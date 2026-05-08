<script lang="ts">
  // Sprite: renderiza un personaje pixelart vía SVG procedural.
  // El user pondrá arte real luego; esto es placeholder funcional con
  // suficiente identidad visual por personaje para distinguirlos.
  export let id: string;
  export let scale: number = 1;
  export let flip: boolean = false;
  export let emotion: 'neutral' | 'happy' | 'sad' | 'angry' | 'mystic' = 'neutral';

  // Paletas por personaje (placeholder — se reemplazará con sprites reales).
  // Cada personaje tiene: hair, skin, body, accent.
  type Palette = { hair: string; skin: string; body: string; accent: string; aura?: string };
  const PALETTES: Record<string, Palette> = {
    aitona:    { hair: '#cccccc', skin: '#e8c39b', body: '#7d4f30', accent: '#3a2a1e' },
    biloba:    { hair: '#3a2a1e', skin: '#f0c8a4', body: '#205d7c', accent: '#c7191c' },
    marinela:  { hair: '#222222', skin: '#dba98a', body: '#0a4d63', accent: '#e6d4a3' },
    mari:      { hair: '#a90c1c', skin: '#f6dec4', body: '#1c2649', accent: '#d4a017', aura: '#c7191c' },
    basajaun:  { hair: '#2a1f12', skin: '#7c5a3a', body: '#3e5d28', accent: '#8a6d3b' },
    sugaar:    { hair: '#0d0d0d', skin: '#b58a6a', body: '#3a0e15', accent: '#d4a017', aura: '#7a0e15' },
    pintxonek: { hair: '#3e2812', skin: '#e8c39b', body: '#a83232', accent: '#f1e0c1' },
    aitonajaun:{ hair: '#dddddd', skin: '#dba98a', body: '#3d2a18', accent: '#8c5a2c' },
    kuadrilla: { hair: '#241008', skin: '#e8c39b', body: '#c7191c', accent: '#ffffff' },
    artzaina:  { hair: '#444444', skin: '#cba07a', body: '#5e4a2a', accent: '#a89564' },
    irakaslea: { hair: '#222222', skin: '#e8c39b', body: '#1f2a44', accent: '#c7191c' },
    hitzbeltz: { hair: '#000000', skin: '#1a1a1a', body: '#0a0a0a', accent: '#c7191c', aura: '#000000' },
    narrator:  { hair: '#888', skin: '#bbb', body: '#444', accent: '#888' },
  };

  $: palette = PALETTES[id] ?? PALETTES.narrator;
  $: hasAura = !!palette.aura;
</script>

<div class="sprite" class:flip style={`--scale: ${scale}`}>
  {#if hasAura}
    <div class="aura" style={`background: radial-gradient(circle, ${palette.aura}55 0%, transparent 65%);`}></div>
  {/if}
  <svg viewBox="0 0 16 24" width={64 * scale} height={96 * scale} shape-rendering="crispEdges">
    <!-- pelo -->
    <rect x="4" y="0" width="8" height="2" fill={palette.hair} />
    <rect x="3" y="1" width="10" height="3" fill={palette.hair} />
    <!-- cara -->
    <rect x="4" y="3" width="8" height="5" fill={palette.skin} />
    <!-- ojos según emoción -->
    {#if emotion === 'happy'}
      <rect x="6" y="5" width="1" height="1" fill={palette.accent} />
      <rect x="9" y="5" width="1" height="1" fill={palette.accent} />
      <rect x="6" y="7" width="4" height="1" fill={palette.accent} />
    {:else if emotion === 'sad'}
      <rect x="6" y="5" width="1" height="1" fill={palette.accent} />
      <rect x="9" y="5" width="1" height="1" fill={palette.accent} />
      <rect x="6" y="7" width="1" height="1" fill={palette.accent} />
      <rect x="9" y="7" width="1" height="1" fill={palette.accent} />
    {:else if emotion === 'angry'}
      <rect x="5" y="5" width="2" height="1" fill={palette.accent} />
      <rect x="9" y="5" width="2" height="1" fill={palette.accent} />
      <rect x="6" y="7" width="4" height="1" fill={palette.accent} />
    {:else if emotion === 'mystic'}
      <rect x="5" y="5" width="6" height="1" fill={palette.accent} />
      <rect x="6" y="7" width="4" height="1" fill={palette.accent} />
    {:else}
      <rect x="6" y="5" width="1" height="1" fill={palette.accent} />
      <rect x="9" y="5" width="1" height="1" fill={palette.accent} />
      <rect x="7" y="7" width="2" height="1" fill={palette.accent} />
    {/if}
    <!-- cuello -->
    <rect x="6" y="8" width="4" height="1" fill={palette.skin} />
    <!-- torso -->
    <rect x="3" y="9" width="10" height="9" fill={palette.body} />
    <!-- detalle accent -->
    <rect x="7" y="11" width="2" height="6" fill={palette.accent} />
    <!-- brazos -->
    <rect x="2" y="10" width="1" height="6" fill={palette.body} />
    <rect x="13" y="10" width="1" height="6" fill={palette.body} />
    <!-- manos -->
    <rect x="2" y="16" width="1" height="1" fill={palette.skin} />
    <rect x="13" y="16" width="1" height="1" fill={palette.skin} />
    <!-- piernas -->
    <rect x="4" y="18" width="3" height="6" fill={palette.accent} />
    <rect x="9" y="18" width="3" height="6" fill={palette.accent} />
    <!-- botas -->
    <rect x="4" y="23" width="3" height="1" fill="#1a1a1a" />
    <rect x="9" y="23" width="3" height="1" fill="#1a1a1a" />
  </svg>
</div>

<style>
  .sprite {
    position: relative;
    display: inline-block;
    image-rendering: pixelated;
    transform: scale(var(--scale));
    transform-origin: center bottom;
  }
  .sprite.flip { transform: scale(var(--scale)) scaleX(-1); }
  .sprite svg { display: block; }
  .aura {
    position: absolute;
    inset: -20%;
    z-index: -1;
    border-radius: 50%;
    animation: pulse 3s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50%      { opacity: 1;   transform: scale(1.1); }
  }
</style>
