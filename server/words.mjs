// What counts as "this title says these words": one definition, used for the message and for
// every track title Spotify returns.
//
// Case, accents, apostrophes and punctuation don't count ("Don't Stop Me Now" says "dont stop
// me now"), and "&" reads as "and". A title can say a phrase in two ways:
//   tier 0: the whole title ("Thank You")
//   tier 1: the title without its version ("Thank You - Remastered 2011", "Thank You (Live)")
// Tier 1 still reads right in the playlist, but the suffix shows, so tier 0 wins when both exist.

const MARKS = /\p{M}+/gu;
const APOSTROPHES = /['’‘`´]/g;
const NON_WORD = /[^\p{L}\p{N}]+/u;

/** The normalised words of any text. */
export function words(text) {
  return String(text ?? '')
    .normalize('NFKD')
    .replace(MARKS, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(APOSTROPHES, '')
    .split(NON_WORD)
    .filter(Boolean);
}

export const norm = (text) => words(text).join(' ');

/** Punctuation that ends a phrase; a hyphen inside a word ("Spider-Man") doesn't. */
const BREAK = /[.,;:!?()[\]"“”„«»—–…]|\s-\s|\n/;

/**
 * The message as tokens: `raw` keeps the user's spelling (for the search query and for words no
 * song covers), `norm` is what titles are compared on. "Spider-Man" is two tokens, "don't" one.
 * `break` marks a token followed by punctuation, so a song title rarely spans "Sam, thank".
 */
export function tokenize(text) {
  const source = String(text ?? '').normalize('NFC').replace(/&/g, ' and ');
  const tokens = [];
  let end = 0;
  for (const match of source.matchAll(/[\p{L}\p{N}\p{M}'’]+/gu)) {
    const value = words(match[0]).join('');
    if (!value) continue;
    const previous = tokens.at(-1);
    if (previous && BREAK.test(source.slice(end, match.index))) previous.break = true;
    tokens.push({ raw: match[0].replace(/^['’]+|['’]+$/g, ''), norm: value, break: false });
    end = match.index + match[0].length;
  }
  return tokens;
}

/** "Song - Remastered 2011", "Song (feat. X)", "Song [Live]" → "Song". */
export const baseTitle = (name) =>
  String(name ?? '')
    .replace(/\s+[-–—]\s+.*$/, '')
    .replace(/\s*[([][^)\]]*[)\]]/g, '')
    .trim();

/** 0 or 1 when the title says the phrase (see the tiers above), otherwise null. */
export function tier(name, phrase) {
  if (norm(name) === phrase) return 0;
  const base = norm(baseTitle(name));
  return base && base === phrase ? 1 : null;
}

/** Whether the title contains the phrase word for word ("Thank You For Everything" contains "you for"). */
export const containsPhrase = (name, phrase) => ` ${norm(name)} `.includes(` ${phrase} `);
