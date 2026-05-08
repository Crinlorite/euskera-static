<script lang="ts">
  import { onMount } from 'svelte';
  import { ZONES, loadVisits, saveVisit, countA1Lessons, type Zone } from './zones';
  import NpcEncounter from './NpcEncounter.svelte';
  import Mascot from './Mascot.svelte';

  let lessonsDone = 0;
  let visits: Record<string, true> = {};
  let activeZone: Zone | null = null;
  let cheering = false;
  let mascotLine: string | null = null;

  function refresh() {
    lessonsDone = countA1Lessons();
    visits = loadVisits();
  }

  onMount(() => {
    refresh();
  });

  function isUnlocked(z: Zone): boolean {
    return lessonsDone >= z.requiresLessons;
  }

  function open(z: Zone) {
    if (!isUnlocked(z)) return;
    activeZone = z;
    cheering = false;
    mascotLine = null;
  }

  function handleSuccess() {
    if (!activeZone) return;
    saveVisit(activeZone.id);
    visits = loadVisits();
    cheering = true;
    mascotLine = '¡Ondo egin duzu!';
    setTimeout(() => { mascotLine = null; }, 3500);
  }

  function handleClose() {
    activeZone = null;
    setTimeout(() => { cheering = false; }, 1800);
  }
</script>

