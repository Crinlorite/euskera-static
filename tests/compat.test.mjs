// Compatibilidad del progreso entre el código de antes de la fase 0 y el de ahora.
//
// - tests/legacy/v1-reader/: el lector viejo, congelado (simula un cliente con el
//   JS antiguo en caché). Lo que escribe el código nuevo lo tiene que entender.
// - tests/fixtures/progress/*.p1.txt|.p0.txt: códigos escritos por el códec VIEJO
//   (scripts/gen-progress-fixtures.mjs, ejecutado una vez antes de tocar nada). El
//   código nuevo los tiene que leer sin perder nada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { decodeHash as oldDecode, exportHash as oldExport } from './legacy/v1-reader/progress-hash.ts';
import { mergeProgress as oldMerge } from './legacy/v1-reader/progress-merge.ts';
import { migrate as oldMigrate } from './legacy/v1-reader/migrate.ts';

import { decodeHash as newDecode, exportHash as newExport } from '../src/stores/progress-hash.ts';
import { mergeProgress as newMerge } from '../src/stores/progress-merge.ts';
import { migrate as newMigrate } from '../src/stores/progress.ts';
import { makeGen } from './helpers/progress-gen.ts';

const FIX = new URL('./fixtures/progress/', import.meta.url);
const leer = (nombre) => readFile(new URL(nombre, FIX), 'utf8');
const json = async (n) => JSON.parse(await leer(`${n}.json`));
/** Igualdad "como se guarda": JSON quita las claves undefined que dejaba el código viejo. */
const comoJSON = (x) => JSON.parse(JSON.stringify(x));

/** Progreso nuevo con TODOS los campos opcionales que se añadieron el 31-oct-2026 (repaso y actividad). */
const nuevo = {
  schemaVersion: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  lastUpdated: '2026-10-30T20:00:00.000Z',
  lessons: {
    'a1-greetings-1': {
      status: 'completed',
      completedAt: '2026-01-02T10:00:00.000Z',
      exercises: {
        e1: { attempts: 3, bestScore: 100, lastAttemptAt: '2026-10-30T19:00:00.000Z', lastScore: 100, fails: 2, box: 2, due: '2026-11-02' },
        e2: { attempts: 1, bestScore: 90, lastAttemptAt: '2026-10-29T19:00:00.000Z', lastScore: 90, fails: 1, box: 0, due: '2026-10-29' },
        e3: { attempts: 5, bestScore: 100, lastAttemptAt: '2026-09-01T19:00:00.000Z', lastScore: 100, fails: 1, box: 4, due: '' },
      },
    },
    'a2-egoerak-1': { status: 'read', exercises: {} },
  },
  streak: { current: 4, longest: 9, lastStudiedDate: '2026-10-30' },
  preferences: { uiLocale: 'eu', theme: 'auto', weeklyGoalDays: 4 },
  achievements: { 'first-step': { unlockedAt: '2026-01-01T00:00:00.000Z' }, 'review-10': { unlockedAt: '2026-10-01T00:00:00.000Z' } },
  activity: { '2026-10-28': 12, '2026-10-29': 3, '2026-10-30': 7 },
};

test('1. el lector viejo lee un código nuevo con todos los campos opcionales', async () => {
  const hash = await newExport(nuevo);
  const leido = await oldDecode(hash);
  assert.notEqual(leido, null);
  assert.deepEqual(leido, nuevo);
});

test('2. migrate() viejo conserva lecciones (con box/due/lastScore/fails), logros y actividad', async () => {
  const migrado = oldMigrate(await oldDecode(await newExport(nuevo)));
  assert.deepEqual(migrado.lessons, nuevo.lessons);
  assert.deepEqual(migrado.achievements, nuevo.achievements);
  assert.deepEqual(migrado.activity, nuevo.activity);
  assert.deepEqual(migrado.preferences, nuevo.preferences);
  assert.deepEqual(migrado, nuevo);
});

test('3. la fusión vieja y la nueva coinciden en 200 pares sin campos nuevos', () => {
  const g = makeGen(200);
  let comparados = 0;
  while (comparados < 200) {
    const a = g.progress();
    const b = g.progress();
    // Con el mismo día de estudio la regla cambia a propósito (antes ganaba `local`).
    if ((a.streak.lastStudiedDate || '') === (b.streak.lastStudiedDate || '')) continue;
    assert.deepEqual(comoJSON(newMerge(a, b)), comoJSON(oldMerge(a, b)), `par ${comparados}`);
    comparados += 1;
  }
});

