<script lang="ts">
  import { onMount } from 'svelte';
  import {
    getProgress, exportHash, importHash, isStorageAvailable, unlockAchievements,
    type ProgressV1,
  } from '../../stores/progress';
  import { t } from '../../i18n/ui';
  import { shareProgress, canRequestReview } from '../../lib/platform';
  import type { LocaleCode } from '../../i18n/config';

  export let locale: LocaleCode;
  export let knownLessonKeys: string[];

  let progress: ProgressV1 | null = null;
  let exportedHash = '';
  let importValue = '';
  let banner = '';
  let modalMode: 'none' | 'export' | 'import' = 'none';
  // Fila de valoración: solo si el binario nativo puede abrir la App Store
  // de verdad (misma versión que trae `requestReview`). Con el binario
  // viejo el enlace acabaría en una ficha web sin formulario → no se
  // muestra. En navegador tampoco. Se resuelve en cliente (onMount).
  let showRate = false;
  const RATE_URL = 'https://apps.apple.com/app/id6784369966?action=write-review';

  onMount(async () => {
    showRate = canRequestReview();
    if (!isStorageAvailable()) {
      banner = t(locale, 'guest.banner');
    }
    progress = getProgress();
    exportedHash = await exportHash(progress);
  });

  async function refresh() {
    progress = getProgress();
    exportedHash = await exportHash(progress);
  }

  async function copyHash() {
    if (typeof navigator === 'undefined') return;
    await navigator.clipboard.writeText(exportedHash);
    banner = t(locale, 'common.copy') + ' ✓';
    unlockAchievements(['first-export']);
  }

  function downloadHash() {
    unlockAchievements(['first-export']);
    const blob = new Blob([exportedHash], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `euskera-progreso-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function shareHash() {
    if (shareProgress(exportedHash)) return;
    unlockAchievements(['first-export']);
    if (typeof navigator !== 'undefined' && (navigator as Navigator & { share?: (data: { title?: string; text?: string }) => Promise<void> }).share) {
      try {
        await (navigator as Navigator & { share: (data: { title?: string; text?: string }) => Promise<void> }).share({
          title: 'Mi progreso de euskera',
          text: exportedHash,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      await copyHash();
    }
  }

  async function handleImport() {
    const known = new Set(knownLessonKeys);
    const existing = getProgress();
    const hasExisting = Object.keys(existing.lessons).length > 0;
    if (hasExisting && !confirm(t(locale, 'progress.import.overwrite'))) return;
    const result = await importHash(importValue, known);
    if (!result.ok) {
      banner = result.reason === 'outdated'
        ? t(locale, 'progress.import.outdated')
        : t(locale, 'progress.import.invalid');
      return;
    }
    if ((result.skippedLessonKeys?.length ?? 0) > 0) {
      banner = t(locale, 'progress.import.skipped');
    } else {
      banner = '✓';
    }
    unlockAchievements(['first-import']);
    importValue = '';
    modalMode = 'none';
    await refresh();
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { importValue = String(reader.result ?? ''); };
    reader.readAsText(file);
  }
</script>

{#if banner}
  <div class="banner" role="status">{banner}</div>
{/if}

{#if progress}
  <section class="summary">
    <div class="card">
      <strong>{Object.keys(progress.lessons).length}</strong>
      <span>{t(locale, 'progress.summary.lessons')}</span>
    </div>
    <div class="card">
      <strong>{progress.streak.current}</strong>
      <span>{t(locale, 'progress.streak.days')}</span>
    </div>
    <div class="card">
      <strong>{progress.streak.longest}</strong>
      <span>{t(locale, 'progress.summary.record')}</span>
    </div>
  </section>
{/if}

<section class="actions">
  <button class="btn btn-primary" on:click={() => (modalMode = 'export')}>
    📥 {t(locale, 'progress.export.title')}
  </button>
  <button class="btn btn-secondary" on:click={() => (modalMode = 'import')}>
    📤 {t(locale, 'progress.import.title')}
  </button>
</section>

{#if showRate}
  <!-- Sin clase .app-promo: esa la oculta `.is-native-app` y esta fila existe
       precisamente PARA la app. Sin mención a otras plataformas (2.3.10). -->
  <section class="rate">
    <div class="rate-txt">
      <strong>{t(locale, 'app.rate')}</strong>
      <span>{t(locale, 'app.rate.hint')}</span>
    </div>
    <a class="btn btn-secondary" href={RATE_URL} rel="noopener">★</a>
  </section>
{/if}

{#if modalMode === 'export'}
  <div class="modal-overlay" on:click={() => (modalMode = 'none')} role="presentation"></div>
  <dialog class="modal" open>
    <h3>{t(locale, 'progress.export.title')}</h3>
    <textarea readonly>{exportedHash}</textarea>
    <p class="help">{t(locale, 'progress.export.help')}</p>
    <div class="actions">
      <button class="btn btn-primary" on:click={copyHash}>📋 {t(locale, 'progress.export.copy')}</button>
      <button class="btn btn-secondary" on:click={downloadHash}>💾 {t(locale, 'progress.export.download')}</button>
      <button class="btn btn-secondary" on:click={shareHash}>📲 {t(locale, 'progress.export.share')}</button>
      <button class="btn btn-secondary" on:click={() => (modalMode = 'none')}>{t(locale, 'common.close')}</button>
    </div>
  </dialog>
{/if}

{#if modalMode === 'import'}
  <div class="modal-overlay" on:click={() => (modalMode = 'none')} role="presentation"></div>
  <dialog class="modal" open>
    <h3>{t(locale, 'progress.import.title')}</h3>
    <textarea
      bind:value={importValue}
      placeholder="P1.eJyrVkpJ…"
      on:dragover|preventDefault
      on:drop={onDrop}
    ></textarea>
    <div class="actions">
      <button class="btn btn-primary" on:click={handleImport} disabled={!importValue.trim()}>
        {t(locale, 'progress.import.do')}
      </button>
      <button class="btn btn-secondary" on:click={() => (modalMode = 'none')}>{t(locale, 'common.cancel')}</button>
    </div>
  </dialog>
{/if}

<style>
  .rate {
    display: flex; align-items: center; justify-content: space-between;
    gap: var(--s-4); flex-wrap: wrap;
    margin-block-start: var(--s-5); padding: var(--s-4) var(--s-5);
    border: 1px solid var(--c-border); border-radius: var(--r-lg);
    background: var(--c-bg-alt);
  }
  .rate-txt { display: grid; gap: 2px; }
  .rate-txt span { color: var(--c-text-muted); font-size: 0.9rem; }
  .rate .btn { text-decoration: none; font-size: 1.1rem; line-height: 1; }

  .banner { padding: var(--s-3) var(--s-4); background: var(--c-green-soft); color: var(--c-green-strong); border-radius: var(--r-md); margin-block-end: var(--s-4); }
  .summary { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: var(--s-3); margin-block-end: var(--s-5); }
  .summary .card { display: grid; gap: var(--s-1); text-align: center; }
  .summary strong { font-size: 2rem; }
  .summary span { color: var(--c-text-muted); font-size: 0.9rem; }
  .actions { display: flex; flex-wrap: wrap; gap: var(--s-3); margin-block: var(--s-4); }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100; }
  .modal { position: fixed; inset: 50% auto auto 50%; transform: translate(-50%, -50%); inline-size: min(90vw, 600px); padding: var(--s-5); border: 0; border-radius: var(--r-lg); z-index: 101; box-shadow: 0 12px 40px rgba(0,0,0,0.2); }
  .modal h3 { margin: 0 0 var(--s-3); }
  .modal textarea { inline-size: 100%; min-block-size: 140px; padding: var(--s-3); border: 1px solid var(--c-border); border-radius: var(--r-md); font-family: ui-monospace, monospace; font-size: 0.875rem; }
  .help { color: var(--c-text-muted); font-size: 0.9rem; }
</style>
