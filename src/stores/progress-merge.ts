import type { AchievementUnlock, ExerciseResult, LessonProgress, ProgressV1 } from './progress';

/**
 * Fusiona dos progresos. **Solo suma**: nunca borra una lección, nunca baja una
 * puntuación y nunca acorta una racha. Por eso se puede aplicar automáticamente
 * al recuperar de iCloud sin arriesgar lo que se acaba de hacer en el dispositivo.
 *
 * Es idempotente —`merge(merge(a,b), b) === merge(a,b)`— porque todas las reglas
 * son máximos o mínimos, nunca sumas: así reintentar una sincronización no infla
 * los contadores.
 *
 * `local` gana en lo que es del dispositivo (preferencias) y en la racha en curso
 * si es quien estudió más recientemente.
 */
export function mergeProgress(local: ProgressV1, remote: ProgressV1): ProgressV1 {
  const localIsNewer = (local.streak.lastStudiedDate || '') >= (remote.streak.lastStudiedDate || '');
  const recent = localIsNewer ? local.streak : remote.streak;

  return {
    schemaVersion: local.schemaVersion,
    createdAt: earliest(local.createdAt, remote.createdAt),
    lastUpdated: latest(local.lastUpdated, remote.lastUpdated),
    lessons: mergeRecords(local.lessons, remote.lessons, mergeLesson),
    streak: {
      current: recent.current,
      longest: Math.max(local.streak.longest, remote.streak.longest),
      lastStudiedDate: recent.lastStudiedDate,
    },
    // Las preferencias son del dispositivo: las locales mandan, las remotas solo
    // rellenan lo que aquí no está definido.
    preferences: { ...remote.preferences, ...local.preferences },
    achievements: mergeRecords(local.achievements ?? {}, remote.achievements ?? {}, mergeAchievement),
  };
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

function mergeLesson(a: LessonProgress, b: LessonProgress): LessonProgress {
  return {
    status: a.status === 'completed' || b.status === 'completed' ? 'completed' : 'read',
    // La primera vez que se completó: si solo un lado la completó, esa fecha.
    completedAt: earliestDefined(a.completedAt, b.completedAt),
    exercises: mergeRecords(a.exercises ?? {}, b.exercises ?? {}, mergeExercise),
  };
}

function mergeExercise(a: ExerciseResult, b: ExerciseResult): ExerciseResult {
  return {
    bestScore: Math.max(a.bestScore, b.bestScore),
    // Máximo y no suma: sumar contaría dos veces al re-sincronizar.
    attempts: Math.max(a.attempts, b.attempts),
    lastAttemptAt: latest(a.lastAttemptAt, b.lastAttemptAt),
  };
}

function mergeAchievement(a: AchievementUnlock, b: AchievementUnlock): AchievementUnlock {
  return { unlockedAt: earliest(a.unlockedAt, b.unlockedAt) };
}

const latest = (a: string, b: string): string => (a > b ? a : b);
const earliest = (a: string, b: string): string => (a < b ? a : b);

function earliestDefined(a?: string, b?: string): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return earliest(a, b);
}
