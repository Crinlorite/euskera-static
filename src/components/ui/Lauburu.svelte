<script lang="ts">
  export let size: number = 720;
  export let opacity: number = 0.10;
  export let monochrome: boolean = false;

  const colors = monochrome
    ? ['#1A1A1A', '#1A1A1A', '#1A1A1A', '#1A1A1A']
    : ['#D52B1E', '#00964B', '#D52B1E', '#00964B'];
</script>

<svg viewBox="-100 -100 200 200" width={size} height={size} style="opacity: {opacity}" aria-hidden="true">
  <defs>
    <path id="lobe" d="M0 0 C 30 -10, 60 -30, 80 -60 C 60 -30, 30 -5, 0 0 Z" />
  </defs>
  <g class="spin">
    {#each [0, 90, 180, 270] as angle, i}
      <use href="#lobe" transform={`rotate(${angle})`} fill={colors[i]} />
    {/each}
  </g>
</svg>

<style>
  svg { display: block; will-change: transform; }
  .spin {
    transform-origin: center;
    animation: spin 50s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
</style>
