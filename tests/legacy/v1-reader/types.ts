// LECTOR ANTIGUO CONGELADO — NO EDITAR.
// Copia literal de los tipos de src/stores/progress.ts tal como estaban antes de la
// fase 0 (progreso y gamificación). Simula a un cliente con el JS viejo en caché:
// tests/compat.test.mjs comprueba que lo que escribe el código nuevo lo sigue
// entendiendo este lector. Si se edita, la prueba deja de valer.

export const STORAGE_KEY = 'euskera-static.progress.v1';
export const SCHEMA_VERSION = 1 as const;

export interface ExerciseResult {
  attempts: number;
  bestScore: number;
  lastAttemptAt: string;
}

export interface LessonProgress {
  status: 'read' | 'completed';
  completedAt?: string;
  exercises: Record<string, ExerciseResult>;
}

export interface Streak {
  current: number;
  longest: number;
  lastStudiedDate: string;
}

export interface Preferences {
  uiLocale?: string;
  theme?: 'light' | 'dark' | 'auto';
}

export interface AchievementUnlock {
  unlockedAt: string;
}

export interface ProgressV1 {
  schemaVersion: 1;
  createdAt: string;
  lastUpdated: string;
  lessons: Record<string, LessonProgress>;
  streak: Streak;
  preferences: Preferences;
  achievements?: Record<string, AchievementUnlock>;
}

export type ProgressAny = ProgressV1;
