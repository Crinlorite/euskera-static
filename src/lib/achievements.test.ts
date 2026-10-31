import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalog, evaluate, ACHIEVEMENT_BY_ID } from './achievements.ts';
import type { ProgressV1 } from '../stores/progress.ts';
import type { LessonIndex } from './lesson-index.ts';

const unitsByLevel = { a1: { unitIds: ['a1-ua', 'a1-ub'] }, a2: { unitIds: ['a2-uc'] } };
const lessonsByUnit = { 'a1-ua': ['a1-ua-1', 'a1-ua-2'], 'a1-ub': ['a1-ub-1'], 'a2-uc': ['a2-uc-1'] };
const index: LessonIndex = {
  'a1-ua-1': { u: 'a1-ua', ex: ['m1', 'f1'], g: ['m1'] },
  'a1-ua-2': { u: 'a1-ua', ex: ['m2'], g: ['m2'] },
  'a1-ub-1': { u: 'a1-ub', ex: ['m3'], g: ['m3'] },
  'a2-uc-1': { u: 'a2-uc', ex: ['m4'], g: ['m4'] },
};
const known = new Set(Object.keys(index));

const ok = (extra: object = {}) => ({ attempts: 1, bestScore: 100, lastAttemptAt: '2026-10-01T10:00:00Z', ...extra });
const mal = { attempts: 1, bestScore: 50, lastAttemptAt: '2026-10-01T10:00:00Z' };

function prog(over: Partial<ProgressV1> = {}): ProgressV1 {
  return {
    schemaVersion: 1, createdAt: '', lastUpdated: '', lessons: {},
    streak: { current: 0, longest: 0, lastStudiedDate: '' }, preferences: {}, achievements: {}, ...over,
  };
}
const run = (p: ProgressV1) => new Set(evaluate(p, known, unitsByLevel, lessonsByUnit, { index }));

test('buildCatalog: sin ids repetidos; maestría e «Impecable» de A1 y A2; nivel A2; sin «Nivel superado»', () => {
  const ids = buildCatalog(unitsByLevel).map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ['unit-complete-a1-ua', 'unit-complete-a2-uc', 'perfect-unit-a1-ub', 'perfect-unit-a2-uc',
    'level-complete-a2', 'volume-a1-complete', 'first-perfect', 'review-10', 'review-50', 'comeback',
    'curiosity-about', 'curiosity-language']) {
    assert.ok(ids.includes(id), id);
  }
  assert.equal(ids.includes('first-level'), false);
  assert.equal(ids.includes('level-complete-a1'), false);
});

test('buildCatalog: quien ya tiene «Nivel superado» lo sigue viendo, tras «Primera unidad»', () => {
  const ids = buildCatalog(unitsByLevel, { held: ['first-level', 'first-step'] }).map((a) => a.id);
  assert.equal(ids.filter((i) => i === 'first-level').length, 1);
  assert.equal(ids.indexOf('first-level'), ids.indexOf('first-unit') + 1);
  assert.ok(ACHIEVEMENT_BY_ID['first-level']);
});

test('evaluate: «Primera lección en verde» solo con una lección completada y todo acertado', () => {
  const casi = prog({ lessons: { 'a1-ua-1': { status: 'completed', exercises: { m1: mal, f1: ok() } } } });
  assert.equal(run(casi).has('first-perfect'), false);
  const verde = prog({ lessons: { 'a1-ua-1': { status: 'completed', exercises: { m1: ok(), f1: ok() } } } });
  assert.ok(run(verde).has('first-perfect'));
});

test('evaluate: «Impecable» de una unidad solo si TODAS sus lecciones están en verde', () => {
  const una = prog({ lessons: {
    'a1-ua-1': { status: 'completed', exercises: { m1: ok(), f1: ok() } },
    'a1-ua-2': { status: 'completed', exercises: { m2: mal } },
  } });
  const r1 = run(una);
  assert.ok(r1.has('unit-complete-a1-ua'));
  assert.equal(r1.has('perfect-unit-a1-ua'), false);
  una.lessons['a1-ua-2'].exercises.m2 = ok({ attempts: 2 });
  assert.ok(run(una).has('perfect-unit-a1-ua'));
});

test('evaluate: «Del error se aprende» cuenta fallados y luego acertados, justo en 10', () => {
  const lessons: ProgressV1['lessons'] = {};
  const idx: LessonIndex = {};
  for (let i = 0; i < 10; i++) {
    idx[`a1-ux-${i}`] = { u: 'a1-ux', ex: ['g'], g: ['g'] };
    lessons[`a1-ux-${i}`] = { status: 'read', exercises: { g: ok({ fails: i < 9 ? 1 : 0, attempts: 2 }) } };
  }
  const k = new Set(Object.keys(idx));
  assert.equal(evaluate(prog({ lessons }), k, {}, undefined, { index: idx }).includes('review-10'), false);
  lessons['a1-ux-9'].exercises.g.fails = 2;
  assert.ok(evaluate(prog({ lessons }), k, {}, undefined, { index: idx }).includes('review-10'));
  // Fallado y aún sin acertar no cuenta; flashcards (no corregibles) tampoco.
  lessons['a1-ux-9'].exercises.g = { ...mal, fails: 3 };
  assert.equal(evaluate(prog({ lessons }), k, {}, undefined, { index: idx }).includes('review-10'), false);
});

