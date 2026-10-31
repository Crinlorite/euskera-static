<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { t, tf } from '../../i18n/ui';
  import type { LocaleCode } from '../../i18n/config';
  import { getProgress, recordExerciseResult } from '../../stores/progress';
  import { formatDayLong, todayKey } from '../../lib/dates';
  import { readIndex, type LessonIndex } from '../../lib/lesson-index';
  import {
    buildReinforcement, buildReviewQueue, countDue, nextDueDate, scopeFromSearch, REINFORCE_THRESHOLD,
    type ReviewExercise, type ReviewItem, type ReviewScope, type ReviewUnitData,
  } from '../../lib/review';
  import { haptic } from '../../lib/platform';
  import MultipleChoice from '../exercises/MultipleChoice.svelte';
  import FillInBlank from '../exercises/FillInBlank.svelte';
  import MatchPairs from '../exercises/MatchPairs.svelte';

  // Sesión de repaso: lo vencido de la cola (src/lib/review.ts), uno a uno, con
  // los mismos componentes de la lección. El índice de lecciones va en la página
  // (LessonIndexData); el contenido de los ejercicios se pide por unidad al
  // empezar. Ámbito opcional con ?unit=<id> o ?lesson=<id>.

  export let locale: LocaleCode;

  type SessionItem = { lessonKey: string; title: string; href: string; ex: ReviewExercise; requeued: boolean };

  let phase: 'loading' | 'ready' | 'empty' | 'session' | 'done' | 'error' = 'loading';
  let index: LessonIndex = {};
  let scope: ReviewScope = { kind: 'all' };
  let queue: ReviewItem[] = [];
  let reinforcement: ReviewItem[] = [];
  let nextDue = '';
  // Ítems de la vuelta en curso; los fallados a la primera vuelven, una vez, al final.
  let items: SessionItem[] = [];
  let again: SessionItem[] = [];
  let i = 0;
  let step = 0;
  let answered = false;
  let firstTry = 0;
  let total = 0;
  // Cambia en cada ítem: remonta el componente aunque se repita el mismo ejercicio.
  let round = 0;
  let remaining = 0;
  // Lo último que se intentó empezar, para reintentar tras un fallo de red.
  let pending: ReviewItem[] | null = null;
  let exEl: HTMLElement | undefined;

  $: current = phase === 'session' ? items[i] : undefined;
  // Pendientes de esta sesión, contando el actual y los que volverán al final.
  $: planned = step + (items.length - i) + again.length;

  // Un JSON por unidad; se guarda la promesa para no pedirlo dos veces en la
  // misma visita (el service worker lo guarda además para usarlo sin conexión).
  const units = new Map<string, Promise<ReviewUnitData>>();
  function unitData(unitId: string): Promise<ReviewUnitData> {
    let req = units.get(unitId);
    if (!req) {
      req = fetch(`/${locale}/repaso/${encodeURIComponent(unitId)}.json`).then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<ReviewUnitData>;
      });
      req.catch(() => units.delete(unitId));
      units.set(unitId, req);
    }
    return req;
  }

  /** Recalcula la cola con lo guardado: al entrar y después de cada sesión. */
  function load() {
    const today = todayKey();
    const p = getProgress();
    queue = buildReviewQueue(p, index, scope, today);
    nextDue = nextDueDate(p, index, scope, today);
    reinforcement = queue.length < REINFORCE_THRESHOLD ? buildReinforcement(p, index, scope) : [];
    phase = queue.length ? 'ready' : 'empty';
  }

  onMount(() => {
    index = readIndex();
    scope = scopeFromSearch(location.search);
    load();
  });

  /**
   * Empieza con la cola o con el refuerzo: los dos se registran igual (un fallo
   * en el refuerzo devuelve el ejercicio a la cola).
   */
  async function start(list: ReviewItem[]) {
    if (!list.length) return;
    pending = list;
    phase = 'loading';
    const unitIds = [...new Set(list.map((it) => index[it.lessonKey]?.u).filter((u): u is string => !!u))];
    let found: SessionItem[];
    try {
      const data = await Promise.all(unitIds.map(unitData));
      const defs = new Map<string, Omit<SessionItem, 'requeued'>>();
      for (const d of data) {
        for (const l of d.lessons) {
          for (const ex of l.exercises) defs.set(`${l.id}\u0000${ex.id}`, { lessonKey: l.id, title: l.title, href: l.href, ex });
        }
      }
      // Lo que ya no exista en el contenido publicado se descarta sin más.
      found = list.flatMap((it) => {
        const def = defs.get(`${it.lessonKey}\u0000${it.exerciseId}`);
        return def ? [{ ...def, requeued: false }] : [];
      });
    } catch {
      phase = 'error';
      return;
    }
    pending = null;
    if (!found.length) {
      phase = 'empty';
      return;
    }
    items = found;
    again = [];
    i = 0;
    step = 0;
    answered = false;
    firstTry = 0;
    total = found.length;
    round += 1;
    phase = 'session';
    focusExercise();
  }

  function onResult(event: CustomEvent<{ exerciseId: string; score: number; finished: boolean }>) {
    const item = items[i];
    if (!item || answered) return;
    const { score } = event.detail;
    haptic(score === 100 ? 'success' : score === 0 ? 'error' : 'light');
    recordExerciseResult(item.lessonKey, item.ex.id, score, true);
    answered = true;
    if (!item.requeued) {
      if (score < 100) again = [...again, { ...item, requeued: true }];
      else firstTry += 1;
    }
  }

  function next() {
    answered = false;
    step += 1;
    round += 1;
    if (i + 1 < items.length) {
      i += 1;
    } else if (again.length) {
      items = again;
      again = [];
      i = 0;
    } else {
      remaining = countDue(getProgress(), index, scope, todayKey());
      phase = 'done';
      return;
    }
    focusExercise();
  }

  /** Otra tanda con lo que siga vencido. */
  function restart() {
    load();
    if (queue.length) start(queue);
  }

  /** Tras un fallo de red, vuelve a pedir lo mismo. */
  function retry() {
    if (pending) start(pending);
  }

  /** El botón «Siguiente» desaparece: el foco pasa al ejercicio nuevo. */
  function focusExercise() {
    tick().then(() => exEl?.focus({ preventScroll: true }));
  }
