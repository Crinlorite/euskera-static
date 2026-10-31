<script lang="ts" context="module">
  import type { LessonState } from '../../lib/lesson-state';

  // De cada lección solo viaja el id: el título, el código (para el enlace) y los
  // ejercicios (para derivar su estado) se leen en cliente del índice embebido en
  // la página (LessonIndexData). Solo hacen falta tras montar, y así no viajan dos
  // veces.
  export interface UnitInput {
    id: string;
    code: string;
    title: string;
    order: number;
    lessonIds: string[];
  }
  export interface LessonDot {
    id: string;
    title: string;
    /** Vacío hasta montar (sin índice no hay código): entonces el punto no es enlace. */
    href: string;
    state: LessonState;
    /** Etiqueta accesible del estado («Completada · 2 para repasar»…); vacía si no se ha empezado. */
    label: string;
    /** % de ejercicios intentados (relleno del anillo de «empezada»). */
    pct: number;
  }
  export interface UnitProgress {
    id: string;
    code: string;
    title: string;
    order: number;
    total: number;
    /** Completadas, incluidas las entendidas. */
    completed: number;
    perfect: number;
    /** Empezadas sin completar. */
    read: number;
    dots: LessonDot[];
  }
</script>

<script lang="ts">
  import { t, tf } from '../../i18n/ui';
  import type { LocaleCode } from '../../i18n/config';
  import { onMount } from 'svelte';
  import { getProgress, PROGRESS_EVENT, type ProgressV1 } from '../../stores/progress';
  import { attemptedPct, lessonState, stateLabel } from '../../lib/lesson-state';
  import { readIndex, type LessonIndex } from '../../lib/lesson-index';

  export let units: UnitInput[] = [];
  export let levelCode: string = 'a1';
  export let locale: string = 'es';
  /** id del encabezado: único por nivel, porque la página pinta un bloque por nivel. */
  export let headingId: string = 'progress-by-unit-heading';
  $: loc = locale as LocaleCode;

  const labels = {
    started: t(locale as LocaleCode, 'lesson.read'),
    completed: t(locale as LocaleCode, 'progress.unit.done'),
    perfect: t(locale as LocaleCode, 'lesson.state.perfect'),
    toReview: t(locale as LocaleCode, 'lesson.toreview'),
  };

  let mounted = false;
  let computed: UnitProgress[] = compute(null, {});

  /** Estados por lección con `lessonState()`; sin progreso (SSR), todo «sin empezar». */
  function compute(progress: ProgressV1 | null, index: LessonIndex): UnitProgress[] {
    return units.map((u) => {
      let completed = 0;
      let perfect = 0;
      let read = 0;
      const dots = u.lessonIds.map((id): LessonDot => {
        const e = index[id];
        const s = lessonState(progress?.lessons[id], e?.ex ?? [], e?.g ?? []);
        if (s.state === 'completed' || s.state === 'perfect') completed += 1;
        if (s.state === 'perfect') perfect += 1;
        if (s.state === 'started') read += 1;
        return {
          id,
          title: e?.t ?? '',
          href: e?.c ? `/${locale}/${levelCode}/${u.code}/${e.c}/` : '',
          state: s.state,
          label: stateLabel(s, labels),
          pct: attemptedPct(s),
        };
      });
      return { id: u.id, code: u.code, title: u.title, order: u.order, total: u.lessonIds.length, completed, perfect, read, dots };
    });
  }

  function pct(u: UnitProgress): number {
    if (u.total <= 0) return 0;
    const raw = (u.completed / u.total) * 100;
    return Math.max(0, Math.min(100, Math.round(raw)));
  }

  function isComplete(u: UnitProgress): boolean {
    return u.total > 0 && u.completed >= u.total;
  }

  function isAllPerfect(u: UnitProgress): boolean {
    return u.total > 0 && u.perfect >= u.total;
  }

  function isUntouched(u: UnitProgress): boolean {
    return u.completed === 0 && u.read === 0;
  }

  function formatOrder(n: number): string {
    return n.toString().padStart(2, '0');
  }

  onMount(() => {
    const index = readIndex();
    const refresh = () => { computed = compute(getProgress(), index); };
    refresh();
    // Trigger one repaint so the bars animate from 0 to their target width.
    requestAnimationFrame(() => {
      mounted = true;
    });
    // Importar un código (o cualquier otro guardado) repinta sin recargar.
    window.addEventListener(PROGRESS_EVENT, refresh);
    return () => window.removeEventListener(PROGRESS_EVENT, refresh);
  });
</script>

