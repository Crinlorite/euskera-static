<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Choice } from '../engine/types';

  export let prompt: string;
  export let options: Choice[];

  const dispatch = createEventDispatcher<{ pick: Choice }>();
</script>

<div class="wrap">
  <p class="prompt">{prompt}</p>
  <ul class="choices">
    {#each options as opt, i}
      <li>
        <button class="choice" on:click={() => dispatch('pick', opt)}>
          <span class="hot">{i + 1}</span>
          <span class="lbl">{opt.label}</span>
        </button>
      </li>
    {/each}
  </ul>
</div>

<style>
  .wrap {
    display: grid;
    gap: var(--s-3);
    inline-size: 100%;
    padding: var(--s-4);
    background: rgba(15, 12, 8, 0.94);
    border: 2px solid #d4a017;
    border-radius: var(--r-md);
    color: #f0e6d0;
  }
  .prompt {
    margin: 0;
    font-family: var(--ff-display);
    font-style: italic;
    font-size: 1.05rem;
    color: #d4a017;
  }
  .choices { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-2); }
  .choice {
    inline-size: 100%;
    text-align: start;
    display: grid;
    grid-template-columns: 28px 1fr;
    gap: var(--s-3);
    padding: var(--s-3) var(--s-4);
    background: rgba(40, 32, 22, 0.7);
    border: 1px solid #6a5a3a;
    border-radius: var(--r-sm);
    color: #f0e6d0;
    font-family: inherit;
    font-size: 0.95rem;
    cursor: pointer;
    transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
  }
  .choice:hover {
    background: rgba(212, 160, 23, 0.14);
    border-color: #d4a017;
    transform: translateX(3px);
  }
  .choice .hot {
    font-weight: 700;
    color: #d4a017;
    font-family: var(--ff-display);
  }
</style>
