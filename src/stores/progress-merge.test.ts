import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeProgress } from './progress-merge.ts';
import type { ProgressV1 } from './progress.ts';

function p(over: Partial<ProgressV1> = {}): ProgressV1 {
  return {
    schemaVersion: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastUpdated: '2026-01-01T00:00:00.000Z',
    lessons: {},
    streak: { current: 0, longest: 0, lastStudiedDate: '' },
    preferences: {},
    achievements: {},
    ...over,
  };
}

const lesson = (over = {}) => ({
  status: 'completed' as const,
  completedAt: '2026-03-01T10:00:00.000Z',
  exercises: {},
  ...over,
});

test('une las lecciones de ambos lados sin perder ninguna', () => {
  const local = p({ lessons: { 'a1-u1-l1': lesson(), 'a1-u1-l2': lesson() } });
  const remote = p({ lessons: { 'a1-u1-l3': lesson() } });

  const out = mergeProgress(local, remote);

  assert.deepEqual(Object.keys(out.lessons).sort(), ['a1-u1-l1', 'a1-u1-l2', 'a1-u1-l3']);
});

test('en una lección repetida se queda la mejor puntuación de cada ejercicio', () => {
  const ex = (bestScore: number, attempts: number, at: string) => ({ bestScore, attempts, lastAttemptAt: at });
  const local = p({ lessons: { l1: lesson({ exercises: { e1: ex(60, 3, '2026-03-01T10:00:00.000Z') } }) } });
  const remote = p({ lessons: { l1: lesson({ exercises: { e1: ex(100, 1, '2026-04-01T10:00:00.000Z') } }) } });

  const out = mergeProgress(local, remote);

  assert.equal(out.lessons.l1.exercises.e1.bestScore, 100);
});

test('completada gana sobre solo leída', () => {
  const local = p({ lessons: { l1: lesson({ status: 'read', completedAt: undefined }) } });
  const remote = p({ lessons: { l1: lesson({ status: 'completed' }) } });

  assert.equal(mergeProgress(local, remote).lessons.l1.status, 'completed');
});

test('la racha más larga sobrevive', () => {
  const local = p({ streak: { current: 2, longest: 5, lastStudiedDate: '2026-05-02' } });
  const remote = p({ streak: { current: 9, longest: 40, lastStudiedDate: '2026-04-01' } });

  assert.equal(mergeProgress(local, remote).streak.longest, 40);
});

test('la racha actual es la del lado que estudió más recientemente', () => {
  const local = p({ streak: { current: 2, longest: 5, lastStudiedDate: '2026-05-02' } });
  const remote = p({ streak: { current: 9, longest: 40, lastStudiedDate: '2026-04-01' } });

  const out = mergeProgress(local, remote);

  assert.equal(out.streak.current, 2);
  assert.equal(out.streak.lastStudiedDate, '2026-05-02');
});

test('los logros se unen y conservan el desbloqueo más antiguo', () => {
  const local = p({ achievements: { a1: { unlockedAt: '2026-05-01T00:00:00.000Z' } } });
  const remote = p({ achievements: { a1: { unlockedAt: '2026-02-01T00:00:00.000Z' }, a2: { unlockedAt: '2026-03-01T00:00:00.000Z' } } });

  const out = mergeProgress(local, remote);

  assert.deepEqual(Object.keys(out.achievements ?? {}).sort(), ['a1', 'a2']);
  assert.equal(out.achievements?.a1.unlockedAt, '2026-02-01T00:00:00.000Z');
});

test('las preferencias del dispositivo mandan', () => {
  const local = p({ preferences: { uiLocale: 'eu' } });
  const remote = p({ preferences: { uiLocale: 'fr', theme: 'dark' } });

  const out = mergeProgress(local, remote);

  assert.equal(out.preferences.uiLocale, 'eu');
  assert.equal(out.preferences.theme, 'dark');
});

test('fusionar dos veces da el mismo resultado (idempotente)', () => {
  const ex = (bestScore: number, attempts: number, at: string) => ({ bestScore, attempts, lastAttemptAt: at });
  const local = p({ lessons: { l1: lesson({ exercises: { e1: ex(60, 3, '2026-03-01T10:00:00.000Z') } }) } });
  const remote = p({ lessons: { l2: lesson({ exercises: { e1: ex(100, 2, '2026-04-01T10:00:00.000Z') } }) } });

  const once = mergeProgress(local, remote);
  const twice = mergeProgress(once, remote);

  assert.deepEqual(twice, once);
});

test('nunca se pierde una lección ni baja una puntuación (propiedad)', () => {
  const ex = (bestScore: number) => ({ bestScore, attempts: 1, lastAttemptAt: '2026-03-01T10:00:00.000Z' });
  const local = p({ lessons: { l1: lesson({ exercises: { e1: ex(80) } }), l2: lesson() } });
  const remote = p({ lessons: { l1: lesson({ exercises: { e1: ex(40), e2: ex(90) } }), l3: lesson() } });

  const out = mergeProgress(local, remote);

  for (const key of [...Object.keys(local.lessons), ...Object.keys(remote.lessons)]) {
    assert.ok(out.lessons[key], `falta la lección ${key}`);
  }
  assert.equal(out.lessons.l1.exercises.e1.bestScore, 80);
  assert.equal(out.lessons.l1.exercises.e2.bestScore, 90);
});
