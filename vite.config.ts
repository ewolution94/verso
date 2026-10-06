import os from 'node:os';
import path from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
// @ts-expect-error plain ESM module shared with the production server
import { createApi } from './server/api.mjs';

const PORT = 5600;

// Mount the same API the production server uses, so dev and prod behave identically.
// SPOTIFY_CLIENT_ID comes from .env.local (not in git); `npm run mock` needs none.
function api(env: Record<string, string>): Plugin {
  const mock = env.VERSO_MOCK === '1';
  const handler = createApi({
    clientId: env.SPOTIFY_CLIENT_ID,
    origin: `http://127.0.0.1:${PORT}`,
    dataDir: mock ? path.join(os.tmpdir(), 'verso-mock') : path.resolve('data'),
    market: env.VERSO_MARKET || 'DE',
    mock,
  });
  return {
    name: 'verso-api',
    configureServer: (server) => void server.middlewares.use(handler),
  };
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env } as Record<string, string>;
  return {
    plugins: [svelte(), api(env)],
    server: { host: '127.0.0.1', port: PORT, strictPort: true },
    build: { target: 'es2022' },
  };
});
