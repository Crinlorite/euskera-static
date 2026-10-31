import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeLesson, mergeProgress } from './progress-merge.ts';
import type { ExerciseResult, ProgressV1 } from './progress.ts';
import { makeGen, undefinedKeys } from '../../tests/helpers/progress-gen.ts';

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

// ---------- Fase 0: reglas nuevas ----------

const T1 = '2026-03-01T10:00:00.000Z';
const T2 = '2026-04-01T10:00:00.000Z';
const exr = (over: Partial<ExerciseResult> = {}): ExerciseResult => ({ attempts: 1, bestScore: 50, lastAttemptAt: T1, ...over });
const withEx = (e: ExerciseResult) => p({ lessons: { l1: lesson({ exercises: { e1: e } }) } });

test('mismo día de estudio en los dos lados: gana la racha mayor, en cualquier orden', () => {
  const a = p({ streak: { current: 3, longest: 5, lastStudiedDate: '2026-05-02' } });
  const b = p({ streak: { current: 8, longest: 8, lastStudiedDate: '2026-05-02' } });

  assert.deepEqual(mergeProgress(a, b).streak, { current: 8, longest: 8, lastStudiedDate: '2026-05-02' });
  assert.deepEqual(mergeProgress(b, a).streak, { current: 8, longest: 8, lastStudiedDate: '2026-05-02' });
});

test('tripleta del repaso: la del lado que respondió más tarde', () => {
  const old = withEx(exr({ lastAttemptAt: T1, lastScore: 100, box: 3, due: '2026-03-08' }));
  const recent = withEx(exr({ lastAttemptAt: T2, lastScore: 40, box: 0, due: '2026-04-01' }));

  for (const out of [mergeProgress(old, recent), mergeProgress(recent, old)]) {
    const e = out.lessons.l1.exercises.e1;
    assert.equal(e.lastScore, 40);
    assert.equal(e.box, 0);
    assert.equal(e.due, '2026-04-01');
  }
});

test('tripleta: si el lado más reciente no la tiene (cliente viejo), se conserva la del otro', () => {
  const nuevo = withEx(exr({ lastAttemptAt: T1, lastScore: 50, box: 1, due: '2026-03-02' }));
  const viejo = withEx(exr({ lastAttemptAt: T2, attempts: 4 }));

  for (const out of [mergeProgress(nuevo, viejo), mergeProgress(viejo, nuevo)]) {
    const e = out.lessons.l1.exercises.e1;
    assert.equal(e.lastScore, 50);
    assert.equal(e.box, 1);
    assert.equal(e.due, '2026-03-02');
    assert.equal(e.attempts, 4);
    assert.equal(e.lastAttemptAt, T2);
  }
});

test('tripleta con la misma fecha exacta: máximo por campo', () => {
  const a = withEx(exr({ lastScore: 100, box: 1, due: '2026-03-02' }));
  const b = withEx(exr({ lastScore: 50, box: 2, due: '' }));

  const e = mergeProgress(a, b).lessons.l1.exercises.e1;
  assert.deepEqual(e, { attempts: 1, bestScore: 50, lastAttemptAt: T1, lastScore: 100, box: 2, due: '2026-03-02' });
  assert.deepEqual(mergeProgress(b, a).lessons.l1.exercises.e1, e);
});

test('fails: el máximo, y solo aparece si algún lado lo tiene', () => {
  assert.equal(mergeProgress(withEx(exr({ fails: 2 })), withEx(exr({ fails: 5 }))).lessons.l1.exercises.e1.fails, 5);
  assert.equal(mergeProgress(withEx(exr({ fails: 2 })), withEx(exr())).lessons.l1.exercises.e1.fails, 2);
  assert.equal('fails' in mergeProgress(withEx(exr()), withEx(exr())).lessons.l1.exercises.e1, false);
});

test('activity: unión de días y máximo por día; ausente si nadie la tiene', () => {
  const a = p({ activity: { '2026-03-01': 5, '2026-03-02': 1 } });
  const b = p({ activity: { '2026-03-02': 7, '2026-03-03': 2 } });

  assert.deepEqual(mergeProgress(a, b).activity, { '2026-03-01': 5, '2026-03-02': 7, '2026-03-03': 2 });
  assert.deepEqual(mergeProgress(a, p()).activity, a.activity);
  assert.equal('activity' in mergeProgress(p(), p()), false);
});

test('no deja claves undefined (completedAt, tripleta, fails)', () => {
  const read = { status: 'read' as const, exercises: { e1: exr() } };
  const out = mergeProgress(p({ lessons: { l1: read } }), p({ lessons: { l1: read } }));

  assert.deepEqual(undefinedKeys(out), []);
  assert.deepEqual(out.lessons.l1, read);
});

test('mergeLesson se exporta y fusiona ejercicios de los dos lados', () => {
  const out = mergeLesson(
    { status: 'read', exercises: { e1: exr({ bestScore: 60 }) } },
    { status: 'completed', completedAt: T2, exercises: { e2: exr({ bestScore: 100 }) } },
  );
  assert.equal(out.status, 'completed');
  assert.equal(out.completedAt, T2);
  assert.deepEqual(Object.keys(out.exercises).sort(), ['e1', 'e2']);
});

test('el resultado siempre es schemaVersion 1', () => {
  const raro = { ...p(), schemaVersion: 7 } as unknown as ProgressV1;
  assert.equal(mergeProgress(raro, p()).schemaVersion, 1);
});

// ---------- Propiedades de la fusión: 500 pares aleatorios con PRNG fijo ----------

