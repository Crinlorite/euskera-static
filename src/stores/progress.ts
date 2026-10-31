import { saveProgress as nativeSaveProgress, syncProgressToNative } from '../lib/platform.ts';
import { addDays, todayKey } from '../lib/dates.ts';
import { exportHash as encodeHash, decodeHash, SUPPORTED_SCHEMA } from './progress-hash.ts';
import { mergeLesson, mergeProgress } from './progress-merge.ts';

export const STORAGE_KEY = 'euskera-static.progress.v1';
export const SCHEMA_VERSION = 1 as const;
/** Evento en `window` tras cada `setProgress` (para refrescar en vivo lo que pinte progreso). */
export const PROGRESS_EVENT = 'kaixo:progress';

// Seguimos en schemaVersion 1 a propósito: todo lo nuevo son campos OPCIONALES.
// Un cliente con el JS viejo en caché vaciaría un blob v2, pero conserva los
// campos que no conoce de un v1 (`migrate` hace `...p`). Los tipos van completos
// desde la fase 0 para que la fusión sea correcta antes de que existan escritores.
export interface ExerciseResult {
  attempts: number;
  bestScore: number;
  /** ISO UTC. */
  lastAttemptAt: string;
  /** Nota del último intento (repaso, fase 2). */
  lastScore?: number;
  /** Intentos con nota < 100 en tipos corregibles (fase 2). */
  fails?: number;
  /** Caja de repaso: 0..3 en cola; 4 = graduado (fase 2). */
  box?: number;
  /** 'YYYY-MM-DD' local en que toca repasar; '' = graduado (fase 2). */
  due?: string;
}

export interface LessonProgress {
  status: 'read' | 'completed';
  /** PRIMERA vez que se completó (ya no se sobrescribe). */
  completedAt?: string;
  exercises: Record<string, ExerciseResult>;
}

export interface Streak {
  current: number;
  longest: number;
  /** 'YYYY-MM-DD' (local desde la fase 0; antes, UTC). */
  lastStudiedDate: string;
}

export interface Preferences {
  uiLocale?: string;
  theme?: 'light' | 'dark' | 'auto';
  /** Meta semanal de días de estudio, 1..7 (fase 3). Del dispositivo. */
  weeklyGoalDays?: number;
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
  /** 'YYYY-MM-DD' local → nº de respuestas ese día (fase 3). */
  activity?: Record<string, number>;
}

/** Lo que puede llegar de fuera: misma forma, versión cualquiera. */
export type ProgressAny = Omit<ProgressV1, 'schemaVersion'> & { schemaVersion: number };

export function emptyProgress(): ProgressV1 {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    createdAt: now,
    lastUpdated: now,
    lessons: {},
    streak: { current: 0, longest: 0, lastStudiedDate: '' },
    preferences: {},
    achievements: {},
  };
}

export function isStorageAvailable(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    const probe = '__probe__';
    localStorage.setItem(probe, probe);
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSave: ProgressV1 | null = null;
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

function readStored(): ProgressV1 | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? migrate(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/**
 * Devuelve SIEMPRE lo más reciente: el guardado pendiente si lo hay (copia), si no
 * lo que haya en disco. Antes leía solo el disco e ignoraba lo pendiente del
 * debounce: dos escrituras seguidas (último ejercicio + lección completada) se
 * pisaban y el último ejercicio desaparecía al recargar.
 */
export function getProgress(): ProgressV1 {
  if (pendingSave) return clone(pendingSave);
  return readStored() ?? emptyProgress();
}

/**
 * Guarda con debounce de 500 ms. Sin localStorage (modo invitado, bloqueado) el
 * progreso queda en memoria durante la sesión: `getProgress()` lo sigue viendo.
 */
export function setProgress(p: ProgressV1) {
  p.lastUpdated = new Date().toISOString();
  pendingSave = p;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flushPendingSave, 500);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(PROGRESS_EVENT));
}

// El debounce de 500ms pierde la última escritura si el usuario cierra la
// pestaña justo tras terminar un ejercicio. pagehide cubre cierre, navegación
// externa y bfcache; visibilitychange cubre cambio de app en móvil.
/**
 * Escribe YA lo que hubiera pendiente. Lo usa la restauración desde el respaldo nativo: ahí no
 * se puede esperar al debounce de 500 ms, porque el usuario puede cerrar la app
 * justo después de que el wrapper devuelva el progreso.
 */
export function saveNow() { flushPendingSave(); }

