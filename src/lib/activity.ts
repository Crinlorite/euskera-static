import { addDays, daysBetween, todayKey, weekStart } from './dates.ts';

/**
 * Actividad por días (fase 3). Puro: sin storage ni DOM.
 *
 * `activity` (en el progreso) = día local 'YYYY-MM-DD' → acciones de ese día
 * (respuestas a ejercicios; al menos 1 si ese día se estudió). Solo existe desde
 * la fase 3: lo anterior se DEDUCE, al mostrar, de las fechas que ya estaban
 * guardadas (cuándo se completó cada lección, último intento de cada ejercicio
 * y el último día de la racha). Lo deducido nunca se escribe: la misma hora UTC
 * cae en días distintos según el huso, y guardarlo duplicaría días al fusionar
 * copias de dispositivos con husos distintos.
 */

export const DEFAULT_WEEKLY_GOAL = 3;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Meta semanal válida (1..7). Lo que no sea un número finito → 3. Se aplica al LEER. */
export function clampGoal(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return DEFAULT_WEEKLY_GOAL;
  return Math.min(7, Math.max(1, Math.round(v)));
}

/**
 * `activity` limpia: solo valores numéricos finitos ≥ 0 (enteros). Un código
 * manipulado con texto o negativos no debe acabar en `NaN` (que el JSON guarda
 * como `null`). Si no es un objeto, `undefined` (y quien llama no crea el campo).
 */
export function sanitizeActivity(a: unknown): Record<string, number> | undefined {
  if (!a || typeof a !== 'object' || Array.isArray(a)) return undefined;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(a as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) out[k] = Math.floor(v);
  }
  return out;
}

interface WithDates {
  lessons: Record<string, { completedAt?: string; exercises: Record<string, { lastAttemptAt: string }> }>;
  streak: { lastStudiedDate: string };
  activity?: Record<string, number>;
}

function localDay(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : todayKey(d);
}

/** Días de estudio que se deducen de lo guardado antes de la fase 3 (cota inferior). */
export function derivedDays(p: WithDates): Set<string> {
  const out = new Set<string>();
  for (const l of Object.values(p.lessons ?? {})) {
    const c = localDay(l?.completedAt);
    if (c) out.add(c);
    for (const ex of Object.values(l?.exercises ?? {})) {
      const a = localDay(ex?.lastAttemptAt);
      if (a) out.add(a);
    }
  }
  const s = p.streak?.lastStudiedDate;
  if (s && DAY.test(s)) out.add(s);
  return out;
}

/**
 * Días de estudio para mostrar: los de `activity` con su cifra y los deducidos
 * sin cifra (`null`). Un día con actividad real usa la real.
 */
export function studyDays(p: WithDates): Map<string, number | null> {
  const out = new Map<string, number | null>();
  for (const d of derivedDays(p)) out.set(d, null);
  for (const [d, n] of Object.entries(p.activity ?? {})) {
    if (DAY.test(d) && n > 0) out.set(d, n);
  }
  return out;
}

/** Días activos entre `from` y `to`, ambos incluidos. */
export function activeDaysBetween(days: Map<string, number | null>, from: string, to: string): number {
  let n = 0;
  for (const d of days.keys()) if (d >= from && d <= to) n++;
  return n;
}

export const activeDaysThisWeek = (days: Map<string, number | null>, today: string): number =>
  activeDaysBetween(days, weekStart(today), today);

export const activeDaysThisMonth = (days: Map<string, number | null>, today: string): number =>
  activeDaysBetween(days, today.slice(0, 8) + '01', today);

export interface GridCell {
  day: string;
  /** Acciones del día; `null` = día deducido (sin cifra). */
  count: number | null;
  level: 0 | 1 | 2 | 3;
}

function levelOf(count: number | null | undefined): GridCell['level'] {
  if (count === null) return 1;
  if (!count) return 0;
  return count <= 2 ? 1 : count <= 5 ? 2 : 3;
}

/** Celdas de la rejilla: del lunes de hace `weeks - 1` semanas hasta hoy, por columnas de semana. */
export function gridCells(days: Map<string, number | null>, today: string, weeks = 12): GridCell[] {
  const start = addDays(weekStart(today), -7 * (weeks - 1));
  const total = daysBetween(start, today) + 1;
  const out: GridCell[] = [];
  for (let i = 0; i < total; i++) {
    const day = addDays(start, i);
    const count = days.has(day) ? (days.get(day) as number | null) : 0;
    out.push({ day, count, level: levelOf(count) });
  }
  return out;
}

/**
 * «Has vuelto»: un día con actividad REAL precedido, ocho días o más antes, por
 * el día de estudio anterior más cercano (real o deducido). Los huecos que solo
 * existen en lo deducido no cuentan: si no, el primer día de la fase 3 recibiría
 * el logro medio mundo por un verano de hace años.
 */
export function hasComeback(activity: Record<string, number> | undefined, derived: Set<string>): boolean {
  const real = Object.entries(activity ?? {}).filter(([d, n]) => DAY.test(d) && n > 0).map(([d]) => d);
  if (!real.length) return false;
  const all = [...new Set([...derived, ...real])].sort();
  const realSet = new Set(real);
  for (let i = 1; i < all.length; i++) {
    if (realSet.has(all[i]) && daysBetween(all[i - 1], all[i]) >= 8) return true;
  }
  return false;
}