<section class="by-unit" aria-labelledby={headingId}>
  <header class="head">
    <p class="eyebrow">{t(loc, 'progress.byunit.eyebrow')}</p>
    <h2 id={headingId} class="title display">{t(loc, 'progress.byunit.title')} · {levelCode.toUpperCase()}</h2>
  </header>

  {#if computed.length === 0}
    <p class="empty">{t(loc, 'progress.units.empty')}</p>
  {:else}
    <nav aria-label={t(loc, 'a11y.units.list')}>
      <ul class="list">
        {#each computed as u (u.id)}
          {@const percentage = pct(u)}
          {@const complete = isComplete(u)}
          {@const untouched = isUntouched(u)}
          {@const allperfect = isAllPerfect(u)}
          {@const fillWidth = mounted ? percentage : 0}
          <li class="row" class:complete class:untouched class:allperfect>
            <!-- La tarjeta ya no es un <a> porque contiene los enlaces de cada
                 lección; el enlace de la unidad la cubre entera por debajo. -->
            <div class="card">
              <span class="num display" aria-hidden="true">{formatOrder(u.order)}</span>

              <div class="body">
                <h3 class="title-row">
                  <a class="unit-link" href={`/${locale}/${levelCode}/${u.code}/`}>{u.title}</a>
                  {#if allperfect}
                    <span class="ls" data-state="perfect" aria-hidden="true"></span>
                    <span class="badge green">{t(loc, 'lesson.state.perfect')}</span>
                  {:else if complete}
                    <span class="ls" data-state="completed" aria-hidden="true"></span>
                    <span class="badge">{t(loc, 'progress.unit.done')}</span>
                  {/if}
                </h3>
                <p class="meta">
                  {t(loc, 'unit.eyebrow')}: {u.completed}/{u.total}{#if u.perfect} · {t(loc, 'lesson.state.perfect')}: {u.perfect}{/if}
                </p>
                <ol class="dots" aria-label={t(loc, 'unit.eyebrow')}>
                  {#each u.dots as d (d.id)}
                    {#if d.href}
                      <li><a class="ls dot" data-state={d.state} style={d.state === 'started' ? `--ls-p: ${d.pct}%` : undefined} href={d.href} title={d.label ? `${d.title} · ${d.label}` : d.title} aria-label={d.label ? `${d.title} · ${d.label}` : d.title}></a></li>
                    {:else}
                      <li><span class="ls dot" data-state="untouched" aria-hidden="true"></span></li>
                    {/if}
                  {/each}
                </ol>
              </div>

              <div
                class="bar"
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={percentage}
                aria-label={tf(loc, 'a11y.unit.progress', u.order, u.title)}
              >
                <span class="fill" style="inline-size: {fillWidth}%"></span>
              </div>

              <span class="pct" aria-hidden="true">{percentage}%</span>
            </div>
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
  /* El enlace de la unidad se estira sobre toda la tarjeta (sigue siendo
     clicable entera); los puntos de lección quedan por encima. */
  .unit-link {
    color: inherit;
    text-decoration: none;
  }
  .unit-link::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    z-index: 0;
  }
  .card:hover .unit-link { color: var(--c-red); }
  .unit-link:focus-visible { outline: none; }
  .unit-link:focus-visible::after {
    outline: 2px solid var(--c-red);
    outline-offset: 2px;
    border-radius: var(--r-lg);
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
  /* «Completada» es neutro; el verde se reserva a «Todo bien». */
  .badge {
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: var(--tr-wide);
    text-transform: uppercase;
    padding: 2px 10px;
    border-radius: var(--r-pill);
    background: var(--c-bg-muted);
    color: var(--c-text-muted);
  }
  .badge.green {
    background: var(--c-green);
    color: #fff;
  }
  .meta {
    margin: 0;
    color: var(--c-text-muted);
    font-size: 0.88rem;
  }
  .dots {
    display: flex;
    gap: var(--s-2);
    flex-wrap: wrap;
    margin: var(--s-2) 0 0;
    padding: 0;
    list-style: none;
    position: relative;
    z-index: 1;
  }
  .dots li { display: flex; }
  .dot {
    inline-size: 1.25rem;
    block-size: 1.25rem;
    font-size: 0.85rem;
    text-decoration: none;
    transition: transform var(--m-fast) var(--ease-out);
  }
  .dot:hover { transform: scale(1.15); }
  .dot:focus-visible { outline: 2px solid var(--c-red); outline-offset: 2px; }

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
    background: var(--c-text-dim);
  }
  .row.allperfect .fill {
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
  .row.allperfect .pct {
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
    .dot { transition: none; }
    .dot:hover { transform: none; }
  }
</style>
