// Production server: serves the built SPA from ../dist and the API (api.mjs). No dependencies.
//
//   PORT=8080 HOST=0.0.0.0 node server/server.mjs
//
// Environment:
//   PORT, HOST          where to listen (default 0.0.0.0:8080)
//   SPOTIFY_CLIENT_ID   the Spotify app's client ID (developer.spotify.com/dashboard)
//   VERSO_ORIGIN        the public origin, for the login redirect (default http://127.0.0.1:<PORT>);
//                       <origin>/auth/callback must be a redirect URI of the Spotify app
//   VERSO_DATA          folder for verso.db: sessions and the search cache (default <project>/data)
//   VERSO_MARKET        the country whose catalogue is searched (default DE)
//   VERSO_CENSUS        Census's ingest origin for visit counts, e.g. http://census:4901 (default: off)
//   VERSO_MOCK=1        a stand-in Spotify (server/mock.mjs), data in the temp folder

import http from 'node:http';
import os from 'node:os';
import { createReadStream } from 'node:fs';
import { stat, readFile } from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { createApi } from './api.mjs';
import { createCensus } from './census.mjs';

const portFlag = process.argv.indexOf('--port');
const PORT = Number(portFlag > -1 ? process.argv[portFlag + 1] : (process.env.PORT ?? 8080));
const HOST = process.env.HOST ?? '0.0.0.0';
const DIST = path.resolve(fileURLToPath(new URL('../dist', import.meta.url)));
const MOCK = process.env.VERSO_MOCK === '1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.webmanifest', '.svg', '.txt']);

export const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'cross-origin-opener-policy': 'same-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'content-security-policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    // Album covers come from Spotify's image CDN.
    "img-src 'self' data: blob: https://i.scdn.co",
    "font-src 'self' data:",
    "connect-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join('; '),
};

const api = createApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  origin: (process.env.VERSO_ORIGIN ?? `http://127.0.0.1:${PORT}`).replace(/\/$/, ''),
  dataDir: process.env.VERSO_DATA
    ? path.resolve(process.env.VERSO_DATA)
    : MOCK
      ? path.join(os.tmpdir(), 'verso-mock')
      : fileURLToPath(new URL('../data', import.meta.url)),
  market: process.env.VERSO_MARKET || 'DE',
  mock: MOCK,
});
const census = createCensus({ target: process.env.VERSO_CENSUS, site: 'verso' });
const compressed = new Map();

async function resolveFile(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const file = path.join(DIST, path.normalize(decoded));
  if (file !== DIST && !file.startsWith(DIST + path.sep)) return null;
  try {
    const info = await stat(file);
    if (info.isFile()) return { file, size: info.size, mtime: info.mtime };
  } catch {}
  return null;
}

async function serveStatic(req, res) {
  const { pathname } = new URL(req.url, 'http://localhost');
  let entry = await resolveFile(pathname);
  if (!entry && !path.extname(pathname)) entry = await resolveFile('/index.html');
  if (!entry) {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
    return;
  }

  const ext = path.extname(entry.file);
  const headers = {
    'content-type': MIME[ext] ?? 'application/octet-stream',
    'cache-control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    'last-modified': entry.mtime.toUTCString(),
  };

  const accept = req.headers['accept-encoding'] ?? '';
  const encoding = /\bbr\b/.test(accept) ? 'br' : /\bgzip\b/.test(accept) ? 'gzip' : null;
  if (encoding && COMPRESSIBLE.has(ext) && entry.size < 8 * 1024 * 1024) {
    const key = `${entry.file}:${entry.mtime.getTime()}:${encoding}`;
    let body = compressed.get(key);
    if (!body) {
      const raw = await readFile(entry.file);
      body = encoding === 'br' ? zlib.brotliCompressSync(raw) : zlib.gzipSync(raw);
      compressed.set(key, body);
    }
    res.writeHead(200, { ...headers, 'content-encoding': encoding, 'content-length': body.length, vary: 'accept-encoding' });
    res.end(req.method === 'HEAD' ? undefined : body);
    return;
  }

  res.writeHead(200, { ...headers, 'content-length': entry.size });
  if (req.method === 'HEAD') return res.end();
  createReadStream(entry.file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/healthz') return res.writeHead(200, { 'content-type': 'text/plain' }).end('ok');

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value);

  try {
    if (await census(req, res)) return;
    await api(req, res, async () => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405).end();
        return;
      }
      await serveStatic(req, res);
    });
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.writeHead(500).end('Internal error');
    else res.destroy();
  }
});

// Docker stops containers with SIGTERM, which Node ignores as PID 1 unless handled. Open match
// streams would hold server.close() open, so every connection is closed too.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    server.closeAllConnections();
    setTimeout(() => process.exit(0), 2000).unref();
  });
}

server.listen(PORT, HOST, () => {
  console.log(`Verso listening on http://${HOST === '0.0.0.0' ? '127.0.0.1' : HOST}:${PORT}${MOCK ? ' (mock Spotify)' : ''}`);
});
