<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { normalize } from './types';
  import { t } from '../../i18n/ui';
  import type { LocaleCode } from '../../i18n/config';

  export let id: string;
  export let prompt: string;
  export let answers: string[];
  export let explanation: string | undefined = undefined;
  export let locale: LocaleCode = 'es';

  let value = '';
  let result: 'pending' | 'correct' | 'wrong' = 'pending';
  const dispatch = createEventDispatcher<{ result: { exerciseId: string; score: number; finished: boolean } }>();

  // Un "hueco" es una racha de 3+ guiones bajos; rachas consecutivas separadas
  // solo por espacios forman UN único hueco multi-palabra ("___ ___" = respuesta
  // de dos palabras). El texto posterior al hueco se conserva siempre íntegro.
  const GAP_RE = /_{3,}(?:[ \t]+_{3,})*/;
  $: gapMatch = GAP_RE.exec(prompt);
  $: before = gapMatch ? prompt.slice(0, gapMatch.index) : prompt;
  $: after = gapMatch ? prompt.slice(gapMatch.index + gapMatch[0].length) : '';
  $: wordHint = gapMatch ? gapMatch[0].split(/[ \t]+/).map(() => '___').join(' ') : '___';

  function check() {
    if (result !== 'pending') return;
    const v = normalize(value).replace(/\s+/g, ' ');
    const ok = answers.some((a) => normalize(a).replace(/\s+/g, ' ') === v);
    result = ok ? 'correct' : 'wrong';
    dispatch('result', { exerciseId: id, score: ok ? 100 : 0, finished: true });
  }
</script>

<div class="ex" class:correct={result === 'correct'} class:wrong={result === 'wrong'}>
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
</style>
