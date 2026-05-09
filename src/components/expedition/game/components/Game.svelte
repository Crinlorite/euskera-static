<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import {
    story,
    currentScene,
    currentBeat,
    advance,
    gotoLabel,
    gotoScene,
    applyChoice,
    gainItem,
    gainWord,
    setFlag,
    setBackground,
    enterActor,
    leaveActor,
    loadGame,
    newGame,
    saveGame,
    hasSave,
  } from '../engine/state';
  import { getScene as getSceneById } from '../scenes';
  import { onFullscreenChange, toggleFullscreen, exitFullscreen } from '../engine/fullscreen';
  import type { Beat, Choice } from '../engine/types';

  import Background from '../sprites/Background.svelte';
  import Sprite from '../sprites/Sprite.svelte';
  import DialogueBox from './DialogueBox.svelte';
  import ChoiceList from './ChoiceList.svelte';
  import PuzzleHost from './PuzzleHost.svelte';
  import Inventory from './Inventory.svelte';
  import Notebook from './Notebook.svelte';
  import ChapterIntro from './ChapterIntro.svelte';
  import MainMenu from './MainMenu.svelte';
  import ChapterSelect from './ChapterSelect.svelte';

  type View =
    | { mode: 'menu' }
    | { mode: 'chapter-select' }
    | { mode: 'chapter-intro'; sceneId: string }
    | { mode: 'playing' }
    | { mode: 'ending'; title: string; body: string };

  let view: View = { mode: 'menu' };
  let gameRoot: HTMLElement | null = null;
  let isFs = false;
  let lastGainBanner: { kind: 'item' | 'word'; label: string; sub: string } | null = null;
  let gainTimer: ReturnType<typeof setTimeout> | null = null;
  let unsubFs: (() => void) | null = null;
  let unsubBeat: (() => void) | null = null;

  // Sistema de hints: si el jugador no interactúa en X segundos sobre un
  // beat interactivo, mostramos un cartel "¿Atascado?".
  let lastInteraction = Date.now();
  let idleHint = false;
  let idleTimer: ReturnType<typeof setInterval> | null = null;

  function bumpInteraction() {
    lastInteraction = Date.now();
    idleHint = false;
  }

  // Guard contra reentrancia del procesado de side-effects.
  let processing = false;

  function isSideEffectBeat(b: import('../engine/types').Beat): boolean {
    return (
      b.type === 'gain-item' ||
      b.type === 'gain-word' ||
      b.type === 'set-bg' ||
      b.type === 'enter-actor' ||
      b.type === 'leave-actor' ||
      b.type === 'flag' ||
      b.type === 'goto-label' ||
      b.type === 'goto-scene' ||
      b.type === 'label' ||
      b.type === 'pause' ||
      b.type === 'ending'
    );
  }

  // Procesa beats de side-effect en cadena hasta llegar a uno interactivo
  // o cambiar de view. Crítico: el reactivo de Svelte NO encadena fiable
  // los $$invalidate dentro del mismo tick, por eso lo hacemos a mano.
  function processBeats() {
    if (processing) return;
    if (view.mode !== 'playing') return;
    processing = true;
    try {
      let safety = 200;
      while (safety-- > 0) {
        const beat = get(currentBeat);
        if (!beat) return;
        if (!isSideEffectBeat(beat)) return;
        const beforeCursor = get(story).cursor;
        const beforeSceneId = get(story).currentSceneId;
        handleSideEffect(beat);
        // si el view cambió a chapter-intro/ending, salimos
        if (view.mode !== 'playing') return;
        const afterCursor = get(story).cursor;
        const afterSceneId = get(story).currentSceneId;
        // si nada se movió, asumimos asíncrono (pause con setTimeout) y salimos
        if (afterCursor === beforeCursor && afterSceneId === beforeSceneId) return;
      }
      console.warn('[game] processBeats: safety guard hit en escena', get(story).currentSceneId);
    } finally {
      processing = false;
    }
  }

  function flashGain(kind: 'item' | 'word', label: string, sub: string) {
    lastGainBanner = { kind, label, sub };
    if (gainTimer) clearTimeout(gainTimer);
    gainTimer = setTimeout(() => (lastGainBanner = null), 2400);
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      if (gameRoot) toggleFullscreen(gameRoot);
    }
    if (e.key === 'Escape' && view.mode === 'playing') {
      e.preventDefault();
      // ESC abre menú (sin perder progreso, está autosave)
      saveGame();
      view = { mode: 'menu' };
    }
    // Enter / Space avanzan SOLO en narration. Para 'speak' el DialogueBox
    // tiene su propio handler con el typewriter (skip → reveal → continue).
    // Si gestionamos ambos aquí y allá, se salta contenido.
    if ((e.key === 'Enter' || e.key === ' ') && view.mode === 'playing') {
      const beat = get(currentBeat);
      const target = e.target as HTMLElement | null;
      const inField = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (inField) return;
      if (beat && beat.type === 'narration') {
        e.preventDefault();
        tryAdvance();
      }
    }
  }

  onMount(() => {
    loadGame();
    unsubFs = onFullscreenChange((fs) => (isFs = fs));
    // Subscribe a currentBeat: cada vez que el beat cambia, intenta procesar
    // side-effects. Combina con el reactivo de view más abajo.
    unsubBeat = currentBeat.subscribe(() => processBeats());
    // Watcher de inactividad: si hay beat interactivo pendiente y el usuario
    // lleva >7s sin clickar, mostramos hint.
    idleTimer = setInterval(() => {
      if (view.mode !== 'playing') {
        idleHint = false;
        return;
      }
      const beat = get(currentBeat);
      const isInteractive =
        beat &&
        (beat.type === 'narration' || beat.type === 'speak' || beat.type === 'choice' || beat.type === 'puzzle');
      if (isInteractive && Date.now() - lastInteraction > 7000) {
        idleHint = true;
      }
    }, 1500);
  });
  onDestroy(() => {
    if (unsubFs) unsubFs();
    if (unsubBeat) unsubBeat();
    if (gainTimer) clearTimeout(gainTimer);
    if (idleTimer) clearInterval(idleTimer);
  });

  // Reactivo: cuando view cambia a 'playing', arrancamos el procesador.
  // (necesario porque el subscribe a currentBeat puede haber fired antes
  // de que view fuera 'playing'.)
  $: if (view.mode === 'playing') processBeats();

  // ----- handlers de acciones de menú -----
  function startNewGame() {
    newGame('ch01-etxea');
    view = { mode: 'chapter-intro', sceneId: 'ch01-etxea' };
  }
  function continueGame() {
    // ya cargado en onMount; saltar a la escena con su intro si es nueva
    if ($currentScene && $story.cursor === 0) {
      view = { mode: 'chapter-intro', sceneId: $story.currentSceneId };
    } else {
      view = { mode: 'playing' };
    }
  }
  function pickChapter(sceneId: string) {
    gotoScene(sceneId);
    view = { mode: 'chapter-intro', sceneId };
  }
  function exitToPortal() {
    if (typeof location !== 'undefined') location.href = '/es/';
  }

  // Clamp helper para posiciones de actores: y entre 40-65 para no
  // solaparse con el dialogue, scale entre 1.2-1.8 para que entren
  // en el viewport.
  function clampActor(a: { x: number; y: number; scale?: number; flip?: boolean }) {
    return {
      x: Math.max(8, Math.min(92, a.x)),
      y: Math.max(40, Math.min(65, a.y)),
      scale: Math.max(1.2, Math.min(1.85, a.scale ?? 1.5)),
      flip: !!a.flip,
    };
  }

  // Botón de "Avanzar" siempre disponible en HUD. Para narration/speak,
  // hace lo mismo que un click en la caja. Para puzzle/choice no fuerza
  // (el jugador tiene que decidir), pero limpia idleHint.
  function tryAdvance() {
    bumpInteraction();
    const beat = get(currentBeat);
    if (!beat) return;
    if (beat.type === 'narration' || beat.type === 'speak') {
      advance();
    } else if (isSideEffectBeat(beat)) {
      processBeats();
    }
  }

  function handleSideEffect(b: Beat) {
    switch (b.type) {
      case 'gain-item':
        gainItem(b.item);
        flashGain('item', `+${b.item.icon} ${b.item.name}`, b.flavor ?? b.item.description);
        // Pausa para que el banner se vea antes del siguiente beat. processBeats
        // verá que el cursor no cambió y saldrá del loop. setTimeout reanuda
        // mediante el subscribe a currentBeat.
        setTimeout(() => advance(), 900);
        break;
      case 'gain-word':
        gainWord(b.word);
        flashGain('word', b.word.eu, b.word.es);
        setTimeout(() => advance(), 900);
        break;
      case 'set-bg':
        setBackground(b.bgId);
        advance();
        break;
      case 'enter-actor':
        enterActor(b.actor);
        advance();
        break;
      case 'leave-actor':
        leaveActor(b.actorId);
        advance();
        break;
      case 'flag':
        setFlag(b.flag, b.value !== false);
        advance();
        break;
      case 'goto-label': {
        const before = $story.cursor;
        gotoLabel(b.label);
        // Si gotoLabel no encontró el label, el cursor no se movió.
        // Avanzamos manualmente para no quedar atascados en bucle.
        if ($story.cursor === before) {
          console.warn(`[game] label '${b.label}' no encontrado en escena ${$currentScene?.id}; avanzando`);
          advance();
        }
        break;
      }
      case 'goto-scene': {
        const sceneExists = !!getSceneById(b.scene);
        if (!sceneExists) {
          console.warn(`[game] escena '${b.scene}' no existe; mostrando ending fallback`);
          view = { mode: 'ending', title: 'Continuará…', body: 'Has llegado al final del prototipo. Más capítulos en próximas versiones.' };
        } else {
          gotoScene(b.scene);
          view = { mode: 'chapter-intro', sceneId: b.scene };
        }
        break;
      }
      case 'label':
        advance();
        break;
      case 'pause':
        setTimeout(() => advance(), b.ms);
        break;
      case 'ending':
        view = { mode: 'ending', title: b.title, body: b.body };
        break;
      default:
        // narration / speak / choice / puzzle requieren input del jugador
        break;
    }
  }

  function onChoicePick(detail: Choice) {
    bumpInteraction();
    applyChoice(detail);
  }
  function onPuzzleResult(success: boolean) {
    bumpInteraction();
    if (!success || !$currentBeat || $currentBeat.type !== 'puzzle') return;
    const beat = $currentBeat;
    if (beat.onSuccess) {
      gotoLabel(beat.onSuccess);
    } else {
      advance();
    }
  }
  function onDialogueContinue() {
    bumpInteraction();
    advance();
  }
