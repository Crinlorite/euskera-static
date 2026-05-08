<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Sprite from '../sprites/Sprite.svelte';

  export let speaker: string;
  export let spriteId: string;
  export let eu: string;
  export let es: string;
  export let emotion: 'neutral' | 'happy' | 'sad' | 'angry' | 'mystic' = 'neutral';

  const dispatch = createEventDispatcher<{ continue: void }>();

  // Typewriter effect: revela el texto eu progresivamente
  let revealed = '';
  let typing = true;
  let interval: ReturnType<typeof setInterval> | null = null;

  $: startTyping(eu);

  function startTyping(text: string) {
    if (interval) clearInterval(interval);
    revealed = '';
    typing = true;
    let i = 0;
    interval = setInterval(() => {
      i++;
      revealed = text.slice(0, i);
      if (i >= text.length) {
        if (interval) clearInterval(interval);
        typing = false;
      }
    }, 18);
  }

  function skip() {
    if (typing) {
      if (interval) clearInterval(interval);
      revealed = eu;
      typing = false;
    } else {
      dispatch('continue');
    }
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      skip();
    }
  }
</script>

<svelte:window on:keydown={handleKey} />

<button class="box" on:click={skip} aria-label="Continuar diálogo">
  <div class="portrait">
    <Sprite id={spriteId} scale={1} {emotion} />
  </div>
  <div class="content">
    <div class="speaker">{speaker}</div>
    <div class="line eu">{revealed}<span class="caret" class:hidden={!typing}>▍</span></div>
    {#if !typing}
      <div class="line es">{es}</div>
      <div class="cont" aria-hidden="true">▶</div>
    {/if}
  </div>
</button>

<style>
  .box {
    position: relative;
    display: grid;
    grid-template-columns: 96px 1fr;
    gap: var(--s-4);
    inline-size: 100%;
    padding: var(--s-4) var(--s-5);
    background: rgba(15, 12, 8, 0.94);
    border: 2px solid #d4a017;
    border-radius: var(--r-md);
    color: #f0e6d0;
    text-align: start;
    cursor: pointer;
    font-family: inherit;
    box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.4);
  }
  .box:focus { outline: 2px solid #ffd84a; outline-offset: 2px; }
  .portrait {
    align-self: end;
    display: grid;
    place-items: end center;
  }
  .content {
    display: grid;
    gap: var(--s-1);
    align-content: center;
  }
  .speaker {
    font-family: var(--ff-display);
    font-style: italic;
    font-size: 0.95rem;
    color: #d4a017;
    letter-spacing: 0.02em;
  }
  .line { line-height: 1.4; }
  .line.eu {
    font-size: 1.15rem;
    color: #f0e6d0;
    font-weight: 500;
    min-block-size: 1.6em;
  }
  .line.es {
    font-size: 0.92rem;
    color: #a89c7a;
    font-style: italic;
    margin-block-start: 2px;
  }
  .caret {
    display: inline-block;
    color: #d4a017;
    animation: blink 0.6s infinite;
  }
  .caret.hidden { visibility: hidden; }
  @keyframes blink {
    50% { opacity: 0; }
  }
  .cont {
    position: absolute;
    inset-block-end: var(--s-3);
    inset-inline-end: var(--s-4);
    color: #d4a017;
    animation: nudge 1.5s ease-in-out infinite;
  }
  @keyframes nudge {
    0%, 100% { transform: translateX(0); }
    50%      { transform: translateX(4px); }
  }

  @media (max-width: 540px) {
    .box { grid-template-columns: 64px 1fr; padding: var(--s-3); }
    .line.eu { font-size: 1rem; }
  }
</style>
