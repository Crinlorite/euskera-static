import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { ProgressV1 } from './progress.ts';
import { exportHash } from './progress-hash.ts';

// localStorage simulado con un Map. Tiene que existir ANTES de cargar el store,
// por eso el import del módulo es dinámico.
class MemStorage {
  map = new Map<string, string>();
  failWrites = false;
  getItem(k: string): string | null { return this.map.get(k) ?? null; }
  setItem(k: string, v: string): void {
    if (this.failWrites) throw new Error('QuotaExceededError');
    this.map.set(k, String(v));
  }
  removeItem(k: string): void { this.map.delete(k); }
  clear(): void { this.map.clear(); }
}
const mem = new MemStorage();
const setGlobal = (name: string, value: unknown) =>
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
setGlobal('localStorage', mem);
// Importar ya no pregunta nada: si alguien llamara a confirm(), la prueba revienta.
setGlobal('confirm', () => { throw new Error('no debe llamarse a confirm()'); });

const store = await import('./progress.ts');
const { STORAGE_KEY } = store;

const disco = (): ProgressV1 => JSON.parse(mem.map.get(STORAGE_KEY) ?? 'null');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function prog(over: Partial<ProgressV1> = {}): ProgressV1 {
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

beforeEach(() => {
  // Vacía lo pendiente del test anterior (con escritura permitida) y el disco.
  setGlobal('localStorage', mem);
  mem.failWrites = false;
  store.saveNow();
  mem.clear();
});

test('1. último ejercicio + lección completada seguidos: no se pierde nada (fallo de producción)', () => {
  store.recordExerciseResult('a1-descriptions-5', 'e6', 100);
  store.recordExerciseResult('a1-descriptions-5', 'e7', 90);
  store.recordLessonCompleted('a1-descriptions-5');

  // Aún no se ha escrito nada (debounce), pero la lectura ya lo ve todo.
  assert.equal(mem.map.has(STORAGE_KEY), false);
  const l = store.getProgress().lessons['a1-descriptions-5'];
  assert.equal(l.status, 'completed');
  assert.deepEqual(Object.keys(l.exercises).sort(), ['e6', 'e7']);
  assert.equal(l.exercises.e7.bestScore, 90);

  store.saveNow();
  const guardada = disco().lessons['a1-descriptions-5'];
  assert.equal(guardada.status, 'completed');
  assert.deepEqual(Object.keys(guardada.exercises).sort(), ['e6', 'e7']);
});

test('getProgress devuelve una copia: mutarla no toca lo pendiente', () => {
  store.recordLessonRead('a1-family-1');
  const p = store.getProgress();
  p.lessons['a1-family-1'].status = 'completed';
  assert.equal(store.getProgress().lessons['a1-family-1'].status, 'read');
});

test('2. importar y desbloquear «Reanudación» seguidos: sobreviven los dos', async () => {
  const hash = await exportHash(prog({ lessons: { 'a2-egoerak-1': { status: 'completed', completedAt: '2026-02-01T00:00:00.000Z', exercises: {} } } }));

  const r = await store.importHash(hash);
  store.unlockAchievements(['first-import']);
  store.saveNow();

  assert.equal(r.ok, true);
  const d = disco();
  assert.ok(d.lessons['a2-egoerak-1']);
  assert.ok(d.achievements?.['first-import']);
});

test('3. completar dos veces no mueve completedAt (primera vez)', async () => {
  const primera = store.recordLessonCompleted('a1-greetings-1').lessons['a1-greetings-1'].completedAt;
  await sleep(5);
  const segunda = store.recordLessonCompleted('a1-greetings-1').lessons['a1-greetings-1'].completedAt;
  assert.ok(primera);
  assert.equal(segunda, primera);
});

test('4. importar fusiona: conserva lecciones desconocidas y las locales, sin confirm()', async () => {
  store.recordLessonRead('a1-greetings-1');
  store.recordExerciseResult('a1-greetings-1', 'e1', 40);
  store.saveNow();
  const hash = await exportHash(prog({
    lessons: {
      'a1-greetings-1': { status: 'completed', completedAt: '2026-02-01T00:00:00.000Z', exercises: { e2: { attempts: 1, bestScore: 100, lastAttemptAt: '2026-02-01T00:00:00.000Z' } } },
      'zz-desconocida-9': { status: 'read', exercises: {} },
      'a1/99-otra/01-x': { status: 'completed', exercises: {} },
    },
  }));

  const r = await store.importHash(hash);

  assert.equal(r.ok, true);
  assert.equal(r.reason, undefined);
  assert.equal(r.added, 2);
  const d = disco();
  assert.deepEqual(Object.keys(d.lessons).sort(), ['a1-greetings-1', 'a1/99-otra/01-x', 'zz-desconocida-9']);
  assert.equal(d.lessons['a1-greetings-1'].status, 'completed');
  assert.deepEqual(Object.keys(d.lessons['a1-greetings-1'].exercises).sort(), ['e1', 'e2']);
});

test('importar un código inválido o vacío no toca nada', async () => {
  store.recordLessonRead('a1-greetings-1');
  assert.deepEqual(await store.importHash('   '), { ok: false, reason: 'invalid', added: 0 });
  assert.deepEqual(await store.importHash('P1.basura'), { ok: false, reason: 'invalid', added: 0 });
  assert.deepEqual(Object.keys(store.getProgress().lessons), ['a1-greetings-1']);
});

test('5. un código de un esquema más nuevo (7) se fusiona y avisa con outdated', async () => {
  store.recordLessonRead('a1-greetings-1');
  const futuro = { ...prog({ lessons: { 'a2-natura-2': { status: 'completed', exercises: {} } } }), schemaVersion: 7, campoDelFuturo: { x: 1 } };
  const hash = await exportHash(futuro as unknown as ProgressV1);

  const r = await store.importHash(hash);

  assert.equal(r.ok, true);
  assert.equal(r.reason, 'outdated');
  assert.equal(r.added, 1);
  const d = disco();
  assert.equal(d.schemaVersion, 1);
  assert.deepEqual(Object.keys(d.lessons).sort(), ['a1-greetings-1', 'a2-natura-2']);
});

test('6. si localStorage no deja escribir, getProgress sigue viendo lo pendiente', () => {
  mem.failWrites = true;
  store.recordExerciseResult('a1-home-2', 'e1', 100);
  store.saveNow();

  assert.equal(mem.map.has(STORAGE_KEY), false);
  assert.equal(store.getProgress().lessons['a1-home-2'].exercises.e1.bestScore, 100);

  // En cuanto se puede, se escribe.
  mem.failWrites = false;
  store.saveNow();
  assert.equal(disco().lessons['a1-home-2'].exercises.e1.bestScore, 100);
});

test('sin localStorage (invitado) el progreso vive en memoria durante la sesión', () => {
  setGlobal('localStorage', undefined);
  store.recordLessonCompleted('a1-town-1');
  store.saveNow();
  assert.equal(store.getProgress().lessons['a1-town-1'].status, 'completed');
});

test('7. al guardar fusiona con lo que otra pestaña escribió en disco', () => {
  store.recordLessonRead('a1-mia-1');
  // Otra pestaña escribe entre medias.
  mem.map.set(STORAGE_KEY, JSON.stringify(prog({ lessons: { 'a1-ajena-1': { status: 'completed', exercises: {} } } })));
  store.saveNow();

  assert.deepEqual(Object.keys(disco().lessons).sort(), ['a1-ajena-1', 'a1-mia-1']);
});

test('8. bumpStreak: mismo día, ayer, fecha "futura" heredada de UTC, hueco y longest', () => {
  const conRacha = (current: number, longest: number, last: string) =>
    prog({ streak: { current, longest, lastStudiedDate: last } });

  const hoy = conRacha(3, 5, '2026-10-31');
  store.bumpStreak(hoy, '2026-10-31');
  assert.deepEqual(hoy.streak, { current: 3, longest: 5, lastStudiedDate: '2026-10-31' });

  const ayer = conRacha(5, 5, '2026-10-30');
  store.bumpStreak(ayer, '2026-10-31');
  assert.deepEqual(ayer.streak, { current: 6, longest: 6, lastStudiedDate: '2026-10-31' });

  // Cruza mes: 31-10 → 01-11.
  const mes = conRacha(2, 9, '2026-10-31');
  store.bumpStreak(mes, '2026-11-01');
  assert.deepEqual(mes.streak, { current: 3, longest: 9, lastStudiedDate: '2026-11-01' });

  const futuro = conRacha(4, 4, '2026-11-01');
  store.bumpStreak(futuro, '2026-10-31');
  assert.deepEqual(futuro.streak, { current: 4, longest: 4, lastStudiedDate: '2026-11-01' });

  const hueco = conRacha(7, 12, '2026-10-20');
  store.bumpStreak(hueco, '2026-10-31');
  assert.deepEqual(hueco.streak, { current: 1, longest: 12, lastStudiedDate: '2026-10-31' });

  const nunca = conRacha(0, 0, '');
  store.bumpStreak(nunca, '2026-10-31');
  assert.deepEqual(nunca.streak, { current: 1, longest: 1, lastStudiedDate: '2026-10-31' });
});

test('9. migrate: colisión fusionada, clave no mapeable conservada, v2 no se vacía, sin lessons → {}', () => {
  // Colisión en los dos órdenes posibles.
  const nueva = { status: 'completed' as const, completedAt: '2026-02-01T00:00:00.000Z', exercises: { e2: { attempts: 1, bestScore: 100, lastAttemptAt: '2026-02-01T00:00:00.000Z' } } };
  const vieja = { status: 'read' as const, exercises: { e1: { attempts: 2, bestScore: 60, lastAttemptAt: '2026-01-01T00:00:00.000Z' } } };
  for (const lessons of [
    { 'a1/01-saludos/02-agur': vieja, 'a1-greetings-2': nueva },
    { 'a1-greetings-2': nueva, 'a1/01-saludos/02-agur': vieja },
  ]) {
    const out = store.migrate(prog({ lessons }));
    assert.deepEqual(Object.keys(out.lessons), ['a1-greetings-2']);
    assert.equal(out.lessons['a1-greetings-2'].status, 'completed');
    assert.deepEqual(Object.keys(out.lessons['a1-greetings-2'].exercises).sort(), ['e1', 'e2']);
  }

  const raro = store.migrate(prog({ lessons: { 'a1/99-desconocida/01-x': vieja, 'b9/x': vieja } }));
  assert.deepEqual(Object.keys(raro.lessons).sort(), ['a1/99-desconocida/01-x', 'b9/x']);

  const v2 = store.migrate({ ...prog({ lessons: { 'a1-greetings-1': nueva } }), schemaVersion: 2 });
  assert.equal(v2.schemaVersion, 1);
  assert.deepEqual(v2.lessons, { 'a1-greetings-1': nueva });

  const sinLessons = store.migrate({ schemaVersion: 1, createdAt: '2026-01-01T00:00:00.000Z' } as unknown as ProgressV1);
  assert.deepEqual(sinLessons.lessons, {});
  assert.deepEqual(sinLessons.achievements, {});
  assert.deepEqual(sinLessons.preferences, {});
  assert.deepEqual(sinLessons.streak, { current: 0, longest: 0, lastStudiedDate: '' });
  assert.equal(sinLessons.createdAt, '2026-01-01T00:00:00.000Z');

  // Basura: nunca lanza.
  assert.deepEqual(store.migrate(null as unknown as ProgressV1).lessons, {});
  const danada = store.migrate(prog({ lessons: { a: null, b: { status: 'read' } } as unknown as ProgressV1['lessons'] }));
  assert.deepEqual(danada.lessons, { b: { status: 'read', exercises: {} } });
});

test('migrate conserva campos desconocidos y los opcionales nuevos', () => {
  const p = { ...prog({ activity: { '2026-10-30': 3 }, preferences: { weeklyGoalDays: 4 } }), extra: 'x' };
  const out = store.migrate(p) as ProgressV1 & { extra?: string };
  assert.equal(out.extra, 'x');
  assert.deepEqual(out.activity, { '2026-10-30': 3 });
  assert.equal(out.preferences.weeklyGoalDays, 4);
});
