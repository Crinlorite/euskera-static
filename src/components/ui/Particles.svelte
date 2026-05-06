<script lang="ts">
  type Particle = { left: number; top: number; size: number; dur: number; delay: number; layer: 1 | 2 | 3; color: string };

  // Three depth layers — far/slow/small, mid, near/fast/larger
  const particles: Particle[] = [
    // Far (layer 1)
    { left: 6,  top: 80, size: 4, dur: 26, delay: 0,   layer: 1, color: 'var(--c-red)'   },
    { left: 18, top: 92, size: 3, dur: 32, delay: 4,   layer: 1, color: 'var(--c-green)' },
    { left: 33, top: 86, size: 4, dur: 28, delay: 8,   layer: 1, color: 'var(--c-red)'   },
    { left: 48, top: 95, size: 3, dur: 30, delay: 2,   layer: 1, color: 'var(--c-green)' },
    { left: 64, top: 88, size: 4, dur: 26, delay: 6,   layer: 1, color: 'transparent'    },
    { left: 80, top: 92, size: 3, dur: 32, delay: 10,  layer: 1, color: 'var(--c-red)'   },
    // Mid (layer 2)
    { left: 12, top: 86, size: 7, dur: 22, delay: 1.5, layer: 2, color: 'var(--c-red)'   },
    { left: 28, top: 90, size: 6, dur: 24, delay: 5,   layer: 2, color: 'var(--c-green)' },
    { left: 44, top: 84, size: 8, dur: 20, delay: 3,   layer: 2, color: 'transparent'    },
    { left: 56, top: 92, size: 7, dur: 22, delay: 7,   layer: 2, color: 'var(--c-red)'   },
    { left: 72, top: 88, size: 6, dur: 24, delay: 0,   layer: 2, color: 'var(--c-green)' },
    { left: 88, top: 90, size: 8, dur: 20, delay: 9,   layer: 2, color: 'var(--c-red)'   },
    // Near (layer 3)
    { left: 22, top: 95, size: 11, dur: 16, delay: 2,  layer: 3, color: 'var(--c-red)'   },
    { left: 52, top: 96, size: 10, dur: 18, delay: 6,  layer: 3, color: 'var(--c-green)' },
    { left: 78, top: 95, size: 12, dur: 16, delay: 4,  layer: 3, color: 'transparent'    },
  ];
</script>

<div class="layer" aria-hidden="true">
  {#each particles as p}
    <span
      class="dot layer-{p.layer}"
      class:outline={p.color === 'transparent'}
      style={`left: ${p.left}%; top: ${p.top}%; inline-size: ${p.size}px; block-size: ${p.size}px; background: ${p.color}; animation-duration: ${p.dur}s; animation-delay: ${p.delay}s;`}
    ></span>
  {/each}
</div>

<style>
  .layer { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
  .dot {
    position: absolute;
    border-radius: 50%;
    animation: rise linear infinite;
  }
  .layer-1 { opacity: 0.18; }
  .layer-2 { opacity: 0.32; }
  .layer-3 { opacity: 0.5; }
  .dot.outline { background: transparent !important; border: 1px solid var(--c-text-dim); }
  @keyframes rise {
    0%   { transform: translateY(0); }
    100% { transform: translateY(-130vh); }
  }
  @media (prefers-reduced-motion: reduce) {
    .dot { animation: none; opacity: 0.18; }
    .layer-2 { opacity: 0.22; }
    .layer-3 { opacity: 0.28; }
  }
</style>
