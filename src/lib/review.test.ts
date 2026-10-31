import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ExerciseResult, LessonProgress, ProgressV1 } from '../stores/progress.ts';
import type { LessonIndex } from './lesson-index.ts';
import {
  buildReinforcement, buildReviewQueue, countDue, countGraduated, dueItems, inScope, isDue, nextDueDate,
  scopeFromSearch, seededShuffleTies, GRADUATED_BOX, REVIEW_SESSION_SIZE, type ReviewItem,
} from './review.ts';

const HOY = '2026-05-11';
const MANANA = '2026-05-12';
const AYER = '2026-05-10';

const r = (over: Partial<ExerciseResult> = {}): ExerciseResult => ({
  attempts: 1, bestScore: 0, lastAttemptAt: '2026-05-01T10:00:00.000Z', ...over,
});

function prog(lessons: Record<string, LessonProgress>): ProgressV1 {
  return {
    schemaVersion: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastUpdated: '2026-01-01T00:00:00.000Z',
    lessons,
    streak: { current: 0, longest: 0, lastStudiedDate: '' },
    preferences: {},
    achievements: {},
  };
}

// Dos unidades; las flashcards (fc) están en `ex` pero no en `g`.
const index: LessonIndex = {
  'a1-descriptions-5': { u: 'a1-descriptions', ex: ['mc1', 'fb1', 'fc', 'mp'], g: ['mc1', 'fb1', 'mp'] },
  'a1-descriptions-6': { u: 'a1-descriptions', ex: ['mc1', 'mc2'], g: ['mc1', 'mc2'] },
  'a1-family-1': { u: 'a1-family', ex: ['mc1', 'fc'], g: ['mc1'] },
};

const ids = (xs: ReviewItem[]) => xs.map((x) => `${x.lessonKey}/${x.exerciseId}`);

test('isDue: arranque legacy (sin caja) vence si nunca se acertó', () => {
  assert.equal(isDue(r({ attempts: 1, bestScore: 0 }), HOY), true);
  assert.equal(isDue(r({ attempts: 2, bestScore: 90 }), HOY), true);
  assert.equal(isDue(r({ attempts: 1, bestScore: 100 }), HOY), false);
  assert.equal(isDue(r({ attempts: 0, bestScore: 0 }), HOY), false);
  assert.equal(isDue(undefined, HOY), false);
});

test('isDue: vence hoy o antes; mañana no; caja 4 nunca', () => {
  assert.equal(isDue(r({ box: 1, due: HOY }), HOY), true);
  assert.equal(isDue(r({ box: 1, due: AYER }), HOY), true);
  assert.equal(isDue(r({ box: 1, due: MANANA }), HOY), false);
  assert.equal(isDue(r({ box: 0, due: '' }), HOY), true);
  assert.equal(isDue(r({ box: GRADUATED_BOX, due: '' }), HOY), false);
  assert.equal(isDue(r({ box: GRADUATED_BOX, due: AYER }), HOY), false);
});

test('dueItems: descarta ids que no están en index[l].g (flashcards y viejos) y lecciones desconocidas', () => {
  const p = prog({
    'a1-descriptions-5': {
      status: 'completed',
      exercises: { mc1: r(), fc: r({ bestScore: 20 }), viejo: r(), mp: r({ bestScore: 100 }) },
    },
    'a1-otra-9': { status: 'completed', exercises: { mc1: r() } },
  });
  const items = dueItems(p, index, { kind: 'all' }, HOY);
  assert.deepEqual(ids(items), ['a1-descriptions-5/mc1']);
  assert.deepEqual(items[0], { lessonKey: 'a1-descriptions-5', exerciseId: 'mc1', box: 0, due: HOY, fails: 1 });
});

