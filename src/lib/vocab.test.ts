import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vocabWords, countVocab } from './vocab.ts';
import { indexLessons } from './lesson-index.ts';

test('vocabWords: euskera distinto de tarjetas y emparejar, normalizado; ignora opción múltiple y huecos', () => {
  const words = vocabWords([
    { id: 'a', type: 'flashcards', cards: [{ eu: 'Kaixo!', es: 'Hola' }, { eu: 'egun on', es: 'buenos días' }] },
    { id: 'b', type: 'match-pairs', pairs: [{ eu: 'kaixo', es: 'hola' }, { eu: 'Agur', es: 'adiós' }] },
    { id: 'c', type: 'multiple-choice', options: ['etxe'] },
    { id: 'd', type: 'fill-in-blank', answers: ['naiz'] },
  ]);
  assert.deepEqual(words, ['kaixo', 'egun on', 'agur']);
});

test('indexLessons con vocab: ids enteros compartidos entre lecciones; countVocab cuenta distintos', () => {
  const ls = [
    { data: { id: 'l1', unitId: 'u', title: '', code: '01', exercises: [{ id: 'f', type: 'flashcards', cards: [{ eu: 'Kaixo', es: '' }, { eu: 'agur', es: '' }] }] } },
    { data: { id: 'l2', unitId: 'u', title: '', code: '02', exercises: [{ id: 'm', type: 'match-pairs', pairs: [{ eu: 'agur', es: '' }, { eu: 'bai', es: '' }] }] } },
    { data: { id: 'l3', unitId: 'u', title: '', code: '03', exercises: [{ id: 'x', type: 'multiple-choice' }] } },
  ];
  const idx = indexLessons(ls, { vocab: true });
  assert.deepEqual(idx.l1.v, [0, 1]);
  assert.deepEqual(idx.l2.v, [1, 2]);
  assert.equal('v' in idx.l3, false);
  assert.equal(countVocab(idx, ['l1', 'l2']), 3);
  assert.equal(countVocab(idx, ['l2']), 2);
  assert.equal(countVocab(idx, ['l3', 'nada']), 0);
  // Sin la opción no hay `v`.
  assert.equal('v' in indexLessons(ls).l1, false);
});
