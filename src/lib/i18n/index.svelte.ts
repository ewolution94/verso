// Verso's texts in the viewer's language: their choice (prefs), or the browser's until they make
// one. The pattern is Cantina's (cantina/src/lib/i18n). English when the browser asks for neither.

import { prefs, type LanguagePref } from '../prefs.svelte';
import { de } from './de';
import { en, type MessageKey } from './en';

export type Locale = 'en' | 'de';
export type { MessageKey };
const LOCALES: Locale[] = ['en', 'de'];
const DICTIONARIES: Record<Locale, Record<MessageKey, string>> = { en, de };

function detectLocale(): Locale {
  const preferred = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of preferred) {
    const base = tag?.toLowerCase().split('-')[0];
    if (LOCALES.includes(base as Locale)) return base as Locale;
  }
  return 'en';
}

let systemLocale = $state<Locale>(detectLocale());
addEventListener('languagechange', () => (systemLocale = detectLocale()));

/** The language a preference shows. */
export function resolveLocale(pref: LanguagePref): Locale {
  return pref === 'system' ? systemLocale : pref;
}

/** The language on screen. */
export function locale(): Locale {
  return resolveLocale(prefs.language);
}

$effect.root(() => {
  $effect(() => {
    document.documentElement.lang = locale();
  });
});

type Param = string | number;

/** Translates a key, filling `{name}` placeholders. Reactive: re-renders when the language changes. */
export function t(key: MessageKey, params?: Record<string, Param>): string {
  const template = DICTIONARIES[locale()][key] ?? en[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    if (!(name in params)) return match;
    const value = params[name];
    return typeof value === 'number' ? new Intl.NumberFormat(locale()).format(value) : value;
  });
}

type PluralBase = { [K in MessageKey]: K extends `${infer Base}.other` ? Base : never }[MessageKey];

/** Plural-aware t(): picks `<key>.one` or `<key>.other` for the count and passes it as {count}. */
export function tn(base: PluralBase, count: number, params?: Record<string, Param>): string {
  const form = new Intl.PluralRules(locale()).select(count) === 'one' ? 'one' : 'other';
  return t(`${base}.${form}` as MessageKey, { count, ...params });
}
