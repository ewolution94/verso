// Verso's routes: Spotify login (PKCE, on the server), the match stream and playlist
// creation. Shared by the production server and the Vite dev server, so both behave the same.
//
//   GET  /auth/login      → Spotify's consent page
//   GET  /auth/callback   → session cookie, back to /
//   POST /auth/logout
//   GET  /api/me          → { name } or 401
//   POST /api/match       { text } → text/event-stream of { type: words | span | progress | done | error }
//   POST /api/playlists   { name, description?, public, uris } → { id, url, public }
//
// The POST routes take JSON only: with the SameSite=Lax cookie that keeps other sites from
// using someone's session.

import path from 'node:path';
import { createSpotify, pkcePair, randomToken, SpotifyError } from './spotify.mjs';
import { createStore, SESSION_TTL } from './store.mjs';
import { createMatcher, MAX_TOKENS } from './match.mjs';
import { createMockFetch } from './mock.mjs';
import { tokenize } from './words.mjs';

const SESSION = 'verso_session';
const PKCE = 'verso_pkce';
const TRACK_URI = /^spotify:track:[A-Za-z0-9]{22}$/;

function cookies(req) {
  const out = {};
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const at = part.indexOf('=');
    if (at > 0) out[part.slice(0, at).trim()] = decodeURIComponent(part.slice(at + 1).trim());
  }
  return out;
}

async function readJson(req, limit = 16_384) {
  if (!/^application\/json\b/.test(req.headers['content-type'] ?? '')) throw Object.assign(new Error('json'), { status: 415 });
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('size'), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('parse'), { status: 400 });
  }
}

const send = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(body === undefined ? undefined : JSON.stringify(body));
};
const redirect = (res, location) => res.writeHead(302, { location, 'cache-control': 'no-store' }).end();

/**
 * @param {{ clientId?: string, origin: string, dataDir: string, market?: string, mock?: boolean, fetch?: typeof fetch, log?: Console }} options
 */
