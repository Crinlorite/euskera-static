<script lang="ts">
  import MultipleChoice from './MultipleChoice.svelte';
  import FillInBlank from './FillInBlank.svelte';
  import Flashcards from './Flashcards.svelte';
  import MatchPairs from './MatchPairs.svelte';
  import { recordExerciseResult, recordLessonRead, recordLessonCompleted } from '../../stores/progress';
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

  onMount(() => {
    recordLessonRead(lessonKey);
  });

  function onResult(event: CustomEvent<{ exerciseId: string; score: number; finished: boolean }>) {
    const { exerciseId, score, finished } = event.detail;
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
        on:result={onResult}
      />
    {:else if ex.type === 'fill-in-blank'}
      <FillInBlank
        id={ex.id}
        prompt={ex.prompt}
        answers={ex.answers}
        explanation={ex.explanation}
        {locale}
        on:result={onResult}
      />
    {:else if ex.type === 'flashcards'}
      <Flashcards id={ex.id} cards={ex.cards} on:result={onResult} />
    {:else if ex.type === 'match-pairs'}
      <MatchPairs id={ex.id} pairs={ex.pairs} on:result={onResult} />
    {/if}
  {/each}
</section>

<style>
  .exercises { margin-block: var(--s-7); }
  .exercises h2 { margin-block-end: var(--s-4); }
</style>
