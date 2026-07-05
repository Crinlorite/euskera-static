<script lang="ts">
  import MultipleChoice from './MultipleChoice.svelte';
  import FillInBlank from './FillInBlank.svelte';
  import Flashcards from './Flashcards.svelte';
  import MatchPairs from './MatchPairs.svelte';
  import { recordExerciseResult, recordLessonRead, recordLessonCompleted, getProgress } from '../../stores/progress';
  import { haptic } from '../../lib/platform';
  import { onMount } from 'svelte';
  import type { LocaleCode } from '../../i18n/config';

  type ExerciseShape =
    | { type: 'multiple-choice'; id: string; prompt: string; options: string[]; answer: number; explanation?: string }
    | { type: 'fill-in-blank'; id: string; prompt: string; answers: string[]; explanation?: string }
    | { type: 'flashcards'; id: string; cards: Array<{ eu: string; es: string }> }
    | { type: 'match-pairs'; id: string; pairs: Array<{ eu: string; es: string }> };

  export let exercises: ExerciseShape[];
  export let lessonKey: string;
  export let locale: LocaleCode = 'es';

  const completed = new Set<string>();

  // Ejercicios ya resueltos en visitas anteriores → mejor nota guardada.
  // El store persiste attempts/bestScore por ejercicio desde siempre, pero la
  // UI arrancaba en blanco (queja de la 1ª reseña). onMount = solo cliente
  // (localStorage no existe en SSR). No restauramos la respuesta elegida (no
  // se guarda) sino un resumen "Resuelto · N%" con opción de repetir.
  let restored: Record<string, number> = {};

  onMount(() => {
    recordLessonRead(lessonKey);
    const saved = getProgress().lessons[lessonKey]?.exercises ?? {};
    const map: Record<string, number> = {};
    for (const ex of exercises) {
      const r = saved[ex.id];
      if (r && r.attempts > 0) {
        map[ex.id] = r.bestScore;
        // Cuenta para completar la lección: antes había que rehacer TODOS los
        // ejercicios en una misma visita para que se marcara completada.
        completed.add(ex.id);
      }
    }
    restored = map;
  });

  function onResult(event: CustomEvent<{ exerciseId: string; score: number; finished: boolean }>) {
    const { exerciseId, score, finished } = event.detail;
    haptic(score === 100 ? 'success' : score === 0 ? 'error' : 'light');
    recordExerciseResult(lessonKey, exerciseId, score);
    if (finished) completed.add(exerciseId);
    if (completed.size === exercises.length) {
      recordLessonCompleted(lessonKey);
    }
  }
</script>

<section class="exercises">
  <h2>Ejercicios</h2>
  {#each exercises as ex (ex.id)}
    {#if ex.type === 'multiple-choice'}
      <MultipleChoice
        id={ex.id}
        prompt={ex.prompt}
        options={ex.options}
        answer={ex.answer}
        explanation={ex.explanation}
        restoredScore={restored[ex.id] ?? null}
        {locale}
        on:result={onResult}
      />
    {:else if ex.type === 'fill-in-blank'}
      <FillInBlank
        id={ex.id}
        prompt={ex.prompt}
        answers={ex.answers}
        explanation={ex.explanation}
        restoredScore={restored[ex.id] ?? null}
        {locale}
        on:result={onResult}
      />
    {:else if ex.type === 'flashcards'}
      <Flashcards id={ex.id} cards={ex.cards} restoredScore={restored[ex.id] ?? null} {locale} on:result={onResult} />
    {:else if ex.type === 'match-pairs'}
      <MatchPairs id={ex.id} pairs={ex.pairs} restoredScore={restored[ex.id] ?? null} {locale} on:result={onResult} />
    {/if}
  {/each}
</section>

<style>
  .exercises { margin-block: var(--s-7); }
  .exercises h2 { margin-block-end: var(--s-4); }
</style>
