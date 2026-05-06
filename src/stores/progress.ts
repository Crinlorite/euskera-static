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

export function migrate(p: ProgressAny): ProgressV1 {
  if (p.schemaVersion === 1) return p;
  return emptyProgress();
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

async function streamThrough(input: Uint8Array, transform: TransformStream<Uint8Array, Uint8Array>): Promise<Uint8Array> {
  const stream = new Response(new Blob([input as BlobPart])).body!.pipeThrough(transform);
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
