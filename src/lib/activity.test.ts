import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_WEEKLY_GOAL, clampGoal, sanitizeActivity, derivedDays, studyDays,
  activeDaysBetween, activeDaysThisWeek, activeDaysThisMonth, gridCells, hasComeback,
} from './activity.ts';
import { todayKey } from './dates.ts';

const base = { lessons: {}, streak: { current: 0, longest: 0, lastStudiedDate: '' } };

test('clampGoal: 3 por defecto; acota 1..7; redondea; basura → 3', () => {
  assert.equal(DEFAULT_WEEKLY_GOAL, 3);
  assert.equal(clampGoal(undefined), 3);
  assert.equal(clampGoal(5), 5);
  assert.equal(clampGoal(0), 1);
  assert.equal(clampGoal(99), 7);
  assert.equal(clampGoal(4.6), 5);
  assert.equal(clampGoal(NaN), 3);
  assert.equal(clampGoal('4'), 3);
  assert.equal(clampGoal(Infinity), 3);
});

test('sanitizeActivity: enteros ≥ 0; descarta lo no numérico; no objeto → undefined', () => {
  assert.deepEqual(sanitizeActivity({ '2026-10-01': 3, '2026-10-02': 2.7, x: 'a', '2026-10-03': -1, '2026-10-04': null }),
    { '2026-10-01': 3, '2026-10-02': 2 });
  assert.equal(sanitizeActivity(undefined), undefined);
  assert.equal(sanitizeActivity('hola'), undefined);
  assert.equal(sanitizeActivity([1, 2]), undefined);
  assert.deepEqual(sanitizeActivity({}), {});
});

test('derivedDays: fecha local de completedAt, lastAttemptAt y lastStudiedDate; ignora vacíos y basura', () => {
  const iso = '2026-10-31T23:30:00Z';
  const p = {
    lessons: {
      a: { status: 'completed' as const, completedAt: iso, exercises: { e1: { attempts: 1, bestScore: 100, lastAttemptAt: '2026-09-02T10:00:00Z' } } },
      b: { status: 'read' as const, exercises: { e1: { attempts: 1, bestScore: 50, lastAttemptAt: '' }, e2: { attempts: 1, bestScore: 50, lastAttemptAt: 'no-es-fecha' } } },
    },
    streak: { current: 1, longest: 1, lastStudiedDate: '2026-08-15' },
  };
  const d = derivedDays(p);
  // El día depende del huso del proceso: se compara con la misma regla que todayKey().
  assert.deepEqual([...d].sort(), [todayKey(new Date(iso)), todayKey(new Date('2026-09-02T10:00:00Z')), '2026-08-15'].sort());
});

test('studyDays: une activity (con su cifra) y derivados (sin cifra, null); un día con activity 0 no cuenta', () => {
  const p = {
    ...base,
    streak: { current: 1, longest: 1, lastStudiedDate: '2026-10-01' },
    activity: { '2026-10-02': 4, '2026-10-01': 2, '2026-10-05': 0 },
  };
  const m = studyDays(p);
  assert.equal(m.get('2026-10-02'), 4);
  assert.equal(m.get('2026-10-01'), 2); // real gana a derivado
  assert.equal(m.has('2026-10-05'), false);
  const p2 = { ...base, streak: { current: 1, longest: 1, lastStudiedDate: '2026-10-09' } };
  assert.equal(studyDays(p2).get('2026-10-09'), null);
});

test('activeDaysThisWeek: semana lunes–domingo; miércoles con lunes y miércoles activos = 2', () => {
  // 2026-10-28 es miércoles.
  const days = new Map<string, number | null>([['2026-10-26', 1], ['2026-10-28', null], ['2026-10-25', 3], ['2026-10-29', 1]]);
  assert.equal(activeDaysThisWeek(days, '2026-10-28'), 2);
});

test('activeDaysThisMonth y activeDaysBetween (incluye extremos)', () => {
  const days = new Map<string, number | null>([['2026-09-30', 1], ['2026-10-01', 1], ['2026-10-15', null], ['2026-10-31', 2]]);
  assert.equal(activeDaysThisMonth(days, '2026-10-31'), 3);
  assert.equal(activeDaysBetween(days, '2026-10-01', '2026-10-15'), 2);
});

