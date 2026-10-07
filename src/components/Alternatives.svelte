<script lang="ts">
  import { Check } from '@lucide/svelte';
  import '../../vendor/ewo/elements/sheet.js';
  import { app } from '../lib/state.svelte';
  import { t } from '../lib/i18n/index.svelte';

  // The sheet slides out for 260 ms after app.choosing clears, so it keeps the segment it opened
  // with until its close event; looked up by key, a new pick shows while it leaves.
  let shownKey = $state<string | null>(null);
  $effect(() => {
    if (app.choosing) shownKey = app.choosing;
  });
  const open = $derived(app.segments.some((s) => s.key === app.choosing));
  const shown = $derived(app.segments.find((s) => s.key === shownKey) ?? null);
  const phrase = $derived(shown ? app.words.slice(shown.i, shown.j).join(' ') : '');
  const close = () => (app.choosing = null);
  const closed = () => {
    shownKey = null;
    close();
  };
</script>

<ewo-sheet {open} label={t('alternatives.label', { phrase })} oncancel={close} onclose={closed}>
  <span slot="heading">{t('alternatives.heading', { phrase })}</span>
  {#if shown}
    <ul>
      {#each shown.tracks as song, k (song.id)}
        <li>
          <button class="option" aria-pressed={k === shown.pick} onclick={() => app.choose(shown.key, k)}>
            {#if song.image}<img src={song.image} alt="" width="44" height="44" loading="lazy" />{:else}<span class="cover"></span>{/if}
            <span class="text">
              <span class="title">{song.name}</span>
              <span class="sub">{song.artists.join(', ')}{#if song.album}{` · ${song.album}`}{/if}</span>
            </span>
            {#if k === shown.pick}<Check size={18} />{/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</ewo-sheet>

<style>
  ul {
    list-style: none;
    margin: 0;
    padding: 0 0 8px;
  }
  .option {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 60px;
    padding: 8px;
    border: 0;
    border-radius: var(--ewo-r-sm);
    background: none;
    text-align: left;
  }
  .option[aria-pressed='true'] {
    background: var(--ewo-fill-2);
  }
  .option:active {
    opacity: 0.7;
  }
  img,
  .cover {
    flex: none;
    width: 44px;
    height: 44px;
    border-radius: 4px;
    object-fit: cover;
    background: var(--ewo-fill-2);
  }
  .text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .title,
  .sub {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .title {
    font-weight: 600;
  }
  .sub {
    color: var(--ewo-fg-3);
    font-size: var(--ewo-text-md);
  }
</style>
