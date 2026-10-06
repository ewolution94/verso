import { test } from 'node:test';
import assert from 'node:assert/strict';
import { segment, spanKey, type Track, type Mode } from '../src/lib/segment.ts';

const track = (name: string, tier: 0 | 1 = 0): Track => ({ id: name, uri: `spotify:track:${name}`, name, artists: ['A'], album: null, image: null, explicit: false, ms: null, tier });

function spansFor(words: string[], titles: string[]) {
  const spans = new Map<string, Track[]>();
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j <= words.length; j++) {
      const phrase = words.slice(i, j).join(' ');
      const found = titles.filter((t) => t.toLowerCase() === phrase).map((t) => track(t));
      if (found.length) spans.set(spanKey(i, j), found);
    }
  }
  return spans;
}

const read = (words: string[], titles: string[], mode: Mode, seed = 0) =>
  segment(words.length, spansFor(words, titles), { mode, seed }).map((s) => (s.tracks.length ? s.tracks[s.pick].name : `[${words[s.i]}]`));

const WORDS = 'happy birthday sam thank you for everything'.split(' ');
const TITLES = ['Happy', 'Birthday', 'Happy Birthday', 'Sam', 'Thank', 'You', 'Thank You', 'For', 'Everything', 'For Everything', 'Thank You For Everything'];

test('fewer: as few songs as possible', () => {
  assert.deepEqual(read(WORDS, TITLES, 'fewer'), ['Happy Birthday', 'Sam', 'Thank You For Everything']);
});

test('balanced: two- and three-word titles where they exist', () => {
  assert.deepEqual(read(WORDS, TITLES, 'balanced'), ['Happy Birthday', 'Sam', 'Thank You', 'For Everything']);
});

test('more: one word per song where possible', () => {
  assert.deepEqual(read(WORDS, TITLES, 'more'), ['Happy', 'Birthday', 'Sam', 'Thank', 'You', 'For', 'Everything']);
});

test('a word no song says becomes a gap, and the rest still reads', () => {
  assert.deepEqual(read(['happy', 'zyx', 'birthday'], ['Happy', 'Birthday'], 'balanced'), ['Happy', '[zyx]', 'Birthday']);
});

test('a longer title is used over a gap', () => {
  assert.deepEqual(read(['the', 'way'], ['The Way'], 'more'), ['The Way']);
});

test('whole titles beat versions of the same length', () => {
  const spans = new Map([
    [spanKey(0, 2), [track('Thank You - Live', 1)]],
    [spanKey(0, 1), [track('Thank')]],
    [spanKey(1, 2), [track('You')]],
  ]);
  assert.deepEqual(segment(2, spans, { mode: 'fewer' }).map((s) => s.key), ['0:2']);
  // In balanced mode the version penalty doesn't outweigh two single words (1.35 each).
  assert.deepEqual(segment(2, spans, { mode: 'balanced' }).map((s) => s.key), ['0:2']);
});

test('the user’s pick wins; shuffle stays within the mode', () => {
  const spans = spansFor(WORDS, TITLES);
  spans.set(spanKey(0, 2), [track('Happy Birthday'), track('Happy Birthday 2')]);
  const picked = segment(WORDS.length, spans, { mode: 'fewer', picks: new Map([[spanKey(0, 2), 1]]) });
  assert.equal(picked[0].pick, 1);
  for (let seed = 1; seed < 40; seed++) assert.equal(segment(WORDS.length, spans, { mode: 'fewer', seed }).length, 3);
});

test('titles don’t run across punctuation when the words exist on their own', () => {
  const words = ['hi', 'sam', 'thank', 'you'];
  const spans = spansFor(words, ['Hi', 'Sam', 'Thank You', 'Sam Thank', 'Hi Sam']);
  const cut = (breaks: number[]) => segment(4, spans, { mode: 'fewer', breaks: new Set(breaks) }).map((s) => s.tracks[s.pick].name);
  assert.deepEqual(cut([]), ['Hi Sam', 'Thank You']);
  assert.deepEqual(cut([1]), ['Hi Sam', 'Thank You']);
  // "Hi, Sam thank you": the comma sits inside "Hi Sam", so it splits there.
  assert.deepEqual(cut([0]), ['Hi', 'Sam', 'Thank You']);
});