const PAIRS = 500;
const sinPrefs = (x: ProgressV1) => ({ ...x, preferences: null });
const sinFechas = (x: ProgressV1) => ({ ...x, createdAt: null, lastUpdated: null });
const vacio = (): ProgressV1 => p({ createdAt: '2099-01-01T00:00:00.000Z', lastUpdated: '2000-01-01T00:00:00.000Z' });

test('propiedad: conmutativa (salvo preferencias, que son del dispositivo)', () => {
  const g = makeGen(1);
  for (let i = 0; i < PAIRS; i++) {
    const a = g.progress({ newFields: true });
    const b = g.progress({ newFields: true });
    assert.deepEqual(sinPrefs(mergeProgress(a, b)), sinPrefs(mergeProgress(b, a)), `par ${i}`);
  }
});

test('propiedad: idempotente — merge(merge(a,b), b) ≡ merge(a,b) ≡ merge(a, merge(a,b))', () => {
  const g = makeGen(2);
  for (let i = 0; i < PAIRS; i++) {
    const a = g.progress({ newFields: true });
    const b = g.progress({ newFields: true });
    const m = mergeProgress(a, b);
    assert.deepEqual(mergeProgress(m, b), m, `par ${i}`);
    assert.deepEqual(mergeProgress(a, m), m, `par ${i}`);
    assert.deepEqual(mergeProgress(a, a), a, `par ${i}`);
  }
});

test('propiedad: el progreso vacío es neutro (salvo createdAt/lastUpdated)', () => {
  const g = makeGen(3);
  for (let i = 0; i < PAIRS; i++) {
    const a = g.progress({ newFields: true });
    assert.deepEqual(sinFechas(mergeProgress(a, vacio())), sinFechas(a), `par ${i}`);
    assert.deepEqual(sinFechas(mergeProgress(vacio(), a)), sinFechas(a), `par ${i}`);
  }
});

test('propiedad: monótona — nada se pierde, ningún máximo baja, ninguna primera vez se retrasa', () => {
  const g = makeGen(4);
  const keys = (...rs: Array<Record<string, unknown> | undefined>) => [...new Set(rs.flatMap((r) => Object.keys(r ?? {})))].sort();
  for (let i = 0; i < PAIRS; i++) {
    const a = g.progress({ newFields: true });
    const b = g.progress({ newFields: true });
    const m = mergeProgress(a, b);
    const msg = `par ${i}`;

    assert.deepEqual(Object.keys(m.lessons).sort(), keys(a.lessons, b.lessons), msg);
    assert.deepEqual(Object.keys(m.achievements ?? {}).sort(), keys(a.achievements, b.achievements), msg);
    assert.deepEqual(Object.keys(m.activity ?? {}).sort(), keys(a.activity, b.activity), msg);
    assert.ok(m.streak.longest >= a.streak.longest && m.streak.longest >= b.streak.longest, msg);
    assert.ok(m.createdAt <= a.createdAt && m.createdAt <= b.createdAt, msg);
    assert.ok(m.lastUpdated >= a.lastUpdated && m.lastUpdated >= b.lastUpdated, msg);

    for (const [day, n] of Object.entries(m.activity ?? {})) {
      assert.ok(n >= (a.activity?.[day] ?? 0) && n >= (b.activity?.[day] ?? 0), msg);
    }
    for (const [id, u] of Object.entries(m.achievements ?? {})) {
      for (const side of [a, b]) {
        const s = side.achievements?.[id];
        if (s) assert.ok(u.unlockedAt <= s.unlockedAt, msg);
      }
    }
    for (const [k, l] of Object.entries(m.lessons)) {
      const la = a.lessons[k];
      const lb = b.lessons[k];
      if (la?.status === 'completed' || lb?.status === 'completed') assert.equal(l.status, 'completed', msg);
      for (const s of [la, lb]) {
        if (s?.completedAt) assert.ok(l.completedAt && l.completedAt <= s.completedAt, msg);
      }
      assert.deepEqual(Object.keys(l.exercises).sort(), keys(la?.exercises, lb?.exercises), msg);
      for (const [e, r] of Object.entries(l.exercises)) {
        for (const s of [la?.exercises[e], lb?.exercises[e]]) {
          if (!s) continue;
          assert.ok(r.attempts >= s.attempts && r.bestScore >= s.bestScore, msg);
          assert.ok(r.lastAttemptAt >= s.lastAttemptAt, msg);
          if (s.fails !== undefined) assert.ok((r.fails ?? -1) >= s.fails, msg);
          // Ningún campo definido en un solo lado desaparece.
          for (const f of ['lastScore', 'box', 'due'] as const) {
            if (s[f] !== undefined) assert.notEqual(r[f], undefined, `${msg}: ${k}.${e}.${f}`);
          }
        }
      }
    }
  }
});

test('propiedad: nunca crea claves con valor undefined', () => {
  const g = makeGen(5);
  for (let i = 0; i < PAIRS; i++) {
    const m = mergeProgress(g.progress({ newFields: true }), g.progress({ newFields: true }));
    assert.deepEqual(undefinedKeys(m), [], `par ${i}`);
  }
});

test('propiedad: asociativa si ningún ejercicio mezcla tripleta definida e indefinida', () => {
  const g = makeGen(6);
  for (let i = 0; i < PAIRS; i++) {
    const [a, b, c] = [1, 2, 3].map(() => g.progress({ newFields: true, triplet: 'byId' }));
    assert.deepEqual(
      mergeProgress(mergeProgress(a, b), c),
      mergeProgress(a, mergeProgress(b, c)),
      `trío ${i}`,
    );
  }
});