test('ámbito: unidad y lección', () => {
  assert.equal(inScope('a1-family-1', 'a1-family', { kind: 'all' }), true);
  assert.equal(inScope('a1-family-1', 'a1-family', { kind: 'unit', unitId: 'a1-family' }), true);
  assert.equal(inScope('a1-family-1', 'a1-family', { kind: 'unit', unitId: 'a1-descriptions' }), false);
  assert.equal(inScope('a1-family-1', 'a1-family', { kind: 'lesson', lessonId: 'a1-family-1' }), true);
  assert.equal(inScope('a1-family-1', 'a1-family', { kind: 'lesson', lessonId: 'a1-family-2' }), false);

  const p = prog({
    'a1-descriptions-5': { status: 'completed', exercises: { mc1: r() } },
    'a1-descriptions-6': { status: 'read', exercises: { mc2: r() } },
    'a1-family-1': { status: 'completed', exercises: { mc1: r() } },
  });
  assert.equal(countDue(p, index, { kind: 'all' }, HOY), 3);
  assert.equal(countDue(p, index, { kind: 'unit', unitId: 'a1-descriptions' }, HOY), 2);
  assert.equal(countDue(p, index, { kind: 'unit', unitId: 'a1-family' }, HOY), 1);
  assert.deepEqual(ids(dueItems(p, index, { kind: 'lesson', lessonId: 'a1-descriptions-6' }, HOY)), ['a1-descriptions-6/mc2']);
});

test('scopeFromSearch: ?unit, ?lesson y sin nada', () => {
  assert.deepEqual(scopeFromSearch(''), { kind: 'all' });
  assert.deepEqual(scopeFromSearch('?unit=a1-family'), { kind: 'unit', unitId: 'a1-family' });
  assert.deepEqual(scopeFromSearch('?lesson=a1-family-1'), { kind: 'lesson', lessonId: 'a1-family-1' });
});

test('buildReviewQueue: ordena por caja, luego vencimiento, luego más fallos', () => {
  const p = prog({
    'a1-descriptions-5': {
      status: 'completed',
      exercises: {
        mc1: r({ box: 2, due: AYER, fails: 1 }),
        fb1: r({ box: 0, due: HOY, fails: 1 }),
        mp: r({ box: 0, due: AYER, fails: 1 }),
      },
    },
    'a1-descriptions-6': {
      status: 'completed',
      exercises: { mc1: r({ box: 0, due: AYER, fails: 5 }), mc2: r({ box: 1, due: HOY, fails: 2 }) },
    },
  });
  assert.deepEqual(ids(buildReviewQueue(p, index, { kind: 'all' }, HOY)), [
    'a1-descriptions-6/mc1', // caja 0, ayer, 5 fallos
    'a1-descriptions-5/mp', //  caja 0, ayer, 1 fallo
    'a1-descriptions-5/fb1', // caja 0, hoy
    'a1-descriptions-6/mc2', // caja 1
    'a1-descriptions-5/mc1', // caja 2
  ]);
});

test('buildReviewQueue: como mucho REVIEW_SESSION_SIZE', () => {
  const g = Array.from({ length: 15 }, (_, k) => `e${k}`);
  const big: LessonIndex = { l1: { u: 'u1', ex: g, g } };
  const p = prog({ l1: { status: 'completed', exercises: Object.fromEntries(g.map((id) => [id, r()])) } });
  assert.equal(buildReviewQueue(p, big, { kind: 'all' }, HOY).length, REVIEW_SESSION_SIZE);
  assert.equal(buildReviewQueue(p, big, { kind: 'all' }, HOY, 4).length, 4);
  assert.equal(countDue(p, big, { kind: 'all' }, HOY), 15);
});

test('seededShuffleTies: estable con la misma semilla, distinto con otra; solo baraja empates', () => {
  const empatados: ReviewItem[] = Array.from({ length: 12 }, (_, k) => ({
    lessonKey: 'l1', exerciseId: `e${k}`, box: 0, due: HOY, fails: 1,
  }));
  const a = seededShuffleTies(empatados, '2026-05-11');
  const b = seededShuffleTies([...empatados].reverse(), '2026-05-11');
  const c = seededShuffleTies(empatados, '2026-05-12');
  assert.deepEqual(ids(a), ids(b), 'no depende del orden de entrada');
  assert.notDeepEqual(ids(a), ids(c), 'otra semilla, otro orden');
  assert.deepEqual([...ids(a)].sort(), [...ids(empatados)].sort(), 'mismos elementos');

  // Un ítem de caja 0 delante de los de caja 1 nunca cambia de sitio.
  const mezcla: ReviewItem[] = [
    { lessonKey: 'l1', exerciseId: 'primero', box: 0, due: HOY, fails: 1 },
    ...empatados.map((x) => ({ ...x, box: 1 })),
    { lessonKey: 'l1', exerciseId: 'ultimo', box: 2, due: HOY, fails: 1 },
  ];
  const out = seededShuffleTies(mezcla, 'x');
  assert.equal(out[0].exerciseId, 'primero');
  assert.equal(out[out.length - 1].exerciseId, 'ultimo');
});

