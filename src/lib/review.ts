import type { ExerciseResult, ProgressV1 } from '../stores/progress.ts';
import type { LessonIndex } from './lesson-index.ts';

// Repaso espaciado de lo fallado (cajas Leitner). Puro: sin storage ni DOM, para
// probarlo con `node --test`. El store escribe `box`/`due` al registrar cada
// respuesta de un ejercicio corregible; aquí solo se lee.
//
// - Fallo (nota < 100) → caja 0, toca hoy.
// - Acierto → caja + 1, con vencimiento a +1, +3 y +7 días.
// - Caja 4 = graduado («ya se quedó»): sale de la cola hasta que vuelva a fallarse.
// Las flashcards nunca entran: son autoevaluadas y no están en `index[l].g`.

/** Vencimiento por caja: 0 → hoy, 1 → +1, 2 → +3, 3 → +7 días. */
export const BOX_DUE_DAYS = [0, 1, 3, 7] as const;
/** Caja de los graduados (4). */
export const GRADUATED_BOX = BOX_DUE_DAYS.length;
export const REVIEW_SESSION_SIZE = 10;
/** Por debajo de tantos pendientes se ofrece el refuerzo. */
export const REINFORCE_THRESHOLD = 3;

export type ReviewScope = { kind: 'all' } | { kind: 'unit'; unitId: string } | { kind: 'lesson'; lessonId: string };

/** Ejercicio corregible tal como va en el JSON de repaso de la unidad. */
export type ReviewExercise =
  | { type: 'multiple-choice'; id: string; prompt: string; options: string[]; answer: number; explanation?: string }
  | { type: 'fill-in-blank'; id: string; prompt: string; answers: string[]; explanation?: string }
  | { type: 'match-pairs'; id: string; pairs: Array<{ eu: string; es: string }> };

/** `/{locale}/repaso/{unitId}.json`: ejercicios corregibles de la unidad, por lección. */
export interface ReviewUnitData {
  unitId: string;
  lessons: Array<{ id: string; title: string; href: string; exercises: ReviewExercise[] }>;
}

export interface ReviewItem {
  lessonKey: string;
  exerciseId: string;
  box: number;
  due: string;
  fails: number;
}

/**
 * ¿Toca repasarlo hoy? Un resultado sin caja (guardado antes del repaso) entra si
 * nunca se acertó: arranca como caja 0 vencida. Es la misma regla de arranque que
 * usa `recordExerciseResult` al acertarlo.
 */
export function isDue(r: ExerciseResult | undefined, today: string): boolean {
  if (!r || !(r.attempts > 0)) return false;
  if (r.box === undefined) return r.bestScore < 100;
  return r.box < GRADUATED_BOX && (r.due || today) <= today;
}

export function inScope(lessonId: string, unitId: string, s: ReviewScope): boolean {
  if (s.kind === 'unit') return unitId === s.unitId;
  if (s.kind === 'lesson') return lessonId === s.lessonId;
  return true;
}

/** Ámbito desde la query de la página de repaso (`?unit=` o `?lesson=`). */
export function scopeFromSearch(search: string): ReviewScope {
  const q = new URLSearchParams(search);
  const lesson = q.get('lesson');
  if (lesson) return { kind: 'lesson', lessonId: lesson };
  const unit = q.get('unit');
  if (unit) return { kind: 'unit', unitId: unit };
  return { kind: 'all' };
}

/**
 * Recorre los corregibles que EXISTEN hoy en el contenido (`index[l].g`) dentro
 * del ámbito, con su resultado guardado. Los ids viejos o desconocidos se ignoran.
 */
function eachGraded(
  p: ProgressV1,
  index: LessonIndex,
  scope: ReviewScope,
  fn: (lessonKey: string, exerciseId: string, r: ExerciseResult | undefined, completed: boolean) => void,
) {
  for (const [lid, e] of Object.entries(index)) {
    if (!inScope(lid, e.u, scope)) continue;
    const lp = p.lessons[lid];
    if (!lp) continue;
    const ex = lp.exercises ?? {};
    for (const id of e.g) fn(lid, id, ex[id], lp.status === 'completed');
  }
}

/** Candidatos vencidos en el ámbito, en el orden del índice. */
export function dueItems(p: ProgressV1, index: LessonIndex, scope: ReviewScope, today: string): ReviewItem[] {
  const out: ReviewItem[] = [];
  eachGraded(p, index, scope, (lessonKey, exerciseId, r) => {
    if (!r || !isDue(r, today)) return;
    out.push({ lessonKey, exerciseId, box: r.box ?? 0, due: r.due || today, fails: r.fails ?? 1 });
  });
  return out;
}

