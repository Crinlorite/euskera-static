import type { LessonProgress } from '../stores/progress.ts';

// Estado de una lección derivado SOLO de lo que ya se guarda (status + intentos
// y mejor nota por ejercicio). Única fuente de verdad para la barra lateral, los
// índices de unidad y de nivel, la tarjeta de cierre y la ventana de progreso.

/** Tipos con respuesta correcta. Las flashcards (autoevaluadas) no cuentan para el verde. */
export const GRADED_TYPES: ReadonlySet<string> = new Set(['multiple-choice', 'fill-in-blank', 'match-pairs']);

/** sin empezar · empezada · completada (con algo para repasar) · entendida («Todo bien»). */
export type LessonState = 'untouched' | 'started' | 'completed' | 'perfect';

export interface LessonStateInfo {
  state: LessonState;
  /** Ejercicios ACTUALES de la lección. */
  total: number;
  /** Ejercicios actuales con algún intento. */
  attempted: number;
  /** Ids actuales sin ningún intento (p. ej. añadidos después de completarla). */
  pending: string[];
  /** Ids corregibles con intento y mejor nota < 100. */
  toReview: string[];
}

/**
 * Verde = completada ∧ todo ejercicio actual intentado ∧ todo corregible con
 * `bestScore === 100` (vale cualquier reintento: `bestScore` es el máximo).
 * Los resultados de ejercicios que ya no existen se ignoran.
 */
export function lessonState(lp: LessonProgress | undefined, exerciseIds: string[], gradedIds: string[]): LessonStateInfo {
  const total = exerciseIds.length;
  if (!lp) return { state: 'untouched', total, attempted: 0, pending: [...exerciseIds], toReview: [] };
  const ex = lp.exercises ?? {};
  const pending = exerciseIds.filter((id) => !((ex[id]?.attempts ?? 0) > 0));
  const toReview = gradedIds.filter((id) => (ex[id]?.attempts ?? 0) > 0 && (ex[id]?.bestScore ?? 0) < 100);
  const attempted = total - pending.length;
  if (lp.status !== 'completed') return { state: 'started', total, attempted, pending, toReview };
  const perfect = pending.length === 0 && toReview.length === 0;
  return { state: perfect ? 'perfect' : 'completed', total, attempted, pending, toReview };
}

/** Porcentaje de ejercicios intentados (relleno del anillo de «empezada»). */
export function attemptedPct(s: LessonStateInfo): number {
  return s.total ? Math.round((s.attempted / s.total) * 100) : 0;
}

/** Textos ya traducidos con los que se compone la etiqueta accesible de un estado. */
export interface StateLabels {
  started: string;
  completed: string;
  perfect: string;
  /** Con `{0}` = nº de ejercicios para repasar. */
  toReview: string;
}

/** «Leída» · «Completada · 2 para repasar» · «Todo bien»; vacío si no se ha empezado. */
export function stateLabel(s: LessonStateInfo, L: StateLabels): string {
  if (s.state === 'untouched') return '';
  if (s.state === 'started') return L.started;
  if (s.state === 'perfect') return L.perfect;
  return s.toReview.length ? `${L.completed} · ${L.toReview.replaceAll('{0}', String(s.toReview.length))}` : L.completed;
}

export interface StateCounts {
  total: number;
  /** Completadas, incluidas las entendidas. */
  completed: number;
  perfect: number;
}

/** Recuento sobre un conjunto de lecciones (`index`: id → ejercicios y corregibles actuales). */
export function countStates(
  lessons: Record<string, LessonProgress>,
  index: Record<string, { ex: string[]; g: string[] }>,
): StateCounts {
  const out: StateCounts = { total: 0, completed: 0, perfect: 0 };
  for (const [id, entry] of Object.entries(index)) {
    const { state } = lessonState(lessons[id], entry.ex, entry.g);
    out.total += 1;
    if (state === 'completed' || state === 'perfect') out.completed += 1;
    if (state === 'perfect') out.perfect += 1;
  }
  return out;
}
