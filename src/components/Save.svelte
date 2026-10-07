<script lang="ts">
  import { ExternalLink, Share } from '@lucide/svelte';
  import '../../vendor/ewo/elements/switch.js';
  import { app } from '../lib/state.svelte';
  import { t, tn } from '../lib/i18n/index.svelte';

  const songs = $derived(app.segments.filter((s) => s.tracks.length).length);
  const gaps = $derived(app.segments.length - songs);
  let copied = $state(false);

  async function share() {
    if (!app.saved) return;
    const url = app.saved.url;
    if (navigator.share) {
      await navigator.share({ title: app.name, url }).catch(() => {});
      return;
    }
    await navigator.clipboard?.writeText(url).catch(() => {});
    copied = true;
    setTimeout(() => (copied = false), 1800);
  }
</script>

{#if app.words.length}
  <section class="save" aria-label={t('save.label')}>
    {#if app.saved}
      <p class="done">{t(app.saved.public ? 'save.done' : 'save.donePrivate')}</p>
      <div class="actions">
        <a class="primary" href={app.saved.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={18} /> {t('save.open')}</a>
        <button class="quiet" onclick={share}><Share size={18} /> {copied ? t('save.copied') : t('save.share')}</button>
      </div>
    {:else}
      <label class="name">
        <span>{t('save.name')}</span>
        <input bind:value={app.name} maxlength="100" autocomplete="off" enterkeyhint="done" />
      </label>
      <div class="actions">
        <ewo-switch checked={app.public} onchange={(e) => (app.public = e.detail.checked)}>{t('save.public')}</ewo-switch>
        <button class="primary" disabled={app.searching || !songs || app.saving} onclick={() => app.save()}>
          {app.saving ? t('save.creating') : app.searching ? t('playlist.searching') : t('save.create')}
        </button>
      </div>
      {#if gaps && !app.searching}
        <p class="note">{tn('save.gaps', gaps)}</p>
      {/if}
    {/if}
    {#if app.problem}<p class="problem" role="alert">{t(app.problem)}</p>{/if}
  </section>
{/if}

<style>
  .save {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-top: 20px;
    padding: 20px 0 calc(40px + env(safe-area-inset-bottom));
    border-top: 1px solid var(--ewo-line-2);
  }
  .name {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .name span {
    color: var(--ewo-fg-3);
    font-size: var(--ewo-text-sm);
    font-weight: 500;
  }
  input {
    width: 100%;
    min-height: 48px;
    padding: 0 14px;
    border: 1px solid var(--ewo-line);
    border-radius: var(--ewo-r-sm);
    background: var(--ewo-bg-raised);
    font-size: 1rem;
  }
  input:focus {
    border-color: var(--ewo-line-strong);
    outline: none;
  }
  .actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }
  .actions .primary {
    margin-left: auto;
  }
  ewo-switch {
    font-size: 1rem;
  }
  .done {
    margin: 0;
    font-weight: 500;
  }
  .note,
  .problem {
    margin: 0;
    color: var(--ewo-fg-3);
    font-size: var(--ewo-text-md);
    line-height: 1.5;
  }
  .problem {
    color: var(--ewo-bad);
  }
</style>
