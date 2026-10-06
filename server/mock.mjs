// A stand-in for Spotify's accounts service and Web API, for `npm run mock` and the tests.
//
// It answers the same requests with the same shapes, from a catalogue invented on the fly: a
// phrase's hash decides whether songs with that title exist, how many, and by whom. Single words
// almost always exist, long phrases rarely do, so the matcher's pruning, paging and local
// resolution all get exercised. Covers are generated SVGs (data: URLs, allowed by the CSP).

import crypto from 'node:crypto';
import { norm } from './words.mjs';

const ARTISTS = ['Neon Harbor', 'The Paper Kites', 'Mira Lune', 'Velvet Static', 'Jonah Reyes', 'Saltwater', 'Ada Moss', 'Golden Hour Club', 'Kavi', 'Lowlands', 'Ivy & The Engines', 'Marlowe'];
const VERSIONS = [' - Remastered 2011', ' (Live)', ' - Acoustic', ' (feat. Kavi)'];
const FILLERS = ['Tonight', 'Again', 'Forever', 'My', 'Blues', 'Slowly', 'Still'];
/** Chance that songs titled exactly the phrase exist, by number of words. */
const EXISTS = [0, 0.94, 0.35, 0.2, 0.1, 0.06, 0.04, 0.03, 0.02];
/** Phrases that always exist, so a demo message reads well. */
const KNOWN = new Set(['happy birthday', 'thank you', 'i will always love you', 'never gonna give you up', 'see you later', 'good morning', 'i love you', 'for everything', 'dont stop me now']);

const rand = (seed) => {
  const h = crypto.createHash('sha256').update(seed).digest();
  return h.readUInt32BE(0) / 2 ** 32;
};
const pick = (list, seed) => list[Math.floor(rand(seed) * list.length)];
const titleCase = (text) => text.replace(/(^|\s)(\p{L})/gu, (_, space, letter) => space + letter.toUpperCase());

function cover(seed) {
  const h1 = Math.floor(rand(seed + 'h1') * 360);
  const h2 = (h1 + 40 + Math.floor(rand(seed + 'h2') * 120)) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h1} 70% 55%)"/><stop offset="1" stop-color="hsl(${h2} 65% 30%)"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><circle cx="${16 + rand(seed + 'x') * 32}" cy="${16 + rand(seed + 'y') * 32}" r="${6 + rand(seed + 'r') * 14}" fill="rgb(255 255 255 / 0.18)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function track(title, seed) {
  const id = crypto.createHash('sha256').update(seed).digest('base64url').replace(/[-_]/g, 'x').slice(0, 22);
  const artist = pick(ARTISTS, seed + 'artist');
  return {
    id,
    uri: `spotify:track:${id}`,
    name: title,
    artists: [{ name: artist }],
    album: { name: `${artist} – ${pick(FILLERS, seed + 'album')}`, images: [{ url: cover(seed), width: 300, height: 300 }] },
    explicit: rand(seed + 'explicit') < 0.1,
    duration_ms: 150_000 + Math.floor(rand(seed + 'ms') * 120_000),
  };
}

/** Every track the invented catalogue has whose title contains the phrase. */
function catalogue(raw) {
  const phrase = norm(raw);
  const length = phrase.split(' ').length;
  const tracks = [];
  if (KNOWN.has(phrase) || rand(phrase) < (EXISTS[length] ?? 0.01)) {
    const count = 1 + Math.floor(rand(phrase + 'count') * 5);
    for (let k = 0; k < count; k++) {
      const version = rand(`${phrase}v${k}`) < 0.25 ? pick(VERSIONS, `${phrase}vv${k}`) : '';
      tracks.push(track(titleCase(raw) + version, `${phrase}#${k}`));
    }
  }
  // Titles that contain the phrase without being it; a single word is in thousands of them.
  const decoys = length === 1 ? 40 : rand(phrase + 'decoys') < 0.5 ? 0 : 1 + Math.floor(rand(phrase + 'nd') * 3);
  for (let k = 0; k < decoys; k++) {
    const filler = pick(FILLERS, `${phrase}f${k}`);
    tracks.splice(Math.floor(rand(`${phrase}at${k}`) * (tracks.length + 1)), 0, track(rand(`${phrase}side${k}`) < 0.5 ? `${titleCase(raw)} ${filler}` : `${filler} ${titleCase(raw)}`, `${phrase}~${k}`));
  }
  return { tracks, total: length === 1 ? 1000 + tracks.length : tracks.length };
}

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** A `fetch` that answers like accounts.spotify.com and api.spotify.com/v1. */
export function createMockFetch({ calls = [] } = {}) {
  let playlists = 0;
  return async function mockFetch(input, init = {}) {
    const url = new URL(String(input));
    const method = (init.method ?? 'GET').toUpperCase();
    calls.push({ method, url: url.toString(), body: init.body });
    if (url.host === 'accounts.spotify.com' && url.pathname === '/api/token') {
      return json(200, { access_token: `mock-${crypto.randomUUID()}`, token_type: 'Bearer', expires_in: 3600, refresh_token: 'mock-refresh' });
    }
    if (url.host !== 'api.spotify.com') return json(404, { error: { status: 404, message: 'Not found' } });
    const path = url.pathname.replace(/^\/v1/, '');
    if (method === 'GET' && path === '/me') return json(200, { id: 'mock-user', display_name: 'Mock Listener', images: [] });
    if (method === 'GET' && path === '/search') {
      const query = url.searchParams.get('q') ?? '';
      const phrase = query.match(/^(?:track:)?"(.*)"$/)?.[1] ?? query;
      const limit = Math.min(Number(url.searchParams.get('limit') ?? 5), 10);
      const offset = Number(url.searchParams.get('offset') ?? 0);
      const { tracks, total } = catalogue(phrase);
      return json(200, { tracks: { href: url.toString(), limit, offset, total, items: tracks.slice(offset, offset + limit) } });
    }
    if (method === 'POST' && path === '/me/playlists') {
      const body = JSON.parse(init.body ?? '{}');
      const id = `mockplaylist${++playlists}`.padEnd(22, '0');
      return json(201, { id, name: body.name, public: body.public !== false, external_urls: { spotify: `https://open.spotify.com/playlist/${id}` } });
    }
    if (method === 'POST' && /^\/playlists\/[^/]+\/items$/.test(path)) return json(201, { snapshot_id: 'mock' });
    return json(404, { error: { status: 404, message: 'Not found' } });
  };
}
