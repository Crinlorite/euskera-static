<script lang="ts">
  import { t, tf, type StringKey } from '../../i18n/ui';
  import type { LocaleCode } from '../../i18n/config';
  import { onMount } from 'svelte';
  import { ACHIEVEMENTS, evaluate, type Achievement, type AchievementCategory } from '../../lib/achievements';
  import { getProgress, unlockAchievements } from '../../stores/progress';
  import { readIndex } from '../../lib/lesson-index';

  // Catálogo que se pinta; por defecto el de lib. evaluate() sigue usando
  // ACHIEVEMENTS para desbloquear: catalog solo decide qué se muestra y se cuenta.
  export let catalog: Achievement[] = ACHIEVEMENTS;
  // Mapas necesarios para evaluar logros que dependen de qué lecciones existen.
  // Si no llega lessonsByUnit, se deriva del índice embebido en la página
  // (LessonIndexData): mismos pares unidad → lecciones, sin repetirlos en props.
  export let lessonsByUnit: Record<string, string[]> = {};
  export let unitsByLevel: Record<string, { unitIds: string[] }> = {};
  /** id de unidad → su título en el idioma de la página (logros de maestría). */
  export let unitTitles: Record<string, string> = {};
  export let locale: string = 'es';
  $: loc = locale as LocaleCode;

  let unlockedIds: string[] = [];
  let unlockedAt: Record<string, string> = {};

  onMount(() => {
    const progress = getProgress();
    const byUnit: Record<string, string[]> = { ...lessonsByUnit };
    if (!Object.keys(byUnit).length) {
      for (const [id, e] of Object.entries(readIndex())) (byUnit[e.u] ??= []).push(id);
    }
    const knownKeys = new Set<string>();
    for (const ids of Object.values(byUnit)) {
      for (const id of ids) knownKeys.add(id);
    }
    // Evalúa logros automáticos a partir del estado actual y los persiste.
    const auto = evaluate(progress, knownKeys, unitsByLevel, byUnit);
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
  $: total = catalog.length;
  $: unlockedCount = catalog.filter((a) => unlockedSet.has(a.id)).length;

  // En «Todos», los logros de maestría (uno por unidad) se juntan en UNA tarjeta
  // por nivel con un anillo por unidad: sueltos repetían la lista de unidades que
  // hay justo encima. Con la pastilla «Maestría» se ven sueltos, como siempre.
  // evaluate() y el contador global no cambian: esto solo decide cómo se pinta.
  type Entry =
    | { kind: 'one'; key: string; a: Achievement; on: boolean }
    | { kind: 'mastery'; key: string; level: string; items: Achievement[]; done: number; on: boolean };

  function levelOf(a: Achievement): string {
    return a.id.replace(/^unit-complete-/, '').split('-')[0];
  }

  function entriesFor(filter: Filter, set: Set<string>): Entry[] {
    if (filter !== 'all') {
      return catalog
        .filter((a) => a.category === filter)
        .map((a) => ({ kind: 'one', key: a.id, a, on: set.has(a.id) }));
    }
    const out: Entry[] = [];
    const groups = new Map<string, Extract<Entry, { kind: 'mastery' }>>();
    for (const a of catalog) {
      if (a.category !== 'mastery') {
        out.push({ kind: 'one', key: a.id, a, on: set.has(a.id) });
        continue;
      }
      const level = levelOf(a);
      let g = groups.get(level);
      if (!g) {
        // La tarjeta ocupa el sitio del primer logro de maestría del catálogo.
        g = { kind: 'mastery', key: `mastery-${level}`, level, items: [], done: 0, on: false };
        groups.set(level, g);
        out.push(g);
      }
      g.items.push(a);
      if (set.has(a.id)) g.done += 1;
      g.on = g.done > 0;
    }
    return out;
  }

  // Mantén el orden: desbloqueados primero, luego bloqueados (estabilidad
  // visual conforme el usuario va consiguiéndolos). La tarjeta de maestría cuenta
  // como desbloqueada en cuanto hay una unidad dominada.
  $: ordered = entriesFor(activeFilter, unlockedSet).sort((x, y) => (x.on ? 0 : 1) - (y.on ? 0 : 1));

  const FILTERS: Array<{ id: Filter; label: string }> = [
    { id: 'all',       label: 'ach.f.all' },
    { id: 'milestone', label: 'ach.f.milestone' },
    { id: 'mastery',   label: 'ach.f.mastery' },
    { id: 'streak',    label: 'ach.f.streak' },
    { id: 'volume',    label: 'ach.f.volume' },
  ];

  // clave i18n con caída al texto del catálogo (logros futuros sin traducir)
  function tr(key: string, fallback: string): string {
    // Maestría: un logro por unidad con el título de la unidad en este idioma.
    const m = key.match(/^ach\.unit-complete-(.+)\.(t|d)$/);
    if (m) {
      const titulo = unitTitles[m[1]];
      if (titulo) return tf(loc, m[2] === 't' ? 'ach.mastery.t' : 'ach.mastery.d', titulo);
    }
    const v = t(loc, key as StringKey);
    return v === key ? fallback : v;
  }

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
      return when ? t(loc, 'ach.unlocked').replace('{0}', formatDate(when)) : t(loc, 'ach.unlocked.short');
    }
    return tr('ach.' + a.id + '.d', a.description);
  }
