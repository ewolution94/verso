import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tokenize, tier, norm, baseTitle } from '../server/words.mjs';
import { createMatcher, exact } from '../server/match.mjs';
import { createStore } from '../server/store.mjs';
import { createApi } from '../server/api.mjs';
import { createSpotify } from '../server/spotify.mjs';

test('tokenize keeps the spelling for queries and normalises for comparing', () => {
  assert.deepEqual(
    tokenize("Don't stop me now, Spider-Man & Björk!").map((t) => [t.raw, t.norm]),
    [["Don't", 'dont'], ['stop', 'stop'], ['me', 'me'], ['now', 'now'], ['Spider', 'spider'], ['Man', 'man'], ['and', 'and'], ['Björk', 'bjork']],
  );
  assert.deepEqual(tokenize('  ...  '), []);
  assert.deepEqual(
    tokenize('Hi Sam, thank you - and goodbye. Spider-Man').flatMap((t, i) => (t.break ? [i] : [])),
    [1, 3, 5],
  );
});

test('a title says a phrase whole (tier 0) or without its version (tier 1)', () => {
  assert.equal(tier('Thank You', 'thank you'), 0);
  assert.equal(tier('Thank You - Remastered 2011', 'thank you'), 1);
  assert.equal(tier('Thank You (feat. Someone) [Live]', 'thank you'), 1);
  assert.equal(tier('Thank You Next', 'thank you'), null);
  assert.equal(tier("Don’t Stop Me Now", 'dont stop me now'), 0);
  assert.equal(tier('Me & You', 'me and you'), 0);
  assert.equal(norm('Für Elise'), 'fur elise');
  assert.equal(baseTitle('(Remastered)'), '');
});

test('exact() puts whole titles first and drops repeats of a title by the same artist', () => {
  const item = (name, artist) => ({ name, artists: [artist] });
  const found = exact([item('You - Live', 'A'), item('You', 'B'), item('Your Song', 'C'), item('You', 'B'), item('YOU', 'D')], 'you');
  assert.deepEqual(found.map((t) => [t.name, t.artists[0], t.tier]), [['You', 'B', 0], ['YOU', 'D', 0], ['You - Live', 'A', 1]]);
  const clean = exact([item('"You"', 'E'), item('You!', 'F'), item('You', 'G')], 'you');
  assert.deepEqual(clean.map((t) => t.name), ['You', '"You"', 'You!']);
});

/** A fake search over a fixed catalogue: 10 a page, titles containing the phrase. */
function fakeSearch(titles, { onlyWords = false } = {}) {
  const queries = [];
  const search = async (query, offset) => {
    queries.push(`${query}@${offset}`);
    const phrase = norm(query.match(/^(?:track:)?"(.*)"$/)[1]);
    if (onlyWords && phrase.includes(' ')) return { items: [] };
    const hits = titles
      .filter((title) => ` ${norm(title)} `.includes(` ${phrase} `))
      .map((title, k) => ({ id: `${norm(title).replace(/ /g, '')}${k}`, uri: 'spotify:track:x', name: title, artists: [{ name: `Artist ${k}` }], album: { name: 'A', images: [] } }));
    return { items: hits.slice(offset, offset + 10) };
  };
  return { search, queries };
}

async function runMatch(text, titles, { store = createStore(':memory:'), onlyWords = false } = {}) {
  const { search, queries } = fakeSearch(titles, { onlyWords });
  const events = [];
  await createMatcher({ store }).match(tokenize(text), { search, emit: (e) => events.push(e) });
  // The last event per span is its full list.
  const last = new Map(events.filter((e) => e.type === 'span').map((e) => [`${e.i}:${e.j}`, e.tracks[0].name]));
  const spans = [...last].map(([key, name]) => `${key} ${name}`).sort();
  return { spans, queries, events, store };
}

test('match finds every span a title says, and only extends spans that occur in titles', async () => {
  const titles = ['Happy', 'Happy Birthday', 'Birthday', 'Sam', 'Birthday Party', 'Thank You', 'You', 'Thank'];
  const { spans, queries, events } = await runMatch('happy birthday sam', titles);
  assert.deepEqual(spans, ['0:1 Happy', '0:2 Happy Birthday', '1:2 Birthday', '2:3 Sam']);
  // No title contains "birthday sam", so "happy birthday sam" is never searched.
  assert.ok(queries.includes('"birthday sam"@0'));
  assert.ok(!queries.some((q) => /happy birthday sam/.test(q)));
  // A word pages until a page comes back empty; a phrase tries the track: form when it found too little.
  assert.ok(queries.includes('"happy"@10') && !queries.includes('"happy"@20'));
  assert.ok(queries.includes('track:"birthday sam"@0'));
  const last = events.filter((e) => e.type === 'progress').at(-1);
  assert.deepEqual([last.done, last.total], [6, 6]);
});

