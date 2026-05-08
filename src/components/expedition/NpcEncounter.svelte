<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Encounter } from './zones';

  export let zoneLabel: string;
  export let encounter: Encounter;

  const dispatch = createEventDispatcher<{ close: void; success: void }>();

  let chosen: number | null = null;
  let revealed = false;

  function choose(i: number) {
    if (revealed) return;
    chosen = i;
    revealed = true;
    if (i === encounter.correctIndex) {
      // Notificar éxito al padre para activar la mascota celebrando
      dispatch('success');
    }
  }

  function close() {
    dispatch('close');
  }

  function retry() {
    chosen = null;
    revealed = false;
  }

  $: correct = chosen === encounter.correctIndex;
</script>

<div class="overlay" on:click|self={close} role="dialog" aria-modal="true" aria-labelledby="enc-title">
  <div class="card pixel">
    <button class="close" on:click={close} aria-label="Cerrar">×</button>

    <p class="eyebrow">{zoneLabel}</p>
    <h3 id="enc-title" class="display">{encounter.npcName}</h3>

    <div class="npc-stage">
      <div class="npc" aria-hidden="true">
        <!-- silueta pixelart minimalista -->
        <div class="head"></div>
        <div class="torso"></div>
      </div>
      <div class="line">
        <p class="line-eu">{encounter.npcGreeting.eu}</p>
        <p class="line-es">{encounter.npcGreeting.es}</p>
      </div>
    </div>

    <p class="challenge">{encounter.challenge}</p>

    <ul class="options">
      {#each encounter.options as opt, i}
        <li>
          <button
            class="opt"
            class:right={revealed && i === encounter.correctIndex}
            class:wrong={revealed && chosen === i && i !== encounter.correctIndex}
            disabled={revealed}
            on:click={() => choose(i)}
          >
            <span class="opt-letter">{String.fromCharCode(65 + i)}</span>
            <span class="opt-text">{opt}</span>
          </button>
        </li>
      {/each}
    </ul>

    {#if revealed}
      <div class="result" class:ok={correct} class:ko={!correct}>
        {#if correct}
          <p class="result-headline">¡Eskerrik asko! Has acertado.</p>
          <p class="result-body">{encounter.rewardLine}</p>
          <p class="reward-word">
            Nueva palabra: <strong>{encounter.rewardWord.eu}</strong>
            <span class="reward-es">— {encounter.rewardWord.es}</span>
          </p>
          <button class="btn btn-primary" on:click={close}>Continuar</button>
        {:else}
          <p class="result-headline">No es eso. Inténtalo de nuevo.</p>
          <button class="btn btn-secondary" on:click={retry}>Reintentar</button>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(20, 20, 30, 0.55);
    backdrop-filter: blur(3px);
    display: grid;
    place-items: center;
    z-index: 100;
    padding: var(--s-4);
  }
  .card {
    inline-size: 100%;
    max-inline-size: 560px;
    background: var(--c-bg);
    border: 2px solid var(--c-text);
    border-radius: var(--r-md);
    padding: var(--s-6);
    box-shadow: 6px 6px 0 0 var(--c-text);
    display: grid;
    gap: var(--s-3);
    position: relative;
  }
  .close {
    position: absolute;
    inset-block-start: var(--s-2);
    inset-inline-end: var(--s-3);
    background: none;
    border: 0;
    font-size: 1.6rem;
    line-height: 1;
    cursor: pointer;
    color: var(--c-text-muted);
    padding: var(--s-2);
  }
  .close:hover { color: var(--c-text); }
  .eyebrow {
    margin: 0;
    font-size: var(--t-eyebrow);
    font-weight: 600;
    letter-spacing: var(--tr-wide);
    text-transform: uppercase;
    color: var(--c-text-muted);
  }
  h3 { margin: 0; font-size: clamp(1.4rem, 3vw, 2rem); line-height: 1.05; }

  .npc-stage {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--s-4);
    align-items: center;
    background: var(--c-bg-alt);
    padding: var(--s-4);
    border-radius: var(--r-md);
  }
  .npc {
    inline-size: 64px;
    block-size: 64px;
    image-rendering: pixelated;
    display: grid;
    grid-template-rows: 28px 36px;
    gap: 0;
    justify-items: center;
  }
  .head {
    inline-size: 28px;
    block-size: 28px;
    background: #f6cfa9;
    border: 2px solid var(--c-text);
    border-radius: 2px;
  }
  .torso {
    inline-size: 36px;
    block-size: 30px;
    background: var(--c-red);
    border: 2px solid var(--c-text);
    border-radius: 2px;
  }
  .line-eu { margin: 0 0 var(--s-1); font-weight: 600; font-size: 1.05rem; }
  .line-es { margin: 0; color: var(--c-text-muted); font-style: italic; font-size: 0.92rem; }

  .challenge {
    margin: var(--s-2) 0 0;
    font-weight: 600;
  }
  .options { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-2); }
  .opt {
    inline-size: 100%;
    text-align: start;
    display: grid;
    grid-template-columns: 32px 1fr;
    gap: var(--s-3);
    padding: var(--s-3) var(--s-4);
    background: var(--c-bg);
    border: 1px solid var(--c-border);
    border-radius: var(--r-md);
    color: var(--c-text);
    font-family: inherit;
    font-size: 0.95rem;
    cursor: pointer;
    transition: background var(--m-base), border-color var(--m-base), transform var(--m-base);
  }
  .opt:hover:not(:disabled) { background: var(--c-bg-alt); border-color: var(--c-text); transform: translateX(2px); }
  .opt-letter {
    font-weight: 700;
    color: var(--c-text-muted);
    font-family: var(--ff-display);
  }
  .opt.right { background: rgba(46, 139, 87, 0.12); border-color: var(--c-green-strong); }
  .opt.right .opt-letter { color: var(--c-green-strong); }
  .opt.wrong { background: rgba(199, 25, 28, 0.08); border-color: var(--c-red); }
  .opt.wrong .opt-letter { color: var(--c-red); }
  .opt:disabled { cursor: default; }

  .result { display: grid; gap: var(--s-2); padding: var(--s-3); border-radius: var(--r-md); }
  .result.ok { background: rgba(46, 139, 87, 0.08); border: 1px solid var(--c-green-strong); }
  .result.ko { background: rgba(199, 25, 28, 0.06); border: 1px solid var(--c-red); }
  .result-headline { margin: 0; font-weight: 600; }
  .result-body { margin: 0; color: var(--c-text-muted); }
  .reward-word { margin: 0; font-size: 0.95rem; }
  .reward-word strong { font-family: var(--ff-display); font-style: italic; color: var(--c-red); font-size: 1.15rem; }
  .reward-es { color: var(--c-text-muted); }
</style>