export function createApi({ clientId, origin, dataDir, market = 'DE', mock = false, fetch = globalThis.fetch, log = console }) {
  const store = createStore(path.join(dataDir, 'verso.db'));
  const spotify = createSpotify({ clientId: mock ? 'mock' : clientId, fetch: mock ? createMockFetch() : fetch, log });
  const matcher = createMatcher({ store });
  const configured = mock || Boolean(clientId);
  const secure = origin.startsWith('https:');
  const redirectUri = `${origin}/auth/callback`;
  const refreshing = new Map();

  function setCookie(res, name, value, { maxAge, path: cookiePath = '/' }) {
    const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${cookiePath}`, 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAge}`];
    if (secure) parts.push('Secure');
    res.appendHeader('set-cookie', parts.join('; '));
  }

  /** A valid access token for the session, refreshed (once, however many callers) when due. */
  function accessToken(session) {
    if (session.expires_at - 60_000 > Date.now()) return Promise.resolve(session.access_token);
    let pending = refreshing.get(session.id);
    if (!pending) {
      pending = spotify
        .refresh(session.refresh_token)
        .then((tokens) => {
          store.setTokens(session.id, tokens);
          Object.assign(session, { access_token: tokens.accessToken, refresh_token: tokens.refreshToken, expires_at: tokens.expiresAt });
          return tokens.accessToken;
        })
        .finally(() => refreshing.delete(session.id));
      refreshing.set(session.id, pending);
    }
    return pending;
  }

  /** Spotify said the login is gone: revoked, the refresh token rejected, or made for another (deleted) app. */
  const loginGone = (err) =>
    err instanceof SpotifyError && (err.status === 401 || (err.status === 400 && (err.code === 'invalid_grant' || err.code === 'invalid_client')));

  async function login(req, res) {
    if (!configured) return redirect(res, '/?login=unconfigured');
    // Spotify only accepts http://127.0.0.1 for local redirects, and the PKCE cookie has to be
    // set on the host the callback lands on.
    const host = req.headers.host ?? '';
    const canonical = new URL(origin);
    if (host !== canonical.host && host.startsWith('localhost:') && canonical.hostname === '127.0.0.1') {
      return redirect(res, `${origin}/auth/login`);
    }
    const state = randomToken(16);
    const { verifier, challenge } = pkcePair();
    setCookie(res, PKCE, `${state}.${verifier}`, { maxAge: 600, path: '/auth' });
    redirect(res, mock ? `/auth/callback?code=mock&state=${state}` : spotify.authorizeUrl({ state, challenge, redirectUri }));
  }

  async function callback(req, res, url) {
    const [state, verifier] = (cookies(req)[PKCE] ?? '').split('.');
    setCookie(res, PKCE, '', { maxAge: 0, path: '/auth' });
    const error = url.searchParams.get('error');
    if (error) return redirect(res, `/?login=${error === 'access_denied' ? 'denied' : 'failed'}`);
    const code = url.searchParams.get('code');
    if (!code || !state || !verifier || url.searchParams.get('state') !== state) return redirect(res, '/?login=failed');

    try {
      const tokens = await spotify.exchange({ code, verifier, redirectUri });
      const me = await spotify.call(tokens.accessToken, 'GET', '/me');
      const cookie = store.createSession({
        userId: me.id,
        name: me.display_name || me.id,
        image: me.images?.[0]?.url ?? null,
        ...tokens,
      });
      setCookie(res, SESSION, cookie, { maxAge: SESSION_TTL / 1000 });
      redirect(res, '/');
    } catch (err) {
      // 403 here is development mode's allow-list: the account isn't one of the app's users.
      log.warn(`login failed: ${err instanceof SpotifyError ? `${err.status} ${err.code}` : err?.name}`);
      redirect(res, `/?login=${err instanceof SpotifyError && err.status === 403 ? 'not-allowed' : 'failed'}`);
    }
  }

  async function matchStream(req, res, session) {
    const { text } = await readJson(req);
    const tokens = tokenize(typeof text === 'string' ? text.slice(0, 400) : '').slice(0, MAX_TOKENS);
    if (!tokens.length) return send(res, 400, { error: 'empty' });

    res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', 'x-accel-buffering': 'no' });
    const emit = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);
    const aborted = new AbortController();
    res.on('close', () => aborted.abort());

    emit({ type: 'words', words: tokens.map((t) => t.raw), breaks: tokens.flatMap((t, i) => (t.break ? [i] : [])) });
    const search = async (query, offset) => {
      const token = await accessToken(session);
      // A fixed market: `from_token` needs the user-read-private scope.
      const result = await spotify.call(token, 'GET', '/search', { query: { q: query, type: 'track', limit: 10, offset, market } });
      return result?.tracks;
    };
    const { failures } = await matcher.match(tokens, { search, emit, signal: aborted.signal });
    if (failures.length) {
      const first = failures[0];
      log.warn(`match: ${failures.length} lookups failed, first: ${first instanceof SpotifyError ? `${first.status} ${first.code}` : first?.name}`);
    }
    if (failures.some(loginGone)) emit({ type: 'error', code: 'login' });
    else emit({ type: 'done', failed: failures.length });
    res.end();
  }

  async function createPlaylist(req, res, session) {
    const body = await readJson(req);
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : '';
    const description = typeof body.description === 'string' ? body.description.trim().slice(0, 300) : '';
    const uris = Array.isArray(body.uris) ? body.uris : [];
    if (!name || !uris.length || uris.length > 100 || !uris.every((u) => typeof u === 'string' && TRACK_URI.test(u))) {
      return send(res, 400, { error: 'invalid' });
    }
    const token = await accessToken(session);
    const playlist = await spotify.call(token, 'POST', '/me/playlists', {
      body: { name, public: body.public !== false, ...(description ? { description } : {}) },
    });
    await spotify.call(token, 'POST', `/playlists/${encodeURIComponent(playlist.id)}/items`, { body: { uris } });
    send(res, 201, {
      id: playlist.id,
      url: playlist.external_urls?.spotify ?? `https://open.spotify.com/playlist/${playlist.id}`,
      public: playlist.public !== false,
    });
  }

  return async function api(req, res, next) {
    const url = new URL(req.url ?? '/', 'http://local');
    const route = `${req.method} ${url.pathname}`;
    if (!url.pathname.startsWith('/auth/') && !url.pathname.startsWith('/api/')) return next();

    try {
      if (route === 'GET /auth/login') return await login(req, res);
      if (route === 'GET /auth/callback') return await callback(req, res, url);

      const cookie = cookies(req)[SESSION];
      if (route === 'POST /auth/logout') {
        store.dropSession(cookie);
        setCookie(res, SESSION, '', { maxAge: 0 });
        return send(res, 204);
      }

      const session = store.session(cookie);
      if (!session) return send(res, 401, { error: 'login', configured });
      if (route === 'GET /api/me') return send(res, 200, { name: session.name, image: session.image, mock });
      if (route === 'POST /api/match') return await matchStream(req, res, session);
      if (route === 'POST /api/playlists') return await createPlaylist(req, res, session);
      return send(res, 404, { error: 'not-found' });
    } catch (err) {
      if (res.headersSent) {
        log.error(err);
        return res.end();
      }
      if (err?.status && !(err instanceof SpotifyError)) return send(res, err.status, { error: err.message });
      if (err instanceof SpotifyError) {
        if (loginGone(err)) {
          store.dropSession(cookies(req)[SESSION]);
          return send(res, 401, { error: 'login', configured });
        }
        log.warn(`spotify: ${err.status} ${err.code}`);
        return send(res, 502, { error: 'spotify', status: err.status });
      }
      log.error(err);
      return send(res, 500, { error: 'internal' });
    }
  };
}
