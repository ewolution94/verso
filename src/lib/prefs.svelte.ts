// The viewer's preferences, kept in this browser only. 'system' means no choice stored: the
// language then follows the browser's, the theme the device's.

export type LanguagePref = 'system' | 'de' | 'en';
export type ThemePref = 'system' | 'light' | 'dark';

const KEY = 'verso:settings';
const LANGUAGES: LanguagePref[] = ['system', 'de', 'en'];
const THEMES: ThemePref[] = ['system', 'light', 'dark'];
/** The tokens' page colours (--ewo-bg), for the status bar of an installed app. */
const THEME_COLOR = { light: '#f5f4f1', dark: '#09090b' };

type Stored = { language?: unknown; theme?: unknown };

function load(): Stored {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

const dark = matchMedia('(prefers-color-scheme: dark)');

/** The colours a preference shows right now. */
export function resolveTheme(theme: ThemePref): 'light' | 'dark' {
  return theme === 'system' ? (dark.matches ? 'dark' : 'light') : theme;
}

/**
 * Pins the theme through the tokens' contract (`:root[data-theme]`), or lets the device decide,
 * and keeps theme-color in step. public/boot.js does the same before first paint.
 */
export function applyTheme(theme: ThemePref) {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const scheme = meta.media.includes('light') ? 'light' : 'dark';
    meta.content = THEME_COLOR[theme === 'system' ? scheme : theme];
  }
}

class Prefs {
  language = $state<LanguagePref>(LANGUAGES.find((l) => l === load().language) ?? 'system');
  theme = $state<ThemePref>(THEMES.find((t) => t === load().theme) ?? 'system');

  setLanguage(language: LanguagePref) {
    this.language = language;
    this.#save();
  }

  setTheme(theme: ThemePref) {
    this.theme = theme;
    applyTheme(theme);
    this.#save();
  }

  #save() {
    try {
      const stored = load();
      for (const [key, value] of [['language', this.language], ['theme', this.theme]] as const) {
        if (value === 'system') delete stored[key];
        else stored[key] = value;
      }
      localStorage.setItem(KEY, JSON.stringify(stored));
    } catch {}
  }
}

export const prefs = new Prefs();
