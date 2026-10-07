<script lang="ts">
  import { flip } from 'svelte/animate';
  import { fade } from 'svelte/transition';
  import { Shuffle } from '@lucide/svelte';
  import '../../vendor/ewo/elements/segmented.js';
  import { app } from '../lib/state.svelte';
  import { t, tn } from '../lib/i18n/index.svelte';
  import type { Mode } from '../lib/segment';

  const songs = $derived(app.segments.filter((s) => s.tracks.length));
  const minutes = $derived(Math.round(songs.reduce((sum, s) => sum + (s.tracks[s.pick].ms ?? 0), 0) / 60_000));
  const modes = $derived([
    { value: 'fewer', label: t('playlist.fewer') },
    { value: 'balanced', label: t('playlist.mixed') },
    { value: 'more', label: t('playlist.more') },
  ]);
  const share = $derived(app.progress.total ? app.progress.done / app.progress.total : 0);
</script>

{#if app.words.length}
  <section class="playlist" aria-label={t('playlist.label')} aria-busy={app.searching}>
    <div class="toolbar">
      <p class="count">
        {tn('playlist.songs', songs.length)}{#if minutes}<span class="dot"> · </span>{t('playlist.minutes', { minutes })}{/if}
      </p>
      <ewo-segmented size="sm" label={t('playlist.length')} value={app.mode} options={modes} onchange={(e) => app.setMode(e.detail.value as Mode)}></ewo-segmented>
      <button class="icon" aria-label={t('playlist.shuffle')} title={t('playlist.shuffle')} onclick={() => app.shuffle()} disabled={!songs.length}>
        <Shuffle size={18} />
      </button>
    </div>
    <div class="progress" class:running={app.searching} style:--share={share} aria-hidden="true"></div>

    <ol>
      {#each app.segments as s (s.key)}
        <li animate:flip={{ duration: 260 }} in:fade={{ duration: 180 }}>
          {#if s.tracks.length}
            {@const song = s.tracks[s.pick]}
            {@const more = s.tracks.length - 1}
            {@const track = t('playlist.track', { title: song.name, artists: song.artists.join(', ') })}
            <button
              class="row"
              onclick={() => (app.choosing = s.key)}
              disabled={!more}
              aria-label={more ? tn('playlist.alternatives', more, { track }) : track}
            >
              {#if song.image}<img src={song.image} alt="" width="48" height="48" loading="lazy" />{:else}<span class="cover"></span>{/if}
              <span class="text">
                <span class="title">
                  {#if song.base && song.name.startsWith(song.base)}{song.base}<span class="version">{song.name.slice(song.base.length)}</span>{:else}{song.name}{/if}
                </span>
                <span class="sub">{#if song.explicit}<span class="explicit" aria-label={t('playlist.explicit')}>E</span>{/if}{song.artists.join(', ')}</span>
              </span>
              {#if more}<span class="more" aria-hidden="true">+{more}</span>{/if}
            </button>
          {:else}
            <div class="row gap" class:pending={app.searching}>
              <span class="cover"></span>
              <span class="text">
                <span class="title">{app.words[s.i]}</span>
                <span class="sub">{app.searching ? t('playlist.searching') : t('playlist.gap')}</span>
              </span>
            </div>
          {/if}
        </li>
      {/each}
    </ol>
  </section>
{/if}

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 12px;
  }
  .count {
    margin: 0 auto 0 0;
    color: var(--ewo-fg-3);
    font-family: var(--ewo-mono);
    font-size: var(--ewo-text-xs);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .icon {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 50%;
    background: var(--ewo-fill-2);
    color: var(--ewo-fg-2);
    transition: transform 160ms var(--ewo-ease);
  }
  .icon:active {
    transform: rotate(-20deg) scale(0.94);
  }
  .icon:disabled {
    opacity: 0.4;
  }

  /* A hairline that fills while Spotify is searched, then fades. */
  .progress {
    height: 1px;
    background: var(--ewo-line-2);
    position: relative;
    overflow: hidden;
  }
  .progress::after {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--ewo-fg-2);
    transform-origin: left;
    transform: scaleX(var(--share));
    opacity: 0;
    transition:
      transform 300ms var(--ewo-ease),
      opacity 600ms var(--ewo-ease);
  }
  .progress.running::after {
    opacity: 1;
  }

  ol {
    list-style: none;
    margin: 0;
    padding: 8px 0 0;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    min-height: 64px;
    padding: 8px 0;
    border: 0;
    background: none;
    text-align: left;
  }
  button.row:disabled {
    cursor: default;
  }
  button.row:not(:disabled):active {
    opacity: 0.7;
  }
  img,
  .cover {
    flex: none;
    width: 48px;
    height: 48px;
    border-radius: 4px;
    object-fit: cover;
    background: var(--ewo-fill-2);
  }
  .text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .title,
  .sub {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .title {
    font-size: 1.0625rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .version {
    color: var(--ewo-fg-3);
    font-weight: 400;
  }
  .sub {
    color: var(--ewo-fg-3);
    font-size: var(--ewo-text-md);
  }
  .explicit {
    display: inline-grid;
    place-items: center;
    width: 15px;
    height: 15px;
    margin-right: 6px;
    border-radius: 2px;
    background: var(--ewo-fg-3);
    color: var(--ewo-bg);
    font-size: 10px;
    font-weight: 700;
    vertical-align: 1px;
  }
  .more {
    flex: none;
    color: var(--ewo-fg-3);
    font-family: var(--ewo-mono);
    font-size: var(--ewo-text-xs);
    font-weight: 500;
  }
  .gap .cover {
    background: none;
    border: 1px dashed var(--ewo-line-strong);
  }
  .gap .title {
    color: var(--ewo-fg-3);
    font-weight: 500;
  }
  .gap.pending .cover {
    border-style: solid;
    border-color: transparent;
    background: var(--ewo-fill-2);
    animation: pulse 1.2s var(--ewo-ease-io) infinite alternate;
  }
  @keyframes pulse {
    to {
      opacity: 0.4;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .gap.pending .cover {
      animation: none;
    }
  }
</style>
