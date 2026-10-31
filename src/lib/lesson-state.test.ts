import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attemptedPct, countStates, GRADED_TYPES, lessonState, stateLabel, type LessonStateInfo } from './lesson-state.ts';
import type { ExerciseResult, LessonProgress } from '../stores/progress.ts';

// Lección tipo: 2 test, 2 huecos, 1 flashcards, 1 emparejar → 6 ejercicios, 5 corregibles.
const EX = ['mc1', 'mc2', 'fb1', 'fb2', 'fc', 'mp'];
const G = ['mc1', 'mc2', 'fb1', 'fb2', 'mp'];

const r = (bestScore: number, attempts = 1): ExerciseResult => ({ attempts, bestScore, lastAttemptAt: '2026-10-31T10:00:00.000Z' });
const lesson = (status: LessonProgress['status'], exercises: Record<string, ExerciseResult>): LessonProgress => ({ status, exercises });
const all = (score: number, ids = EX) => Object.fromEntries(ids.map((id) => [id, r(score)]));

interface Caso {
  nombre: string;
  lp: LessonProgress | undefined;
  ex?: string[];
  g?: string[];
  state: LessonStateInfo['state'];
  pct?: number;
  pending?: string[];
  toReview?: string[];
}

const CASOS: Caso[] = [
  { nombre: 'sin entrada → sin empezar', lp: undefined, state: 'untouched', pct: 0, pending: EX, toReview: [] },
  { nombre: 'leída sin intentos → empezada al 0 %', lp: lesson('read', {}), state: 'started', pct: 0, pending: EX, toReview: [] },
  {
    nombre: 'leída con 2 de 6 → empezada al 33 %',
    lp: lesson('read', { mc1: r(100), fb1: r(0) }),
    state: 'started', pct: 33, pending: ['mc2', 'fb2', 'fc', 'mp'], toReview: ['fb1'],
  },
  {
    nombre: 'completada con un corregible a 60 → completada, uno para repasar',
    lp: lesson('completed', { ...all(100), mp: r(60) }),
    state: 'completed', pct: 100, pending: [], toReview: ['mp'],
  },
  { nombre: 'todo al 100 → todo bien', lp: lesson('completed', all(100)), state: 'perfect', pct: 100, pending: [], toReview: [] },
  {
    nombre: 'flashcards al 50 % y corregibles al 100 → todo bien (las flashcards no cuentan)',
    lp: lesson('completed', { ...all(100), fc: r(50) }),
    state: 'perfect', pending: [], toReview: [],
  },
  {
    nombre: 'fallo corregido en un reintento (bestScore = máx.) → todo bien',
    lp: lesson('completed', { ...all(100), mc1: r(100, 2) }),
    state: 'perfect', toReview: [],
  },
  {
    nombre: 'ejercicio añadido después (sin intento) → completada, pendiente',
    lp: lesson('completed', all(100)),
    ex: [...EX, 'nuevo'], g: [...G, 'nuevo'],
    state: 'completed', pending: ['nuevo'], toReview: [],
  },
  {
    nombre: 'ejercicio retirado (resultado huérfano) → se ignora',
    lp: lesson('completed', { ...all(100), viejo: r(0) }),
    state: 'perfect', pct: 100, pending: [], toReview: [],
  },
  {
    nombre: 'sin corregibles y todo intentado → todo bien',
    lp: lesson('completed', { fc: r(30) }),
    ex: ['fc'], g: [],
    state: 'perfect', pct: 100, pending: [], toReview: [],
  },
  {
    nombre: 'intentos a 0 no cuentan como intentados',
    lp: lesson('read', { mc1: r(0, 0) }),
    state: 'started', pct: 0, toReview: [],
  },
  {
    nombre: 'completada sin ejercicios guardados (dato antiguo) → completada, todo pendiente',
    lp: { status: 'completed', exercises: undefined as unknown as Record<string, ExerciseResult> },
    state: 'completed', pct: 0, pending: EX, toReview: [],
  },
];

for (const c of CASOS) {
  test(`lessonState: ${c.nombre}`, () => {
    const s = lessonState(c.lp, c.ex ?? EX, c.g ?? G);
    assert.equal(s.state, c.state);
    assert.equal(s.total, (c.ex ?? EX).length);
    assert.equal(s.attempted, s.total - s.pending.length);
    if (c.pct !== undefined) assert.equal(attemptedPct(s), c.pct);
    if (c.pending) assert.deepEqual(s.pending, c.pending);
    if (c.toReview) assert.deepEqual(s.toReview, c.toReview);
  });
}

test('lessonState no modifica la lista de ejercicios que recibe', () => {
  const ex = [...EX];
  const s = lessonState(undefined, ex, G);
  s.pending.push('x');
  assert.deepEqual(ex, EX);
});

test('GRADED_TYPES: test, huecos y emparejar; flashcards no', () => {
  assert.ok(GRADED_TYPES.has('multiple-choice'));
  assert.ok(GRADED_TYPES.has('fill-in-blank'));
  assert.ok(GRADED_TYPES.has('match-pairs'));
  assert.ok(!GRADED_TYPES.has('flashcards'));
});

test('attemptedPct de una lección sin ejercicios es 0', () => {
  assert.equal(attemptedPct(lessonState(lesson('read', {}), [], [])), 0);
});

const L = { started: 'Leída', completed: 'Completada', perfect: 'Todo bien', toReview: '{0} para repasar' };

test('stateLabel compone la etiqueta de cada estado', () => {
  assert.equal(stateLabel(lessonState(undefined, EX, G), L), '');
  assert.equal(stateLabel(lessonState(lesson('read', {}), EX, G), L), 'Leída');
  assert.equal(stateLabel(lessonState(lesson('completed', all(100)), EX, G), L), 'Todo bien');
  assert.equal(stateLabel(lessonState(lesson('completed', { ...all(100), mc1: r(0), mp: r(90) }), EX, G), L), 'Completada · 2 para repasar');
  // Completada con solo un ejercicio nuevo pendiente: nada que repasar.
  assert.equal(stateLabel(lessonState(lesson('completed', all(100)), [...EX, 'nuevo'], G), L), 'Completada');
});

test('countStates cuenta solo las lecciones del índice', () => {
  const index = {
    a: { ex: EX, g: G },
    b: { ex: EX, g: G },
    c: { ex: EX, g: G },
    d: { ex: EX, g: G },
  };
  const lessons = {
    a: lesson('completed', all(100)),                     // todo bien
    b: lesson('completed', { ...all(100), mp: r(90) }),   // completada
    c: lesson('read', { mc1: r(100) }),                   // empezada
    'otra-leccion': lesson('completed', all(100)),        // no está en el índice
  };
  assert.deepEqual(countStates(lessons, index), { total: 4, completed: 2, perfect: 1 });
  assert.deepEqual(countStates({}, {}), { total: 0, completed: 0, perfect: 0 });
});
