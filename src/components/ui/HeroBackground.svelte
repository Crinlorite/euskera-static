<script lang="ts">
  // Gradient mesh background for the hero. Three radial blobs drifting
  // independently, low opacity, on top of the body's existing soft tints.
  // CSS-only animation, respects prefers-reduced-motion via transitions.css.
</script>

<div class="mesh" aria-hidden="true">
  <span class="blob blob-a"></span>
  <span class="blob blob-b"></span>
  <span class="blob blob-c"></span>
  <div class="grain"></div>
</div>

<style>
  .mesh {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
  }
  .blob {
    position: absolute;
    inset-block-start: -20%;
    inline-size: 70vw;
    block-size: 70vw;
    max-inline-size: 1000px;
    max-block-size: 1000px;
    border-radius: 50%;
    filter: blur(110px);
    opacity: 0.55;
  }
  .blob-a {
    inset-inline-start: -20%;
    background: radial-gradient(circle, rgba(213, 43, 30, 0.32) 0%, rgba(213, 43, 30, 0) 70%);
    animation: drift-a 22s var(--ease-out) infinite;
  }
  .blob-b {
    inset-inline-start: 35%;
    inset-block-start: -10%;
    background: radial-gradient(circle, rgba(0, 150, 75, 0.26) 0%, rgba(0, 150, 75, 0) 70%);
    animation: drift-b 28s var(--ease-out) infinite;
  }
  .blob-c {
    inset-inline-end: -10%;
    inset-block-start: 10%;
    background: radial-gradient(circle, rgba(213, 43, 30, 0.22) 0%, rgba(213, 43, 30, 0) 70%);
    animation: drift-c 24s var(--ease-out) infinite;
  }
  /* Subtle grain texture for depth */
  .grain {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(15, 12, 10, 0.08) 1px, transparent 1px);
    background-size: 3px 3px;
    opacity: 0.18;
    mix-blend-mode: multiply;
    pointer-events: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .blob { animation: none; }
  }
</style>
