import type { AchievementUnlock, ExerciseResult, LessonProgress, ProgressV1, Streak } from './progress';

/**
 * Fusiona dos progresos. **Solo suma**: nunca borra una lección, nunca baja una
 * puntuación y nunca acorta una racha. Por eso se puede aplicar automáticamente
 * al recuperar del respaldo nativo sin arriesgar lo que se acaba de hacer en el dispositivo.
 *
 * Es idempotente —`merge(merge(a,b), b) === merge(a,b)`— porque todas las reglas
 * son máximos o mínimos, nunca sumas: así reintentar una sincronización no infla
 * los contadores. Y es conmutativa salvo en las preferencias, que son del
 * dispositivo: las de `local` mandan.
 *
 * Toda clave de `lessons`, `exercises`, `achievements` y `activity` presente en
 * cualquiera de los dos lados sale en el resultado, y ningún campo definido en un
 * solo lado desaparece. Tampoco se crean claves con valor `undefined`.
 */
export function mergeProgress(local: ProgressV1, remote: ProgressV1): ProgressV1 {
  // Racha en curso: la del lado que estudió más recientemente. Si los dos
  // estudiaron el mismo día, la mayor (antes ganaba `local` y no era conmutativa).
  const ld = local.streak.lastStudiedDate || '';
  const rd = remote.streak.lastStudiedDate || '';
  const streak: Streak = ld === rd
    ? { current: Math.max(local.streak.current, remote.streak.current), longest: 0, lastStudiedDate: ld }
    : ld > rd ? { ...local.streak } : { ...remote.streak };
  streak.longest = Math.max(local.streak.longest, remote.streak.longest);

  const out: ProgressV1 = {
    schemaVersion: 1,
    createdAt: earliest(local.createdAt, remote.createdAt),
    lastUpdated: latest(local.lastUpdated, remote.lastUpdated),
    lessons: mergeRecords(local.lessons, remote.lessons, mergeLesson),
    streak,
    // Las preferencias son del dispositivo: las locales mandan, las remotas solo
    // rellenan lo que aquí no está definido.
    preferences: { ...remote.preferences, ...local.preferences },
    achievements: mergeRecords(local.achievements ?? {}, remote.achievements ?? {}, mergeAchievement),
  };
  // Respuestas por día: máximo, nunca suma (la misma actividad llega por los dos lados).
  if (local.activity || remote.activity) {
    out.activity = mergeRecords(local.activity ?? {}, remote.activity ?? {}, (x, y) => Math.max(x, y));
  }
  return out;
}

function mergeRecords<T>(
  a: Record<string, T>,
  b: Record<string, T>,
  merge: (x: T, y: T) => T,
): Record<string, T> {
  const out: Record<string, T> = { ...b };
  for (const [key, value] of Object.entries(a)) {
    const other = b[key];
    out[key] = other === undefined ? value : merge(value, other);
  }
  return out;
}

/**
 * Fusiona dos estados de la misma lección. Exportada porque `migrate()` la usa
 * cuando una clave antigua y una nueva apuntan a la misma lección.
 */
export function mergeLesson(a: LessonProgress, b: LessonProgress): LessonProgress {
  const out: LessonProgress = {
    status: a.status === 'completed' || b.status === 'completed' ? 'completed' : 'read',
    exercises: mergeRecords(a.exercises ?? {}, b.exercises ?? {}, mergeExercise),
  };
  // La primera vez que se completó: si solo un lado la completó, esa fecha.
  setIfDefined(out, 'completedAt', earliestDefined(a.completedAt, b.completedAt));
  return out;
}

function mergeExercise(a: ExerciseResult, b: ExerciseResult): ExerciseResult {
  const at = a.lastAttemptAt || '';
  const bt = b.lastAttemptAt || '';
  const out: ExerciseResult = {
    // Máximo y no suma: sumar contaría dos veces al re-sincronizar.
    attempts: Math.max(a.attempts, b.attempts),
    bestScore: Math.max(a.bestScore, b.bestScore),
    lastAttemptAt: latest(at, bt),
  };
  setIfDefined(out, 'fails', maxDefined(a.fails, b.fails));
  // Última nota y caja de repaso: del lado que respondió más tarde. Si ese lado no
  // las tiene (un cliente viejo que no las escribe), las del otro: así la cola de
  // repaso no se evapora al pasar por él. Empate exacto de fecha: el máximo.
  const pick = <K extends 'lastScore' | 'box' | 'due'>(k: K): ExerciseResult[K] => {
    const x = a[k];
    const y = b[k];
    if (at === bt) {
      if (x === undefined) return y;
      if (y === undefined) return x;
      return x > y ? x : y;
    }
    return at > bt ? (x ?? y) : (y ?? x); // el reciente; si no lo tiene, el otro
  };
  setIfDefined(out, 'lastScore', pick('lastScore'));
  setIfDefined(out, 'box', pick('box'));
  setIfDefined(out, 'due', pick('due'));
  return out;
}

function mergeAchievement(a: AchievementUnlock, b: AchievementUnlock): AchievementUnlock {
  return { unlockedAt: earliest(a.unlockedAt, b.unlockedAt) };
}

const latest = (a: string, b: string): string => (a > b ? a : b);
const earliest = (a: string, b: string): string => (a < b ? a : b);

function earliestDefined(a?: string, b?: string): string | undefined {
  if (a && b) return earliest(a, b);
  // Uno solo (o ninguno) con fecha. `a || b || (a ?? b)` es simétrica también con
  // cadenas vacías heredadas, para que la fusión siga siendo conmutativa.
  return a || b || (a ?? b);
}

function maxDefined(a?: number, b?: number): number | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return Math.max(a, b);
}

/** Asigna solo si hay valor: nunca deja claves `undefined` (JSON más corto, tests exactos). */
function setIfDefined<T extends object, K extends keyof T>(obj: T, key: K, value: T[K] | undefined): void {
  if (value !== undefined) obj[key] = value as T[K];
}
