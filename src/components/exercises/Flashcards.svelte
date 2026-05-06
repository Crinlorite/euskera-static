<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let id: string;
  export let cards: Array<{ eu: string; es: string }>;

  function shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  let deck = shuffle(cards);
  let i = 0;
  let flipped = false;
  let known = 0;

  const dispatch = createEventDispatcher<{ result: { exerciseId: string; score: number; finished: boolean } }>();

  function flip() { flipped = !flipped; }
  function mark(knew: boolean) {
    if (knew) known += 1;
    flipped = false;
    if (i < deck.length - 1) {
      i += 1;
    } else {
      const score = Math.round((known / deck.length) * 100);
      dispatch('result', { exerciseId: id, score, finished: true });
      deck = shuffle(cards);
      i = 0;
      known = 0;
    }
  }
</script>

<div class="ex">
  <p class="meta">Tarjeta {i + 1} de {deck.length}</p>
  <button class="card" on:click={flip}>
    {#if !flipped}
      <span class="front">{deck[i].eu}</span>
      <small>(toca para ver traducción)</small>
    {:else}
      <span class="back">{deck[i].es}</span>
      <small>(toca para ocultar)</small>
    {/if}
  </button>
  <div class="actions">
    <button class="btn btn-secondary" on:click={() => mark(false)}>Lo aprendo</button>
    <button class="btn btn-primary" on:click={() => mark(true)}>Lo sabía</button>
  </div>
</div>

<style>
  .ex { padding: var(--s-5); border: 1px solid var(--c-border); border-radius: var(--r-lg); margin-block: var(--s-4); }
  .meta { color: var(--c-text-muted); font-size: 0.875rem; margin: 0 0 var(--s-3); text-align: center; }
  .card {
    inline-size: 100%;
    min-block-size: 180px;
    border: 1px solid var(--c-border);
    border-radius: var(--r-lg);
    background: var(--c-bg-alt);
    display: grid;
    place-items: center;
    gap: var(--s-2);
    padding: var(--s-6);
    transition: transform 200ms;
  }
  .card:hover { transform: translateY(-1px); }
  .front, .back { font-size: 1.6rem; font-weight: 700; }
  .back { font-style: italic; color: var(--c-text-muted); font-weight: 500; }
  small { color: var(--c-text-muted); font-size: 0.8rem; }
  .actions { display: flex; gap: var(--s-3); margin-block-start: var(--s-4); justify-content: center; }
</style>
