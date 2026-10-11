// Spotify's accounts service and Web API, as Verso uses them.
//
// Every API call goes through one queue: Spotify rate-limits per app (all users together, over a
// rolling 30 s window), so a 429 pauses everyone until its Retry-After, not just the caller.
//
// Login is the authorization code flow with PKCE, run on the server: it needs only the client
// ID (no secret), and the tokens never reach the browser.
//
// Development-mode rules (February 2026) this relies on: search takes at most 10 results per
// page; playlists are created with POST /me/playlists and filled through /playlists/{id}/items.

import crypto from 'node:crypto';
import { withDeadline } from './deadline.mjs';

export const SCOPES = ['playlist-modify-public', 'playlist-modify-private'];
const ACCOUNTS = 'https://accounts.spotify.com';
const API = 'https://api.spotify.com/v1';

export class SpotifyError extends Error {
  constructor(status, code, detail) {
    super(`Spotify ${status}${code ? ` ${code}` : ''}`);
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

const base64url = (buffer) => Buffer.from(buffer).toString('base64url');
export const randomToken = (bytes = 32) => base64url(crypto.randomBytes(bytes));

export function pkcePair() {
  const verifier = randomToken(48);
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function createSpotify({ clientId, fetch = globalThis.fetch, concurrency = 3, timeout = 15_000, log = console }) {
  let active = 0;
  const waiting = [];
  let pausedUntil = 0;
  /** When each request now holding a slot was sent. */
  const sent = new Set();

  async function slot() {
    if (active >= concurrency) await new Promise((resolve) => waiting.push(resolve));
    active++;
  }
  function release() {
    active--;
    waiting.shift()?.();
  }

  /**
   * One request, headers and body, on our clock (server/deadline.mjs). The abort signal alone
   * isn't the guarantee: on 2026-10-09 one of Clinch's requests never settled although it had
   * been aborted, and here a request that never settles keeps its slot. Three of them and every
   * search and playlist, for every user, waits forever. Waiting for a slot or for a 429's pause
   * happens before this and doesn't count.
   * @returns {Promise<{ status: number, ok: boolean, headers: Headers, text: string }>}
   */
  async function send(url, init) {
    let signal;
    try {
      return await withDeadline(timeout, async (s) => {
        signal = s;
        const res = await fetch(url, { ...init, signal });
        return { status: res.status, ok: res.ok, headers: res.headers, text: await res.text() };
      });
    } catch (err) {
      throw new SpotifyError(0, signal?.aborted || err?.name === 'TimeoutError' ? 'timeout' : 'network');
    }
  }

  function readError(res) {
    let body = null;
    try {
      body = JSON.parse(res.text);
    } catch {}
    // The accounts service answers { error: 'invalid_grant', error_description }, the Web API
    // { error: { status, message } }.
    const code = typeof body?.error === 'string' ? body.error : body?.error?.message;
    return new SpotifyError(res.status, typeof code === 'string' ? code : '', body);
  }

  /** One Web API request, queued, retried on 429 (after Retry-After) and once on 5xx. */
  async function call(token, method, path, { query, body } = {}) {
    const url = new URL(API + path);
    for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, String(value));
    const init = {
      method,
      headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    };

    for (let attempt = 0; ; attempt++) {
      const wait = pausedUntil - Date.now();
      if (wait > 0) await sleep(wait);
      await slot();
      const at = { since: Date.now() };
      sent.add(at);
      let res;
      try {
        res = await send(url, init);
      } finally {
        sent.delete(at);
        release();
      }
      if (res.status === 429 && attempt < 4) {
        const seconds = Math.min(Number(res.headers.get('retry-after')) || 2, 60);
        pausedUntil = Math.max(pausedUntil, Date.now() + seconds * 1000);
        log.warn?.(`spotify: 429, pausing ${seconds}s`);
        continue;
      }
      if (res.status >= 500 && attempt < 1) {
        await sleep(500);
        continue;
      }
      if (!res.ok) throw readError(res);
      if (res.status === 204) return null;
      return res.text ? JSON.parse(res.text) : null;
    }
  }

  async function token(params) {
    const res = await send(`${ACCOUNTS}/api/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, ...params }),
    });
    if (!res.ok) throw readError(res);
    const json = JSON.parse(res.text);
    return {
      accessToken: json.access_token,
      // With PKCE Spotify may rotate the refresh token; keep the old one if it doesn't.
      refreshToken: json.refresh_token ?? params.refresh_token,
      expiresAt: Date.now() + (Number(json.expires_in) || 3600) * 1000,
    };
  }

  return {
    authorizeUrl: ({ state, challenge, redirectUri }) =>
      `${ACCOUNTS}/authorize?${new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        scope: SCOPES.join(' '),
        redirect_uri: redirectUri,
        state,
        code_challenge_method: 'S256',
        code_challenge: challenge,
      })}`,
    exchange: ({ code, verifier, redirectUri }) =>
      token({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, code_verifier: verifier }),
    refresh: (refreshToken) => token({ grant_type: 'refresh_token', refresh_token: refreshToken }),
    call,
    /**
     * A request has held its slot for longer than its deadline allows, which send() rules out,
     * so this is true only if something else holds one. Spotify answering 429 or 5xx is calls
     * failing, which is this working. `/healthz` answers 503 on it.
     */
    get stuck() {
      const now = Date.now();
      for (const at of sent) if (now - at.since > timeout + 60_000) return true;
      return false;
    },
  };
}
