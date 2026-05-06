<script lang="ts">
  import { onMount } from 'svelte';
  import { ACHIEVEMENTS, evaluate, type Achievement, type AchievementCategory } from '../../lib/achievements';
  import { getProgress, unlockAchievements } from '../../stores/progress';

  // Unused but kept para compat (catalog está hardcoded en lib)
  export let catalog: Achievement[] = ACHIEVEMENTS;
  // Mapas necesarios para evaluar logros que dependen de qué lecciones existen.
  export let lessonsByUnit: Record<string, string[]> = {};
  export let unitsByLevel: Record<string, { unitIds: string[] }> = {};
  export let locale: string = 'es';

  let unlockedIds: string[] = [];
  let unlockedAt: Record<string, string> = {};

  onMount(() => {
    const progress = getProgress();
    const knownKeys = new Set<string>();
    for (const ids of Object.values(lessonsByUnit)) {
      for (const id of ids) knownKeys.add(id);
    }
    // Evalúa logros automáticos a partir del estado actual y los persiste.
    const auto = evaluate(progress, knownKeys, unitsByLevel, lessonsByUnit);
    if (auto.length > 0) unlockAchievements(auto);
    // Lee tras persistir para incluir trigger-only que ya estaban
    const after = getProgress();
    const ach = after.achievements ?? {};
    unlockedIds = Object.keys(ach);
    unlockedAt = Object.fromEntries(
      Object.entries(ach).map(([id, v]) => [id, v.unlockedAt]),
    );
  });

  type Filter = 'all' | AchievementCategory;

  let activeFilter: Filter = 'all';

  $: unlockedSet = new Set(unlockedIds);
  $: total = ACHIEVEMENTS.length;
  $: unlockedCount = ACHIEVEMENTS.filter((a) => unlockedSet.has(a.id)).length;

  $: visible = activeFilter === 'all'
    ? ACHIEVEMENTS
    : ACHIEVEMENTS.filter((a) => a.category === activeFilter);

  // Mantén el orden: desbloqueados primero, luego bloqueados (estabilidad
  // visual conforme el usuario va consiguiéndolos).
  $: ordered = [...visible].sort((a, b) => {
    const ua = unlockedSet.has(a.id) ? 0 : 1;
    const ub = unlockedSet.has(b.id) ? 0 : 1;
    return ua - ub;
  });

  const FILTERS: Array<{ id: Filter; label: string }> = [
    { id: 'all',       label: 'Todos' },
    { id: 'milestone', label: 'Hitos' },
    { id: 'mastery',   label: 'Maestría' },
    { id: 'streak',    label: 'Constancia' },
    { id: 'volume',    label: 'Volumen' },
  ];

  function formatDate(iso: string): string {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      // Locale del usuario para fechas, pero sin hora — solo día.
      return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return iso.slice(0, 10);
    }
  }

  function tooltipFor(a: Achievement): string {
    if (unlockedSet.has(a.id)) {
      const when = unlockedAt[a.id];
      return when ? `Desbloqueado: ${formatDate(when)}` : 'Desbloqueado';
    }
    return a.description;
  }
</script>

