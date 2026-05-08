<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let chapter: number;
  export let title: string;
  export let subtitle: string;
  export let body: string;
  export let level: string = 'a1';
  export let playable: boolean = true;

  const dispatch = createEventDispatcher<{ enter: void; back: void }>();
</script>

<div class="chap" role="dialog" aria-modal="true">
  <p class="chap-num">Atala {chapter.toString().padStart(2, '0')} · Nivel {level.toUpperCase()}</p>
  <h2 class="chap-title">{title}</h2>
  <p class="chap-sub">{subtitle}</p>
  <div class="chap-body">
    {#each body.split('\n\n') as p}
      <p>{p}</p>
    {/each}
  </div>
  <div class="chap-cta">
    {#if playable}
      <button class="primary" on:click={() => dispatch('enter')}>Comenzar capítulo</button>
    {:else}
      <p class="locked">Este capítulo aún no está disponible. La trama continuará.</p>
    {/if}
    <button class="ghost" on:click={() => dispatch('back')}>← Volver al menú</button>
  </div>
</div>

<style>
  .chap {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgba(0, 0, 0, 0.86);
    backdrop-filter: blur(2px);
    z-index: 60;
    padding: var(--s-5);
    overflow-y: auto;
  }
  .chap > * {
    inline-size: 100%;
    max-inline-size: 720px;
  }
  .chap-num {
    margin: 0;
    color: #d4a017;
    font-size: 0.85rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    font-weight: 600;
  }
  .chap-title {
    margin: var(--s-2) 0 var(--s-2);
    font-family: var(--ff-display);
    font-size: clamp(2rem, 5vw, 3.4rem);
    color: #f0e6d0;
    line-height: 1.05;
    letter-spacing: -0.02em;
  }
  .chap-sub {
    margin: 0 0 var(--s-5);
    font-style: italic;
    color: #a89c7a;
    font-size: 1.05rem;
  }
  .chap-body {
    display: grid;
    gap: var(--s-3);
    margin-block-end: var(--s-6);
    color: #d8c8a8;
    line-height: 1.7;
    font-size: 1.05rem;
  }
  .chap-body p { margin: 0; }
  .chap-cta { display: flex; gap: var(--s-3); flex-wrap: wrap; align-items: center; }
  .primary {
    padding: var(--s-3) var(--s-5);
    background: #d4a017;
    color: #1a0e08;
    border: 0;
    border-radius: var(--r-sm);
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.18s;
  }
  .primary:hover { background: #f0c038; }
  .ghost {
    padding: var(--s-2) var(--s-4);
    background: transparent;
    color: #a89c7a;
    border: 1px solid #6a5a3a;
    border-radius: var(--r-sm);
    cursor: pointer;
    transition: border-color 0.18s, color 0.18s;
  }
  .ghost:hover { border-color: #d4a017; color: #f0e6d0; }
  .locked {
    margin: 0;
    color: #a89c7a;
    font-style: italic;
    font-size: 0.95rem;
  }
</style>
