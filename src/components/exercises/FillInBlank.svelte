<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { splitGap, isFillCorrect } from '../../lib/fill-answer';
  import { t } from '../../i18n/ui';
  import type { LocaleCode } from '../../i18n/config';

  export let id: string;
  export let prompt: string;
  export let answers: string[];
  export let explanation: string | undefined = undefined;
  export let locale: LocaleCode = 'es';
  // Mejor nota de una visita anterior (null = nunca resuelto).
  export let restoredScore: number | null = null;

  let value = '';
  let result: 'pending' | 'correct' | 'wrong' = 'pending';
  const dispatch = createEventDispatcher<{ result: { exerciseId: string; score: number; finished: boolean } }>();

  // Hueco, texto de antes y de después (el posterior se conserva íntegro).
  // "___ ___" es un único hueco de dos palabras. Ver lib/fill-answer.ts.
  $: parts = splitGap(prompt);
  $: before = parts.before;
  $: after = parts.after;
  $: wordHint = parts.gap ? parts.gap.split(/[ \t]+/).map(() => '___').join(' ') : '___';

  function check() {
    if (result !== 'pending') return;
    const ok = isFillCorrect(value, answers, before, after);
    result = ok ? 'correct' : 'wrong';
    dispatch('result', { exerciseId: id, score: ok ? 100 : 0, finished: true });
  }
</script>

<div class="ex" class:correct={result === 'correct'} class:wrong={result === 'wrong'}>
  {#if restoredScore !== null}
  <p class="prompt-solved">{prompt}</p>
  <div class="solved" role="status">
    <span class="ok">✓ {t(locale, 'exercise.done')} · {restoredScore}%</span>
    <button class="btn btn-secondary" on:click={() => (restoredScore = null)}>{t(locale, 'exercise.redo')}</button>
  </div>
  {:else}
  <p class="prompt">
    <span>{before}</span>
    <input
      type="text"
      bind:value
      on:keydown={(e) => e.key === 'Enter' && check()}
      disabled={result !== 'pending'}
      autocapitalize="off"
      autocomplete="off"
      autocorrect="off"
      spellcheck="false"
      placeholder={wordHint}
      style={`min-inline-size: ${Math.max(6, wordHint.length * 0.7)}em`}
    />
    <span>{after}</span>
  </p>
  <button class="btn btn-primary" on:click={check} disabled={result !== 'pending' || !value.trim()}>
    {t(locale, 'common.check')}
  </button>
  <p class="feedback" role="status">
    {#if result === 'correct'}
      <span class="ok">{t(locale, 'exercise.correct')}</span>
    {:else if result === 'wrong'}
      {t(locale, 'exercise.was')} <strong>{answers[0]}</strong>
    {/if}
  </p>
  {#if result !== 'pending' && explanation}
    <p class="explain">{explanation}</p>
  {/if}
  {/if}
</div>

<style>
  .ex { padding: var(--s-5); border: 1px solid var(--c-border); border-radius: var(--r-lg); margin-block: var(--s-4); transition: background 200ms; }
  .ex.correct { background: var(--c-green-soft); border-color: var(--c-green); }
  .ex.wrong { background: var(--c-red-soft); border-color: var(--c-red); }
  .prompt { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--s-2); font-size: 1.1rem; margin: 0 0 var(--s-3); }
  input {
    min-inline-size: 8em;
    padding: var(--s-2) var(--s-3);
    border: 1px solid var(--c-border);
    border-radius: var(--r-sm);
    font-size: 1rem;
  }
  input:focus { outline: 2px solid var(--c-text); outline-offset: 1px; border-color: var(--c-text); }
  .feedback { color: var(--c-green-strong); margin-block: var(--s-3) 0; min-block-size: 1.2em; }
  .feedback:empty { margin: 0; min-block-size: 0; }
  .feedback .ok { color: var(--c-green-strong); font-weight: 600; }
  .explain { color: var(--c-text-muted); font-size: 0.9rem; }
  .prompt-solved { font-weight: 600; margin: 0 0 var(--s-3); font-size: 1.1rem; }
  .solved { display: flex; align-items: center; justify-content: space-between; gap: var(--s-3); flex-wrap: wrap; }
  .solved .ok { color: var(--c-green-strong); font-weight: 600; }
</style>
