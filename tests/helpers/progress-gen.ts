// Generador casero de progresos aleatorios (sin librerías) para las pruebas de
// propiedades de la fusión y la de compatibilidad con el lector antiguo.
// Determinista: misma semilla, mismos datos. Pools pequeños a propósito para que
// haya muchas colisiones de claves y empates de fechas.
import type { ExerciseResult, LessonProgress, ProgressV1 } from '../../src/stores/progress.ts';

/** PRNG mulberry32: rápido, 32 bits, suficiente para tests. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface GenOptions {
  /** Incluir los campos nuevos (fails, lastScore/box/due, activity, weeklyGoalDays). */
  newFields?: boolean;
  /**
   * Cómo se reparte la tripleta lastScore/box/due cuando hay campos nuevos:
   * - 'random': cada campo aparece o no al azar (mezcla definida/indefinida);
   * - 'byId': según el id del ejercicio (pares la tienen entera, impares nunca),
   *   así ninguna fusión mezcla tripleta definida con indefinida.
   */
  triplet?: 'random' | 'byId';
}

const ISO = [1, 2, 3, 4, 5, 6].map((d) => `2026-03-0${d}T10:00:00.000Z`);
const DAYS = [1, 2, 3, 4, 5, 6].map((d) => `2026-03-0${d}`);

export function makeGen(seed: number) {
  const rnd = mulberry32(seed);
  const int = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
  const chance = (p: number) => rnd() < p;

  function exercise(index: number, opts: GenOptions): ExerciseResult {
    const ex: ExerciseResult = {
      attempts: int(1, 5),
      bestScore: pick([0, 50, 90, 100]),
      lastAttemptAt: pick(ISO),
    };
    if (!opts.newFields) return ex;
    if (chance(0.5)) ex.fails = int(0, 3);
    const mode = opts.triplet ?? 'random';
    const has = (): boolean => (mode === 'byId' ? index % 2 === 0 : chance(0.5));
    if (mode === 'byId') {
      if (has()) {
        ex.lastScore = pick([0, 50, 100]);
        ex.box = int(0, 4);
        ex.due = pick([...DAYS, '']);
      }
    } else {
      if (has()) ex.lastScore = pick([0, 50, 100]);
      if (has()) ex.box = int(0, 4);
      if (has()) ex.due = pick([...DAYS, '']);
    }
    return ex;
  }

  function lesson(opts: GenOptions): LessonProgress {
    const completed = chance(0.5);
    const l: LessonProgress = { status: completed ? 'completed' : 'read', exercises: {} };
    if (completed && chance(0.8)) l.completedAt = pick(ISO);
    for (let i = 0; i < 5; i++) if (chance(0.5)) l.exercises[`e${i}`] = exercise(i, opts);
    return l;
  }

  function progress(opts: GenOptions = {}): ProgressV1 {
    const current = int(0, 10);
    const p: ProgressV1 = {
      schemaVersion: 1,
      createdAt: pick(ISO),
      lastUpdated: pick(ISO),
      lessons: {},
      streak: { current, longest: current + int(0, 5), lastStudiedDate: pick([...DAYS, '']) },
      preferences: {},
      achievements: {},
    };
    for (let i = 0; i < 6; i++) if (chance(0.5)) p.lessons[`l${i}`] = lesson(opts);
    if (chance(0.6)) p.preferences.uiLocale = pick(['es', 'eu', 'fr']);
    if (chance(0.3)) p.preferences.theme = pick(['light', 'dark', 'auto'] as const);
    for (let i = 0; i < 5; i++) if (chance(0.5)) p.achievements![`a${i}`] = { unlockedAt: pick(ISO) };
    if (opts.newFields) {
      if (chance(0.3)) p.preferences.weeklyGoalDays = int(1, 7);
      if (chance(0.6)) {
        p.activity = {};
        for (const d of DAYS) if (chance(0.5)) p.activity[d] = int(1, 20);
      }
    }
    return p;
  }

  return { progress, rnd, pick, int, chance, DAYS };
}

/** Rutas de las claves con valor `undefined` (debe quedar vacío). */
export function undefinedKeys(x: unknown, path = '$'): string[] {
  if (!x || typeof x !== 'object') return [];
  const out: string[] = [];
  for (const [k, v] of Object.entries(x)) {
    if (v === undefined) out.push(`${path}.${k}`);
    else out.push(...undefinedKeys(v, `${path}.${k}`));
  }
  return out;
}