for (const variante of ['p1', 'p0']) {
  test(`4. ${variante}: los códigos viejos se leen tal cual con el decodificador nuevo`, async () => {
    for (const n of ['v1-sin-achievements', 'v1-claves-legacy', 'v1-completo']) {
      const hash = await leer(`${n}.${variante}.txt`);
      assert.ok(hash.startsWith(variante === 'p1' ? 'P1.' : 'P0.'), n);
      assert.deepEqual(await newDecode(hash), await json(n), n);
      // Y el lector viejo también (los fixtures no se han corrompido).
      assert.deepEqual(await oldDecode(hash), await json(n), n);
    }
  });

  test(`4. ${variante}: v1 sin achievements → mismas lecciones y achievements: {}`, async () => {
    const original = await json('v1-sin-achievements');
    const out = newMigrate(await newDecode(await leer(`v1-sin-achievements.${variante}.txt`)));
    assert.deepEqual(out.lessons, original.lessons);
    assert.deepEqual(out.achievements, {});
    assert.deepEqual(out, { ...original, achievements: {} });
  });

  test(`4. ${variante}: claves antiguas traducidas, colisión fusionada y la desconocida conservada`, async () => {
    const original = await json('v1-claves-legacy');
    const out = newMigrate(await newDecode(await leer(`v1-claves-legacy.${variante}.txt`)));
    assert.deepEqual(Object.keys(out.lessons).sort(), [
      'a1-descriptions-5',
      'a1-greetings-1',
      'a1-greetings-2',
      'a1/99-desconocida/01-x',
    ]);
    assert.deepEqual(out.lessons['a1-greetings-1'], original.lessons['a1/01-saludos/01-kaixo']);
    assert.deepEqual(out.lessons['a1-descriptions-5'], original.lessons['a1/03-nolakoa-zara/05-izan-vs-egon']);
    assert.deepEqual(out.lessons['a1/99-desconocida/01-x'], original.lessons['a1/99-desconocida/01-x']);
    // Colisión: "a1/01-saludos/02-agur" (e1) y "a1-greetings-2" (e2) son la misma lección.
    const g2 = out.lessons['a1-greetings-2'];
    assert.equal(g2.status, 'completed');
    assert.equal(g2.completedAt, '2025-11-15T19:55:00.000Z');
    assert.deepEqual(g2.exercises, {
      e1: { attempts: 2, bestScore: 60, lastAttemptAt: '2025-10-02T09:00:00.000Z' },
      e2: { attempts: 1, bestScore: 100, lastAttemptAt: '2025-11-15T19:50:00.000Z' },
    });
    assert.deepEqual(out.achievements, original.achievements);
    assert.deepEqual(out.streak, original.streak);
  });

  test(`4. ${variante}: v1 completo → idéntico`, async () => {
    const original = await json('v1-completo');
    const out = newMigrate(await newDecode(await leer(`v1-completo.${variante}.txt`)));
    assert.deepEqual(out, original);
  });
}

test('ida y vuelta: lo que el código nuevo reescribe de un fixture lo lee el viejo sin perder nada', async () => {
  for (const n of ['v1-sin-achievements', 'v1-claves-legacy', 'v1-completo']) {
    const migrado = newMigrate(await newDecode(await leer(`${n}.p1.txt`)));
    const releido = oldMigrate(await oldDecode(await newExport(migrado)));
    // El viejo descartaría la clave no traducible; todo lo demás debe seguir ahí.
    for (const [k, v] of Object.entries(migrado.lessons)) {
      if (k.includes('/')) continue;
      assert.deepEqual(releido.lessons[k], v, `${n}: ${k}`);
    }
    assert.deepEqual(releido.achievements, migrado.achievements, n);
  }
});

test('el códec nuevo produce exactamente lo mismo que el viejo (formato sin cambios)', async () => {
  for (const n of ['v1-sin-achievements', 'v1-claves-legacy', 'v1-completo']) {
    const p = await json(n);
    assert.equal(await newExport(p), await oldExport(p), n);
  }
});
