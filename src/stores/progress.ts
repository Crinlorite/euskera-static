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

function emptyProgress(): ProgressV1 {
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

export function getProgress(): ProgressV1 {
  if (!isStorageAvailable()) return emptyProgress();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyProgress();
  try {
    const parsed = JSON.parse(raw) as ProgressAny;
    return migrate(parsed);
  } catch {
    return emptyProgress();
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function setProgress(p: ProgressV1) {
  if (!isStorageAvailable()) return;
  p.lastUpdated = new Date().toISOString();
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  }, 500);
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

export function migrate(p: ProgressAny): ProgressV1 {
  if (p.schemaVersion !== 1) return emptyProgress();
  // Si hay claves legacy en lessons, traducirlas
  const lessons: Record<string, LessonProgress> = {};
  for (const [key, value] of Object.entries(p.lessons)) {
    if (key.includes('/')) {
      const newKey = migrateLegacyLessonKey(key);
      if (newKey) {
        lessons[newKey] = value;
      }
      // Si no se puede mapear (clave desconocida), la descartamos silenciosamente
    } else {
      lessons[key] = value;
    }
  }
  // Backwards-compat: hashes antiguos no traen `achievements`. Garantizamos
  // que el campo siempre exista para que el resto del código no vea undefined.
  const achievements = p.achievements ?? {};
  return { ...p, lessons, achievements };
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
  p.lessons[lessonKey].status = 'completed';
  p.lessons[lessonKey].completedAt = new Date().toISOString();
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

function bumpStreak(p: ProgressV1) {
  const today = new Date().toISOString().slice(0, 10);
  if (p.streak.lastStudiedDate === today) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (p.streak.lastStudiedDate === yesterday) {
    p.streak.current += 1;
  } else {
    p.streak.current = 1;
  }
  p.streak.longest = Math.max(p.streak.longest, p.streak.current);
  p.streak.lastStudiedDate = today;
}

// ---------- Hash encoding ----------

function bytesToBase64Url(bytes: Uint8Array): string {
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function base64UrlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = (s + pad).replaceAll('-', '+').replaceAll('_', '/');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function streamThrough(input: Uint8Array, transform: GenericTransformStream): Promise<Uint8Array> {
  const stream = new Response(new Blob([input as BlobPart])).body!.pipeThrough(transform as TransformStream<Uint8Array, Uint8Array>);
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

export async function exportHash(p: ProgressV1 = getProgress()): Promise<string> {
  const json = JSON.stringify(p);
  const encoded = new TextEncoder().encode(json);
  if (typeof CompressionStream === 'undefined') {
    return 'P0.' + bytesToBase64Url(encoded);
  }
  const compressed = await streamThrough(encoded, new CompressionStream('deflate-raw'));
  return 'P1.' + bytesToBase64Url(compressed);
}

export interface ImportResult {
  ok: boolean;
  reason?: 'invalid' | 'outdated';
  imported?: ProgressV1;
  skippedLessonKeys?: string[];
}

export async function importHash(hash: string, knownLessonKeys: Set<string>): Promise<ImportResult> {
  hash = hash.trim();
  if (!hash) return { ok: false, reason: 'invalid' };
  let payload: ProgressAny;
  try {
    if (hash.startsWith('P1.')) {
      const bytes = base64UrlToBytes(hash.slice(3));
      const expanded = await streamThrough(bytes, new DecompressionStream('deflate-raw'));
      payload = JSON.parse(new TextDecoder().decode(expanded));
    } else if (hash.startsWith('P0.')) {
      const bytes = base64UrlToBytes(hash.slice(3));
      payload = JSON.parse(new TextDecoder().decode(bytes));
    } else {
      payload = JSON.parse(hash);
    }
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  if (!payload || typeof payload !== 'object' || !('schemaVersion' in payload)) {
    return { ok: false, reason: 'invalid' };
  }
  if ((payload as ProgressAny).schemaVersion > SCHEMA_VERSION) {
    return { ok: false, reason: 'outdated' };
  }
  const migrated = migrate(payload);
  const skipped: string[] = [];
  for (const key of Object.keys(migrated.lessons)) {
    if (!knownLessonKeys.has(key)) {
      skipped.push(key);
      delete migrated.lessons[key];
    }
  }
  setProgress(migrated);
  return { ok: true, imported: migrated, skippedLessonKeys: skipped };
}
