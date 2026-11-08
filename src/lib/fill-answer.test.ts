import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitGap, isFillCorrect } from './fill-answer.ts';

const ok = (prompt: string, answers: string[], value: string) => {
  const g = splitGap(prompt);
  return isFillCorrect(value, answers, g.before, g.after);
};

test('splitGap: separa antes/después y un hueco de varias palabras es uno solo', () => {
  assert.deepEqual(splitGap('Vivo en Donostia = Donostia___ bizi naiz.'),
    { before: 'Vivo en Donostia = Donostia', after: ' bizi naiz.', gap: '___' });
  assert.equal(splitGap('Zer ___ ___ zuk?').gap, '___ ___');
  assert.deepEqual(splitGap('Sin hueco'), { before: 'Sin hueco', after: '', gap: '' });
});

test('EU-0005: hueco pegado a la raíz acepta el sufijo, la palabra entera y «-sufijo»', () => {
  const p = 'Vivo en Donostia = Donostia___ bizi naiz.';
  assert.equal(ok(p, ['n'], 'n'), true);
  assert.equal(ok(p, ['n'], 'Donostian'), true);
  assert.equal(ok(p, ['n'], ' donostian '), true);
  assert.equal(ok(p, ['n'], '-n'), true);
  // Sin el sufijo sigue estando mal.
  assert.equal(ok(p, ['n'], 'Donostia'), false);
  assert.equal(ok(p, ['n'], ''), false);
  assert.equal(ok(p, ['n'], 'Donostiaren'), false);
});

test('varias respuestas válidas: cualquiera, sola o con la raíz', () => {
  const p = 'Vienen de Madrid = Madril___ datoz.';
  for (const v of ['dik', 'etik', 'Madrildik', 'Madriletik', '-etik']) assert.equal(ok(p, ['dik', 'etik'], v), true, v);
  assert.equal(ok(p, ['dik', 'etik'], 'Madrilera'), false);
});

test('tildes y mayúsculas como hasta ahora, también en la raíz', () => {
  assert.equal(ok('"Mañana lo veré" = Bihar ikusi___ dut.', ['ko', 'KO'], 'IKUSIKO'), true);
  assert.equal(ok('Prueba = Ñandú___ x.', ['abc'], 'nandúABC'), true);
});

test('hueco suelto (no pegado): no se inventan formas con guion ni con la palabra anterior', () => {
  const p = 'Bilbo + -koa = ___ (de Bilbao).';
  assert.equal(ok(p, ['Bilbokoa', 'bilbokoa'], 'Bilbokoa'), true);
  assert.equal(ok(p, ['Bilbokoa'], '-Bilbokoa'), false);
  assert.equal(ok('Prueba: foo ___ bar.', ['abc'], 'fooabc'), false);
});

test('hueco pegado por detrás (texto justo después) acepta la palabra entera', () => {
  const p = 'Prueba: ___xyz foo.';
  assert.equal(ok(p, ['abc'], 'abc'), true);
  assert.equal(ok(p, ['abc'], 'abcxyz'), true);
  assert.equal(ok(p, ['abc'], 'abc-'), false);
});
