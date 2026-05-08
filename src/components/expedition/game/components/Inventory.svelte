<script lang="ts">
  import { story } from '../engine/state';
  import type { Item } from '../engine/types';

  let active: Item | null = null;
</script>

<div class="inv">
  <div class="title">Maleta</div>
  <ul class="slots">
    {#each $story.inventory as it}
      <li>
        <button class="slot" on:click={() => (active = active?.id === it.id ? null : it)}>
          <span class="ic">{it.icon}</span>
          <span class="lb">{it.name}</span>
        </button>
      </li>
    {/each}
    {#if $story.inventory.length === 0}
      <li class="empty">Vacía aún</li>
    {/if}
  </ul>
  {#if active}
    <div class="detail" role="status">
      <strong>{active.name}</strong>
      <span>{active.description}</span>
    </div>
  {/if}
</div>

<style>
  .inv {
    display: grid;
    gap: var(--s-2);
    padding: var(--s-3);
    background: rgba(15, 12, 8, 0.85);
    border: 1px solid #6a5a3a;
    border-radius: var(--r-sm);
    color: #f0e6d0;
    font-size: 0.85rem;
  }
  .title {
    font-family: var(--ff-display);
    font-style: italic;
    color: #d4a017;
    font-size: 0.95rem;
  }
  .slots {
    list-style: none; margin: 0; padding: 0;
    display: flex;
    gap: var(--s-2);
    flex-wrap: wrap;
  }
  .empty { color: #a89c7a; font-style: italic; padding: var(--s-1); }
  .slot {
    display: inline-flex;
    align-items: center;
    gap: var(--s-2);
    padding: var(--s-2) var(--s-3);
    background: rgba(40, 32, 22, 0.7);
    border: 1px solid #6a5a3a;
    border-radius: var(--r-sm);
    color: #f0e6d0;
    font-family: inherit;
    font-size: 0.85rem;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }
  .slot:hover { border-color: #d4a017; background: rgba(212, 160, 23, 0.12); }
  .ic { font-size: 1.1rem; }
  .detail {
    padding: var(--s-2) var(--s-3);
    background: rgba(40, 32, 22, 0.6);
    border-inline-start: 2px solid #d4a017;
    display: grid;
    gap: 2px;
  }
  .detail strong { color: #d4a017; }
  .detail span { font-size: 0.82rem; color: #a89c7a; }
</style>
