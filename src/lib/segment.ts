// Cuts the message into songs: the cheapest way to cover every word with spans that have a
// track, where "cheap" depends on the mode. Runs on every streamed span, so the playlist
// re-forms as longer titles turn up.

export type Track = {
  id: string;
  uri: string;
  name: string;
  artists: string[];
  album: string | null;
  image: string | null;
  explicit: boolean;
  ms: number | null;
  /** 0: the title is exactly the words; 1: plus a version ("- Remastered", "(Live)"). */
  tier: 0 | 1;
  /** For tier 1: the part of the title that says the words. */
  base?: string;
};

export type Mode = 'fewer' | 'balanced' | 'more';

export type Segment = {
  i: number;
  j: number;
  key: string;
  /** Empty when no song says this word: the playlist will skip it. */
  tracks: Track[];
  pick: number;
};

export const spanKey = (i: number, j: number) => `${i}:${j}`;

/** What one song covering `length` words costs, per mode. */
const COST: Record<Mode, (length: number) => number> = {
  // One song is one song, whatever its length.
  fewer: () => 1,
  // Two- and three-word titles read best; single words and long titles cost a little more.
  balanced: (length) => 1 + 0.35 * (length - 2) ** 2,
  // Anything longer than one word costs more than its words would separately.
  more: (length) => 1 + 1.5 * (length - 1),
};
/** How far Shuffle may bend the costs: enough to swap near-equal cuts, not to break the mode. */
const NOISE: Record<Mode, number> = { fewer: 0.35, balanced: 0.3, more: 0.2 };
const VERSION_PENALTY = 0.25;
/** Running a title across a comma or full stop costs more than the extra songs avoiding it usually takes. */
const BREAK_PENALTY = 3;
const GAP = 50;
const MAX_WORDS = 8;

/** A stable pseudo-random number in [0, 1) for a seed and a key. */
export function chance(seed: number, key: string): number {
  let h = 2166136261 ^ seed;
  for (let k = 0; k < key.length; k++) h = Math.imul(h ^ key.charCodeAt(k), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Which of a span's tracks to show: the user's pick, else the first, or a shuffled whole title. */
function defaultPick(tracks: Track[], seed: number, key: string): number {
  if (!seed) return 0;
  const whole = tracks.filter((t) => t.tier === 0).length || tracks.length;
  return Math.floor(chance(seed, `${key}#pick`) * whole);
}

export type Options = {
  mode: Mode;
  /** 0 for the plain best cut; anything else shuffles near-equal choices. */
  seed?: number;
  /** The user's chosen track per span key. */
  picks?: ReadonlyMap<string, number>;
  /** Indexes of words followed by punctuation. */
  breaks?: ReadonlySet<number>;
};

/**
 * @param n      number of words
 * @param spans  tracks per span key ("i:j"), best first
 */
export function segment(n: number, spans: ReadonlyMap<string, Track[]>, { mode, seed = 0, picks = new Map(), breaks = new Set() }: Options): Segment[] {
  const best = new Float64Array(n + 1).fill(Infinity);
  const from = new Int32Array(n + 1).fill(-1);
  best[0] = 0;

  for (let j = 1; j <= n; j++) {
    for (let i = Math.max(0, j - MAX_WORDS); i < j; i++) {
      if (best[i] === Infinity) continue;
      const key = spanKey(i, j);
      const tracks = spans.get(key);
      let cost: number;
      if (tracks?.length) {
        cost = COST[mode](j - i) + (tracks[0].tier === 1 ? VERSION_PENALTY : 0);
        for (let k = i; k < j - 1; k++) if (breaks.has(k)) cost += BREAK_PENALTY;
        if (seed) cost += chance(seed, key) * NOISE[mode];
      } else if (j - i === 1) {
        cost = GAP;
      } else continue;
      // Ties go to the longer last song, so a cut doesn't flip between equal options as spans stream in.
      if (best[i] + cost < best[j] - 1e-9) {
        best[j] = best[i] + cost;
        from[j] = i;
      }
    }
  }

  const out: Segment[] = [];
  for (let j = n; j > 0; j = from[j]) {
    const i = from[j];
    const key = spanKey(i, j);
    const tracks = spans.get(key) ?? [];
    const chosen = picks.get(key);
    const pick = chosen !== undefined && chosen < tracks.length ? chosen : defaultPick(tracks, seed, key);
    out.push({ i, j, key: tracks.length ? key : `gap:${i}`, tracks, pick });
  }
  return out.reverse();
}
