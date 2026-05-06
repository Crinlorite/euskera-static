<script lang="ts" context="module">
  export interface UnitInput {
    id: string;
    code: string;
    title: string;
    order: number;
    lessonIds: string[];
  }
  export interface UnitProgress {
    id: string;
    code: string;
    title: string;
    order: number;
    totalLessons: number;
    completedLessons: number;
    readLessons: number;
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { getProgress } from '../../stores/progress';

  export let units: UnitInput[] = [];
  export let levelCode: string = 'a1';
  export let locale: string = 'es';

  let mounted = false;
  let computed: UnitProgress[] = units.map((u) => ({
    id: u.id, code: u.code, title: u.title, order: u.order,
    totalLessons: u.lessonIds.length,
    completedLessons: 0,
    readLessons: 0,
  }));

  function pct(u: UnitProgress): number {
    if (u.totalLessons <= 0) return 0;
    const raw = (u.completedLessons / u.totalLessons) * 100;
    return Math.max(0, Math.min(100, Math.round(raw)));
  }

  function isComplete(u: UnitProgress): boolean {
    return u.totalLessons > 0 && u.completedLessons >= u.totalLessons;
  }

  function isUntouched(u: UnitProgress): boolean {
    return u.completedLessons === 0 && u.readLessons === 0;
  }

  function formatOrder(n: number): string {
    return n.toString().padStart(2, '0');
  }

  onMount(() => {
    // Lee localStorage y calcula completedLessons/readLessons por unidad.
    const progress = getProgress();
    computed = units.map((u) => {
      let completed = 0;
      let read = 0;
      for (const lid of u.lessonIds) {
        const lp = progress.lessons[lid];
        if (!lp) continue;
        if (lp.status === 'completed') completed += 1;
        else if (lp.status === 'read') read += 1;
      }
      return {
        id: u.id, code: u.code, title: u.title, order: u.order,
        totalLessons: u.lessonIds.length,
        completedLessons: completed,
        readLessons: read,
      };
    });
    // Trigger one repaint so the bars animate from 0 to their target width.
    requestAnimationFrame(() => {
      mounted = true;
    });
  });
</script>

<section class="by-unit" aria-labelledby="progress-by-unit-heading">
  <header class="head">
    <p class="eyebrow">Recorrido</p>
    <h2 id="progress-by-unit-heading" class="title display">Progreso por unidad</h2>
  </header>

  {#if computed.length === 0}
    <p class="empty">Aún no hay unidades activas en este nivel.</p>
  {:else}
    <nav aria-label="Lista de unidades con progreso">
      <ul class="list">
        {#each computed as u (u.id)}
          {@const percentage = pct(u)}
          {@const complete = isComplete(u)}
          {@const untouched = isUntouched(u)}
          {@const fillWidth = mounted ? percentage : 0}
          <li class="row" class:complete class:untouched>
            <a class="card" href={`/${locale}/${levelCode}/${u.code}/`}>
              <span class="num display" aria-hidden="true">{formatOrder(u.order)}</span>

              <div class="body">
                <h3 class="title-row">
                  <span class="title-text">{u.title}</span>
                  {#if complete}
                    <span class="check" aria-hidden="true">✓</span>
                    <span class="badge">Completada</span>
                  {/if}
                </h3>
                <p class="meta">
                  {u.completedLessons} de {u.totalLessons} {u.totalLessons === 1 ? 'lección' : 'lecciones'}
                </p>
              </div>

              <div
                class="bar"
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={percentage}
                aria-label={`Progreso de Unidad ${u.order}: ${u.title}`}
              >
                <span class="fill" style="inline-size: {fillWidth}%"></span>
              </div>

              <span class="pct" aria-hidden="true">{percentage}%</span>
            </a>
          </li>
        {/each}
      </ul>
    </nav>
  {/if}
</section>

<style>
  .by-unit {
    margin-block: var(--s-6);
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

  .empty {
    color: var(--c-text-muted);
    padding: var(--s-5);
    background: var(--c-bg-alt);
    border: 1px dashed var(--c-border);
    border-radius: var(--r-lg);
    text-align: center;
  }

  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: var(--s-3);
  }

  .row {
    display: contents;
  }

  .card {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    align-items: center;
    gap: var(--s-4);
    padding: var(--s-4) var(--s-5);
    background: var(--c-bg);
    border: 1px solid var(--c-border);
    border-radius: var(--r-lg);
    box-shadow: var(--sh-card);
    text-decoration: none;
    color: inherit;
    transition: transform var(--m-base) var(--ease-out),
                box-shadow var(--m-base) var(--ease-out),
                border-color var(--m-base) var(--ease-out);
    position: relative;
    isolation: isolate;
  }
  .card:hover {
    transform: translateY(-2px);
    box-shadow: var(--sh-card-hover);
    border-color: var(--c-red);
  }
  .card:focus-visible {
    outline: 2px solid var(--c-red);
    outline-offset: 2px;
  }

  .row.untouched .card {
    opacity: 0.6;
    filter: grayscale(0.4);
  }
  .row.untouched .card:hover {
    opacity: 1;
    filter: none;
  }

  .num {
    font-family: var(--ff-display);
    font-weight: 700;
    font-size: clamp(1.6rem, 3.2vw, 2.2rem);
    line-height: 1;
    background: var(--grad-ikurri-text);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent;
    padding-block: 0.06em;
    min-inline-size: 2.2ch;
  }

  .body {
    display: grid;
    gap: var(--s-1);
    min-inline-size: 0;
  }
  .title-row {
    margin: 0;
    display: flex;
    align-items: center;
    gap: var(--s-2);
    flex-wrap: wrap;
    font-family: var(--ff-sans);
    font-size: 1.05rem;
    font-weight: 600;
    letter-spacing: -0.005em;
    line-height: 1.25;
  }
  .title-text {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .check {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: 1.25rem;
    block-size: 1.25rem;
    border-radius: 50%;
    background: var(--c-green);
    color: #fff;
    font-size: 0.75rem;
    font-weight: 700;
    line-height: 1;
  }
  .badge {
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: var(--tr-wide);
    text-transform: uppercase;
    padding: 2px 10px;
    border-radius: var(--r-pill);
    background: var(--c-green-soft);
    color: var(--c-green-strong);
  }
  .meta {
    margin: 0;
    color: var(--c-text-muted);
    font-size: 0.88rem;
  }

  .bar {
    inline-size: clamp(180px, 30vw, 360px);
    block-size: 8px;
    background: var(--c-bg-muted);
    border-radius: var(--r-pill);
    overflow: hidden;
    position: relative;
  }
  .fill {
    display: block;
    block-size: 100%;
    inline-size: 0;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--c-red), var(--c-green));
    transition: inline-size var(--m-graceful) var(--ease-out);
  }
  .row.complete .fill {
    background: var(--c-green);
  }

  .pct {
    font-family: var(--ff-sans);
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--c-text);
    min-inline-size: 3.2ch;
    text-align: end;
    font-variant-numeric: tabular-nums;
  }
  .row.complete .pct {
    color: var(--c-green-strong);
  }
  .row.untouched .pct {
    color: var(--c-text-dim);
  }

  /* Mobile: stack number+title on top, bar+percent below */
  @media (max-width: 720px) {
    .card {
      grid-template-columns: auto 1fr auto;
      grid-template-areas:
        'num body pct'
        'bar bar bar';
      row-gap: var(--s-3);
      column-gap: var(--s-3);
      padding: var(--s-4);
    }
    .num { grid-area: num; }
    .body { grid-area: body; }
    .pct { grid-area: pct; align-self: center; }
    .bar {
      grid-area: bar;
      inline-size: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .fill { transition: none; }
    .card { transition: none; }
    .card:hover { transform: none; }
  }
</style>
