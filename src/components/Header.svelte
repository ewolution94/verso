<script lang="ts">
  import '../../vendor/ewo/elements/settings-button.js';
  import { app } from '../lib/state.svelte';
  import { t } from '../lib/i18n/index.svelte';

  let open = $state(false);
  let menu: HTMLElement | undefined = $state();
  const initial = $derived((app.user?.name ?? '?').trim().charAt(0).toUpperCase());

  function outside(event: MouseEvent) {
    if (open && menu && !menu.contains(event.target as Node)) open = false;
  }
</script>

<svelte:window onclick={outside} onkeydown={(e) => e.key === 'Escape' && (open = false)} />

<header class="bar">
  <div class="inner">
    <img class="logo" src="/icon.svg" alt="" width="28" height="28" />
    <span class="mark">Verso</span>
    {#if app.user?.mock}<span class="mock" title={t('header.mockTitle')}>{t('header.mock')}</span>{/if}
    <!-- The element is a real <button> inside (keys and role included); Svelte can't see into it. -->
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <ewo-settings-button class="settings" onclick={() => (app.settingsOpen = true)}></ewo-settings-button>
    <div class="me" bind:this={menu}>
      <button class="avatar" aria-label={t('header.account')} aria-haspopup="menu" aria-expanded={open} onclick={() => (open = !open)}>{initial}</button>
      {#if open}
        <div class="menu" role="menu">
          <p class="who">{app.user?.name}</p>
          <button role="menuitem" onclick={() => app.logout()}>{t('header.logout')}</button>
        </div>
      {/if}
    </div>
  </div>
</header>

<style>
  .bar {
    position: sticky;
    top: 0;
    z-index: 10;
    padding-top: env(safe-area-inset-top);
    background: color-mix(in srgb, var(--ewo-bg) 82%, transparent);
    backdrop-filter: blur(16px) saturate(1.4);
    -webkit-backdrop-filter: blur(16px) saturate(1.4);
    border-bottom: 1px solid var(--ewo-line-2);
  }
  .inner {
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: var(--page);
    height: var(--bar-h);
    margin: 0 auto;
    padding: 0 var(--gutter);
  }
  .logo {
    display: block;
    border-radius: 7px;
  }
  .mark {
    font-family: var(--ewo-serif);
    font-style: italic;
    font-size: 1.375rem;
    letter-spacing: -0.02em;
  }
  .mock {
    padding: 2px 7px;
    border: 1px solid var(--ewo-line-strong);
    border-radius: var(--ewo-r-pill);
    color: var(--ewo-fg-2);
    font-family: var(--ewo-mono);
    font-size: var(--ewo-text-2xs);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .settings {
    margin-left: auto;
  }
  .me {
    position: relative;
  }
  .avatar {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 50%;
    background: var(--ewo-fill-3);
    font-weight: 600;
    font-size: var(--ewo-text-md);
  }
  .menu {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    min-width: 200px;
    padding: 6px;
    border: 1px solid var(--ewo-line);
    border-radius: var(--ewo-r-md);
    background: var(--ewo-bg-raised);
    box-shadow: var(--ewo-shadow);
  }
  .who {
    margin: 0;
    padding: 8px 10px 6px;
    color: var(--ewo-fg-3);
    font-size: var(--ewo-text-sm);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .menu button {
    display: block;
    width: 100%;
    min-height: 44px;
    padding: 0 10px;
    border: 0;
    border-radius: var(--ewo-r-sm);
    background: none;
    text-align: left;
    font-size: 1rem;
  }
  .menu button:hover {
    background: var(--ewo-fill-2);
  }
</style>