<section class="ach" aria-labelledby="achievements-heading">
  <header class="head">
    <p class="eyebrow">Tu camino</p>
    <h2 id="achievements-heading" class="title display">Logros</h2>
    <p class="counter" aria-live="polite">
      <span class="counter-num text-grad">{unlockedCount}</span>
      <span class="counter-of">de {total} desbloqueados</span>
    </p>
  </header>

  <div class="filters" role="tablist" aria-label="Filtrar logros por categoría">
    {#each FILTERS as f (f.id)}
      <button
        type="button"
        role="tab"
        aria-selected={activeFilter === f.id}
        class="pill"
        class:active={activeFilter === f.id}
        on:click={() => (activeFilter = f.id)}
      >
        {f.label}
      </button>
    {/each}
  </div>

  <ul class="grid">
    {#each ordered as a (a.id)}
      {@const isUnlocked = unlockedSet.has(a.id)}
      <li
        class="card"
        class:unlocked={isUnlocked}
        class:locked={!isUnlocked}
        title={tooltipFor(a)}
      >
        <span class="icon" aria-hidden="true">{a.icon}</span>
        {#if isUnlocked}
          <span class="check" aria-hidden="true">✓</span>
        {/if}
        <h3 class="card-title">{a.title}</h3>
        <p class="card-desc">{a.description}</p>
        {#if isUnlocked && unlockedAt[a.id]}
          <p class="card-date">Desbloqueado: {formatDate(unlockedAt[a.id])}</p>
        {/if}
      </li>
    {/each}
  </ul>
</section>

<style>
  .ach {
    margin-block: var(--s-7);
  }

  .head {
    display: grid;
    gap: var(--s-2);
    margin-block-end: var(--s-5);
  }
  .eyebrow {
    font-family: var(--ff-sans);
    font-size: var(--t-eyebrow);
    font-weight: 600;
    letter-spacing: var(--tr-wide);
    text-transform: uppercase;
    color: var(--c-text-muted);
    margin: 0;
  }
  .title {
    font-family: var(--ff-display);
    font-weight: 700;
    font-size: clamp(1.65rem, 3.2vw, 2rem);
    line-height: 1.05;
    letter-spacing: var(--tr-tight);
    margin: 0;
  }
  .counter {
    margin: 0;
    display: flex;
    align-items: baseline;
    gap: var(--s-2);
    font-family: var(--ff-sans);
  }
  .counter-num {
    font-family: var(--ff-display);
    font-weight: 700;
    font-size: clamp(1.6rem, 3vw, 2rem);
    line-height: 1;
  }
  .counter-of {
    font-size: 0.95rem;
    color: var(--c-text-muted);
  }

  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-2);
    margin-block-end: var(--s-5);
  }
  .pill {
    font-family: var(--ff-sans);
    font-size: 0.82rem;
    font-weight: 600;
    letter-spacing: -0.005em;
    padding: 0.35rem 0.85rem;
    border-radius: var(--r-pill);
    border: 1px solid var(--c-border);
    background: var(--c-bg);
    color: var(--c-text);
    cursor: pointer;
    transition: background var(--m-fast) var(--ease-out),
                border-color var(--m-fast) var(--ease-out),
                color var(--m-fast) var(--ease-out);
  }
  .pill:hover {
    border-color: var(--c-red);
    color: var(--c-red);
  }
  .pill.active {
    background: var(--c-text);
    color: var(--c-bg);
    border-color: var(--c-text);
  }
  .pill:focus-visible {
    outline: 2px solid var(--c-red);
    outline-offset: 2px;
  }

  .grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--s-3);
  }
  @media (min-width: 720px) {
    .grid { grid-template-columns: repeat(3, 1fr); }
  }
  @media (min-width: 1080px) {
    .grid { grid-template-columns: repeat(4, 1fr); }
  }

  .card {
    position: relative;
    display: grid;
    gap: var(--s-2);
    padding: var(--s-4);
    background: var(--c-bg);
    border: 1px solid var(--c-border);
    border-radius: var(--r-lg);
    box-shadow: var(--sh-card);
    transition: transform var(--m-base) var(--ease-out),
                box-shadow var(--m-base) var(--ease-out),
                border-color var(--m-base) var(--ease-out),
                opacity var(--m-base) var(--ease-out),
                filter var(--m-base) var(--ease-out);
    isolation: isolate;
    min-block-size: 132px;
  }
  .card.unlocked {
    border-color: var(--c-border);
  }
  .card.unlocked:hover {
    transform: translateY(-3px) scale(1.02);
    box-shadow: var(--sh-card-hover), 0 0 0 1px rgba(213, 43, 30, 0.16);
    border-color: transparent;
  }
  .card.locked {
    opacity: 0.4;
    filter: grayscale(0.85) blur(0.5px);
  }
  .card.locked:hover {
    opacity: 0.6;
    filter: grayscale(0.7);
  }

  .icon {
    font-size: 2rem;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    block-size: 2.2rem;
  }
  .card.locked .icon {
    filter: grayscale(1);
  }

  .check {
    position: absolute;
    inset-block-start: var(--s-3);
    inset-inline-end: var(--s-3);
    inline-size: 1.25rem;
    block-size: 1.25rem;
    border-radius: 50%;
    background: var(--c-green);
    color: #fff;
    font-family: var(--ff-sans);
    font-size: 0.72rem;
    font-weight: 700;
    line-height: 1.25rem;
    text-align: center;
  }

  .card-title {
    margin: 0;
    font-family: var(--ff-sans);
    font-weight: 600;
    font-size: 1rem;
    line-height: 1.25;
    letter-spacing: -0.005em;
  }
  .card-desc {
    margin: 0;
    font-family: var(--ff-sans);
    font-size: 0.875rem;
    font-weight: 400;
    color: var(--c-text-muted);
    line-height: 1.4;
  }
  .card-date {
    margin: 0;
    margin-block-start: auto;
    font-family: var(--ff-sans);
    font-size: 0.75rem;
    color: var(--c-green-strong);
    font-weight: 500;
    letter-spacing: -0.005em;
  }

  @media (prefers-reduced-motion: reduce) {
    .card { transition: none; }
    .card.unlocked:hover { transform: none; }
  }
</style>
