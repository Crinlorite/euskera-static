import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportHash, decodeHash } from './progress-hash.ts';
import type { ProgressV1 } from './progress.ts';

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
