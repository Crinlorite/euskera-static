import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexLessons, serializeIndex } from './lesson-index.ts';

const lecciones = [
  {
    data: {
      id: 'a1-descriptions-5', unitId: 'a1-descriptions', title: 'Izan vs egon', code: '05-izan-vs-egon',
      exercises: [
        { id: 'ex-ive-mc1', type: 'multiple-choice' },
        { id: 'ex-ive-fb1', type: 'fill-in-blank' },
        { id: 'ex-ive-fc', type: 'flashcards' },
        { id: 'ex-ive-mp', type: 'match-pairs' },
      ],
    },
  },
  {
    data: {
      id: 'a1-descriptions-6', unitId: 'a1-descriptions', title: 'Solo tarjetas', code: '06-tarjetas',
      exercises: [{ id: 'ex-fc', type: 'flashcards' }],
    },
  },
];

test('indexLessons: claves u/ex/g por id de lección', () => {
  const idx = indexLessons(lecciones);
  assert.deepEqual(Object.keys(idx), ['a1-descriptions-5', 'a1-descriptions-6']);
  assert.deepEqual(idx['a1-descriptions-5'], {
    u: 'a1-descriptions',
    ex: ['ex-ive-mc1', 'ex-ive-fb1', 'ex-ive-fc', 'ex-ive-mp'],
    g: ['ex-ive-mc1', 'ex-ive-fb1', 'ex-ive-mp'],
  });
});

test('indexLessons: los corregibles excluyen las flashcards', () => {
  const idx = indexLessons(lecciones);
  assert.deepEqual(idx['a1-descriptions-6'].ex, ['ex-fc']);
  assert.deepEqual(idx['a1-descriptions-6'].g, []);
});

test('indexLessons: sin opciones no hay título ni enlace (ni claves undefined)', () => {
  const entry = indexLessons(lecciones)['a1-descriptions-5'];
  assert.ok(!('t' in entry));
  assert.ok(!('h' in entry));
  assert.equal(JSON.stringify(entry).includes('undefined'), false);
});

test('indexLessons: título y enlace opcionales', () => {
  const idx = indexLessons(lecciones, { titles: true, hrefOf: (l) => `/es/a1/03-descripciones/${l.data.code}/` });
  assert.equal(idx['a1-descriptions-5'].t, 'Izan vs egon');
  assert.equal(idx['a1-descriptions-5'].h, '/es/a1/03-descripciones/05-izan-vs-egon/');
  assert.equal(idx['a1-descriptions-6'].t, 'Solo tarjetas');
});

test('indexLessons: lista vacía → índice vacío', () => {
  assert.deepEqual(indexLessons([]), {});
});

test('serializeIndex: JSON que no puede cerrar el <script> y vuelve igual', () => {
  const idx = indexLessons([{ data: { id: 'x', unitId: 'u', title: '</script><b>', exercises: [] } }], { titles: true });
  const json = serializeIndex(idx);
  assert.equal(json.includes('<'), false);
  assert.deepEqual(JSON.parse(json), idx);
});