// Ojo si algún día se añade «borrar progreso»: debe escribir directamente en
// localStorage y poner `pendingSave = null`; si no, la fusión de aquí abajo
// resucitaría lo borrado.
function flushPendingSave() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (pendingSave === null) return;
  // Fusiona con lo que haya en disco (otra pestaña pudo escribir) antes de
  // escribir: nunca pisa.
  const stored = readStored();
  const progress = stored ? mergeProgress(pendingSave, stored) : pendingSave;
  let written = false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    written = true;
  } catch { /* storage lleno, bloqueado o inexistente */ }
  const lessonsCompleted = Object.values(progress.lessons).filter((l) => l.status === 'completed').length;
  nativeSaveProgress({
    streak: progress.streak.current,
    longest: progress.streak.longest,
    lessonsCompleted,
    lastStudied: progress.streak.lastStudiedDate,
  });
  // Progreso COMPLETO al wrapper nativo (iOS lo respalda en local), también si
  // el guardado local falló. El hash es asíncrono; si falla no pasa nada.
  void encodeHash(progress).then((h) => syncProgressToNative(h, progress.lastUpdated)).catch(() => {});
  // Si no se pudo escribir, sigue en memoria (lecturas coherentes) y se reintenta
  // en el siguiente guardado o al ocultar la página.
  pendingSave = written ? null : progress;
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushPendingSave);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPendingSave();
  });
  // Otra pestaña escribió: lo pendiente de esta se fusiona ya con ello, para que
  // las lecturas de aquí lo vean antes del siguiente guardado.
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY || !pendingSave) return;
    const stored = readStored();
    if (stored) pendingSave = mergeProgress(pendingSave, stored);
  });
}

// Migración path-based legacy → opaque IDs estables.
// Antes (v0.x) las claves de `lessons` eran paths tipo "a1/01-saludos/01-kaixo".
// Ahora son IDs opacos como "a1-greetings-1". Cuando importamos un hash antiguo
// (o leemos un localStorage de antes), traducimos las claves.
const LEGACY_UNIT_SLUG_TO_ID: Record<string, string> = {
  '01-saludos':            'a1-greetings',
  '02-familia':            'a1-family',
  '03-nolakoa-zara':       'a1-descriptions',
  '04-kafe-goxoa':         'a1-bar-food',
  '05-auzoko-euskaltegia': 'a1-town',
  '06-maritxu-nora-zoaz':  'a1-directions',
  '07-bizimodua':          'a1-routine',
  '08-zer-egin-duzu':      'a1-recent-past',
  '09-etxean-jan-eta-lan': 'a1-home',
  '10-auzokideak':         'a1-people',
  '11-erosi-eta-egin':     'a1-shopping',
  '12-jatetxean':          'a1-restaurant',
  '13-asteko-agenda':      'a1-week-plan',
};

function migrateLegacyLessonKey(key: string): string | null {
  // Detecta si la clave es path-based ("a1/<unit-slug>/<lesson-slug>") y la
  // traduce a ID nuevo "<unit-id>-<order>" — null si no se puede mapear.
  if (!key.includes('/')) return null; // ya es ID nuevo
  const parts = key.split('/');
  if (parts.length !== 3) return null;
  const [, unitSlug, lessonSlug] = parts;
  const unitId = LEGACY_UNIT_SLUG_TO_ID[unitSlug];
  if (!unitId) return null;
  const orderMatch = lessonSlug.match(/^(\d+)/);
  if (!orderMatch) return null;
  const order = parseInt(orderMatch[1], 10);
  return `${unitId}-${order}`;
}

/**
 * Normaliza lo que venga (disco, código importado, respaldo nativo) a v1.
 * NUNCA vacía:
 * - una versión superior se trata como v1 con campos extra (se conservan);
 * - una clave antigua que no se sabe traducir se conserva con su clave;
 * - si una clave antigua y una nueva son la misma lección, se fusionan.
 */
export function migrate(p: ProgressAny): ProgressV1 {
  if (!p || typeof p !== 'object') return emptyProgress();
  const base = emptyProgress();
  const lessons: Record<string, LessonProgress> = {};
  for (const [key, raw] of Object.entries(p.lessons ?? {})) {
    if (!raw || typeof raw !== 'object') continue;
    // Una lección sin `exercises` (dato dañado) haría reventar a quien la lea.
    const value: LessonProgress = raw.exercises && typeof raw.exercises === 'object' ? raw : { ...raw, exercises: {} };
    const newKey = key.includes('/') ? (migrateLegacyLessonKey(key) ?? key) : key;
    const prev = lessons[newKey];
    lessons[newKey] = prev ? mergeLesson(prev, value) : value;
  }
  // Backwards-compat: hashes antiguos no traen `achievements`. Garantizamos
  // que el campo siempre exista para que el resto del código no vea undefined.
  return {
    ...p, // conserva campos que esta versión no conoce
    schemaVersion: 1,
    createdAt: p.createdAt ?? base.createdAt,
    lastUpdated: p.lastUpdated ?? base.lastUpdated,
    lessons,
    streak: { ...base.streak, ...(p.streak ?? {}) },
    preferences: p.preferences ?? {},
    achievements: p.achievements ?? {},
  };
}

