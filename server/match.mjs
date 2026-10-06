// Finds every track whose title says a run of words from the message ("span"), for the client
// to cut the message into songs.
//
// Spotify's search in development mode (measured 2026-10-06, see learnings/projects/verso.md):
// 10 results a page at most, `total` and `next` are noise (5, then 0, then 100 for one query), and
// results rank by popularity, not by how exactly a title matches. So:
//
// - Single words are searched as `"word"`, up to 4 pages, until 4 exact titles turned up. Small
//   words ("for", "see") often have none; they end up inside longer titles instead.
// - Longer spans are searched as `"phrase"`, then `track:"phrase"` if that found too little (it
//   ranks narrow phrases like "happy birthday sam" better).
// - A span is only extended when its results show a title that contains it word for word: "sam
//   thank" turns up no such title, so "sam thank you" is never searched.
// - Every title that comes back is checked against every span of the message, so searching
//   "never" can already deliver "Never Gonna Give You Up".
// - Every lookup is cached by its normalised phrase for 30 days, across users (store.mjs).

import { baseTitle, containsPhrase, norm, tier } from './words.mjs';

export const MAX_TITLE_WORDS = 8;
export const MAX_TOKENS = 30;
const PAGE = 10;
/** Exact matches worth collecting for a word: the first is used, the rest are alternatives. */
const WANT = 4;
const WORD_PAGES = 4;
/** Alternatives sent per span. */
const KEEP = 8;

/** The part of Spotify's track object Verso keeps. */
export function compact(track) {
  const images = [...(track.album?.images ?? [])].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  const image = images.find((i) => (i.width ?? 0) >= 120) ?? images.at(-1);
  return {
    id: track.id,
    uri: track.uri,
    name: track.name,
    artists: (track.artists ?? []).map((a) => a.name),
    album: track.album?.name ?? null,
    image: image?.url ?? null,
    explicit: Boolean(track.explicit),
    ms: track.duration_ms ?? null,
  };
}

