<script lang="ts">
  import type { GridCell } from '../../lib/activity';
  import { keyToDate } from '../../lib/dates';

  /** Celdas de `gridCells()`: del lunes de hace 11 semanas a hoy, por columnas de semana. */
  export let cells: GridCell[] = [];
  export let locale: string = 'es';
  /** Resumen para lectores de pantalla (la rejilla se lee como una imagen). */
  export let label: string = '';

  // Un solo formateador por idioma (antes, uno por celda en cada repintado).
  function formatter(loc: string): (key: string) => string {
    try {
      const f = new Intl.DateTimeFormat(loc, { weekday: 'long', day: 'numeric', month: 'long' });
      return (key) => f.format(keyToDate(key));
    } catch {
      return (key) => key;
    }
  }
  $: fmt = formatter(locale);
  $: tip = (c: GridCell) => (c.count ? `${fmt(c.day)}: ${c.count}` : fmt(c.day));
</script>

<!-- Una imagen con su resumen: 84 celdas con nombre serían 84 paradas para un
     lector de pantalla. El `title` de cada celda es solo para el ratón. -->
<div class="grid" role="img" aria-label={label}>
  {#each cells as c (c.day)}<span class="c" data-level={c.level} title={tip(c)} aria-hidden="true"></span>{/each}
</div>

<style>
  /* Geometría fija (7 × 12 px + 6 huecos de 3 px = 102 px de alto) para que el
     hueco reservado del resumen no dependa del idioma. En RTL la semana más
     antigua queda a la derecha, que es lo natural. */
  .grid {
    display: grid;
    grid-auto-flow: column;
    grid-template-rows: repeat(7, 12px);
    grid-auto-columns: 12px;
    gap: 3px;
    inline-size: max-content;
    max-inline-size: 100%;
  }
  /* Vacío con borde (se distingue del fondo); con actividad, verde de contraste
     ≥ 3:1 contra el vacío desde el primer nivel. */
  .c {
    border-radius: 2px;
    background: var(--c-bg-muted);
    box-shadow: inset 0 0 0 1px var(--c-border);
  }
  .c[data-level="1"] { background: var(--c-green); box-shadow: none; }
  .c[data-level="2"] { background: var(--c-green-strong); box-shadow: none; }
  .c[data-level="3"] { background: var(--c-green-deep); box-shadow: none; }
  @media (forced-colors: active) {
    .c { forced-color-adjust: none; background: Canvas; box-shadow: inset 0 0 0 1px CanvasText; }
    .c[data-level="1"], .c[data-level="2"], .c[data-level="3"] { background: Highlight; }
  }
</style>
