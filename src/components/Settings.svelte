<script lang="ts">
  // Settings: General first, as in every app (Language, Theme), in Folio's shared sheet. A pick
  // that changes what's on screen applies under themeShift's blur, like Cantina's; the first run
  // and a pick that changes nothing on screen apply at once.
  import '../../vendor/ewo/elements/sheet.js';
  import '../../vendor/ewo/elements/settings-basics.js';
  import { themeShift } from '../../vendor/ewo/elements/theme-shift.js';
  import { app } from '../lib/state.svelte';
  import { prefs, resolveTheme, type LanguagePref, type ThemePref } from '../lib/prefs.svelte';
  import { locale, resolveLocale, t } from '../lib/i18n/index.svelte';

  const close = () => (app.settingsOpen = false);

  function pickLanguage(value: LanguagePref) {
    if (value === prefs.language) return;
    // <html lang> is set here too, not only by i18n's effect, so Folio's elements switch their
    // words under the same blur.
    const apply = () => {
      prefs.setLanguage(value);
      document.documentElement.lang = resolveLocale(value);
    };
    if (resolveLocale(value) !== locale()) themeShift(apply);
    else apply();
  }

  function pickTheme(value: ThemePref) {
    if (value === prefs.theme) return;
    const apply = () => prefs.setTheme(value);
    if (resolveTheme(value) !== resolveTheme(prefs.theme)) themeShift(apply);
    else apply();
  }
</script>

<ewo-sheet open={app.settingsOpen} label={t('settings.title')} oncancel={close} onclose={close}>
  <span slot="heading">{t('settings.title')}</span>
  <section>
    <h3 class="label">{t('settings.general')}</h3>
    <!-- Its words follow <html lang>, the same in every app. -->
    <ewo-settings-basics
      language={prefs.language}
      theme={prefs.theme}
      onlanguage-change={(e) => pickLanguage(e.detail.value)}
      ontheme-change={(e) => pickTheme(e.detail.value)}
    ></ewo-settings-basics>
  </section>
</ewo-sheet>

<style>
  section {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 4px 0 22px;
  }
  .label {
    margin: 0;
    font-family: var(--ewo-mono);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--ewo-fg-3);
  }
</style>