test('a title found by any search counts for every span it says', async () => {
  // Spotify answers nothing for phrases here; "Thank You For Everything" still turns up via "thank".
  const { spans } = await runMatch('thank you for everything', ['Thank You For Everything', 'Thank', 'You', 'For', 'Everything'], { onlyWords: true });
  assert.ok(spans.includes('0:4 Thank You For Everything'));
  assert.ok(spans.includes('3:4 Everything'));
});

test('lookups are cached by phrase', async () => {
  const store = createStore(':memory:');
  const first = await runMatch('thank you', ['Thank You'], { store });
  assert.ok(first.queries.length > 0);
  const second = await runMatch('Thank you!', ['Thank You'], { store });
  assert.deepEqual(second.queries, []);
  assert.deepEqual(second.spans, first.spans);
});

test('a 429 pauses every call until Retry-After, then retries', async () => {
  let calls = 0;
  const fetch = async () => {
    calls++;
    if (calls === 1) return new Response('{}', { status: 429, headers: { 'retry-after': '1' } });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  const spotify = createSpotify({ clientId: 'x', fetch, log: {} });
  const started = Date.now();
  assert.deepEqual(await spotify.call('t', 'GET', '/me'), { ok: true });
  assert.equal(calls, 2);
  assert.ok(Date.now() - started >= 950);
});

// --- The whole flow against the mock Spotify --------------------------------------------------

async function startServer() {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), 'verso-test-'));
  const server = http.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const api = createApi({ origin, dataDir, mock: true, log: { warn() {}, error() {} } });
  server.on('request', (req, res) => api(req, res, () => res.writeHead(404).end()));
  return {
    origin,
    close: () => {
      server.closeAllConnections();
      server.close();
      rmSync(dataDir, { recursive: true, force: true });
    },
  };
}

test('login, match and create a playlist (mock Spotify)', async () => {
  const { origin, close } = await startServer();
  try {
    assert.equal((await fetch(`${origin}/api/me`)).status, 401);

    // /auth/login sets the PKCE cookie and (in mock mode) goes straight to the callback.
    const login = await fetch(`${origin}/auth/login`, { redirect: 'manual' });
    assert.equal(login.status, 302);
    const pkce = login.headers.getSetCookie().find((c) => c.startsWith('verso_pkce='));
    assert.match(pkce, /HttpOnly; SameSite=Lax/);
    const callback = await fetch(origin + login.headers.get('location'), { redirect: 'manual', headers: { cookie: pkce.split(';')[0] } });
    assert.equal(callback.headers.get('location'), '/');
    const session = callback.headers.getSetCookie().find((c) => c.startsWith('verso_session=')).split(';')[0];

    // A forged state is refused.
    const forged = await fetch(`${origin}/auth/callback?code=x&state=nope`, { redirect: 'manual', headers: { cookie: pkce.split(';')[0] } });
    assert.equal(forged.headers.get('location'), '/?login=failed');

    const me = await (await fetch(`${origin}/api/me`, { headers: { cookie: session } })).json();
    assert.equal(me.name, 'Mock Listener');

    // Only JSON is accepted on POST routes.
    const form = await fetch(`${origin}/api/match`, { method: 'POST', headers: { cookie: session, 'content-type': 'text/plain' }, body: 'text=hi' });
    assert.equal(form.status, 415);

    const stream = await fetch(`${origin}/api/match`, {
      method: 'POST',
      headers: { cookie: session, 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'Happy birthday, thank you for everything' }),
    });
    assert.equal(stream.headers.get('content-type'), 'text/event-stream; charset=utf-8');
    const events = (await stream.text()).split('\n\n').filter(Boolean).map((chunk) => JSON.parse(chunk.replace(/^data: /, '')));
    assert.deepEqual(events[0], { type: 'words', words: ['Happy', 'birthday', 'thank', 'you', 'for', 'everything'], breaks: [1] });
    assert.equal(events.at(-1).type, 'done');
    const spans = events.filter((e) => e.type === 'span');
    assert.ok(spans.some((e) => e.i === 0 && e.j === 2), 'finds "happy birthday"');
    const uris = spans.filter((e) => e.j - e.i === 1).map((e) => e.tracks[0].uri);

    const bad = await fetch(`${origin}/api/playlists`, {
      method: 'POST',
      headers: { cookie: session, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'x', uris: ['spotify:album:nope'] }),
    });
    assert.equal(bad.status, 400);

    const created = await fetch(`${origin}/api/playlists`, {
      method: 'POST',
      headers: { cookie: session, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Happy birthday', public: true, uris }),
    });
    assert.equal(created.status, 201);
    const playlist = await created.json();
    assert.match(playlist.url, /^https:\/\/open\.spotify\.com\/playlist\//);
    assert.equal(playlist.public, true);

    const logout = await fetch(`${origin}/auth/logout`, { method: 'POST', headers: { cookie: session } });
    assert.equal(logout.status, 204);
    assert.equal((await fetch(`${origin}/api/me`, { headers: { cookie: session } })).status, 401);
  } finally {
    close();
  }
});