/** Titles with stray marks ("\"Happy\"", "SEE YOU LATER!") read worse in a playlist. */
const quirky = (name) => (/[^\p{L}\p{N}\p{M}\s'’,&.-]/u.test(name) ? 1 : 0);

/** Best first: whole titles, then clean ones; otherwise Spotify's order (the sort is stable). */
export const rank = (a, b) => a.tier - b.tier || quirky(a.name) - quirky(b.name);

/**
 * The items whose title says the phrase, best first (`rank`), one per title and artist. A tier 1
 * track carries `base`, the part of its title that says the phrase.
 */
export function exact(items, phrase) {
  const seen = new Set();
  const found = [];
  for (const item of items) {
    const t = tier(item.name, phrase);
    if (t === null) continue;
    const key = `${item.name.toLowerCase()}|${item.artists[0]?.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(t === 1 ? { ...item, tier: t, base: baseTitle(item.name) } : { ...item, tier: t });
  }
  return found.sort(rank);
}

/** The searches for a span, in order; the lookup stops once it has enough. */
function searchesFor(tokens) {
  const text = tokens.map((t) => t.raw.replace(/"/g, '')).join(' ');
  if (tokens.length === 1) return Array.from({ length: WORD_PAGES }, (_, page) => ({ q: `"${text}"`, offset: page * PAGE }));
  return [
    { q: `"${text}"`, offset: 0 },
    { q: `track:"${text}"`, offset: 0 },
  ];
}

/**
 * @param {{ store: ReturnType<import('./store.mjs').createStore> }} options
 */
export function createMatcher({ store }) {
  const inflight = new Map();

  /** One phrase's results: from the cache, or searched and cached. */
  function lookup(tokens, search) {
    const phrase = tokens.map((t) => t.norm).join(' ');
    const cached = store.search(phrase);
    if (cached) return Promise.resolve(cached.items);
    let pending = inflight.get(phrase);
    if (!pending) {
      pending = fetchPhrase(tokens, phrase, search).finally(() => inflight.delete(phrase));
      inflight.set(phrase, pending);
    }
    return pending;
  }

  async function fetchPhrase(tokens, phrase, search) {
    const items = [];
    const ids = new Set();
    const enough = tokens.length === 1 ? WANT : 2;
    for (const { q, offset } of searchesFor(tokens)) {
      const page = (await search(q, offset))?.items ?? [];
      for (const track of page) {
        if (!track?.id || ids.has(track.id)) continue;
        ids.add(track.id);
        items.push(compact(track));
      }
      if (exact(items, phrase).length >= enough) break;
      // An empty page ends the paging of a word (a phrase's second search is another query).
      if (!page.length && offset > 0) break;
    }
    store.putSearch(phrase, { total: items.length, items });
    return items;
  }

  /**
   * Looks up the spans of the message and reports each one that has tracks, as they turn up.
   * @param {{ raw: string, norm: string }[]} tokens
   * @param {{ search: (query: string, offset: number) => Promise<{ items: object[] }>,
   *           emit: (event: object) => void, signal?: AbortSignal }} io
   */
  async function match(tokens, { search, emit, signal }) {
    const n = tokens.length;
    const longest = Math.min(n, MAX_TITLE_WORDS);
    const failures = [];
    let total = 0;
    let done = 0;

    // Where each phrase sits in the message ("you" can be in two places).
    const places = new Map();
    for (let length = 1; length <= longest; length++) {
      for (let i = 0; i + length <= n; i++) {
        const phrase = tokens.slice(i, i + length).map((t) => t.norm).join(' ');
        if (!places.has(phrase)) places.set(phrase, []);
        places.get(phrase).push([i, i + length]);
        total++;
      }
    }

    /** Tracks per span, merged from every search that turned one up. */
    const found = new Map();
    function offer(items) {
      const changed = new Set();
      for (const item of items) {
        const whole = norm(item.name);
        const base = norm(baseTitle(item.name));
        for (const phrase of new Set([whole, base])) {
          for (const [i, j] of places.get(phrase) ?? []) {
            const key = `${i}:${j}`;
            const list = found.get(key) ?? [];
            const [match] = exact([item], phrase);
            if (!match) continue;
            const same = (t) => t.name.toLowerCase() === item.name.toLowerCase() && t.artists[0]?.toLowerCase() === item.artists[0]?.toLowerCase();
            if (list.some(same)) continue;
            list.push(match);
            list.sort(rank);
            found.set(key, list);
            changed.add(key);
          }
        }
      }
      if (signal?.aborted) return;
      for (const key of changed) {
        const [i, j] = key.split(':').map(Number);
        emit({ type: 'span', i, j, tracks: found.get(key).slice(0, KEEP) });
      }
    }

    const spans = new Map();
    const resolve = (i, j) => {
      const key = `${i}:${j}`;
      if (!spans.has(key)) spans.set(key, run(i, j));
      return spans.get(key);
    };

    /** Searches a span when it can exist; resolves to whether a title contains it. */
    async function run(i, j) {
      let alive = false;
      const extendable = j - i === 1 || (await Promise.all([resolve(i, j - 1), resolve(i + 1, j)])).every(Boolean);
      if (extendable && !signal?.aborted) {
        const span = tokens.slice(i, j);
        const phrase = span.map((t) => t.norm).join(' ');
        try {
          const items = await lookup(span, search);
          offer(items);
          // Any word can start a phrase; a longer span has to show up inside a real title.
          alive = j - i === 1 || items.some((item) => containsPhrase(item.name, phrase));
        } catch (err) {
          failures.push(err);
          alive = j - i === 1;
        }
      }
      done++;
      if (!signal?.aborted) emit({ type: 'progress', done, total });
      return alive;
    }

    const all = [];
    for (let length = 1; length <= longest; length++) {
      for (let i = 0; i + length <= n; i++) all.push(resolve(i, i + length));
    }
    await Promise.all(all);
    return { failures };
  }

  return { match };
}
