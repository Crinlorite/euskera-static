import { test } from 'node:test';
import assert from 'node:assert/strict';
import { achievementTitle, achievementDesc, achievementIcon } from './achievement-text.ts';

const titles = { 'a1-family': 'Familia', 'a2-travel': 'De viaje' };

test('títulos: maestría e «Impecable» con el título de la unidad; nivel en mayúsculas; «Del error» con su cifra', () => {
  assert.equal(achievementTitle('es', 'unit-complete-a1-family', titles), 'Maestría: Familia');
  assert.equal(achievementTitle('es', 'perfect-unit-a2-travel', titles), 'Impecable: De viaje');
  assert.equal(achievementTitle('es', 'level-complete-a2', titles), 'Nivel A2 completo');
  assert.equal(achievementTitle('es', 'review-50', titles), 'Del error se aprende: 50');
  assert.equal(achievementTitle('es', 'comeback', titles), 'Has vuelto');
  assert.equal(achievementTitle('es', 'first-perfect', titles), 'Primera lección en verde');
  assert.equal(achievementTitle('es', 'first-level', titles), 'Nivel superado');
});

test('descripciones con su parámetro', () => {
  assert.equal(achievementDesc('es', 'perfect-unit-a1-family', titles), 'Todas las lecciones de la unidad «Familia» en verde.');
  assert.equal(achievementDesc('es', 'review-10', titles), '10 ejercicios que fallaste y luego acertaste.');
  assert.equal(achievementDesc('es', 'level-complete-a2', titles), 'Completa todas las lecciones del nivel A2.');
});

test('sin título de unidad o sin clave, cae al catálogo o al id; nunca revienta', () => {
  assert.equal(achievementTitle('es', 'unit-complete-a1-greetings', {}), 'Maestría: Saludos');
  assert.equal(achievementTitle('es', 'perfect-unit-zz-nada', {}), 'Impecable: zz-nada');
  assert.equal(achievementTitle('es', 'logro-que-no-existe', {}), 'logro-que-no-existe');
});

test('iconos por familia', () => {
  assert.equal(achievementIcon('unit-complete-a2-travel'), '📘');
  assert.equal(achievementIcon('perfect-unit-a1-family'), '🟢');
  assert.equal(achievementIcon('level-complete-b1'), '🏆');
  assert.equal(achievementIcon('streak-3'), '🔥');
  assert.equal(achievementIcon('nada'), '🏅');
});
