import type { LessonProgress } from '../stores/progress.ts';
import { lessonState, type LessonState } from './lesson-state.ts';

// «Qué toca ahora»: la siguiente lección a partir de lo que ya se guarda (sin
// campos nuevos en el progreso). Puro, para probarlo con `node --test`. Lo usan
// la página de progreso («Continuar»), el índice de nivel (unidad actual) y el
// índice de unidad, cada uno con su propio `order`.

export type NextReason = 'started' | 'after' | 'gap' | 'first';
export interface NextLesson {
  id: string;
  reason: NextReason;
}

/** Última actividad conocida de una lección (ISO UTC); '' si solo se abrió. */
export function lastActivityAt(lp: LessonProgress | undefined): string {
  if (!lp) return '';
  let at = lp.completedAt ?? '';
  for (const r of Object.values(lp.exercises ?? {})) if ((r?.lastAttemptAt ?? '') > at) at = r.lastAttemptAt;
  return at;
}

/**
 * Siguiente lección que toca:
 * 1. candidata = la lección de `order` con actividad más reciente (empate → la más avanzada);
 * 2. si está empezada → esa;
 * 3. si está completada → la primera no completada que haya DESPUÉS en `order`
 *    (siguiente de la unidad, primera de la unidad siguiente, primera del nivel siguiente…);
 * 4. si no queda nada después → el primer hueco que quedó ATRÁS;
 * 5. sin ninguna entrada en `order` → la primera lección (`reason: 'first'`);
 * 6. todo completado → null.
 * `order` es el currículo en orden (nivel → unidad → lección); las entradas de
 * `lessons` que no estén en `order` (otros niveles, ids viejos) se ignoran.
 * Las fechas ISO UTC se comparan como cadenas.
 */
export function nextLesson(
  lessons: Record<string, LessonProgress>,
  index: Record<string, { ex: string[]; g: string[] }>,
  order: readonly string[],
): NextLesson | null {
  if (!order.length) return null;
  const stateOf = (id: string): LessonState => lessonState(lessons[id], index[id]?.ex ?? [], index[id]?.g ?? []).state;
  const done = (s: LessonState) => s === 'completed' || s === 'perfect';
  let ci = -1;
  let cat = '';
  order.forEach((id, i) => {
    if (!lessons[id]) return;
    const at = lastActivityAt(lessons[id]);
    if (ci < 0 || at >= cat) {
      ci = i;
      cat = at;
    }
  });
  if (ci < 0) return { id: order[0], reason: 'first' };
  if (!done(stateOf(order[ci]))) return { id: order[ci], reason: 'started' };
  for (let i = ci + 1; i < order.length; i++) if (!done(stateOf(order[i]))) return { id: order[i], reason: 'after' };
  for (let i = 0; i < ci; i++) if (!done(stateOf(order[i]))) return { id: order[i], reason: 'gap' };
  return null;
}