test('gridCells: 84 celdas si hoy es domingo; empieza en lunes; niveles 0/1/2/3; derivado = 1 sin cifra', () => {
  // 2026-11-01 es domingo.
  const days = new Map<string, number | null>([
    ['2026-11-01', 7], ['2026-10-31', 4], ['2026-10-30', 2], ['2026-10-29', null],
  ]);
  const cells = gridCells(days, '2026-11-01');
  assert.equal(cells.length, 84);
  assert.equal(cells[0].day, '2026-08-10'); // lunes, 11 semanas antes
  assert.equal(cells.at(-1)!.day, '2026-11-01');
  const by = Object.fromEntries(cells.map((c) => [c.day, c]));
  assert.equal(by['2026-11-01'].level, 3);
  assert.equal(by['2026-10-31'].level, 2);
  assert.equal(by['2026-10-30'].level, 1);
  assert.deepEqual([by['2026-10-29'].level, by['2026-10-29'].count], [1, null]);
  assert.deepEqual([by['2026-10-28'].level, by['2026-10-28'].count], [0, 0]);
});

test('gridCells: un miércoles da 11 semanas enteras + 3 días', () => {
  assert.equal(gridCells(new Map(), '2026-10-28').length, 77 + 3);
});

test('hasComeback: el día de vuelta tiene que ser actividad real (no se premian huecos antiguos)', () => {
  // Solo derivados con hueco de 8 días → no.
  assert.equal(hasComeback(undefined, new Set(['2026-06-01', '2026-06-09'])), false);
  // Último día derivado y vuelta con actividad real 8 días después → sí.
  assert.equal(hasComeback({ '2026-06-09': 3 }, new Set(['2026-06-01'])), true);
  // Dos días reales con hueco de 8 → sí; de 6 → no.
  assert.equal(hasComeback({ '2026-06-01': 1, '2026-06-09': 1 }, new Set()), true);
  assert.equal(hasComeback({ '2026-06-01': 1, '2026-06-07': 1 }, new Set()), false);
  // El hueco se mide con el día ANTERIOR más cercano (aunque sea derivado).
  assert.equal(hasComeback({ '2026-06-09': 1 }, new Set(['2026-06-01', '2026-06-05'])), false);
  // Una sola fecha → no.
  assert.equal(hasComeback({ '2026-06-09': 1 }, new Set()), false);
});

test('derivedDays por huso: 23:30 UTC del 31-oct es 1-nov en Madrid y 31-oct en Ciudad de México', () => {
  const p = { lessons: { a: { status: 'completed' as const, completedAt: '2026-10-31T23:30:00Z', exercises: {} } }, streak: { current: 0, longest: 0, lastStudiedDate: '' } };
  const d = [...derivedDays(p)];
  if (process.env.TZ === 'Europe/Madrid') assert.deepEqual(d, ['2026-11-01']);
  else if (process.env.TZ === 'America/Mexico_City') assert.deepEqual(d, ['2026-10-31']);
  else assert.equal(d.length, 1);
});

test('hasComeback en el borde: hueco de 7 días no, de 8 sí; fecha futura heredada no lanza', () => {
  assert.equal(hasComeback({ '2026-06-01': 1, '2026-06-08': 1 }, new Set()), false);
  assert.equal(hasComeback({ '2026-06-01': 1, '2026-06-09': 1 }, new Set()), true);
  assert.equal(hasComeback({ '2026-06-09': 1 }, new Set(['2099-01-01'])), false);
});

test('gridCells y semana cruzando cambio de hora y de año (Madrid y Santiago de Chile)', () => {
  // Tras el adelanto de marzo (29-mar-2026) y en una semana que cruza el año.
  const c1 = gridCells(new Map(), '2026-03-30');
  assert.equal(c1.length, 78);
  assert.equal(c1[0].day, '2026-01-12');
  assert.equal(new Set(c1.map((c) => c.day)).size, c1.length);
  const c2 = gridCells(new Map([['2026-12-31', 2], ['2027-01-01', 1]]), '2027-01-15');
  assert.equal(c2.length, 82);
  assert.equal(c2.filter((c) => c.level > 0).length, 2);
  assert.equal(new Set(c2.map((c) => c.day)).size, c2.length);
  const dias = new Map<string, number | null>([['2026-03-30', 1], ['2026-04-05', 1], ['2026-03-29', 1]]);
  assert.equal(activeDaysThisWeek(dias, '2026-03-30'), 1); // lunes: solo hoy
  assert.equal(activeDaysThisWeek(dias, '2026-04-05'), 2); // domingo: lunes y domingo
});
