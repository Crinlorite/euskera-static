<script lang="ts">
  import { t, tf } from '../../i18n/ui';
  import MultipleChoice from './MultipleChoice.svelte';
  import FillInBlank from './FillInBlank.svelte';
  import Flashcards from './Flashcards.svelte';
  import MatchPairs from './MatchPairs.svelte';
  import { recordExerciseResult, recordLessonRead, recordLessonCompleted, getProgress } from '../../stores/progress';
  import { GRADED_TYPES, lessonState, type LessonStateInfo } from '../../lib/lesson-state';
  import { haptic, requestReview } from '../../lib/platform';
  import { onMount, tick } from 'svelte';
  import type { LocaleCode } from '../../i18n/config';

  type ExerciseShape =
    | { type: 'multiple-choice'; id: string; prompt: string; options: string[]; answer: number; explanation?: string }
    | { type: 'fill-in-blank'; id: string; prompt: string; answers: string[]; explanation?: string }
    | { type: 'flashcards'; id: string; cards: Array<{ eu: string; es: string }> }
    | { type: 'match-pairs'; id: string; pairs: Array<{ eu: string; es: string }> };

  export let exercises: ExerciseShape[];
  export let lessonKey: string;
  export let locale: LocaleCode = 'es';
  /** Siguiente lección (o unidad) para el botón de la tarjeta de cierre. */
  export let nextHref: string | undefined = undefined;
  export let nextTitle: string | undefined = undefined;

  const allIds = exercises.map((e) => e.id);
  const gradedIds = exercises.filter((e) => GRADED_TYPES.has(e.type)).map((e) => e.id);
  // Solo los corregibles programan repaso; las flashcards nunca entran en la cola.
  const typeOf = new Map(exercises.map((e) => [e.id, e.type]));

  // Ejercicios ya resueltos en visitas anteriores → mejor nota guardada.
  // El store persiste attempts/bestScore por ejercicio desde siempre, pero la
  // UI arrancaba en blanco (queja de la 1ª reseña). onMount = solo cliente
  // (localStorage no existe en SSR). No restauramos la respuesta elegida (no
  // se guarda) sino un resumen "Resuelto · N%" con opción de repetir.
  // OJO: no se reasigna después del montaje; si cambiara, los ejercicios que el
  // usuario ha reabierto con «Repetir» volverían a mostrarse como resueltos.
  let restored: Record<string, number> = {};
  // Mejor nota conocida por ejercicio (restaurada + esta visita). Objeto y no
  // Map para que el recuento de la tarjeta sea reactivo.
  let scores: Record<string, number> = {};
  // Ejercicios con resultado (de antes o de hoy): cuando están todos, la
  // lección se completa. Antes había que rehacerlos todos en una misma visita.
  const finished = new Set<string>();
  let lessonDone = false;
  // Ya estaba completada al entrar: repetir no es un hito nuevo (ni reseña, ni
  // desplazamiento, ni animación de la tarjeta).
  let wasComplete = false;
  let info: LessonStateInfo | null = null;
  // Reintento de los fallados: subconjunto en pantalla, resultados de la ronda
  // y contador que remonta los ejercicios limpios en cada ronda.
  let retryIds: string[] = [];
  let roundDone = new Set<string>();
  let round = 0;
  let sectionEl: HTMLElement | undefined;
  let hintEl: HTMLElement | undefined;
  let cardEl: HTMLElement | undefined;
  let fresh = false;

  $: visible = retryIds.length ? exercises.filter((e) => retryIds.includes(e.id)) : exercises;
  $: correct = gradedIds.filter((id) => scores[id] === 100).length;
  // Mientras quedan fallados de la ronda por responder no se ofrece otra.
  $: inRound = retryIds.length > 0 && roundDone.size < retryIds.length;

  const prefersReduced = () =>
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Estado de la lección recalculado sobre el store (mismo cálculo que la barra lateral). */
  function refreshInfo() {
    info = lessonState(getProgress().lessons[lessonKey], allIds, gradedIds);
  }

  onMount(() => {
    recordLessonRead(lessonKey);
    const saved = getProgress().lessons[lessonKey]?.exercises ?? {};
    const map: Record<string, number> = {};
    for (const ex of exercises) {
      const r = saved[ex.id];
      if (r && r.attempts > 0) {
        map[ex.id] = r.bestScore;
        finished.add(ex.id);
      }
    }
    restored = map;
    scores = { ...map };
    lessonDone = finished.size === exercises.length;
    wasComplete = lessonDone;
    // Todos intentados pero sin marcar (se perdió la última escritura con el
    // guardado antiguo): se completa ya, sin celebrarlo como nuevo.
    if (lessonDone && getProgress().lessons[lessonKey]?.status !== 'completed') recordLessonCompleted(lessonKey);
    refreshInfo();
  });

  function onResult(event: CustomEvent<{ exerciseId: string; score: number; finished: boolean }>) {
    const { exerciseId, score, finished: fin } = event.detail;
    haptic(score === 100 ? 'success' : score === 0 ? 'error' : 'light');
    // El reintento pasa por el MISMO registro: sube attempts y bestScore = máx.;
    // completedAt no se mueve.
    recordExerciseResult(lessonKey, exerciseId, score, GRADED_TYPES.has(typeOf.get(exerciseId) ?? ''));
    scores = { ...scores, [exerciseId]: Math.max(scores[exerciseId] ?? 0, score) };
    if (fin) finished.add(exerciseId);
    if (retryIds.length) roundDone = new Set(roundDone).add(exerciseId);
    if (!lessonDone && finished.size === exercises.length) {
      lessonDone = true;
      recordLessonCompleted(lessonKey);
      if (!wasComplete) {
        wasComplete = true;
        fresh = true;
        // Momento feliz: lección terminada. Solo se REPORTA el resultado; el
        // gate nativo decide (≥80 % y solo 3.ª/10.ª/25.ª buena lección).
        const good = exercises.filter((e) => (scores[e.id] ?? 0) >= 80).length;
        requestReview(good, exercises.length);
        tick().then(() => cardEl?.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth', block: 'nearest' }));
      }
    }
    refreshInfo();
    if (retryIds.length && roundDone.size >= retryIds.length && info?.state === 'perfect') haptic('success');
  }

  /** Remonta, limpios, solo los corregibles que aún no se han acertado. */
  function startRetry() {
    if (!info || !info.toReview.length) return;
    retryIds = [...info.toReview];
    roundDone = new Set();
    round += 1;
    // El botón desaparece durante la ronda: el foco pasa al aviso de arriba.
    tick().then(() => {
      hintEl?.focus({ preventScroll: true });
      sectionEl?.scrollIntoView({ block: 'start', behavior: prefersReduced() ? 'auto' : 'smooth' });
    });
  }
</script>

<section class="exercises" bind:this={sectionEl}>
  <h2>{t(locale, 'lesson.exercises')}</h2>
  {#if inRound}<p class="retry-hint" tabindex="-1" bind:this={hintEl}>{t(locale, 'lesson.retry.hint')}</p>{/if}
  {#each visible as ex (ex.id)}
    {#key round}
      {#if ex.type === 'multiple-choice'}
        <MultipleChoice
          id={ex.id}
          prompt={ex.prompt}
          options={ex.options}
          answer={ex.answer}
          explanation={ex.explanation}
          restoredScore={round > 0 ? null : (restored[ex.id] ?? null)}
          {locale}
          on:result={onResult}
        />
      {:else if ex.type === 'fill-in-blank'}
        <FillInBlank
          id={ex.id}
          prompt={ex.prompt}
          answers={ex.answers}
          explanation={ex.explanation}
          restoredScore={round > 0 ? null : (restored[ex.id] ?? null)}
          {locale}
          on:result={onResult}
        />
      {:else if ex.type === 'flashcards'}
        <Flashcards id={ex.id} cards={ex.cards} restoredScore={round > 0 ? null : (restored[ex.id] ?? null)} {locale} on:result={onResult} />
      {:else if ex.type === 'match-pairs'}
        <MatchPairs id={ex.id} pairs={ex.pairs} restoredScore={round > 0 ? null : (restored[ex.id] ?? null)} {locale} on:result={onResult} />
      {/if}
    {/key}
  {/each}
  {#if lessonDone && info}
    <div class="done-card" class:perfect={info.state === 'perfect'} class:fresh role="status" aria-live="polite" bind:this={cardEl}>
      <p class="done-title">
        <span class="ls" data-state={info.state} aria-hidden="true"></span>
        <span>{t(locale, 'lesson.completed')}</span>
        {#if info.state === 'perfect'}<span class="done-badge">{t(locale, 'lesson.state.perfect')}</span>{/if}
      </p>
      {#if gradedIds.length}<p class="done-score">{tf(locale, 'lesson.summary.correct', correct, gradedIds.length)}</p>{/if}
      <div class="done-actions">
        {#if info.toReview.length && !inRound}
          <button class="btn btn-primary" type="button" on:click={startRetry}>{tf(locale, 'lesson.retry', info.toReview.length)}</button>
        {/if}
        {#if nextHref}
          <a class="btn {info.toReview.length && !inRound ? 'btn-secondary' : 'btn-primary'}" href={nextHref}>{t(locale, 'lesson.next')}{nextTitle ? ` · ${nextTitle}` : ''}</a>
        {/if}
      </div>
    </div>
  {/if}
</section>

<style>
  .exercises {
    margin-block: var(--s-7);
    /* Que la cabecera fija no tape el inicio al desplazarse para el reintento. */
    scroll-margin-block-start: calc(var(--beta-banner-h, 0px) + 5rem);
  }
  .exercises h2 { margin-block-end: var(--s-4); }
  .retry-hint { color: var(--c-text-muted); margin: 0 0 var(--s-3); }
  .retry-hint:focus { outline: none; }

  /* Tarjeta de cierre: neutra si queda algo por repasar (nunca roja ni ámbar),
     verde cuando todo está bien. */
  .done-card {
    margin-block-start: var(--s-5);
    padding: var(--s-5);
    display: grid;
    gap: var(--s-3);
    border: 1px solid var(--c-border);
    border-radius: var(--r-lg);
    background: var(--c-bg-alt);
    transition: background-color var(--m-base) var(--ease-out), border-color var(--m-base) var(--ease-out);
  }
  .done-card.perfect { border-color: var(--c-green); background: var(--c-green-soft); }
  .done-card.fresh { animation: done-in var(--m-slow) var(--ease-out); }
  .done-title { margin: 0; font-weight: 700; display: flex; align-items: center; gap: var(--s-2); flex-wrap: wrap; }
  .done-badge {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: var(--tr-wide);
    padding: 2px 10px;
    border-radius: var(--r-pill);
    background: var(--c-green);
    color: #fff;
  }
  .done-score { margin: 0; color: var(--c-text-muted); }
  .done-actions { display: flex; gap: var(--s-3); flex-wrap: wrap; }
  .done-actions .btn { text-decoration: none; }
  @keyframes done-in {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .done-card { transition: none; }
    .done-card.fresh { animation: none; }
  }
</style>
