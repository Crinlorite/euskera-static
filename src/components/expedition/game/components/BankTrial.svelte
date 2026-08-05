<script lang="ts">
  // Repaso rápido: n preguntas MC sorteadas del banco A1 del simulakro
  // (262 items etiquetados). Reutiliza PuzzleHost, que ya baraja opciones.
  import { createEventDispatcher } from 'svelte';
  import PuzzleHost from './PuzzleHost.svelte';
  import type { Puzzle } from '../engine/types';
  import bank from '../../../../data/bank/a1.es.json';

  export let n = 2;

  const dispatch = createEventDispatcher<{ done: void }>();

  type BankItem = {
    type: string;
    prompt: string;
    options: string[];
    answer: number;
    explanation?: string;
  };

  const MC = (bank.items as BankItem[]).filter((i) => i.type === 'mc');
  const picked: Puzzle[] = [];
  {
    const pool = [...MC];
    for (let i = 0; i < n && pool.length; i++) {
      const j = Math.floor(Math.random() * pool.length);
      const it = pool.splice(j, 1)[0];
      picked.push({
        type: 'multiple-choice',
        prompt: it.prompt,
        options: it.options,
        correctIndex: it.answer,
        explainCorrect: it.explanation,
      });
    }
  }

  let idx = 0;
  function onResult() {
    if (idx + 1 < picked.length) {
      idx += 1;
    } else {
      dispatch('done');
    }
  }
</script>

<div class="trial">
  <p class="head">📖 Aitonaren liburua · repaso {idx + 1}/{picked.length}</p>
  {#key idx}
    <PuzzleHost puzzle={picked[idx]} on:result={onResult} />
  {/key}
</div>

<style>
  .trial {
    inline-size: 100%;
    display: grid;
    gap: var(--s-2);
  }
  .head {
    margin: 0;
    font-family: var(--ff-display);
    font-style: italic;
    font-size: 0.9rem;
    color: #d4a017;
    text-align: center;
    letter-spacing: 0.03em;
  }
</style>