test('evaluate: nivel A2 completo; A1 completo ya no añade «Nivel superado» pero lo conserva si estaba', () => {
  const todo = prog({ lessons: Object.fromEntries(Object.keys(index).map((id) => [id, { status: 'completed' as const, exercises: {} }])) });
  const r = run(todo);
  assert.ok(r.has('level-complete-a2'));
  assert.ok(r.has('volume-a1-complete'));
  assert.ok(r.has('unit-complete-a2-uc'));
  assert.equal(r.has('first-level'), false);
  todo.achievements = { 'first-level': { unlockedAt: '2026-05-01T00:00:00Z' } };
  assert.ok(run(todo).has('first-level'));
});

test('evaluate: solo el A2 a medias no da el nivel', () => {
  const p = prog({ lessons: { 'a2-uc-1': { status: 'read', exercises: {} } } });
  assert.equal(run(p).has('level-complete-a2'), false);
});

test('evaluate: «Has vuelto» con actividad real tras ocho días; nunca por huecos solo deducidos', () => {
  const antiguo = prog({
    lessons: { 'a1-ua-1': { status: 'completed', completedAt: '2026-06-01T10:00:00Z', exercises: {} } },
    streak: { current: 1, longest: 1, lastStudiedDate: '2026-06-20' },
  });
  assert.equal(run(antiguo).has('comeback'), false);
  antiguo.activity = { '2026-06-28': 4 };
  assert.ok(run(antiguo).has('comeback'));
});

test('evaluate: una lección del A2 cuenta para «10 lecciones»', () => {
  const lessons: ProgressV1['lessons'] = {};
  const idx: LessonIndex = {};
  for (let i = 0; i < 9; i++) { idx[`a1-uy-${i}`] = { u: 'a1-uy', ex: [], g: [] }; lessons[`a1-uy-${i}`] = { status: 'completed', exercises: {} }; }
  idx['a2-uz-1'] = { u: 'a2-uz', ex: [], g: [] };
  lessons['a2-uz-1'] = { status: 'completed', exercises: {} };
  assert.ok(evaluate(prog({ lessons }), new Set(Object.keys(idx)), {}, undefined, { index: idx }).includes('volume-10'));
});

test('evaluate: los logros de disparador no se inventan, pero se conservan', () => {
  assert.equal(run(prog()).has('curiosity-about'), false);
  assert.ok(run(prog({ achievements: { 'curiosity-about': { unlockedAt: 'x' } } })).has('curiosity-about'));
});

// ---------- Contexto de lección (lo que se anuncia en la tarjeta de cierre) ----------
import { lessonAchievements } from './achievements.ts';

test('lección: nunca concede niveles; no cuenta lecciones con candado ni claves antiguas; solo lo nuevo', () => {
  const unitIdx: LessonIndex = { 'a1-ua-1': index['a1-ua-1'], 'a1-ua-2': index['a1-ua-2'] };
  const lessons: ProgressV1['lessons'] = {
    'a1-ua-1': { status: 'completed', exercises: { m1: ok(), f1: ok() } },
    'a1-ua-2': { status: 'completed', exercises: { m2: ok() } },
  };
  // 8 lecciones del B1 (con candado) y una clave antigua: no suman para «10 lecciones».
  for (let i = 0; i < 8; i++) lessons[`b1-uz-${i}`] = { status: 'completed', exercises: {} };
  lessons['a1/01-saludos/99-x'] = { status: 'completed', exercises: {} };
  const p = prog({ lessons, achievements: { 'first-step': { unlockedAt: 'x' } } });
  const ids = lessonAchievements(p, 'a1-ua', unitIdx);
  assert.ok(ids.includes('perfect-unit-a1-ua'));
  assert.ok(ids.includes('unit-complete-a1-ua'));
  assert.equal(ids.includes('volume-10'), false);
  assert.equal(ids.includes('first-step'), false); // ya estaba
  assert.equal(ids.some((id) => id.startsWith('level-complete') || id === 'volume-a1-complete'), false);
});

test('lección: sin unidad o sin índice no concede nada', () => {
  assert.deepEqual(lessonAchievements(prog(), '', index), []);
  assert.deepEqual(lessonAchievements(prog(), 'a1-ua', {}), []);
});

test('el catálogo nuevo contiene todos los logros del de antes (con «Nivel superado» si se tiene): el contador no baja', () => {
  const antes = ['first-step', 'first-completed', 'first-unit', 'first-level', 'first-export', 'first-import',
    'streak-3', 'streak-7', 'streak-14', 'streak-30', 'volume-10', 'volume-25', 'volume-50', 'volume-a1-complete',
    'curiosity-about', 'curiosity-language'];
  const a1 = ['a1-greetings', 'a1-family', 'a1-descriptions', 'a1-bar-food', 'a1-town', 'a1-directions', 'a1-routine',
    'a1-recent-past', 'a1-home', 'a1-people', 'a1-shopping', 'a1-restaurant', 'a1-week-plan'];
  const ids = new Set(buildCatalog({ a1: { unitIds: a1 }, a2: { unitIds: ['a2-x'] } }, { held: ['first-level'] }).map((a) => a.id));
  for (const id of [...antes, ...a1.map((u) => `unit-complete-${u}`)]) assert.ok(ids.has(id), id);
});
