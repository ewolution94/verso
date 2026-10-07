# Verso

Type a message, get a Spotify playlist whose song titles, read top to bottom, spell it out.

## How it works

1. **Login first.** Spotify's authorization code flow with PKCE, run on the server
   (`server/api.mjs`): only the client ID is needed, no secret, and the tokens stay on the server.
   The browser holds an HttpOnly session cookie; the SQLite file stores a SHA-256 of it.
2. **Matching** (`server/match.mjs`). The message is split into words (`server/words.mjs`), and
   runs of up to 8 words are searched. A title says a phrase when it equals it after case, accents,
   apostrophes and punctuation are ignored (tier 0), or does so without its version suffix, as in
   "Thank You - Remastered 2011" (tier 1). Clean titles rank before ones with stray marks ("\"And\"").
   - Words are searched as `"word"` (up to 4 pages), phrases as `"phrase"`, then `track:"phrase"`.
   - A run is only extended when a title in its results contains it word for word.
   - Every title that comes back counts for every run of the message it says, whichever search
     found it.
   - Every phrase is cached for 30 days, shared by all users.
   Matches stream to the browser as server-sent events while the search runs; an 11-word message
   takes about 8–10 s uncached.
3. **Cutting** (`src/lib/segment.ts`). A dynamic program picks the cheapest cover of the message:
   *Fewer* (fewest songs), *Mixed* (two- and three-word titles) or *More* (one word per song).
   Running a title across a comma or full stop costs extra; a word no song says becomes a gap and is
   left out. *Shuffle* bends near-equal choices; tapping a song lists the others with that title.
4. **Saving.** `POST /me/playlists`, then `POST /playlists/{id}/items`. Public by default.
5. **Settings** (the sliders in the header, as in every ewolution app): Language (System, Deutsch,
   English) and Theme (System, Light, Dark), stored in this browser (`verso:settings`) and applied
   under Folio's `themeShift` blur. `public/boot.js` sets a stored theme before first paint. Verso's
   own texts are in `src/lib/i18n` (English is the source, German is typed against it); song titles
   are Spotify's and stay as they are.

### Spotify's development mode (as of February 2026)

- The app owner needs **Spotify Premium**, or the app stops working.
- **At most 5 users**, added by hand under the app's *User Management*. Anyone else can't log in
  (the login lands on `/?login=not-allowed`). Extended quota is only for registered companies.
- Search returns at most **10 results per page** (`track:` filters only 5), and `total` and `next`
  are noise. `market=from_token` needs the `user-read-private` scope, so the market is fixed
  (`VERSO_MARKET`, default `DE`).
- Redirect URIs must be HTTPS, or `http://127.0.0.1:<port>`: `localhost` is refused.

## Run it

```bash
npm install
npm run mock      # a stand-in Spotify (server/mock.mjs), no account needed
npm run dev       # the real one: needs .env.local with SPOTIFY_CLIENT_ID=…
npm test
npm run check
```

Both serve http://127.0.0.1:5600. For `npm run dev`, the Spotify app needs the redirect URI
`http://127.0.0.1:5600/auth/callback`.

Production: `npm run build && SPOTIFY_CLIENT_ID=… VERSO_ORIGIN=https://… npm start`.

## Deploy (NAS)

A push to `release` is the deploy: CI (`.github/workflows/docker-publish.yml`) runs the checks, then
publishes `ghcr.io/ewolution94/verso:latest` for amd64 and arm64, and the NAS's Watchtower pulls it
into the stack from `deploy/portainer-stack.yml` (port 5900, a named volume for `/data`, the shared
`ewolution` network for Census). `main` stays behind on purpose.

The Spotify app (developer.spotify.com/dashboard) needs:

- the redirect URIs `https://verso.ewolution.cloud/auth/callback` and, for development,
  `http://127.0.0.1:5600/auth/callback`;
- every friend who should use it under *User Management* (their Spotify account's email; five
  accounts at most in development mode).

| Variable | |
|---|---|
| `SPOTIFY_CLIENT_ID` | the Spotify app's client ID |
| `VERSO_ORIGIN` | the public origin; `<origin>/auth/callback` must be one of the app's redirect URIs |
| `VERSO_MARKET` | the country whose catalogue is searched (default `DE`) |
| `VERSO_DATA` | folder for `verso.db` (sessions, search cache); default `./data` |
| `VERSO_CENSUS` | Census's ingest origin for visit counts (`http://census:4901` on the NAS); off when empty |
| `VERSO_MOCK=1` | the stand-in Spotify, with its data in the temp folder |
| `PORT`, `HOST` | default `0.0.0.0:8080` |

## Layout

```
server/
  server.mjs   static files, security headers, /healthz, shutdown
  api.mjs      routes: /auth/login, /auth/callback, /auth/logout, /api/me, /api/match, /api/playlists
  spotify.mjs  accounts + Web API client: one queue, 429 back-off, PKCE
  match.mjs    which phrases to look up, and the exact-title filter
  words.mjs    normalisation and tokenising
  store.mjs    node:sqlite: sessions and the search cache
  census.mjs   forwards /_e and /_e.js to Census (visit counts without cookies)
  mock.mjs     the stand-in Spotify for `npm run mock` and the tests
src/
  lib/segment.ts      cutting the message into songs
  lib/state.svelte.ts app state
  lib/i18n/           en.ts (the source), de.ts, t() and tn()
  lib/prefs.svelte.ts language and theme, stored in this browser
  components/         Login, Header, Composer, Playlist, Alternatives and Settings (sheets), Save
public/sw.js   the offline shell (never touches /auth/ or /api/)
public/boot.js the stored theme, before first paint
brand/         the app icon, from development/plans/app-icons (the Field set)
deploy/        the Portainer stack
vendor/ewo/    Folio's tokens and elements (vendored, don't edit)
```