</script>

<section class="review">
  {#if phase === 'ready'}
    <p class="intro">{t(locale, 'review.intro')}</p>
    <p class="count">{tf(locale, 'lesson.toreview', queue.length)}</p>
    <div class="actions">
      <button class="btn btn-primary" type="button" on:click={() => start(queue)}>{t(locale, 'review.start')}</button>
      {#if reinforcement.length}
        <button class="btn btn-secondary" type="button" on:click={() => start(reinforcement)}>{t(locale, 'review.reinforce')}</button>
      {/if}
    </div>
  {:else if phase === 'empty'}
    <p class="intro">{t(locale, 'review.intro')}</p>
    <p class="count">{t(locale, 'review.empty')}</p>
    {#if nextDue}<p class="next">{tf(locale, 'review.next', formatDayLong(locale, nextDue))}</p>{/if}
    {#if reinforcement.length}
      <div class="actions">
        <button class="btn btn-secondary" type="button" on:click={() => start(reinforcement)}>{t(locale, 'review.reinforce')}</button>
      </div>
    {/if}
  {:else if phase === 'session' && current}
    <p class="meta"><span class="pos">{step + 1} / {planned}</span> · <a href={current.href}>{current.title}</a></p>
    <div class="ex-slot" tabindex="-1" bind:this={exEl}>
      {#key `${current.ex.id}:${round}`}
        {#if current.ex.type === 'multiple-choice'}
          <MultipleChoice
            id={current.ex.id}
            prompt={current.ex.prompt}
            options={current.ex.options}
            answer={current.ex.answer}
            explanation={current.ex.explanation}
            restoredScore={null}
            {locale}
            on:result={onResult}
          />
        {:else if current.ex.type === 'fill-in-blank'}
          <FillInBlank
            id={current.ex.id}
            prompt={current.ex.prompt}
            answers={current.ex.answers}
            explanation={current.ex.explanation}
            restoredScore={null}
            {locale}
            on:result={onResult}
          />
        {:else}
          <MatchPairs id={current.ex.id} pairs={current.ex.pairs} restoredScore={null} {locale} on:result={onResult} />
        {/if}
      {/key}
    </div>
    {#if answered}
      <div class="actions">
        <button class="btn btn-primary" type="button" on:click={next}>{t(locale, 'lesson.next')}</button>
      </div>
    {/if}
  {:else if phase === 'done'}
    <p class="done" role="status">{tf(locale, 'review.done', firstTry, total)}</p>
    {#if remaining > 0}
      <div class="actions">
        <button class="btn btn-primary" type="button" on:click={restart}>{t(locale, 'review.start')}</button>
      </div>
    {/if}
  {:else if phase === 'error'}
    <p class="error" role="alert">{t(locale, 'review.offline')}</p>
    {#if pending}
      <div class="actions">
        <button class="btn btn-secondary" type="button" on:click={retry}>{t(locale, 'review.start')}</button>
      </div>
    {/if}
  {/if}
</section>

<style>
  .review {
    max-inline-size: 60ch;
    display: grid;
    gap: var(--s-3);
    /* Reserva algo de alto mientras se calcula la cola: evita el salto al pintar. */
    min-block-size: 8rem;
    align-content: start;
  }
  .review p { margin: 0; }
  .intro { color: var(--c-text-muted); line-height: 1.55; }
  .count { font-size: 1.2rem; font-weight: 700; }
  .next { color: var(--c-text-muted); }
  .actions { display: flex; flex-wrap: wrap; gap: var(--s-3); justify-content: flex-start; }
  .meta { color: var(--c-text-muted); font-size: 0.92rem; }
  .meta .pos { font-variant-numeric: tabular-nums; }
  .meta a { color: inherit; }
  .ex-slot:focus { outline: none; }
  /* El componente de ejercicio trae su propio margen vertical. */
  .ex-slot :global(.ex) { margin-block: 0; }
  .done {
    padding: var(--s-5);
    background: var(--c-green-soft);
    border-radius: var(--r-lg);
    font-weight: 600;
  }
  .error {
    padding: var(--s-4) var(--s-5);
    border: 1px solid var(--c-border);
    border-radius: var(--r-lg);
    background: var(--c-bg-alt);
  }
</style>