<div class="exp">
  <div class="map-wrap">
    <svg
      viewBox="0 0 100 70"
      preserveAspectRatio="xMidYMid meet"
      class="map"
      role="img"
      aria-label="Mapa de Euskal Herria"
    >
      <defs>
        <pattern id="seaPat" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="#bfdce8"/>
          <rect x="0" y="3" width="3" height="3" fill="#aacfdf"/>
        </pattern>
      </defs>

      <!-- Mar -->
      <rect x="0" y="0" width="100" height="14" fill="url(#seaPat)"/>
      <g stroke="#7faabd" stroke-width="0.3" fill="none" opacity="0.7">
        <path d="M0 4 q 4 -2 8 0 t 8 0 t 8 0 t 8 0 t 8 0 t 8 0 t 8 0 t 8 0 t 8 0 t 8 0 t 8 0 t 8 0"/>
        <path d="M0 9 q 4 -2 8 0 t 8 0 t 8 0 t 8 0 t 8 0 t 8 0 t 8 0 t 8 0 t 8 0 t 8 0 t 8 0 t 8 0"/>
      </g>

      <!-- Tierra: contorno simplificado de Euskal Herria -->
      <path
        d="M2 14 L18 14 L22 12 L34 14 L46 13 L58 14 L70 14 L82 15 L94 17 L98 22 L98 50 L92 58 L82 62 L66 64 L52 64 L40 62 L26 58 L14 52 L6 44 L2 30 Z"
        fill="#e9e0c5"
        stroke="#22221c"
        stroke-width="0.6"
        stroke-linejoin="round"
      />

      <!-- Cordilleras (montes pixelados) -->
      <g fill="#a59a78" stroke="#5e5640" stroke-width="0.25" stroke-linejoin="round">
        <polygon points="20,32 26,24 32,32"/>
        <polygon points="44,34 52,26 60,34"/>
        <polygon points="68,38 76,30 84,38"/>
        <polygon points="48,48 56,42 64,48"/>
        <polygon points="32,46 38,40 44,46"/>
      </g>

      <!-- Ríos -->
      <g fill="none" stroke="#7fb1c3" stroke-width="0.5" stroke-linecap="round">
        <path d="M24 14 q 0 6 -2 12 t -4 16"/>
        <path d="M58 14 q -2 12 -8 22 t -10 18"/>
      </g>

      <!-- Camino entre nodos (puntos cardinales) -->
      <path
        d="M58 22 L22 26 L33 56 L72 50 L92 40"
        fill="none"
        stroke="#c7191c"
        stroke-width="0.4"
        stroke-dasharray="1.5 1.5"
        opacity="0.45"
      />

      <!-- Nodos de zonas -->
      {#each ZONES as z}
        {@const unlocked = isUnlocked(z)}
        {@const visited = !!visits[z.id]}
        <g
          class="zone"
          class:unlocked
          class:locked={!unlocked}
          class:visited
          transform={`translate(${z.x} ${z.y})`}
          on:click={() => open(z)}
          on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && open(z)}
          tabindex={unlocked ? 0 : -1}
          role="button"
          aria-label={unlocked ? `Visitar ${z.label}` : `${z.label}: bloqueado, ${z.requiresLessons} lecciones requeridas`}
        >
          <!-- hit area invisible para tap fácil en móvil -->
          <circle cx="0" cy="0" r="6" fill="transparent" />
          <circle
            class="dot"
            cx="0"
            cy="0"
            r={unlocked ? 2.6 : 2}
            fill={visited ? '#2e8b57' : (unlocked ? '#c7191c' : '#c0bba0')}
            stroke="#22221c"
            stroke-width="0.5"
          />
          {#if visited}
            <path d="M-1.2 0 L-0.2 1 L1.2 -1" stroke="#fff" stroke-width="0.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          {/if}
          <text x="0" y="-3.8" text-anchor="middle" font-size="3" fill="#22221c" font-weight="700">{z.label}</text>
        </g>
      {/each}
    </svg>

    <div class="mascot-wrap" aria-hidden="true">
      <Mascot {cheering} line={mascotLine} />
    </div>
  </div>

  <div class="meta">
    <p class="counter">
      Lecciones completadas: <strong>{lessonsDone}</strong>
      <span class="sep">·</span>
      Zonas visitadas: <strong>{Object.keys(visits).length} / {ZONES.length}</strong>
    </p>
  </div>

  <ul class="legend">
    {#each ZONES as z}
      {@const unlocked = isUnlocked(z)}
      {@const visited = !!visits[z.id]}
      <li class:locked={!unlocked} class:visited class:unlocked={unlocked && !visited}>
        <span class="lbl">
          <strong>{z.label}</strong>
          <span class="region">{z.region}</span>
        </span>
        <span class="status">
          {#if visited}Visitada
          {:else if unlocked}Disponible
          {:else}Faltan {z.requiresLessons - lessonsDone} lecciones
          {/if}
        </span>
      </li>
    {/each}
  </ul>
</div>

{#if activeZone}
  <NpcEncounter
    zoneLabel={activeZone.label}
    encounter={activeZone.encounter}
    on:close={handleClose}
    on:success={handleSuccess}
  />
{/if}

<style>
  .exp { display: grid; gap: var(--s-5); }

  .map-wrap {
    position: relative;
    background: var(--c-bg-alt);
    border: 2px solid var(--c-text);
    border-radius: var(--r-md);
    padding: var(--s-3);
    box-shadow: 6px 6px 0 0 var(--c-text);
  }
  .map {
    inline-size: 100%;
    block-size: auto;
    image-rendering: pixelated;
    display: block;
    border-radius: var(--r-sm);
    background: #f3ede0;
  }
  .zone { cursor: pointer; }
  .zone.locked { cursor: not-allowed; }
  .zone:focus { outline: none; }
  .zone:focus .dot { stroke: var(--c-red); stroke-width: 1; }
  .zone.unlocked:hover .dot { transform: scale(1.18); transform-origin: center; transform-box: fill-box; }
  .zone.unlocked .dot {
    transition: transform var(--m-base) var(--ease-out);
    animation: pulse 2.4s ease-in-out infinite;
  }
  .zone.visited .dot { animation: none; }
  @keyframes pulse {
    0%, 100% { filter: drop-shadow(0 0 0 rgba(199, 25, 28, 0)); }
    50%      { filter: drop-shadow(0 0 1.5px rgba(199, 25, 28, 0.7)); }
  }
  @media (prefers-reduced-motion: reduce) {
    .zone .dot { animation: none; }
  }

  .mascot-wrap {
    position: absolute;
    inset-block-end: var(--s-3);
    inset-inline-end: var(--s-4);
    pointer-events: none;
  }

  .meta {
    text-align: center;
    color: var(--c-text-muted);
    font-size: 0.95rem;
  }
  .counter strong { color: var(--c-text); }
  .sep { margin: 0 var(--s-2); color: var(--c-text-dim); }

  .legend {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: var(--s-3);
  }
  .legend li {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--s-2);
    padding: var(--s-3) var(--s-4);
    background: var(--c-bg);
    border: 1px solid var(--c-border);
    border-radius: var(--r-md);
    font-size: 0.9rem;
  }
  .legend .lbl { display: grid; line-height: 1.2; }
  .legend .lbl strong { color: var(--c-text); font-size: 1rem; }
  .legend .region { color: var(--c-text-muted); font-size: 0.78rem; }
  .legend .status {
    align-self: center;
    font-weight: 600;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: var(--tr-wide);
    color: var(--c-text-muted);
  }
  .legend .visited { border-color: var(--c-green-strong); }
  .legend .visited .status { color: var(--c-green-strong); }
  .legend .unlocked { border-color: var(--c-red); }
  .legend .unlocked .status { color: var(--c-red); }
  .legend .locked { opacity: 0.65; }
</style>
