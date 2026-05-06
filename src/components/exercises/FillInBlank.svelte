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

  $: parts = prompt.split('___');
  $: before = parts[0] ?? prompt;
  $: after = parts[1] ?? '';

  function check() {
    if (result !== 'pending') return;
    const v = normalize(value);
    const ok = answers.some((a) => normalize(a) === v);
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
      placeholder="___"
    />
    <span>{after}</span>
  </p>
  <button class="btn btn-primary" on:click={check} disabled={result !== 'pending' || !value.trim()}>
    {t(locale, 'common.check')}
  </button>
  {#if result === 'wrong'}
    <p class="hint">Era: <strong>{answers[0]}</strong></p>
  {/if}
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
  .hint { color: var(--c-green-strong); }
  .explain { color: var(--c-text-muted); font-size: 0.9rem; }
</style>
