<script lang="ts">
  // Backgrounds procedurales por escena. Composiciones SVG con paleta
  // distintiva por lugar — placeholder hasta que el user ponga arte real.
  export let bgId: string;

  type BgSpec = {
    sky: string;
    skyTo?: string;
    horizon: string;
    ground: string;
    accent: string;
    decor?: 'mountain' | 'sea' | 'forest' | 'town' | 'cave' | 'inside' | 'darkness' | 'stone';
  };

  const BACKGROUNDS: Record<string, BgSpec> = {
    'etxe-barrua': {
      sky: '#3a2418', skyTo: '#1a0e08',
      horizon: '#4a2a18', ground: '#2a1808', accent: '#d4a017',
      decor: 'inside',
    },
    'donostia-portua': {
      sky: '#a8c8e0', skyTo: '#5a8abf',
      horizon: '#2a4a6a', ground: '#7a8aa0', accent: '#d4a017',
      decor: 'sea',
    },
    'anbotoko-mendia': {
      sky: '#8a1c2c', skyTo: '#3a0e1a',
      horizon: '#22221c', ground: '#3a3024', accent: '#d4a017',
      decor: 'mountain',
    },
    'bilboko-itsasportua': {
      sky: '#4a4a55', skyTo: '#2a2a35',
      horizon: '#1a1a22', ground: '#444452', accent: '#a8a040',
      decor: 'town',
    },
    'gasteizko-plaza': {
      sky: '#c8b894', skyTo: '#9a8868',
      horizon: '#5a4828', ground: '#3a2818', accent: '#a02828',
      decor: 'town',
    },
    'iparraldeko-basoa': {
      sky: '#2a3a28', skyTo: '#10180e',
      horizon: '#0e1408', ground: '#1a2018', accent: '#5a8a3a',
      decor: 'forest',
    },
    'sugaar-galeria': {
      sky: '#1a0a14', skyTo: '#0a0408',
      horizon: '#3a0e15', ground: '#0a0408', accent: '#d4a017',
      decor: 'cave',
    },
    'hitzbeltz-finala': {
      sky: '#000000', skyTo: '#0a0408',
      horizon: '#10040a', ground: '#000000', accent: '#c7191c',
      decor: 'darkness',
    },
    'mapa-euskal-herria': {
      sky: '#d8c898', skyTo: '#a89868',
      horizon: '#5a4828', ground: '#3a2818', accent: '#c7191c',
      decor: 'stone',
    },
    'iruna-festa': {
      sky: '#c83c2c', skyTo: '#7a1a14',
      horizon: '#2a0e08', ground: '#1a0a08', accent: '#f0d038',
      decor: 'town',
    },
    'maule-gaina': {
      sky: '#7a8898', skyTo: '#4a5868',
      horizon: '#2a3a48', ground: '#5a6878', accent: '#a8a040',
      decor: 'mountain',
    },
  };

  $: spec = BACKGROUNDS[bgId] ?? BACKGROUNDS['etxe-barrua'];
</script>

