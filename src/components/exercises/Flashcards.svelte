<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { t, tf } from '../../i18n/ui';
  import { speak, canSpeak } from '../../lib/platform';
  import type { LocaleCode } from '../../i18n/config';

  export let id: string;
  export let cards: Array<{ eu: string; es: string }>;
  export let locale: LocaleCode = 'es';

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
  let lastRound: { known: number; total: number } | null = null;

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
      lastRound = { known, total: deck.length };
      deck = shuffle(cards);
      i = 0;
      known = 0;
    }
  }
</script>

<div class="ex">
  <p class="meta">{tf(locale, 'exercise.flash.counter', i + 1, deck.length)}</p>
  <button class="card" on:click={flip}>
    {#if !flipped}
      <span class="front">{deck[i].eu}</span>
      {#if canSpeak()}<button class="tts-btn" type="button" aria-label="Entzun" on:click|stopPropagation={() => speak(deck[i].eu)}>🔊</button>{/if}
      <small>{t(locale, 'exercise.flash.reveal')}</small>
    {:else}
      <span class="back">{deck[i].es}</span>
      <small>{t(locale, 'exercise.flash.hide')}</small>
    {/if}
  </button>
  <div class="actions">
    <button class="btn btn-secondary" on:click={() => mark(false)}>{t(locale, 'exercise.flash.learning')}</button>
    <button class="btn btn-primary" on:click={() => mark(true)}>{t(locale, 'exercise.flash.known')}</button>
  </div>
  <p class="round" role="status">
    {#if lastRound}
      {tf(locale, 'exercise.flash.round', lastRound.known, lastRound.total)}
    {/if}
  </p>
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
  .tts-btn {
    border: 1px solid var(--c-border);
    border-radius: var(--r-md);
    background: var(--c-bg);
    cursor: pointer;
    padding: var(--s-1) var(--s-2);
    font-size: 1.1rem;
    line-height: 1;
  }
  .tts-btn:hover { background: var(--c-bg-alt); }
  .actions { display: flex; gap: var(--s-3); margin-block-start: var(--s-4); justify-content: center; }
  .round { color: var(--c-green-strong); text-align: center; font-size: 0.9rem; margin-block: var(--s-3) 0; }
</style>
