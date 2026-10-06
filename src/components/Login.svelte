<script lang="ts">
  import { app } from '../lib/state.svelte';
</script>

<main class="login">
  <img class="logo" src="/icon.svg" alt="" width="64" height="64" />
  <h1 class="mark">Verso</h1>
  <p class="line">Messages spelled in song titles.</p>
  <a class="primary" href="/auth/login">Log in with Spotify</a>
  {#if app.notice}<p class="notice" role="status">{app.notice}</p>{/if}
  {#if !app.configured}<p class="notice">Set SPOTIFY_CLIENT_ID on the server first, or run <code>npm run mock</code>.</p>{/if}
</main>

<style>
  .login {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: var(--gutter);
    padding-bottom: calc(var(--gutter) + 10vh);
    text-align: center;
  }
  .logo {
    display: block;
    margin-bottom: 6px;
    border-radius: 15px;
  }
  .mark {
    margin: 0;
    font-family: var(--ewo-serif);
    font-weight: 400;
    font-style: italic;
    font-size: clamp(3rem, 2rem + 6vw, 4.5rem);
    letter-spacing: -0.03em;
    line-height: 1;
  }
  .line {
    margin: 0 0 18px;
    color: var(--ewo-fg-2);
  }
  .notice {
    max-width: 34ch;
    margin: 6px 0 0;
    color: var(--ewo-fg-2);
    font-size: var(--ewo-text-md);
    line-height: 1.5;
  }
  code {
    font-family: var(--ewo-mono);
    font-size: 0.92em;
  }
</style>
