// Sessions and the search cache, in one SQLite file.
//
// Sessions are keyed by a SHA-256 of the cookie value, so the file alone can't be turned back
// into a login cookie. The search cache is shared by every user: Spotify rate-limits the app as
// a whole, and a phrase looked up once ("you", "happy birthday") never needs asking again soon.

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DAY = 86_400_000;
export const SESSION_TTL = 90 * DAY;
export const SEARCH_TTL = 30 * DAY;
/** Bump when the cached item shape changes, so older rows are refetched. */
const SEARCH_REVISION = 2;

const hash = (value) => crypto.createHash('sha256').update(value).digest('base64url');

export function createStore(file) {
  if (file !== ':memory:') mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT,
      image TEXT,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      seen_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS searches (
      phrase TEXT PRIMARY KEY,
      revision INTEGER NOT NULL,
      total INTEGER NOT NULL,
      items TEXT NOT NULL,
      fetched_at INTEGER NOT NULL
    );
  `);

  const q = {
    getSession: db.prepare('SELECT * FROM sessions WHERE id = ?'),
    putSession: db.prepare(`INSERT OR REPLACE INTO sessions (id, user_id, name, image, access_token, refresh_token, expires_at, seen_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`),
    setTokens: db.prepare('UPDATE sessions SET access_token = ?, refresh_token = ?, expires_at = ? WHERE id = ?'),
    touch: db.prepare('UPDATE sessions SET seen_at = ? WHERE id = ?'),
    dropSession: db.prepare('DELETE FROM sessions WHERE id = ?'),
    pruneSessions: db.prepare('DELETE FROM sessions WHERE seen_at < ?'),
    getSearch: db.prepare('SELECT * FROM searches WHERE phrase = ?'),
    putSearch: db.prepare('INSERT OR REPLACE INTO searches (phrase, revision, total, items, fetched_at) VALUES (?, ?, ?, ?, ?)'),
    pruneSearches: db.prepare('DELETE FROM searches WHERE fetched_at < ? OR revision <> ?'),
  };

  q.pruneSessions.run(Date.now() - SESSION_TTL);
  q.pruneSearches.run(Date.now() - SEARCH_TTL, SEARCH_REVISION);

  return {
    /** Stores a new session and returns the cookie value for it. */
    createSession({ userId, name, image, accessToken, refreshToken, expiresAt }) {
      const cookie = crypto.randomBytes(32).toString('base64url');
      q.putSession.run(hash(cookie), userId, name ?? null, image ?? null, accessToken, refreshToken, expiresAt, Date.now());
      return cookie;
    },
    session(cookie) {
      if (!cookie) return null;
      const row = q.getSession.get(hash(cookie));
      if (!row || row.seen_at < Date.now() - SESSION_TTL) return null;
      if (row.seen_at < Date.now() - DAY) q.touch.run(Date.now(), row.id);
      return { ...row };
    },
    setTokens(id, { accessToken, refreshToken, expiresAt }) {
      q.setTokens.run(accessToken, refreshToken, expiresAt, id);
    },
    dropSession(cookie) {
      if (cookie) q.dropSession.run(hash(cookie));
    },
    search(phrase) {
      const row = q.getSearch.get(phrase);
      if (!row || row.revision !== SEARCH_REVISION || row.fetched_at < Date.now() - SEARCH_TTL) return null;
      return { total: row.total, items: JSON.parse(row.items) };
    },
    putSearch(phrase, { total, items }) {
      q.putSearch.run(phrase, SEARCH_REVISION, total, JSON.stringify(items), Date.now());
    },
    close: () => db.close(),
  };
}
