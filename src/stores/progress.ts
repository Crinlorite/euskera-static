// Progress store: minimal stub. Expanded in Phase 7 with full memory card behavior.
// This stub exists so layout components can import safely before Phase 7 lands.

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

export interface ProgressV1 {
  schemaVersion: 1;
  createdAt: string;
  lastUpdated: string;
  lessons: Record<string, LessonProgress>;
  streak: Streak;
  preferences: Preferences;
}

function emptyProgress(): ProgressV1 {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    createdAt: now,
    lastUpdated: now,
    lessons: {},
    streak: { current: 0, longest: 0, lastStudiedDate: '' },
    preferences: {},
  };
}

export function getProgress(): ProgressV1 {
  if (typeof localStorage === 'undefined') return emptyProgress();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyProgress();
  try {
    return JSON.parse(raw) as ProgressV1;
  } catch {
    return emptyProgress();
  }
}
