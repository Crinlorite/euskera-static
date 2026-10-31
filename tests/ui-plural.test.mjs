import { test } from 'node:test';
import assert from 'node:assert/strict';
import { t, tf, tp } from '../src/i18n/ui.ts';
import { ACTIVE_LOCALES } from '../src/i18n/config.ts';

// tp(): singular solo donde hay variante `.one` en el idioma de la página; si no,
// el texto genérico de siempre (tf). Nunca cae al castellano.

test('tp: «lección completada» con 1; el genérico con 0 y con 2', () => {
  assert.equal(tp('es', 'progress.summary.completed', 1), 'lección completada');
  assert.equal(tp('es', 'progress.summary.completed', 2), t('es', 'progress.summary.completed'));
  assert.equal(tp('es', 'progress.summary.completed', 0), t('es', 'progress.summary.completed'));
});

test('tp: «día seguido» con 1', () => {
  assert.equal(tp('es', 'progress.streak.days', 1), 'día seguido');
});

test('tp: el número entra como {0} en el singular y en el plural', () => {
  assert.equal(tp('es', 'review.graduated', 1), '1 ejercicio que ya se quedó');
  assert.equal(tp('es', 'review.graduated', 3), '3 ejercicios que ya se quedaron');
});

test('tp: un idioma sin categoría «one» (ja) ve su texto de siempre', () => {
  assert.equal(tp('ja', 'progress.summary.completed', 1), t('ja', 'progress.summary.completed'));
});

test('tp: nunca mezcla idiomas (sin variante cae en el genérico del propio idioma)', () => {
  // Se compara con la frase castellana entera: palabras sueltas como «quedó»
  // también son correctas en asturiano.
  const es = tp('es', 'review.graduated', 1);
  for (const loc of ACTIVE_LOCALES) {
    if (loc === 'es') continue;
    const s = tp(loc, 'review.graduated', 1);
    assert.notEqual(s, es, `${loc}: ${s}`);
  }
});

test('tp: el dariya no lanza', () => {
  assert.doesNotThrow(() => tp('ary', 'progress.streak.days', 1));
  assert.equal(typeof tp('ary', 'progress.streak.days', 1), 'string');
});

test('tp: sin variante sustituye {0} y {1} como tf', () => {
  assert.equal(tp('es', 'lesson.summary.correct', 1, 1), tf('es', 'lesson.summary.correct', 1, 1));
  assert.equal(tp('es', 'lesson.summary.correct', 1, 1).includes('{'), false);
});
