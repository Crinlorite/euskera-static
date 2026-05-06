<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let id: string;
  export let prompt: string;
  export let options: string[];
  export let answer: number;
  export let explanation: string | undefined = undefined;

  let chosen: number | null = null;
  const dispatch = createEventDispatcher<{ result: { exerciseId: string; score: number; finished: boolean } }>();

  function pick(i: number) {
    if (chosen !== null) return;
    chosen = i;
    const correct = i === answer;
    dispatch('result', { exerciseId: id, score: correct ? 100 : 0, finished: true });
  }
</script>

<div class="ex">
  <p class="prompt">{prompt}</p>
  <ul>
    {#each options as opt, i}
      <li>
        <button
          class="opt"
          class:correct={chosen !== null && i === answer}
          class:wrong={chosen === i && i !== answer}
          disabled={chosen !== null}
          on:click={() => pick(i)}
        >
          <span class="dot"></span>{opt}
        </button>
      </li>
    {/each}
  </ul>
  {#if chosen !== null && chosen !== answer}
    <p class="hint">Era: <strong>{options[answer]}</strong></p>
  {/if}
  {#if chosen !== null && explanation}
    <p class="explain">{explanation}</p>
  {/if}
</div>

<style>
  .ex { padding: var(--s-5); border: 1px solid var(--c-border); border-radius: var(--r-lg); margin-block: var(--s-4); }
  .prompt { font-weight: 600; margin: 0 0 var(--s-3); }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-2); }
  .opt {
    inline-size: 100%;
    text-align: start;
    padding: var(--s-3);
    border: 1px solid var(--c-border);
    border-radius: var(--r-md);
    background: var(--c-bg);
    transition: background-color 200ms, border-color 200ms, transform 200ms;
    display: flex; align-items: center; gap: var(--s-3);
  }
  .opt:hover:not([disabled]) { border-color: var(--c-text-dim); }
  .opt[disabled] { cursor: default; opacity: 0.85; }
  .dot { inline-size: 1rem; block-size: 1rem; border-radius: 50%; border: 2px solid var(--c-border); }
  .correct { background: var(--c-green-soft); border-color: var(--c-green); animation: bounce 200ms; }
  .correct .dot { border-color: var(--c-green); background: var(--c-green); }
  .wrong { background: var(--c-red-soft); border-color: var(--c-red); }
  .hint { color: var(--c-green-strong); margin-block-start: var(--s-3); }
  .explain { color: var(--c-text-muted); margin-block-start: var(--s-2); font-size: 0.9rem; }
  @keyframes bounce {
    0% { transform: scale(1); } 50% { transform: scale(1.03); } 100% { transform: scale(1); }
  }
</style>