export function recordLessonRead(lessonKey: string): ProgressV1 {
  const p = getProgress();
  if (!p.lessons[lessonKey]) {
    p.lessons[lessonKey] = { status: 'read', exercises: {} };
  }
  bumpStreak(p);
  setProgress(p);
  return p;
}

export function recordLessonCompleted(lessonKey: string): ProgressV1 {
  const p = getProgress();
  if (!p.lessons[lessonKey]) p.lessons[lessonKey] = { status: 'completed', exercises: {} };
  const l = p.lessons[lessonKey];
  l.status = 'completed';
  // Primera vez que se completó: repetir la lección no la mueve.
  if (!l.completedAt) l.completedAt = new Date().toISOString();
  bumpStreak(p);
  setProgress(p);
  return p;
}

export function recordExerciseResult(
  lessonKey: string,
  exerciseId: string,
  score: number,
): ProgressV1 {
  const p = getProgress();
  if (!p.lessons[lessonKey]) p.lessons[lessonKey] = { status: 'read', exercises: {} };
  const ex = p.lessons[lessonKey].exercises[exerciseId] ?? { attempts: 0, bestScore: 0, lastAttemptAt: '' };
  ex.attempts += 1;
  ex.bestScore = Math.max(ex.bestScore, Math.round(score));
  ex.lastAttemptAt = new Date().toISOString();
  p.lessons[lessonKey].exercises[exerciseId] = ex;
  bumpStreak(p);
  setProgress(p);
  return p;
}

// Persiste los logros desbloqueados pasados como argumento. Idempotente:
// si un id ya estaba desbloqueado, no se reescribe la fecha. Devuelve el
// estado actualizado del progreso. La evaluación (qué logros desbloquear)
// vive en src/lib/achievements.ts para mantener el store "tonto".
export function unlockAchievements(achievementIds: string[]): ProgressV1 {
  const p = getProgress();
  if (!p.achievements) p.achievements = {};
  const now = new Date().toISOString();
  let changed = false;
  for (const id of achievementIds) {
    if (!p.achievements[id]) {
      p.achievements[id] = { unlockedAt: now };
      changed = true;
    }
  }
  if (changed) setProgress(p);
  return p;
}

/**
 * Racha de días seguidos, con el día LOCAL de `todayKey()`. Exportada para tests.
 * `last >= today` cuenta como "ya contado hoy": cubre también las fechas
 * "futuras" que dejó el cálculo antiguo en UTC (de noche, en husos al oeste de
 * Greenwich), para que el cambio a hora local no rompa ninguna racha.
 */
export function bumpStreak(p: ProgressV1, today: string = todayKey()) {
  const last = p.streak.lastStudiedDate || '';
  if (last >= today) return;
  p.streak.current = last === addDays(today, -1) ? p.streak.current + 1 : 1;
  p.streak.longest = Math.max(p.streak.longest, p.streak.current);
  p.streak.lastStudiedDate = today;
}

// ---------- Hash encoding ----------
// El códec vive en progress-hash.ts (puro y probado); aquí solo se le da el
// progreso actual por defecto.

export async function exportHash(p: ProgressV1 = getProgress()): Promise<string> {
  return encodeHash(p);
}

export interface ImportResult {
  ok: boolean;
  /** 'outdated': el código viene de una versión más nueva; se fusionó igual. */
  reason?: 'invalid' | 'outdated';
  imported?: ProgressV1;
  /** Lecciones que no estaban aquí y llegaron con el código. */
  added: number;
}

/**
 * Importa un código de progreso FUSIONÁNDOLO con el local (antes lo sustituía y
 * borraba las lecciones que este idioma no conocía). No pregunta nada: la fusión
 * solo puede añadir. Escribe ya, sin esperar al debounce.
 */
export async function importHash(hash: string): Promise<ImportResult> {
  hash = hash.trim();
  if (!hash) return { ok: false, reason: 'invalid', added: 0 };
  const payload = await decodeHash(hash);
  if (!payload) return { ok: false, reason: 'invalid', added: 0 };
  const local = getProgress();
  const merged = mergeProgress(local, migrate(payload));
  setProgress(merged);
  saveNow();
  const result: ImportResult = {
    ok: true,
    imported: merged,
    added: Object.keys(merged.lessons).length - Object.keys(local.lessons).length,
  };
  if (payload.schemaVersion > SUPPORTED_SCHEMA) result.reason = 'outdated';
  return result;
}
