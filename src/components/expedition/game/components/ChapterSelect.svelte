<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getAllScenes } from '../scenes';
  import { story } from '../engine/state';

  const dispatch = createEventDispatcher<{ pick: string; back: void }>();

  $: scenes = getAllScenes().sort((a, b) => a.chapter - b.chapter);
</script>

<div class="sel" role="dialog" aria-modal="true">
  <header>
    <h2 class="display">Atalak · Capítulos</h2>
    <p class="sub">Selecciona un capítulo. Los completados se pueden revisitar.</p>
  </header>
  <ul class="list">
    {#each scenes as scene}
      {@const status = $story.progress[scene.id] ?? 'unvisited'}
      {@const lockedByChapter = scene.chapter > 2 && status === 'unvisited' && !scene.playable}
      <li class:current={scene.id === $story.currentSceneId}>
        <button
          class="row"
          class:locked={lockedByChapter}
          on:click={() => !lockedByChapter && dispatch('pick', scene.id)}
        >
          <span class="num">{scene.chapter.toString().padStart(2, '0')}</span>
          <span class="info">
            <span class="t">{scene.title}</span>
            <span class="sb">{scene.subtitle}</span>
          </span>
          <span class="badges">
            <span class="lvl">{scene.level.toUpperCase()}</span>
            {#if status === 'completed'}<span class="state ok">✓</span>
            {:else if status === 'in-progress'}<span class="state act">⏵</span>
            {:else if !scene.playable}<span class="state lock">🔒</span>
            {:else}<span class="state new">·</span>{/if}
          </span>
        </button>
      </li>
    {/each}
  </ul>
  <button class="back" on:click={() => dispatch('back')}>← Volver</button>
</div>

<style>
  .sel {
    position: absolute;
    inset: 0;
    background: rgba(13, 10, 8, 0.97);
    z-index: 55;
    display: grid;
    grid-template-rows: auto 1fr auto;
    padding: var(--s-5);
    color: #f0e6d0;
  }
  header { text-align: center; margin-block-end: var(--s-5); }
  h2 {
    margin: 0;
    font-family: var(--ff-display);
    font-size: clamp(1.8rem, 4vw, 2.6rem);
    color: #d4a017;
  }
  .sub { margin: var(--s-1) 0 0; color: #a89c7a; }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: var(--s-2);
    overflow-y: auto;
    max-block-size: 60vh;
  }
  .row {
    inline-size: 100%;
    text-align: start;
    display: grid;
    grid-template-columns: 56px 1fr auto;
    gap: var(--s-3);
    align-items: center;
    padding: var(--s-3) var(--s-4);
    background: rgba(40, 32, 22, 0.6);
    border: 1px solid #4a3a22;
    border-radius: var(--r-sm);
    color: #f0e6d0;
    font-family: inherit;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, transform 0.15s;
  }
  .row:hover:not(.locked) {
    border-color: #d4a017;
    background: rgba(212, 160, 23, 0.1);
    transform: translateX(3px);
  }
  .row.locked { cursor: not-allowed; opacity: 0.55; }
  .current .row { border-color: #d4a017; }
  .num {
    font-family: var(--ff-display);
    font-size: 1.6rem;
    color: #d4a017;
    font-style: italic;
  }
  .info { display: grid; gap: 2px; }
  .t { font-weight: 600; }
  .sb { font-size: 0.85rem; color: #a89c7a; }
  .badges { display: flex; align-items: center; gap: var(--s-2); }
  .lvl {
    font-size: 0.7rem;
    background: #2a1f12;
    color: #d4a017;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 700;
    letter-spacing: 0.05em;
  }
  .state.ok { color: #2e8b57; font-weight: 700; }
  .state.act { color: #d4a017; }
  .state.lock { color: #6a5a3a; }
  .state.new { color: #6a5a3a; }
  .back {
    justify-self: start;
    padding: var(--s-2) var(--s-4);
    background: transparent;
    color: #a89c7a;
    border: 1px solid #4a3a22;
    border-radius: var(--r-sm);
    cursor: pointer;
    margin-block-start: var(--s-4);
  }
  .back:hover { border-color: #d4a017; color: #f0e6d0; }
</style>
