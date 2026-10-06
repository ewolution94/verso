<script lang="ts">
  import { app } from './lib/state.svelte';
  import Login from './components/Login.svelte';
  import Header from './components/Header.svelte';
  import Composer from './components/Composer.svelte';
  import Playlist from './components/Playlist.svelte';
  import Save from './components/Save.svelte';
  import Alternatives from './components/Alternatives.svelte';

  void app.start();
</script>

{#if app.status === 'out'}
  <Login />
{:else if app.status === 'in'}
  <Header />
  <main class="page">
    <Composer />
    <Playlist />
    <Save />
  </main>
  <Alternatives />
{/if}

<style>
  .page {
    max-width: var(--page);
    margin: 0 auto;
    padding: 0 var(--gutter);
  }
</style>
