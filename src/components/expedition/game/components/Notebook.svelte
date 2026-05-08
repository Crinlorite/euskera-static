<script lang="ts">
  import { story } from '../engine/state';

  let open = false;
</script>

<div class="nb">
  <button class="toggle" on:click={() => (open = !open)} aria-expanded={open}>
    📖 Koadernoa <span class="count">{$story.notebook.length}</span>
  </button>
  {#if open}
    <div class="panel" role="dialog" aria-label="Cuaderno de palabras">
      <h3>Hitzak ikasiak</h3>
      {#if $story.notebook.length === 0}
        <p class="empty">Aún no has aprendido palabras nuevas. Sigue avanzando.</p>
      {:else}
        <ul class="words">
          {#each $story.notebook as w}
            <li>
              <span class="eu">{w.eu}</span>
              <span class="es">{w.es}</span>
              <span class="lvl" title={`Nivel ${w.level.toUpperCase()}`}>{w.level.toUpperCase()}</span>
              {#if w.context}<span class="ctx">"{w.context}"</span>{/if}
            </li>
          {/each}
        </ul>
      {/if}
      <button class="close" on:click={() => (open = false)}>Cerrar</button>
    </div>
  {/if}
</div>

<style>
  .nb { position: relative; }
  .toggle {
    display: inline-flex; align-items: center; gap: var(--s-2);
    padding: var(--s-2) var(--s-3);
    background: rgba(15, 12, 8, 0.85);
    border: 1px solid #6a5a3a;
    border-radius: var(--r-sm);
    color: #f0e6d0;
    font-family: inherit;
    font-size: 0.85rem;
    cursor: pointer;
    transition: border-color 0.15s;
  }
  .toggle:hover { border-color: #d4a017; }
  .count {
    background: #d4a017;
    color: #1a0e08;
    padding: 0 6px;
    border-radius: 10px;
    font-weight: 700;
    font-size: 0.78rem;
  }
  .panel {
    position: fixed;
    inset-block-end: 80px;
    inset-inline-start: 50%;
    transform: translateX(-50%);
    inline-size: min(560px, 92vw);
    max-block-size: 60vh;
    overflow-y: auto;
    padding: var(--s-5);
    background: rgba(15, 12, 8, 0.97);
    border: 2px solid #d4a017;
    border-radius: var(--r-md);
    color: #f0e6d0;
    z-index: 50;
    box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.6);
  }
  .panel h3 {
    margin: 0 0 var(--s-3);
    font-family: var(--ff-display);
    font-style: italic;
    color: #d4a017;
  }
  .empty { color: #a89c7a; font-style: italic; }
  .words { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-2); }
  .words li {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: var(--s-2);
    padding: var(--s-2) var(--s-3);
    background: rgba(40, 32, 22, 0.5);
    border-inline-start: 2px solid #d4a017;
    border-radius: var(--r-sm);
    align-items: center;
  }
  .eu { font-weight: 700; color: #f0e6d0; }
  .es { color: #a89c7a; font-style: italic; }
  .lvl {
    font-size: 0.7rem;
    background: #d4a017;
    color: #1a0e08;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 700;
    letter-spacing: 0.05em;
  }
  .ctx {
    grid-column: 1 / -1;
    font-size: 0.78rem;
    color: #a89c7a;
    font-style: italic;
  }
  .close {
    margin-block-start: var(--s-3);
    padding: var(--s-2) var(--s-4);
    background: #d4a017;
    color: #1a0e08;
    border: 0;
    border-radius: var(--r-sm);
    font-weight: 700;
    cursor: pointer;
  }
</style>
