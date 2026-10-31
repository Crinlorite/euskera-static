<script lang="ts">
  import { onMount } from 'svelte';
  import { appStoreReviewUrl } from '../../lib/appstore';
  import {
    getProgress, exportHash, importHash, isStorageAvailable, unlockAchievements,
    type ProgressV1,
  } from '../../stores/progress';
  import { t, tf, tp } from '../../i18n/ui';
  import { shareProgress, canRequestReview, canCloudSync, isCloudSyncEnabled, setCloudSync, nativePlatform } from '../../lib/platform';
  import { URL_VALORAR_ANDROID } from '../../lib/migrar.mjs';
  import { countStates } from '../../lib/lesson-state';
  import { readIndex, type LessonIndex } from '../../lib/lesson-index';
  import { countDue, countGraduated, nextDueDate } from '../../lib/review';
  import { formatDayLong, todayKey } from '../../lib/dates';
  import type { LocaleCode } from '../../i18n/config';

  export let locale: LocaleCode;

  let progress: ProgressV1 | null = null;
  // Lecciones de los niveles abiertos del idioma: el índice embebido en la página
  // (LessonIndexData). Solo cuentan las que existen aquí, con el mismo cálculo
  // que la barra lateral (antes se contaba cualquier clave guardada como «empezada»).
  let index: LessonIndex = {};
  $: counts = progress ? countStates(progress.lessons, index) : null;
  // Repaso: lo que toca hoy y lo que ya salió de la cola, con el mismo índice.
  $: dueToday = progress ? countDue(progress, index, { kind: 'all' }, todayKey()) : 0;
  $: graduated = progress ? countGraduated(progress, index) : 0;
  // Sin pendientes: cuándo vuelve a tocar (la misma fecha que enseña /repaso/).
  $: nextDue = progress ? nextDueDate(progress, index, { kind: 'all' }, todayKey()) : '';
  // Los textos compuestos van aquí y no en el marcado: Svelte recorta el espacio
  // con que empieza un bloque {#if} (« · …» quedaría pegado).
  $: reviewLine = dueToday
    ? tf(locale, 'lesson.toreview', dueToday)
    : t(locale, 'review.empty') + (nextDue ? ` · ${tf(locale, 'review.next', formatDayLong(locale, nextDue))}` : '');
  let exportedHash = '';
  let importValue = '';
  let banner = '';
  let modalMode: 'none' | 'export' | 'import' = 'none';
  // Fila de valoración: solo si el binario nativo puede abrir su tienda
  // de verdad (misma versión que trae `requestReview`). Con el binario
  // viejo el enlace acabaría en una ficha web sin formulario → no se
  // muestra. En navegador tampoco. Se resuelve en cliente (onMount).
  let showRate = false;
  // Respaldo opcional en la nube DEL USUARIO. Apagado por defecto: el credo
  // promete que el progreso no sale del dispositivo, así que encenderlo es
  // una decisión suya y se puede revocar (al apagarlo el nativo borra la copia).
  let showSync = false;
  let syncOn = false;
  // Cada app valora en SU tienda. iOS: la del idioma del lector (sin país, Apple
  // manda a la de EE. UU.). Android: la ficha de Play, abierta por la tienda.
  let enAndroid = false;
  $: RATE_URL = enAndroid ? URL_VALORAR_ANDROID : appStoreReviewUrl(locale);

  onMount(async () => {
    showRate = canRequestReview();
    enAndroid = nativePlatform() === 'android';
    showSync = canCloudSync();
    syncOn = isCloudSyncEnabled();
    if (!isStorageAvailable()) {
      banner = t(locale, 'guest.banner');
    }
    index = readIndex();
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

  // Importar FUSIONA con lo que ya hay (solo puede añadir), así que no se pregunta
  // nada ni se descarta ninguna lección. Un código de una versión más nueva se
  // fusiona igual y solo se avisa.
  async function handleImport() {
    const result = await importHash(importValue);
    if (!result.ok) {
      banner = t(locale, 'progress.import.invalid');
      return;
    }
    banner = result.reason === 'outdated' ? t(locale, 'progress.import.outdated') : '✓';
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

{#if progress && counts}
  <section class="summary">
    <div class="card">
      <strong>{counts.completed}<small class="of">/{counts.total}</small></strong>
      <span>{tp(locale, 'progress.summary.completed', counts.completed)}</span>
    </div>
    <div class="card">
      <strong>{counts.perfect}</strong>
      <span>{t(locale, 'lesson.state.perfect')}</span>
    </div>
    <div class="card">
      <strong>{progress.streak.current}</strong>
      <span>{tp(locale, 'progress.streak.days', progress.streak.current)}</span>
    </div>
    <div class="card">
      <strong>{progress.streak.longest}</strong>
      <span>{t(locale, 'progress.summary.record')}</span>
    </div>
  </section>

  <section class="review-card">
    <div class="review-txt">
      <strong>{t(locale, 'review.title')}</strong>
      <span>{reviewLine}</span>
      {#if graduated}<span>{tp(locale, 'review.graduated', graduated)}</span>{/if}
    </div>
    <!-- Sin nada que repasar no se invita a repasar: solo un enlace a la página
         (allí sigue el refuerzo opcional). -->
    {#if dueToday}
      <a class="btn btn-primary" href={`/${locale}/repaso/`}>{t(locale, 'review.start')}</a>
    {:else}
      <a class="review-more" href={`/${locale}/repaso/`}>{t(locale, 'review.title')} <span class="icon-direction-aware" aria-hidden="true">→</span></a>
    {/if}
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

{#if showSync}
  <section class="sync">
    <div class="sync-txt">
      <strong>{t(locale, 'sync.title')}</strong>
      <span>{t(locale, 'sync.hint')}</span>
    </div>
    <button
      class="btn {syncOn ? 'btn-primary' : 'btn-secondary'}"
      aria-pressed={syncOn}
      on:click={() => { syncOn = !syncOn; setCloudSync(syncOn); }}
    >{syncOn ? t(locale, 'sync.on') : t(locale, 'sync.off')}</button>
  </section>
{/if}
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
  .sync {
    display: flex; align-items: center; justify-content: space-between;
    gap: var(--s-4); flex-wrap: wrap;
    margin-block-start: var(--s-5); padding: var(--s-4) var(--s-5);
    border: 1px solid var(--c-border); border-radius: var(--r-lg);
    background: var(--c-bg-alt);
  }
  .sync-txt { display: grid; gap: 2px; max-inline-size: 46ch; }
  .sync-txt span { color: var(--c-text-muted); font-size: 0.9rem; }

  .rate {
    display: flex; align-items: center; justify-content: space-between;
    gap: var(--s-4); flex-wrap: wrap;
    margin-block-start: var(--s-5); padding: var(--s-4) var(--s-5);
    border: 1px solid var(--c-border); border-radius: var(--r-lg);
    background: var(--c-bg-alt);
  }
  .rate-txt { display: grid; gap: 2px; }

  /* Repaso: mismo aspecto que .sync/.rate; neutro aunque haya pendientes. */
  .review-card {
    display: flex; align-items: center; justify-content: space-between;
    gap: var(--s-4); flex-wrap: wrap;
    margin-block-end: var(--s-5); padding: var(--s-4) var(--s-5);
    border: 1px solid var(--c-border); border-radius: var(--r-lg);
    background: var(--c-bg-alt);
  }
  .review-txt { display: grid; gap: 2px; }
  .review-txt span { color: var(--c-text-muted); font-size: 0.9rem; }
  .review-card .btn { text-decoration: none; }
  .review-more { color: var(--c-text); font-weight: 600; text-underline-offset: 0.2em; }
  .review-more:hover { color: var(--c-red); }
  .review-more span { display: inline-block; }
  .rate-txt span { color: var(--c-text-muted); font-size: 0.9rem; }
  .rate .btn { text-decoration: none; font-size: 1.1rem; line-height: 1; }

  .banner { padding: var(--s-3) var(--s-4); background: var(--c-green-soft); color: var(--c-green-strong); border-radius: var(--r-md); margin-block-end: var(--s-4); }
  .summary { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: var(--s-3); margin-block-end: var(--s-5); }
  .summary .card { display: grid; gap: var(--s-1); text-align: center; }
  .summary strong { font-size: 2rem; }
  .summary span { color: var(--c-text-muted); font-size: 0.9rem; }
  /* «/65» junto a la cifra: pequeño y apagado. */
  .summary .of { font-size: 0.5em; font-weight: 500; color: var(--c-text-muted); margin-inline-start: 2px; }
  /* Mayúscula inicial sin claves nuevas (el span es ítem de grid: bloque). Neutro
     donde ya va en mayúscula (alemán) y en escrituras sin caja. */
  .summary span::first-letter { text-transform: uppercase; }
  .actions { display: flex; flex-wrap: wrap; gap: var(--s-3); margin-block: var(--s-4); }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100; }
  .modal { position: fixed; inset: 50% auto auto 50%; transform: translate(-50%, -50%); inline-size: min(90vw, 600px); padding: var(--s-5); border: 0; border-radius: var(--r-lg); z-index: 101; box-shadow: 0 12px 40px rgba(0,0,0,0.2); }
  .modal h3 { margin: 0 0 var(--s-3); }
  .modal textarea { inline-size: 100%; min-block-size: 140px; padding: var(--s-3); border: 1px solid var(--c-border); border-radius: var(--r-md); font-family: ui-monospace, monospace; font-size: 0.875rem; }
  .help { color: var(--c-text-muted); font-size: 0.9rem; }
</style>
