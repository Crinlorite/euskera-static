import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, daysBetween, formatDayLong, keyToDate, todayKey, weekStart } from './dates.ts';

// Los cambios de hora solo se notan con una zona que los tenga. Ejecutar también con
//   TZ=Europe/Madrid node --test src/lib/dates.test.ts
const MADRID = process.env.TZ === 'Europe/Madrid';

test('todayKey usa el día local con ceros a la izquierda', () => {
  assert.equal(todayKey(new Date(2026, 0, 5, 0, 1)), '2026-01-05');
  assert.equal(todayKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  assert.equal(todayKey(new Date(2026, 10, 30, 12)), '2026-11-30');
});

test('todayKey es el día de Madrid, no el de UTC', { skip: !MADRID && 'solo con TZ=Europe/Madrid' }, () => {
  // 00:30 en Madrid (verano, UTC+2) son las 22:30 UTC del día anterior.
  assert.equal(todayKey(new Date('2026-06-30T22:30:00Z')), '2026-07-01');
  assert.equal(new Date('2026-06-30T22:30:00Z').toISOString().slice(0, 10), '2026-06-30');
});

test('keyToDate da la medianoche local de ese día', () => {
  const d = keyToDate('2026-03-29');
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 2);
  assert.equal(d.getDate(), 29);
  assert.equal(d.getHours(), 0);
  assert.equal(todayKey(keyToDate('2026-10-25')), '2026-10-25');
});

test('addDays cruza meses, años y el 29 de febrero', () => {
  assert.equal(addDays('2026-03-31', 1), '2026-04-01');
  assert.equal(addDays('2026-04-01', -1), '2026-03-31');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2027-01-01', -1), '2026-12-31');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2027-02-28', 1), '2027-03-01');
  assert.equal(addDays('2026-05-10', 0), '2026-05-10');
  assert.equal(addDays('2026-01-01', 7), '2026-01-08');
});

test('addDays atraviesa los cambios de hora sin saltarse ni repetir días', () => {
  // Europa: 29-03-2026 (día de 23 h) y 25-10-2026 (día de 25 h).
  assert.equal(addDays('2026-03-28', 1), '2026-03-29');
  assert.equal(addDays('2026-03-29', 1), '2026-03-30');
  assert.equal(addDays('2026-03-30', -1), '2026-03-29');
  assert.equal(addDays('2026-10-24', 1), '2026-10-25');
  assert.equal(addDays('2026-10-25', 1), '2026-10-26');
  assert.equal(addDays('2026-10-26', -1), '2026-10-25');
  // Un año entero de uno en uno: 365 días distintos y se llega al 1 de enero.
  let k = '2026-01-01';
  const seen = new Set([k]);
  for (let i = 0; i < 365; i++) { k = addDays(k, 1); seen.add(k); }
  assert.equal(k, '2027-01-01');
  assert.equal(seen.size, 366);
});

test('daysBetween cuenta días enteros, también con cambio de hora', () => {
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2);
  assert.equal(daysBetween('2026-10-24', '2026-10-26'), 2);
  assert.equal(daysBetween('2026-03-31', '2026-04-01'), 1);
  assert.equal(daysBetween('2026-04-01', '2026-03-31'), -1);
  assert.equal(daysBetween('2026-05-10', '2026-05-10'), 0);
  assert.equal(daysBetween('2026-01-01', '2027-01-01'), 365);
  assert.equal(daysBetween('2028-01-01', '2029-01-01'), 366);
});

test('daysBetween con fechas inválidas devuelve 0', () => {
  assert.equal(daysBetween('', '2026-05-10'), 0);
  assert.equal(daysBetween('2026-05-10', 'basura'), 0);
});

test('weekStart devuelve el lunes (semana lunes–domingo)', () => {
  assert.equal(weekStart('2026-10-26'), '2026-10-26'); // lunes
  assert.equal(weekStart('2026-10-31'), '2026-10-26'); // sábado
  assert.equal(weekStart('2026-11-01'), '2026-10-26'); // domingo
  assert.equal(weekStart('2026-11-02'), '2026-11-02'); // lunes siguiente
  assert.equal(weekStart('2026-04-01'), '2026-03-30'); // semana que cruza mes y cambio de hora
  assert.equal(weekStart('2027-01-01'), '2026-12-28'); // semana que cruza año
});

test('formatDayLong da el día en largo en el idioma pedido', () => {
  const es = formatDayLong('es', '2026-11-05');
  assert.ok(es.includes('noviembre'), es);
  assert.ok(es.includes('5'), es);
});

test('formatDayLong en árabe no lanza y no queda vacío', () => {
  const ar = formatDayLong('ar', '2026-11-05');
  assert.equal(typeof ar, 'string');
  assert.ok(ar.length > 0);
});

test('formatDayLong sin fecha devuelve la cadena vacía', () => {
  assert.equal(formatDayLong('es', ''), '');
});

test('formatDayLong con una clave que no es fecha la devuelve tal cual', () => {
  assert.equal(formatDayLong('es', 'x'), 'x');
});
