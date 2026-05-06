<script lang="ts">
  type Particle = { left: number; size: number; dur: number; delay: number; color: string };
  const particles: Particle[] = [
    { left: 10, size: 8, dur: 18, delay: 0, color: 'var(--c-red)' },
    { left: 25, size: 6, dur: 22, delay: 3, color: 'var(--c-green)' },
    { left: 42, size: 10, dur: 16, delay: 1, color: 'var(--c-red)' },
    { left: 58, size: 7, dur: 24, delay: 5, color: 'var(--c-green)' },
    { left: 72, size: 9, dur: 20, delay: 2, color: 'transparent' },
    { left: 86, size: 5, dur: 19, delay: 4, color: 'var(--c-red)' },
  ];
</script>

<div class="layer" aria-hidden="true">
  {#each particles as p}
    <span
      class="dot"
      class:outline={p.color === 'transparent'}
      style={`left: ${p.left}%; inline-size: ${p.size}px; block-size: ${p.size}px; background: ${p.color}; animation-duration: ${p.dur}s; animation-delay: ${p.delay}s;`}
    ></span>
  {/each}
</div>

<style>
  .layer { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
  .dot {
    position: absolute;
    inset-block-end: -10%;
    border-radius: 50%;
    opacity: 0.4;
    animation: rise linear infinite;
  }
  .dot.outline { background: transparent !important; border: 1px solid var(--c-text-muted); }
  @keyframes rise {
    from { transform: translateY(0); opacity: 0.4; }
    to { transform: translateY(-110vh); opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) { .dot { animation: none; opacity: 0.2; } }
</style>