</script>

<svelte:window on:keydown={handleKey} />

<div class="game" bind:this={gameRoot} class:fullscreen={isFs}>
  {#if view.mode === 'menu'}
    <MainMenu
      on:new-game={startNewGame}
      on:continue={continueGame}
      on:chapters={() => (view = { mode: 'chapter-select' })}
      on:exit={exitToPortal}
    />
  {:else if view.mode === 'chapter-select'}
    <ChapterSelect
      on:pick={(e) => pickChapter(e.detail)}
      on:back={() => (view = { mode: 'menu' })}
    />
  {:else if view.mode === 'chapter-intro'}
    {@const scene = $currentScene}
    {#if scene && scene.id === view.sceneId && scene.intro}
      <ChapterIntro
        chapter={scene.chapter}
        title={scene.intro.title}
        subtitle={scene.intro.subtitle}
        body={scene.intro.body}
        level={scene.level}
        playable={scene.playable}
        on:enter={() => (view = { mode: 'playing' })}
        on:back={() => (view = { mode: 'menu' })}
      />
    {/if}
  {:else if view.mode === 'playing' && $currentScene}
    <div class="stage">
      <Background bgId={$story.bgOverride ?? $currentScene.bgId} />
      <div class="stage-band" aria-hidden="true"></div>
      <!-- actores -->
      {#each Object.values($story.actors) as a (a.id)}
        {@const ca = clampActor(a)}
        <div
          class="actor"
          style={`inset-inline-start: ${ca.x}%; inset-block-end: ${100 - ca.y}%;`}
        >
          <div class="actor-shadow" aria-hidden="true"></div>
          <Sprite id={a.spriteId} scale={ca.scale} flip={ca.flip} />
        </div>
      {/each}
    </div>

    <header class="hud-top">
      <div class="hud-info">
        <span class="ch-label">Atala {$currentScene.chapter.toString().padStart(2, '0')} · {$currentScene.title}</span>
        <span class="lvl-tag">{$currentScene.level.toUpperCase()}</span>
      </div>
      <div class="hud-actions">
        <button class="hud-btn primary-btn" on:click={tryAdvance} title="Avanzar (Enter / Espacio)">▶ Avanzar</button>
        <button class="hud-btn" on:click={() => (view = { mode: 'menu' })} title="Menú (Esc)">☰ Menú</button>
        <button class="hud-btn" on:click={() => gameRoot && toggleFullscreen(gameRoot)} title="Pantalla completa (F)">{isFs ? '⮌' : '⛶'}</button>
      </div>
    </header>

    {#if lastGainBanner}
      <div class="gain-banner" class:item={lastGainBanner.kind === 'item'} class:word={lastGainBanner.kind === 'word'}>
        <strong>{lastGainBanner.kind === 'item' ? 'Encontrado' : 'Nueva palabra'}: {lastGainBanner.label}</strong>
        <span>{lastGainBanner.sub}</span>
      </div>
    {/if}

    <div class="hud-bottom">
      {#if $currentBeat}
        {@const b = $currentBeat}
        {#if b.type === 'narration'}
          <button class="narration" on:click={onDialogueContinue}>
            <p>{b.text}</p>
            <span class="cont">▶ Continuar</span>
          </button>
        {:else if b.type === 'speak'}
          <DialogueBox
            speaker={b.speaker}
            spriteId={b.spriteId}
            eu={b.eu}
            es={b.es}
            emotion={b.emotion ?? 'neutral'}
            on:continue={onDialogueContinue}
          />
        {:else if b.type === 'choice'}
          <ChoiceList prompt={b.prompt} options={b.options} on:pick={(e) => onChoicePick(e.detail)} />
        {:else if b.type === 'puzzle'}
          <PuzzleHost puzzle={b.puzzle} on:result={(e) => onPuzzleResult(e.detail.success)} />
        {:else}
          <!-- side-effect que aún no se ha procesado: muestra botón de rescate -->
          <button class="narration stuck" on:click={tryAdvance}>
            <p>Procesando… si no avanza, pulsa aquí.</p>
            <span class="cont">▶ Avanzar</span>
          </button>
        {/if}
      {:else}
        <button class="narration stuck" on:click={tryAdvance}>
          <p>El abuelo guarda silencio. Pulsa para continuar el viaje.</p>
          <span class="cont">▶ Avanzar</span>
        </button>
      {/if}

      <div class="hud-side">
        <Inventory />
        <Notebook />
      </div>
    </div>

    {#if idleHint}
      <div class="idle-hint" role="status">
        <p><strong>¿Atascado?</strong> Pulsa la caja de diálogo (o usa <kbd>Enter</kbd> · <kbd>▶ Avanzar</kbd> arriba a la derecha).</p>
      </div>
    {/if}

  {:else if view.mode === 'ending'}
    <div class="ending">
      <p class="kicker">Amaiera</p>
      <h2 class="display">{view.title}</h2>
      <div class="ending-body">
        {#each view.body.split('\n\n') as p}
          <p>{p}</p>
        {/each}
      </div>
      <div class="ending-actions">
        <button class="primary" on:click={() => (view = { mode: 'menu' })}>Volver al menú principal</button>
        <button class="ghost" on:click={exitToPortal}>← Salir al portal</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .game {
    position: relative;
    inline-size: 100%;
    aspect-ratio: 16 / 9;
    background: #050402;
    border: 2px solid #6a5a3a;
    border-radius: var(--r-md);
    overflow: hidden;
    color: #f0e6d0;
    font-family: var(--ff-sans);
    user-select: none;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
  }
  .game.fullscreen {
    border: 0;
    border-radius: 0;
    aspect-ratio: auto;
    block-size: 100vh;
  }
  .stage {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }
  /* Banda de "escenario" que separa fondo de zona de diálogo y crea
     una franja donde los personajes se sitúan. Suave gradiente sin
     línea dura para no romper la composición de cada fondo. */
  .stage-band {
    position: absolute;
    inset-block-end: 0;
    inset-inline: 0;
    block-size: 38%;
    background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.22) 60%, rgba(0, 0, 0, 0.55));
    pointer-events: none;
    z-index: 1;
  }
  .actor {
    position: absolute;
    transform: translate(-50%, 0);
    z-index: 5;
    pointer-events: none;
    filter: drop-shadow(2px 4px 0 rgba(0, 0, 0, 0.55));
  }
  /* Sombra elíptica bajo el personaje para anclarlo al "suelo" */
  .actor-shadow {
    position: absolute;
    inset-block-end: -6px;
    inset-inline-start: 50%;
    transform: translateX(-50%);
    inline-size: 64px;
    block-size: 12px;
    border-radius: 50%;
    background: radial-gradient(ellipse, rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0));
    pointer-events: none;
  }

  /* ---- HUD ---- */
  .hud-top {
    position: absolute;
    inset-block-start: 0;
    inset-inline: 0;
    z-index: 30;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--s-3) var(--s-4);
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.7), transparent);
    pointer-events: none;
  }
  .hud-info {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    font-family: var(--ff-display);
    font-style: italic;
  }
  .ch-label { color: #d4a017; font-size: 0.95rem; }
  .lvl-tag {
    font-size: 0.7rem;
    background: #d4a017;
    color: #1a0e08;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 700;
    letter-spacing: 0.05em;
    font-style: normal;
  }
  .hud-actions { display: flex; gap: var(--s-2); pointer-events: auto; }
  .hud-btn {
    background: rgba(15, 12, 8, 0.85);
    border: 1px solid #4a3a22;
    color: #f0e6d0;
    padding: var(--s-1) var(--s-3);
    border-radius: var(--r-sm);
    font-family: inherit;
    cursor: pointer;
    font-size: 0.85rem;
    transition: border-color 0.15s, background 0.15s;
  }
  .hud-btn:hover { border-color: #d4a017; background: rgba(40, 32, 22, 0.9); }
  .hud-btn.primary-btn {
    background: rgba(212, 160, 23, 0.18);
    border-color: #d4a017;
    color: #f0d878;
    font-weight: 700;
  }
  .hud-btn.primary-btn:hover { background: rgba(212, 160, 23, 0.32); color: #fff; }

  /* ---- HUD bottom: dialogue / choices / puzzle ---- */
  .hud-bottom {
    position: absolute;
    inset-block-end: 0;
    inset-inline: 0;
    z-index: 20;
    padding: var(--s-3);
    display: grid;
    gap: var(--s-2);
  }
  .hud-side {
    display: flex;
    gap: var(--s-2);
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: end;
  }

  .narration {
    inline-size: 100%;
    text-align: start;
    background: rgba(15, 12, 8, 0.94);
    border: 1px solid #6a5a3a;
    border-inline-start: 3px solid #d4a017;
    border-radius: var(--r-sm);
    padding: var(--s-3) var(--s-4);
    padding-inline-end: 110px; /* espacio para el indicador "Continuar" */
    color: #d8c8a8;
    font-style: italic;
    line-height: 1.5;
    cursor: pointer;
    font-family: inherit;
    position: relative;
    animation: pulse-edge 2.4s ease-in-out infinite;
  }
  .narration:hover { background: rgba(25, 20, 12, 0.96); }
  .narration p { margin: 0; }
  .narration .cont {
    position: absolute;
    inset-block-end: var(--s-2);
    inset-inline-end: var(--s-3);
    color: #d4a017;
    animation: nudge 1.5s ease-in-out infinite;
    font-style: normal;
    font-weight: 700;
    font-size: 0.85rem;
  }
  .narration.stuck {
    border-color: #d4a017;
    background: rgba(40, 32, 22, 0.96);
    color: #f0e6d0;
  }
  @keyframes pulse-edge {
    0%, 100% { box-shadow: 0 0 0 0 rgba(212, 160, 23, 0); }
    50%      { box-shadow: 0 0 0 3px rgba(212, 160, 23, 0.18); }
  }
  @keyframes nudge {
    0%, 100% { transform: translateX(0); }
    50%      { transform: translateX(4px); }
  }

  /* gain banner */
  .gain-banner {
    position: absolute;
    inset-block-start: 64px;
    inset-inline-end: var(--s-4);
    z-index: 35;
    display: grid;
    gap: 2px;
    padding: var(--s-2) var(--s-4);
    background: rgba(15, 12, 8, 0.94);
    border: 1px solid #d4a017;
    border-radius: var(--r-sm);
    color: #f0e6d0;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    animation: slide-in 0.4s ease-out;
    max-inline-size: 320px;
  }
  .gain-banner.item { border-color: #2e8b57; }
  .gain-banner.word { border-color: #d4a017; }
  .gain-banner strong { color: #d4a017; font-size: 0.9rem; }
  .gain-banner.item strong { color: #6cd49a; }
  .gain-banner span { color: #a89c7a; font-size: 0.82rem; font-style: italic; }
  @keyframes slide-in {
    from { transform: translateX(50px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  /* ---- ending ---- */
  .ending {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background:
      radial-gradient(circle at 50% 30%, rgba(212, 160, 23, 0.12), transparent 60%),
      #050402;
    z-index: 50;
    padding: var(--s-5);
    text-align: center;
  }
  .ending > * { inline-size: 100%; max-inline-size: 720px; }
  .kicker {
    margin: 0;
    color: #d4a017;
    font-size: 0.78rem;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    font-weight: 600;
  }
  .ending h2 {
    margin: var(--s-2) 0 var(--s-5);
    font-family: var(--ff-display);
    font-size: clamp(2rem, 5vw, 3.4rem);
    color: #f0e6d0;
    line-height: 1.05;
  }
  .ending-body {
    display: grid;
    gap: var(--s-3);
    margin-block-end: var(--s-6);
    color: #d8c8a8;
    line-height: 1.7;
  }
  .ending-body p { margin: 0; }
  .ending-actions { display: flex; gap: var(--s-3); justify-content: center; flex-wrap: wrap; }
  .primary {
    padding: var(--s-3) var(--s-5);
    background: #d4a017;
    color: #1a0e08;
    border: 0;
    border-radius: var(--r-sm);
    font-weight: 700;
    cursor: pointer;
  }
  .primary:hover { background: #f0c038; }
  .ghost {
    padding: var(--s-2) var(--s-4);
    background: transparent;
    color: #a89c7a;
    border: 1px solid #4a3a22;
    border-radius: var(--r-sm);
    cursor: pointer;
  }
  .ghost:hover { border-color: #d4a017; color: #f0e6d0; }

  /* ---- responsive ---- */
  @media (max-width: 720px) {
    .game { aspect-ratio: 4 / 5; }
    .hud-side { display: none; }
  }
</style>
