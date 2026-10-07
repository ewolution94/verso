// The app's state: who is logged in, the message, its matches and the playlist cut from them.

import { SvelteMap } from 'svelte/reactivity';
import * as api from './api';
import { loadCensus } from './census';
import type { MessageKey } from './i18n/index.svelte';
import { segment, type Mode, type Segment, type Track } from './segment';

const DRAFT = 'verso:draft';
const MODE = 'verso:mode';

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};

/** What the server's ?login= codes mean; the texts are in i18n, so a notice follows the language. */
const LOGIN_NOTICES: Record<string, MessageKey> = {
  denied: 'notice.denied',
  failed: 'notice.failed',
  'not-allowed': 'notice.notAllowed',
  unconfigured: 'notice.unconfigured',
};

class App {
  status = $state<'loading' | 'out' | 'in'>('loading');
  user = $state<api.Me | null>(null);
  configured = $state(true);
  notice = $state<MessageKey | null>(null);

  text = $state(read(DRAFT) ?? '');
  /** The message the results below are for. */
  query = $state('');
  words = $state<string[]>([]);
  breaks = $state<ReadonlySet<number>>(new Set());
  spans = new SvelteMap<string, Track[]>();
  progress = $state({ done: 0, total: 0 });
  searching = $state(false);
  problem = $state<MessageKey | null>(null);

  mode = $state<Mode>((['fewer', 'balanced', 'more'] as const).find((m) => m === read(MODE)) ?? 'balanced');
  seed = $state(0);
  picks = new SvelteMap<string, number>();
  segments: Segment[] = $derived(segment(this.words.length, this.spans, { mode: this.mode, seed: this.seed, picks: this.picks, breaks: this.breaks }));

  settingsOpen = $state(false);
  /** The segment whose alternatives are open in the sheet. */
  choosing = $state<string | null>(null);
  name = $state('');
  public = $state(true);
  saving = $state(false);
  saved = $state<api.Saved | null>(null);

  #controller: AbortController | null = null;

  async start() {
    const params = new URLSearchParams(location.search);
    const login = params.get('login');
    if (login) {
      this.notice = LOGIN_NOTICES[login] ?? LOGIN_NOTICES.failed;
      history.replaceState(null, '', location.pathname);
    }
    loadCensus();
    try {
      const { user, configured } = await api.me();
      this.user = user;
      this.configured = configured;
      this.status = user ? 'in' : 'out';
    } catch {
      this.status = 'out';
      this.notice = 'notice.unreachable';
    }
  }

  setText(text: string) {
    this.text = text;
    write(DRAFT, text);
  }

  setMode(mode: Mode) {
    this.mode = mode;
    write(MODE, mode);
  }

  shuffle() {
    this.picks.clear();
    this.seed = 1 + Math.floor(Math.random() * 2 ** 31);
  }

  choose(key: string, index: number) {
    this.picks.set(key, index);
    this.choosing = null;
    this.saved = null;
  }

  async find() {
    const text = this.text.trim();
    if (!text) return;
    this.#controller?.abort();
    const controller = new AbortController();
    this.#controller = controller;

    this.query = text;
    this.name = text.slice(0, 100);
    this.words = [];
    this.breaks = new Set();
    this.spans.clear();
    this.picks.clear();
    this.seed = 0;
    this.saved = null;
    this.problem = null;
    this.progress = { done: 0, total: 0 };
    this.searching = true;

    try {
      await api.match(
        text,
        (event) => {
          if (controller.signal.aborted) return;
          if (event.type === 'words') {
            this.words = event.words;
            this.breaks = new Set(event.breaks);
          }
          else if (event.type === 'span') this.spans.set(`${event.i}:${event.j}`, event.tracks);
          else if (event.type === 'progress') this.progress = { done: event.done, total: event.total };
          else if (event.type === 'error' && event.code === 'login') this.#loggedOut();
          else if (event.type === 'done' && event.failed) this.problem = 'problem.partial';
        },
        controller.signal,
      );
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err instanceof api.LoginRequired) this.#loggedOut();
      else if (err instanceof api.Offline) this.problem = 'problem.offline';
      else this.problem = 'problem.server';
    } finally {
      if (this.#controller === controller) this.searching = false;
    }
  }

  async save() {
    const uris = this.segments.filter((s) => s.tracks.length).map((s) => s.tracks[s.pick].uri);
    if (!uris.length || this.saving) return;
    this.saving = true;
    this.problem = null;
    try {
      this.saved = await api.createPlaylist({ name: this.name.trim() || this.query.slice(0, 100), public: this.public, uris });
    } catch (err) {
      if (err instanceof api.LoginRequired) this.#loggedOut();
      else if (err instanceof api.Offline) this.problem = 'problem.offlineSave';
      else this.problem = 'problem.saveFailed';
    } finally {
      this.saving = false;
    }
  }

  async logout() {
    this.#controller?.abort();
    await api.logout().catch(() => {});
    this.#loggedOut();
    this.notice = null;
  }

  #loggedOut() {
    this.user = null;
    this.status = 'out';
    this.notice = 'notice.expired';
  }
}

export const app = new App();
