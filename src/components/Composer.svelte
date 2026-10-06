<script lang="ts">
  import { ArrowUp } from '@lucide/svelte';
  import { app } from '../lib/state.svelte';

  let field: HTMLTextAreaElement | undefined = $state();
  const changed = $derived(app.text.trim() !== app.query);

  /** Grows with the text (field-sizing isn't in every Safari yet). */
  function fit() {
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = `${field.scrollHeight}px`;
  }
  $effect(() => {
    void app.text;
    fit();
  });

  function submit(event?: Event) {
    event?.preventDefault();
    if (!app.text.trim()) return;
    // Put the keyboard away on the phone, so the playlist is what's on screen.
    if (matchMedia('(pointer: coarse)').matches) field?.blur();
    void app.find();
  }
</script>

<form class="composer" onsubmit={submit}>
  <label class="visually-hidden" for="message">Message</label>
  <textarea
    id="message"
    bind:this={field}
    value={app.text}
    oninput={(e) => app.setText(e.currentTarget.value.replace(/\n/g, ' '))}
    onkeydown={(e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) submit(e);
    }}
    rows="1"
    maxlength="160"
    placeholder="Type a message"
    enterkeyhint="go"
    autocomplete="off"
    spellcheck="false"
  ></textarea>
  <button class="go" type="submit" aria-label="Find songs" disabled={!app.text.trim() || (!changed && app.searching)}>
    <ArrowUp size={22} strokeWidth={2.25} />
  </button>
</form>

<style>
  .composer {
    display: flex;
    align-items: flex-end;
    gap: 12px;
    padding: 28px 0 20px;
  }
  textarea {
    flex: 1;
    min-width: 0;
    resize: none;
    overflow: hidden;
    padding: 0;
    border: 0;
    background: none;
    font-family: var(--ewo-serif);
    font-size: clamp(1.75rem, 1.4rem + 1.6vw, 2.25rem);
    line-height: 1.18;
    letter-spacing: -0.015em;
    outline: none;
  }
  textarea::placeholder {
    color: var(--ewo-fg-4);
  }
  .go {
    flex: none;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    margin-bottom: 2px;
    border: 0;
    border-radius: 50%;
    background: var(--ewo-invert);
    color: var(--ewo-invert-ink);
    transition: transform 160ms var(--ewo-ease), opacity 160ms var(--ewo-ease);
  }
  .go:active {
    transform: scale(0.94);
  }
  .go:disabled {
    opacity: 0.25;
    cursor: default;
  }
</style>
