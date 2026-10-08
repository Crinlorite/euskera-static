import { test } from 'node:test';
import assert from 'node:assert/strict';
import { candidatas, destinoIdioma } from '../src/lib/alternates-puro.mjs';

// Inventario de juguete: el Hiztegia por palabra y B1 solo en castellano.
const INV = new Map([
  ['', new Set(['es', 'de', 'ko'])],
  ['hiztegia/', new Set(['es', 'de', 'ko'])],
  ['hiztegia/ura/', new Set(['es'])],
  ['a2/', new Set(['es', 'de', 'ko'])],
  ['a2/07-bidaiak/', new Set(['es', 'de', 'ko'])],
  ['a2/07-bidaiak/01-garraioa/', new Set(['es', 'de'])],
  ['b1/', new Set(['es'])],
  ['b1/01-perpausak/01-temporal/', new Set(['es'])],
]);
const existe = (r, l) => INV.get(r)?.has(l) ?? false;

test('las candidatas van de la pagina a la portada', () => {
  assert.deepEqual(candidatas('hiztegia/ura/'), ['hiztegia/ura/', 'hiztegia/', '']);
  assert.deepEqual(candidatas(''), ['']);
});

test('si la pagina existe en el otro idioma, va a ella', () => {
  assert.equal(destinoIdioma('/es/hiztegia/', 'de', existe), '/de/hiztegia/');
  assert.equal(destinoIdioma('/de/a2/07-bidaiak/01-garraioa/', 'es', existe), '/es/a2/07-bidaiak/01-garraioa/');
});

test('una palabra del Hiztegia lleva al indice del Hiztegia, no a un 404', () => {
  assert.equal(destinoIdioma('/es/hiztegia/ura/', 'de', existe), '/de/hiztegia/');
});

test('una leccion sin traducir sube a su unidad', () => {
  assert.equal(destinoIdioma('/es/a2/07-bidaiak/01-garraioa/', 'ko', existe), '/ko/a2/07-bidaiak/');
});

test('B1 (solo castellano) cae a la portada del idioma', () => {
  assert.equal(destinoIdioma('/es/b1/01-perpausak/01-temporal/', 'de', existe), '/de/');
});

test('una ruta sin idioma va a la portada del idioma elegido', () => {
  assert.equal(destinoIdioma('/app/migrar/', 'de', existe), '/de/');
  assert.equal(destinoIdioma('/', 'ko', existe), '/ko/');
});
