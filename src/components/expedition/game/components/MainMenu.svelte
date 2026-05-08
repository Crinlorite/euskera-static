<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { hasSave, story } from '../engine/state';

  const dispatch = createEventDispatcher<{
    'new-game': void;
    'continue': void;
    'chapters': void;
    'exit': void;
  }>();

  let saveExists = false;
  let lastSaved: string | null = null;

  $: { // recompute on store changes
    saveExists = $story && hasSave();
    lastSaved = $story?.lastSavedAt ?? null;
  }
</script>

<div class="menu" role="dialog" aria-modal="true">
  <div class="hero">
    <p class="kicker">Modo Expedición · Vista previa</p>
    <h1 class="display">Aitonaren <em>Hitzak</em></h1>
    <p class="tag">Una aventura por Euskal Herria<br/>buscando las palabras del abuelo</p>
  </div>

  <div class="actions">
    {#if saveExists}
      <button class="primary" on:click={() => dispatch('continue')}>
        ▶ Continuar
        {#if lastSaved}
          <span class="meta">{new Date(lastSaved).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</span>
        {/if}
      </button>
    {/if}
    <button class="primary" class:secondary={saveExists} on:click={() => dispatch('new-game')}>
      {saveExists ? 'Nueva partida (sobrescribir)' : '▶ Comenzar aventura'}
    </button>
    <button class="ghost" on:click={() => dispatch('chapters')}>Selección de capítulos</button>
    <button class="ghost" on:click={() => dispatch('exit')}>← Salir al portal</button>
  </div>

  <p class="footer-tip">
    Recomendado a pantalla completa. Puedes activarla con la tecla <kbd>F</kbd>.
  </p>
</div>

<style>
  .menu {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background:
      radial-gradient(circle at 30% 20%, rgba(212, 160, 23, 0.08), transparent 50%),
      radial-gradient(circle at 70% 80%, rgba(199, 25, 28, 0.08), transparent 50%),
      #0d0a08;
    z-index: 50;
    padding: var(--s-5);
    color: #f0e6d0;
  }
  .menu > * { inline-size: 100%; max-inline-size: 540px; text-align: center; }
  .hero { margin-block-end: var(--s-6); }
  .kicker {
    margin: 0;
    color: #d4a017;
    font-size: 0.78rem;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    font-weight: 600;
  }
  h1 {
    margin: var(--s-3) 0 var(--s-2);
    font-family: var(--ff-display);
    font-size: clamp(2.2rem, 7vw, 4rem);
    line-height: 1;
    letter-spacing: -0.03em;
  }
  h1 em {
    font-style: italic;
    color: #d4a017;
  }
  .tag {
    margin: 0;
    color: #a89c7a;
    font-style: italic;
    line-height: 1.5;
  }
  .actions {
    display: grid;
    gap: var(--s-3);
    margin-block-end: var(--s-5);
  }
  .primary {
    padding: var(--s-4);
    background: #d4a017;
    color: #1a0e08;
    border: 0;
    border-radius: var(--r-sm);
    font-weight: 700;
    font-size: 1.05rem;
    cursor: pointer;
    transition: background 0.18s, transform 0.18s;
    display: grid;
    gap: 2px;
    place-items: center;
  }
  .primary:hover { background: #f0c038; transform: translateY(-1px); }
  .primary.secondary {
    background: transparent;
    color: #d4a017;
    border: 1px solid #d4a017;
  }
  .primary.secondary:hover { background: rgba(212, 160, 23, 0.12); }
  .meta { font-size: 0.7rem; color: #6a4f10; font-weight: 500; }
  .ghost {
    padding: var(--s-2) var(--s-4);
    background: transparent;
    color: #a89c7a;
    border: 1px solid #4a3a22;
    border-radius: var(--r-sm);
    cursor: pointer;
    transition: border-color 0.18s, color 0.18s;
  }
  .ghost:hover { border-color: #d4a017; color: #f0e6d0; }
  .footer-tip {
    margin: 0;
    color: #6a5a3a;
    font-size: 0.82rem;
  }
  kbd {
    background: #2a1f12;
    border: 1px solid #6a5a3a;
    padding: 1px 6px;
    border-radius: 3px;
    font-family: ui-monospace, monospace;
    color: #d4a017;
    font-size: 0.78rem;
  }
</style>
