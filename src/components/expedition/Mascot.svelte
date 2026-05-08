<script lang="ts">
  // Mascota lauburu animada para el Modo Expedición.
  // El lauburu flota suavemente y reacciona cuando el usuario completa un encuentro.
  export let cheering = false;
  export let line: string | null = null;
</script>

<div class="mascot" class:cheer={cheering}>
  {#if line}
    <div class="bubble" role="status">{line}</div>
  {/if}
  <svg viewBox="-100 -100 200 200" width="72" height="72" aria-hidden="true">
    <g class="lauburu-rot">
      <path d="M0 0 C 30 -10, 60 -30, 80 -60 C 60 -30, 30 -5, 0 0 Z" transform="rotate(0)"/>
      <path d="M0 0 C 30 -10, 60 -30, 80 -60 C 60 -30, 30 -5, 0 0 Z" transform="rotate(90)"/>
      <path d="M0 0 C 30 -10, 60 -30, 80 -60 C 60 -30, 30 -5, 0 0 Z" transform="rotate(180)"/>
      <path d="M0 0 C 30 -10, 60 -30, 80 -60 C 60 -30, 30 -5, 0 0 Z" transform="rotate(270)"/>
    </g>
  </svg>
</div>

<style>
  .mascot {
    position: relative;
    inline-size: 72px;
    block-size: 72px;
    color: var(--c-red);
    animation: float 3.6s ease-in-out infinite;
    filter: drop-shadow(0 4px 8px rgba(199, 25, 28, 0.18));
  }
  .lauburu-rot {
    transform-origin: center;
    animation: spin 18s linear infinite;
    fill: currentColor;
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-8px); }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  .mascot.cheer .lauburu-rot {
    animation: spin 1.2s linear infinite;
  }
  .mascot.cheer {
    filter: drop-shadow(0 0 18px var(--c-red));
  }
  .bubble {
    position: absolute;
    inset-block-end: calc(100% + 6px);
    inset-inline-start: 50%;
    transform: translateX(-50%);
    background: var(--c-bg);
    color: var(--c-text);
    font-family: var(--ff-sans);
    font-size: 0.78rem;
    font-weight: 600;
    padding: var(--s-2) var(--s-3);
    border: 1px solid var(--c-border);
    border-radius: var(--r-md);
    box-shadow: var(--sh-card);
    white-space: nowrap;
  }
  .bubble::after {
    content: '';
    position: absolute;
    inset-block-start: 100%;
    inset-inline-start: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-block-start-color: var(--c-bg);
  }
  @media (prefers-reduced-motion: reduce) {
    .mascot, .lauburu-rot { animation: none; }
  }
</style>
