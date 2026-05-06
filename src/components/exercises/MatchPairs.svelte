<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let id: string;
  export let pairs: Array<{ eu: string; es: string }>;

  type Side = 'left' | 'right';
  interface Item { side: Side; text: string; pairIndex: number; matched: boolean; }

  function shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  let left: Item[] = shuffle(pairs.map((p, i) => ({ side: 'left' as Side, text: p.eu, pairIndex: i, matched: false })));
  let right: Item[] = shuffle(pairs.map((p, i) => ({ side: 'right' as Side, text: p.es, pairIndex: i, matched: false })));
  let selected: Item | null = null;
  let mistakes = 0;

  const dispatch = createEventDispatcher<{ result: { exerciseId: string; score: number; finished: boolean } }>();

  function pick(item: Item) {
    if (item.matched) return;
    if (!selected) { selected = item; return; }
    if (selected.side === item.side) { selected = item; return; }
    if (selected.pairIndex === item.pairIndex) {
      selected.matched = true;
      item.matched = true;
      left = [...left];
      right = [...right];
      selected = null;
      const allMatched = left.every((l) => l.matched);
      if (allMatched) {
        const score = Math.max(0, 100 - mistakes * 10);
        dispatch('result', { exerciseId: id, score, finished: true });
      }
    } else {
      mistakes += 1;
      selected = null;
    }
  }
</script>

<div class="ex">
  <p class="meta">Empareja cada palabra con su traducción.</p>
  <div class="grid">
    <ul>
      {#each left as item}
        <li>
          <button
            class:selected={selected === item}
            class:matched={item.matched}
            disabled={item.matched}
            on:click={() => pick(item)}
          >{item.text}</button>
        </li>
      {/each}
    </ul>
    <ul>
      {#each right as item}
        <li>
          <button
            class:selected={selected === item}
            class:matched={item.matched}
            disabled={item.matched}
            on:click={() => pick(item)}
          >{item.text}</button>
        </li>
      {/each}
    </ul>
  </div>
  {#if mistakes > 0}<p class="hint">Errores: {mistakes}</p>{/if}
</div>

<style>
  .ex { padding: var(--s-5); border: 1px solid var(--c-border); border-radius: var(--r-lg); margin-block: var(--s-4); }
  .meta { color: var(--c-text-muted); margin: 0 0 var(--s-3); }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-3); }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-2); }
  button {
    inline-size: 100%;
    padding: var(--s-3);
    border: 1px solid var(--c-border);
    border-radius: var(--r-md);
    background: var(--c-bg);
    text-align: center;
    transition: background 150ms, border-color 150ms;
    min-block-size: 44px;
  }
  button:hover:not([disabled]) { border-color: var(--c-text-dim); }
  button.selected { background: var(--c-red-soft); border-color: var(--c-red); }
  button.matched { background: var(--c-green-soft); border-color: var(--c-green); color: var(--c-green-strong); }
  .hint { color: var(--c-text-muted); margin-block-start: var(--s-3); font-size: 0.9rem; }
</style>
