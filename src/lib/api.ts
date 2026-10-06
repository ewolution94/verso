// The server's routes (server/api.mjs), typed. Network failures are classified by type, never
// by message text: Safari says "Load failed", Chrome "Failed to fetch".

import type { Track } from './segment';

export type Me = { name: string; image: string | null; mock: boolean };
export type Saved = { id: string; url: string; public: boolean };
export type MatchEvent =
  | { type: 'words'; words: string[]; breaks: number[] }
  | { type: 'span'; i: number; j: number; tracks: Track[] }
  | { type: 'progress'; done: number; total: number }
  | { type: 'done'; failed: number }
  | { type: 'error'; code: string };

export class LoginRequired extends Error {}
export class Offline extends Error {}
export class ApiError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new Offline();
  }
  if (res.status === 401) throw new LoginRequired();
  if (!res.ok) throw new ApiError(res.status);
  return res;
}

const json = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

/** The logged-in user, or null with whether the server has a Spotify app configured at all. */
export async function me(): Promise<{ user: Me | null; configured: boolean }> {
  const res = await fetch('/api/me').catch(() => {
    throw new Offline();
  });
  if (res.status === 401) {
    const body = await res.json().catch(() => ({}));
    return { user: null, configured: body.configured !== false };
  }
  if (!res.ok) throw new ApiError(res.status);
  return { user: await res.json(), configured: true };
}

export async function logout() {
  await request('/auth/logout', { method: 'POST' });
}

/** Streams the matches for a message; resolves when the server is done. */
export async function match(text: string, onEvent: (event: MatchEvent) => void, signal: AbortSignal) {
  const res = await request('/api/match', { ...json({ text }), signal });
  if (!res.body) throw new ApiError(res.status);
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      let at;
      while ((at = buffer.indexOf('\n\n')) >= 0) {
        const chunk = buffer.slice(0, at);
        buffer = buffer.slice(at + 2);
        if (chunk.startsWith('data: ')) onEvent(JSON.parse(chunk.slice(6)));
      }
    }
  } catch (err) {
    if (signal.aborted) throw err;
    throw new Offline();
  }
}

export async function createPlaylist(body: { name: string; public: boolean; uris: string[] }): Promise<Saved> {
  return (await request('/api/playlists', json(body))).json();
}
