import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lastActivityAt, nextLesson } from './next-lesson.ts';
import type { LessonProgress } from '../stores/progress.ts';

// Dos niveles: A1 (u1 con 3 lecciones, u2 con 2) y A2 (u1 con 2). Cada lección
// con dos ejercicios corregibles.
const IDS = ['a1-u1-1', 'a1-u1-2', 'a1-u1-3', 'a1-u2-1', 'a1-u2-2', 'a2-u1-1', 'a2-u1-2'];
const index: Record<string, { ex: string[]; g: string[] }> = Object.fromEntries(
  IDS.map((id) => [id, { ex: ['m', 'f'], g: ['m', 'f'] }]),
);
const ORDER = IDS;
const A1 = IDS.filter((id) => id.startsWith('a1-'));

const HACE_3_DIAS = '2026-10-28T10:00:00.000Z';
const AYER = '2026-10-30T10:00:00.000Z';
const HOY = '2026-10-31T10:00:00.000Z';

/** Lección perfecta: completada con los dos ejercicios a 100. */
const done = (at: string = HACE_3_DIAS): LessonProgress => ({
  status: 'completed',
  completedAt: at,
  exercises: {
    m: { attempts: 1, bestScore: 100, lastAttemptAt: at },
    f: { attempts: 1, bestScore: 100, lastAttemptAt: at },
  },
});
/** Lección solo abierta: sin ningún intento. */
const read = (): LessonProgress => ({ status: 'read', exercises: {} });
/** Lección empezada con un intento en la fecha dada. */
const started = (at: string): LessonProgress => ({
  status: 'read',
  exercises: { m: { attempts: 1, bestScore: 100, lastAttemptAt: at } },
});

test('sin progreso → la primera lección, como «first»', () => {
  assert.deepEqual(nextLesson({}, index, ORDER), { id: 'a1-u1-1', reason: 'first' });
});

test('una lección solo abierta (sin intentos) → esa, como «started»', () => {
  assert.deepEqual(nextLesson({ 'a1-u1-2': read() }, index, ORDER), { id: 'a1-u1-2', reason: 'started' });
});

test('la primera perfecta → la siguiente de la unidad', () => {
  assert.deepEqual(nextLesson({ 'a1-u1-1': done() }, index, ORDER), { id: 'a1-u1-2', reason: 'after' });
});

test('unidad completa → primera lección de la unidad siguiente', () => {
  const lessons = { 'a1-u1-1': done(), 'a1-u1-2': done(), 'a1-u1-3': done() };
  assert.deepEqual(nextLesson(lessons, index, ORDER), { id: 'a1-u2-1', reason: 'after' });
});

test('nivel completo → primera lección del nivel siguiente', () => {
  const lessons = Object.fromEntries(A1.map((id) => [id, done()]));
  assert.deepEqual(nextLesson(lessons, index, ORDER), { id: 'a2-u1-1', reason: 'after' });
});

test('con un solo nivel en el orden y ese nivel completo → null', () => {
  const lessons = Object.fromEntries(A1.map((id) => [id, done()]));
  assert.equal(nextLesson(lessons, index, A1), null);
});

test('hueco: lo último hecho es posterior y no queda nada después → el hueco de atrás', () => {
  const lessons = {
    'a1-u1-1': done(),
    'a1-u1-2': done(),
    'a1-u1-3': done(),
    'a1-u2-2': done(AYER),
  };
  // a1-u2-1 sin tocar; después de a1-u2-2 (la más reciente) no queda nada en A1.
  assert.deepEqual(nextLesson(lessons, index, A1), { id: 'a1-u2-1', reason: 'gap' });
});

test('manda la actividad más reciente, no la lección más avanzada', () => {
  const lessons = { 'a1-u2-2': done(HACE_3_DIAS), 'a1-u1-2': started(HOY) };
  assert.deepEqual(nextLesson(lessons, index, ORDER), { id: 'a1-u1-2', reason: 'started' });
});

test('candidata completada y la siguiente también → la primera no completada después', () => {
  const lessons = { 'a1-u1-1': done(AYER), 'a1-u1-2': done(HACE_3_DIAS) };
  assert.deepEqual(nextLesson(lessons, index, ORDER), { id: 'a1-u1-3', reason: 'after' });
});

test('empate exacto de fechas → la más avanzada', () => {
  const lessons = { 'a1-u1-1': done(AYER), 'a1-u1-3': done(AYER) };
  assert.deepEqual(nextLesson(lessons, index, ORDER), { id: 'a1-u2-1', reason: 'after' });
});

test('todo completo → null', () => {
  const lessons = Object.fromEntries(IDS.map((id) => [id, done()]));
  assert.equal(nextLesson(lessons, index, ORDER), null);
});

test('las entradas que no están en el orden se ignoran', () => {
  const lessons = { 'b1-x-1': started(HOY), 'a1/01-saludos/01-kaixo': started(HOY), 'a1-u1-1': done(HACE_3_DIAS) };
  assert.deepEqual(nextLesson(lessons, index, ORDER), { id: 'a1-u1-2', reason: 'after' });
  assert.deepEqual(nextLesson({ 'b1-x-1': started(HOY) }, index, ORDER), { id: 'a1-u1-1', reason: 'first' });
});

test('lastActivityAt: sin entrada, solo abierta y reintento posterior a completarla', () => {
  assert.equal(lastActivityAt(undefined), '');
  assert.equal(lastActivityAt(read()), '');
  const reintento: LessonProgress = {
    status: 'completed',
    completedAt: HACE_3_DIAS,
    exercises: { m: { attempts: 2, bestScore: 100, lastAttemptAt: HOY } },
  };
  assert.equal(lastActivityAt(reintento), HOY);
});

test('orden vacío → null', () => {
  assert.equal(nextLesson({ 'a1-u1-1': done() }, index, []), null);
});

test('una lección completada con algo por repasar cuenta como hecha', () => {
  const conFallo: LessonProgress = {
    status: 'completed',
    completedAt: AYER,
    exercises: {
      m: { attempts: 2, bestScore: 60, lastAttemptAt: AYER },
      f: { attempts: 1, bestScore: 100, lastAttemptAt: AYER },
    },
  };
  assert.deepEqual(nextLesson({ 'a1-u1-1': conFallo }, index, ORDER), { id: 'a1-u1-2', reason: 'after' });
});
