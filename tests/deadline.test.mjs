// Spotify's request slots come free, whatever Spotify does.
//
// On 2026-10-09 one of Clinch's requests never settled: no answer, no error, no timeout, although
// it had been aborted. Here a request like that kept its slot, and three of them left every
// search and playlist, for every user, waiting forever. Most tests stub a `fetch` that never
// answers and ignores its abort signal, which is that afternoon in its simplest form.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSpotify, SpotifyError } from '../server/spotify.mjs';

/** A `fetch` that never answers, and counts how often it was asked. */
function hangingFetch() {
  const fetch = () => {
    fetch.calls += 1;
    return new Promise(() => {});
  };
  fetch.calls = 0;
  return fetch;
}

/** Waits for `promise` to settle, either way, and fails the test past `ms`. */
async function within(ms, promise) {
  let timer;
  try {
    return await Promise.race([
      promise.then((value) => ({ value }), (error) => ({ error })),
      new Promise((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`still pending after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

const isTimeout = (error) => error instanceof SpotifyError && error.status === 0 && error.code === 'timeout';

describe('a request Spotify never answers', () => {
  it('fails at its deadline even when fetch ignores the abort, as a timeout', async () => {
    const spotify = createSpotify({ clientId: 'x', fetch: hangingFetch(), timeout: 50, log: {} });
    const { error } = await within(1_000, spotify.call('t', 'GET', '/search'));
    assert.ok(isTimeout(error), String(error));
  });

  it('fails at its deadline when the headers arrive and the body never does', async () => {
    const fetch = async () => ({ status: 200, ok: true, headers: new Headers(), text: () => new Promise(() => {}) });
    const spotify = createSpotify({ clientId: 'x', fetch, timeout: 50, log: {} });
    const { error } = await within(1_000, spotify.call('t', 'GET', '/search'));
    assert.ok(isTimeout(error), String(error));
  });

  it('gives its slot back, so a fourth request still goes out', async () => {
    const fetch = hangingFetch();
    const spotify = createSpotify({ clientId: 'x', fetch, timeout: 50, log: {} });
    // Three slots: before the fix the fourth waited for one forever and never asked.
    const results = await within(1_000, Promise.all([1, 2, 3, 4].map(() => spotify.call('t', 'GET', '/search').catch((e) => e))));
    assert.ok(results.value.every(isTimeout));
    assert.equal(fetch.calls, 4);
    assert.equal(spotify.stuck, false);
  });

  it('settles a token refresh too, so the session can try again', async () => {
    const spotify = createSpotify({ clientId: 'x', fetch: hangingFetch(), timeout: 50, log: {} });
    const { error } = await within(1_000, spotify.refresh('r'));
    assert.ok(isTimeout(error), String(error));
  });
});

describe('the deadline', () => {
  it("doesn't count a 429's pause against the request", async () => {
    let calls = 0;
    const fetch = async () => {
      calls++;
      if (calls === 1) return new Response('{}', { status: 429, headers: { 'retry-after': '1' } });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };
    // The pause (1 s) is far past the deadline (200 ms); only the requests are on its clock.
    const spotify = createSpotify({ clientId: 'x', fetch, timeout: 200, log: {} });
    const { value } = await within(3_000, spotify.call('t', 'GET', '/me'));
    assert.deepEqual(value, { ok: true });
    assert.equal(calls, 2);
  });

  it('marks a slot held past it as stuck', async (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: Date.now() });
    const spotify = createSpotify({ clientId: 'x', fetch: hangingFetch(), timeout: 300, log: {} });
    void spotify.call('t', 'GET', '/search').catch(() => {});
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(spotify.stuck, false);

    // The clock moves, the request's real timer hasn't fired yet: as if it never would.
    t.mock.timers.tick(300 + 60_001);
    assert.equal(spotify.stuck, true);
  });
});