const cmpStr = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const sameRank = (a: ReviewItem, b: ReviewItem) => a.box === b.box && a.due === b.due && a.fails === b.fails;

/**
 * Cola de la sesión: primero las cajas bajas, después lo que lleva más tiempo
 * vencido, después lo más fallado. Los empates se barajan con el día como
 * semilla: la misma tanda si se recarga hoy, otra mezcla mañana.
 */
export function buildReviewQueue(
  p: ProgressV1,
  index: LessonIndex,
  scope: ReviewScope,
  today: string,
  limit: number = REVIEW_SESSION_SIZE,
): ReviewItem[] {
  const items = dueItems(p, index, scope, today)
    .sort((a, b) => a.box - b.box || cmpStr(a.due, b.due) || b.fails - a.fails);
  return seededShuffleTies(items, today).slice(0, limit);
}

export function countDue(p: ProgressV1, index: LessonIndex, scope: ReviewScope, today: string): number {
  return dueItems(p, index, scope, today).length;
}

/** Primer día posterior a hoy en que vence algo del ámbito; '' si no queda nada en cola. */
export function nextDueDate(p: ProgressV1, index: LessonIndex, scope: ReviewScope, today: string): string {
  let next = '';
  eachGraded(p, index, scope, (_l, _e, r) => {
    if (!r || !(r.attempts > 0) || r.box === undefined || r.box >= GRADUATED_BOX) return;
    if (r.due && r.due > today && (!next || r.due < next)) next = r.due;
  });
  return next;
}

/** Ejercicios que salieron de la cola tras acertarlos en todos los repasos. */
export function countGraduated(p: ProgressV1, index: LessonIndex, scope: ReviewScope = { kind: 'all' }): number {
  let n = 0;
  eachGraded(p, index, scope, (_l, _e, r) => {
    if (r && r.box !== undefined && r.box >= GRADUATED_BOX) n += 1;
  });
  return n;
}

/**
 * Refuerzo (opcional, a petición): corregibles ya acertados de lecciones
 * completadas que NO están en la cola (ni vencidos ni esperando su día), los
 * practicados hace más tiempo primero. Nunca se mezcla con la cola de fallos.
 */
export function buildReinforcement(
  p: ProgressV1,
  index: LessonIndex,
  scope: ReviewScope,
  limit: number = REVIEW_SESSION_SIZE,
): ReviewItem[] {
  const out: Array<{ item: ReviewItem; at: string }> = [];
  eachGraded(p, index, scope, (lessonKey, exerciseId, r, completed) => {
    if (!completed || !r || !(r.attempts > 0) || r.bestScore < 100) return;
    if (r.box !== undefined && r.box < GRADUATED_BOX) return; // en cola: ya le llegará su día
    out.push({
      item: { lessonKey, exerciseId, box: r.box ?? GRADUATED_BOX, due: '', fails: r.fails ?? 0 },
      at: r.lastAttemptAt || '',
    });
  });
  return out
    .sort((a, b) => cmpStr(a.at, b.at))
    .slice(0, limit)
    .map((x) => x.item);
}

/** Hash de cadena a 32 bits (FNV-1a). */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** PRNG mulberry32: primer valor en [0, 1) para una semilla. */
function mulberry32(seed: number): number {
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Baraja SOLO los empates (misma caja, vencimiento y fallos) de una lista ya
 * ordenada. Cada ítem recibe un número a partir de la semilla y de su propia
 * clave, así que el resultado no depende del orden de entrada: misma semilla,
 * mismo orden.
 */
export function seededShuffleTies<T extends ReviewItem>(sorted: T[], seed: string): T[] {
  const rank = (x: T) => mulberry32(hashString(`${seed}\u0000${x.lessonKey}\u0000${x.exerciseId}`));
  const out: T[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && sameRank(sorted[i], sorted[j])) j++;
    const run = sorted.slice(i, j).map((x) => ({ x, r: rank(x) }));
    run.sort((a, b) => a.r - b.r || cmpStr(`${a.x.lessonKey}/${a.x.exerciseId}`, `${b.x.lessonKey}/${b.x.exerciseId}`));
    for (const { x } of run) out.push(x);
    i = j;
  }
  return out;
}