<div class="bg">
  <svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" class="bg-svg" shape-rendering="crispEdges">
    <defs>
      <linearGradient id={`sky-${bgId}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color={spec.sky} />
        <stop offset="100%" stop-color={spec.skyTo ?? spec.sky} />
      </linearGradient>
    </defs>

    <rect x="0" y="0" width="400" height="170" fill={`url(#sky-${bgId})`} />

    {#if spec.decor === 'sea'}
      <!-- olas pixelart -->
      <rect x="0" y="160" width="400" height="90" fill={spec.horizon} />
      <g fill={spec.ground} opacity="0.8">
        {#each Array(20) as _, i}
          <rect x={i * 20} y={170 + (i % 3) * 4} width="20" height="2" />
        {/each}
      </g>
      <!-- barco lejano -->
      <rect x="280" y="155" width="20" height="6" fill="#1a1a1a" />
      <rect x="288" y="148" width="2" height="7" fill="#1a1a1a" />
    {:else if spec.decor === 'mountain'}
      <!-- siluetas escalonadas -->
      <g fill={spec.horizon}>
        <polygon points="0,170 50,110 100,140 160,80 220,130 280,90 340,140 400,120 400,170" />
      </g>
      <g fill={spec.ground} opacity="0.7">
        <polygon points="0,170 80,140 160,160 240,135 320,155 400,145 400,170" />
      </g>
      <!-- nieve en cumbres -->
      <g fill="#e8e0d0" opacity="0.85">
        <polygon points="158,82 165,90 152,90" />
        <polygon points="218,128 225,135 211,135" />
        <polygon points="278,92 285,100 271,100" />
      </g>
    {:else if spec.decor === 'forest'}
      <!-- árboles escalonados -->
      <rect x="0" y="160" width="400" height="90" fill={spec.ground} />
      <g fill={spec.horizon}>
        {#each Array(10) as _, i}
          <polygon points={`${i * 40 + 10},${170 - (i % 3) * 8} ${i * 40 + 25},${110 - (i % 3) * 8} ${i * 40 + 40},${170 - (i % 3) * 8}`} />
        {/each}
      </g>
      <g fill={spec.accent} opacity="0.6">
        {#each Array(10) as _, i}
          <polygon points={`${i * 40 + 13},${165} ${i * 40 + 25},${125} ${i * 40 + 37},${165}`} />
        {/each}
      </g>
    {:else if spec.decor === 'town'}
      <!-- siluetas urbanas -->
      <rect x="0" y="160" width="400" height="90" fill={spec.ground} />
      <g fill={spec.horizon}>
        {#each [0, 60, 100, 160, 200, 260, 320, 360] as x, i}
          <rect {x} y={140 - (i % 3) * 12} width="40" height={32 + (i % 3) * 12} />
        {/each}
      </g>
      <!-- ventanas -->
      <g fill={spec.accent} opacity="0.7">
        {#each [10, 30, 70, 90, 110, 130, 170, 190, 210, 230, 270, 290, 330, 350, 370, 390] as x, i}
          {#each [0, 1, 2] as row}
            <rect {x} y={150 + row * 6} width="3" height="3" />
          {/each}
        {/each}
      </g>
    {:else if spec.decor === 'inside'}
      <!-- pared interior con cuadros -->
      <rect x="0" y="160" width="400" height="90" fill={spec.ground} />
      <rect x="0" y="0" width="400" height="170" fill={spec.horizon} opacity="0.3" />
      <g fill={spec.accent} opacity="0.6">
        <rect x="40" y="40" width="50" height="60" stroke="#1a0e08" stroke-width="2" />
        <rect x="180" y="50" width="40" height="50" stroke="#1a0e08" stroke-width="2" />
        <rect x="300" y="35" width="60" height="80" stroke="#1a0e08" stroke-width="2" />
      </g>
      <!-- ventana -->
      <rect x="120" y="50" width="40" height="55" fill="#3a4a5a" stroke="#1a0e08" stroke-width="2" />
      <line x1="140" y1="50" x2="140" y2="105" stroke="#1a0e08" stroke-width="1" />
      <line x1="120" y1="77" x2="160" y2="77" stroke="#1a0e08" stroke-width="1" />
    {:else if spec.decor === 'cave'}
      <!-- cueva: bóveda + estalactitas -->
      <ellipse cx="200" cy="0" rx="220" ry="170" fill={spec.horizon} opacity="0.8" />
      <rect x="0" y="160" width="400" height="90" fill={spec.ground} />
      <g fill={spec.horizon}>
        {#each [50, 100, 150, 200, 250, 300, 350] as x, i}
          <polygon points={`${x},0 ${x + 6},${20 + (i % 3) * 8} ${x - 6},${20 + (i % 3) * 8}`} />
        {/each}
      </g>
      <g fill={spec.accent} opacity="0.4">
        <circle cx="200" cy="180" r="80" />
      </g>
    {:else if spec.decor === 'darkness'}
      <rect x="0" y="0" width="400" height="250" fill="#000" />
      <radialGradient id="darkLight" cx="50%" cy="50%">
        <stop offset="0%" stop-color={spec.accent} stop-opacity="0.4" />
        <stop offset="100%" stop-color="#000" stop-opacity="0" />
      </radialGradient>
      <circle cx="200" cy="125" r="120" fill="url(#darkLight)" />
    {:else if spec.decor === 'stone'}
      <!-- mapa antiguo / pergamino -->
      <rect x="0" y="0" width="400" height="250" fill={spec.sky} />
      <g fill={spec.horizon} opacity="0.4">
        {#each Array(40) as _, i}
          <rect x={Math.random() * 400} y={Math.random() * 250} width="2" height="2" />
        {/each}
      </g>
    {/if}
  </svg>
</div>

<style>
  .bg {
    position: absolute;
    inset: 0;
    overflow: hidden;
    image-rendering: pixelated;
  }
  .bg-svg {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