</script>

<section class="ach" aria-labelledby="achievements-heading">
  <header class="head">
    <h2 id="achievements-heading" class="title display">{t(loc, 'ach.title')}</h2>
    <p class="counter" aria-live="polite">
      <span class="counter-num text-grad">{unlockedCount}</span>
      <span class="counter-of">{t(loc, 'ach.counter').replace('{0}', String(total))}</span>
    </p>
  </header>

  <!-- Filtros: botones que se quedan pulsados (no son pestañas: no hay paneles). -->
  <div class="filters" role="group" aria-label={t(loc, 'a11y.ach.filter')}>
    {#each FILTERS as f (f.id)}
      <button
        type="button"
        class="pill"
        class:active={activeFilter === f.id}
        aria-pressed={activeFilter === f.id}
        on:click={() => (activeFilter = f.id)}
      >
        {tr(f.label, f.label)}
      </button>
    {/each}
  </div>

  <ul class="grid">
    {#each ordered as e (e.key)}
      {#if e.kind === 'mastery'}
        <!-- Toda la tarjeta lleva a la lista de unidades del nivel (una sola parada
             de tabulación); los anillos son decorativos. -->
        <li class="card mastery" class:unlocked={e.on} class:locked={!e.on}>
          <span class="icon" aria-hidden="true">{e.items[0].icon}</span>
          {#if e.done === e.items.length}
            <span class="check" aria-hidden="true">✓</span>
          {/if}
          <h3 class="card-title">
            <a class="mastery-link" href={`#progress-by-unit-${e.level}`} aria-describedby={`mastery-${e.level}-count`}>{t(loc, 'ach.f.mastery')} · {e.level.toUpperCase()}</a>
          </h3>
          <p class="card-desc" id={`mastery-${e.level}-count`}><strong>{e.done}</strong> {t(loc, 'ach.counter').replace('{0}', String(e.items.length))}</p>
          <span class="rings" aria-hidden="true">{#each e.items as a (a.id)}<span class="ls" data-state={unlockedSet.has(a.id) ? 'perfect' : undefined}></span>{/each}</span>
        </li>
      {:else}
        {@const a = e.a}
        <li
          class="card"
          class:unlocked={e.on}
          class:locked={!e.on}
          title={tooltipFor(a)}
        >
          <span class="icon" aria-hidden="true">{a.icon}</span>
          {#if e.on}
            <span class="check" aria-hidden="true">✓</span>
          {/if}
          <h3 class="card-title">{tr('ach.' + a.id + '.t', a.title)}</h3>
          <p class="card-desc">{tr('ach.' + a.id + '.d', a.description)}</p>
          {#if e.on && unlockedAt[a.id]}
            <p class="card-date">{t(loc, 'ach.unlocked').replace('{0}', formatDate(unlockedAt[a.id]))}</p>
          {/if}
        </li>
      {/if}
    {/each}
  </ul>
</section>

<style>
  /* Sin margen propio: el hueco entre secciones lo pone el grid de .progreso. */
  .head {
    display: grid;
    gap: var(--s-2);
    margin-block-end: var(--s-5);
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

  /* Columnas según el ancho del contenedor, no de la ventana: 3 en los 672 px
     del escritorio, 2 en el móvil. */
  .grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 160px), 1fr));
    gap: var(--s-3);
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
    /* Contenido arriba: lo que sobre en una fila de tarjetas más altas va bajo
       la descripción (y la fecha de desbloqueo, al pie). */
    grid-template-rows: auto auto 1fr;
  }
  .card.unlocked { grid-template-rows: auto auto 1fr auto; }
  .card.unlocked {
    border-color: var(--c-border);
  }
  .card.unlocked:hover {
    transform: translateY(-3px) scale(1.02);
    box-shadow: var(--sh-card-hover), 0 0 0 1px rgba(213, 43, 30, 0.16);
    border-color: transparent;
  }
  /* Bloqueado = una meta: tiene que poder leerse. Borde discontinuo, icono en
     gris, texto apagado pero legible y descripción en dos líneas (entera en el
     title de la tarjeta). Sin opacidad en la tarjeta: con 0,75 el texto apagado
     se queda en 3,2:1 sobre blanco; sin ella, 5,3:1. */
  .card.locked {
    border-style: dashed;
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
    opacity: 0.6;
  }
  .card.locked .card-title { color: var(--c-text-muted); }
  .card.locked .card-desc {
    /* Sin estirarse con la fila (si no, asoma la tercera línea bajo los puntos suspensivos). */
    align-self: start;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Maestría agregada: el enlace del título cubre la tarjeta entera. */
  .card.mastery { grid-template-rows: auto auto auto 1fr; }
  .mastery-link { color: inherit; text-decoration: none; }
  .mastery-link::after { content: ""; position: absolute; inset: 0; border-radius: inherit; z-index: 1; }
  .card.mastery:hover { border-color: var(--c-red); }
  .card.mastery:hover .mastery-link { color: var(--c-red); }
  .mastery-link:focus-visible { outline: none; }
  .mastery-link:focus-visible::after { outline: 2px solid var(--c-red); outline-offset: 2px; }
  .card.mastery .card-desc strong { color: var(--c-text); font-weight: 700; }
  .rings { display: flex; flex-wrap: wrap; gap: 6px; align-self: end; font-size: 0.95rem; }

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