test('nextDueDate: el menor vencimiento posterior a hoy en cola; nada si no queda', () => {
  const p = prog({
    'a1-descriptions-5': {
      status: 'completed',
      exercises: {
        mc1: r({ box: 2, due: '2026-05-14', bestScore: 100 }),
        fb1: r({ box: 1, due: MANANA, bestScore: 100 }),
        mp: r({ box: GRADUATED_BOX, due: '', bestScore: 100 }),
      },
    },
    'a1-family-1': { status: 'completed', exercises: { mc1: r({ box: 3, due: '2026-05-13', bestScore: 100 }) } },
  });
  assert.equal(nextDueDate(p, index, { kind: 'all' }, HOY), MANANA);
  assert.equal(nextDueDate(p, index, { kind: 'unit', unitId: 'a1-family' }, HOY), '2026-05-13');
  assert.equal(nextDueDate(prog({}), index, { kind: 'all' }, HOY), '');
  // Lo vencido hoy no es «próximo».
  const vencido = prog({ 'a1-family-1': { status: 'completed', exercises: { mc1: r({ box: 0, due: HOY }) } } });
  assert.equal(nextDueDate(vencido, index, { kind: 'all' }, HOY), '');
});

test('countGraduated: caja 4 solo sobre ids del índice', () => {
  const p = prog({
    'a1-descriptions-5': {
      status: 'completed',
      exercises: {
        mc1: r({ box: GRADUATED_BOX, due: '', bestScore: 100 }),
        fb1: r({ box: 3, due: MANANA, bestScore: 100 }),
        viejo: r({ box: GRADUATED_BOX, due: '', bestScore: 100 }),
      },
    },
    'a1-family-1': { status: 'completed', exercises: { mc1: r({ box: GRADUATED_BOX, due: '', bestScore: 100 }) } },
  });
  assert.equal(countGraduated(p, index), 2);
  assert.equal(countGraduated(p, index, { kind: 'unit', unitId: 'a1-family' }), 1);
});

test('buildReinforcement: acertados de lecciones completadas, fuera de la cola, más antiguos primero', () => {
  const p = prog({
    'a1-descriptions-5': {
      status: 'completed',
      exercises: {
        mc1: r({ bestScore: 100, lastAttemptAt: '2026-03-01T00:00:00.000Z' }), // sin caja: entra
        fb1: r({ bestScore: 100, box: 2, due: MANANA, lastAttemptAt: '2026-01-01T00:00:00.000Z' }), // en cola
        mp: r({ bestScore: 100, box: GRADUATED_BOX, due: '', lastAttemptAt: '2026-02-01T00:00:00.000Z' }), // graduado: entra
        fc: r({ bestScore: 100, lastAttemptAt: '2025-01-01T00:00:00.000Z' }), // flashcards: nunca
      },
    },
    'a1-descriptions-6': {
      status: 'completed',
      exercises: {
        mc1: r({ bestScore: 0, lastAttemptAt: '2025-06-01T00:00:00.000Z' }), // vencido: no
        mc2: r({ bestScore: 100, box: 0, due: HOY, lastAttemptAt: '2025-06-01T00:00:00.000Z' }), // vencido: no
      },
    },
    'a1-family-1': { status: 'read', exercises: { mc1: r({ bestScore: 100, lastAttemptAt: '2025-01-01T00:00:00.000Z' }) } }, // sin completar
  });
  const out = buildReinforcement(p, index, { kind: 'all' });
  assert.deepEqual(ids(out), ['a1-descriptions-5/mp', 'a1-descriptions-5/mc1']);
  // Nada del refuerzo está en la cola de hoy.
  const cola = new Set(ids(dueItems(p, index, { kind: 'all' }, HOY)));
  assert.ok(ids(out).every((id) => !cola.has(id)));
  assert.equal(buildReinforcement(p, index, { kind: 'all' }, 1).length, 1);
  assert.deepEqual(buildReinforcement(p, index, { kind: 'unit', unitId: 'a1-family' }), []);
});
