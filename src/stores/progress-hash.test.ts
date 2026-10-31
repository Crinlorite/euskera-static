import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportHash, decodeHash, SUPPORTED_SCHEMA } from './progress-hash.ts';
import type { ProgressV1 } from './progress.ts';
import { mulberry32 } from '../../tests/helpers/progress-gen.ts';

const sample: ProgressV1 = {
  schemaVersion: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  lastUpdated: '2026-06-01T00:00:00.000Z',
  lessons: { 'a1-u1-l1': { status: 'completed', completedAt: '2026-03-01T10:00:00.000Z', exercises: { e1: { attempts: 2, bestScore: 100, lastAttemptAt: '2026-03-01T10:00:00.000Z' } } } },
  streak: { current: 4, longest: 12, lastStudiedDate: '2026-06-01' },
  preferences: { uiLocale: 'eu' },
  achievements: { first: { unlockedAt: '2026-02-01T00:00:00.000Z' } },
};

test('un progreso exportado se puede volver a leer entero', async () => {
  const decoded = await decodeHash(await exportHash(sample));
  assert.deepEqual(decoded, sample);
});

test('un código corrupto devuelve null en vez de reventar', async () => {
  assert.equal(await decodeHash('P1.esto-no-es-valido'), null);
  assert.equal(await decodeHash(''), null);
});

test('sin schemaVersion numérico devuelve null', async () => {
  assert.equal(await decodeHash('{"lessons":{}}'), null);
  assert.equal(await decodeHash('{"schemaVersion":"1","lessons":{}}'), null);
  assert.equal(await decodeHash('[1,2]'), null);
  assert.equal(await decodeHash('null'), null);
});

test('un esquema más nuevo se devuelve entero (antes se descartaba): decide quien importa', async () => {
  const futuro = { ...sample, schemaVersion: 2, algoNuevo: [1, 2] };
  const decoded = await decodeHash(await exportHash(futuro as unknown as ProgressV1));
  assert.deepEqual(decoded, futuro);
  assert.ok((decoded?.schemaVersion ?? 0) > SUPPORTED_SCHEMA);
});

// Presupuesto de tamaño: el código tiene que caber con holgura en `kaixo://migrar?p=` (la app acepta
// hasta 200 000) y en iCloud KVS. Progreso sintético máximo con todos los campos.
const MAX_HASH_CHARS = 100_000;

test('presupuesto: progreso máximo sintético → código de menos de 100 000 caracteres', async (t) => {
  const rnd = mulberry32(38);
  const int = (n: number) => Math.floor(rnd() * n);
  const iso = (day: number) => new Date(Date.UTC(2024, 0, 1) + day * 86400000 + int(86400000)).toISOString();
  const dayKey = (day: number) => new Date(Date.UTC(2024, 0, 1) + day * 86400000).toISOString().slice(0, 10);

  const lessons: ProgressV1['lessons'] = {};
  for (let l = 0; l < 220; l++) {
    const exercises: ProgressV1['lessons'][string]['exercises'] = {};
    for (let e = 0; e < 10; e++) {
      const day = int(1100);
      exercises[`ex-${String(e + 1).padStart(2, '0')}-${int(1000)}`] = {
        attempts: 1 + int(9),
        bestScore: [50, 75, 90, 100][int(4)],
        lastAttemptAt: iso(day),
        lastScore: [0, 50, 90, 100][int(4)],
        fails: int(5),
        box: int(5),
        due: int(5) === 4 ? '' : dayKey(day + int(8)),
      };
    }
    lessons[`unit-${Math.floor(l / 7)}-lesson-${l % 7}`] = { status: 'completed', completedAt: iso(int(1100)), exercises };
  }
  const activity: Record<string, number> = {};
  for (let d = 0; d < 1100; d++) activity[dayKey(d)] = 1 + int(60);
  const achievements: Record<string, { unlockedAt: string }> = {};
  for (let a = 0; a < 90; a++) achievements[`perfect-unit-unidad-${a}`] = { unlockedAt: iso(int(1100)) };

  const max: ProgressV1 = {
    schemaVersion: 1,
    createdAt: iso(0),
    lastUpdated: iso(1099),
    lessons,
    streak: { current: 120, longest: 365, lastStudiedDate: dayKey(1099) },
    preferences: { uiLocale: 'pt-BR', theme: 'dark', weeklyGoalDays: 5 },
    achievements,
    activity,
  };

  const hash = await exportHash(max);
  t.diagnostic(`JSON ${JSON.stringify(max).length} B → código ${hash.length} caracteres`);
  assert.match(hash, /^P\d+\.[A-Za-z0-9_\-+/=.]+$/);
  assert.ok(hash.length < MAX_HASH_CHARS, `el código mide ${hash.length} caracteres`);
  assert.deepEqual(await decodeHash(hash), max);
});
