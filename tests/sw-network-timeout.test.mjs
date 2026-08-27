import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarSW } from './helpers/sw-harness.mjs';

const PAGINA = 'https://euskera.crintech.pro/es/';
const AGOTADO = Symbol('guarda');

// Corre una promesa con guardián: si tarda más de `ms` devuelve AGOTADO en vez
// de colgar el runner (una promesa que nunca se resuelve no mantiene vivo el
// bucle de eventos de Node y cancelaría el resto de pruebas del fichero).
function conGuarda(promesa, ms) {
  let t;
  const guarda = new Promise((r) => { t = setTimeout(() => r(AGOTADO), ms); });
  return Promise.race([promesa, guarda]).finally(() => clearTimeout(t));
}

const nunca = () => new Promise(() => {});
const responde = (cuerpo) => ({ status: 200, cuerpo, clone: () => ({ status: 200, cuerpo }) });
const lenta = (ms, cuerpo) => () => new Promise((r) => setTimeout(() => r(responde(cuerpo)), ms));

test('red colgada CON copia guardada: sirve la copia en vez de esperar para siempre', async () => {
  const sw = cargarSW({ red: nunca, cacheInicial: { 'pages-euskera-v5': { [PAGINA]: 'copia' } } });
  const res = await conGuarda(sw.pedir(PAGINA), 9000);
  assert.notEqual(res, AGOTADO, 'el service worker se quedó colgado esperando a la red');
  assert.equal(res.cuerpo, 'copia');
});

test('red colgada SIN copia: NO se rinde (una conexión lenta debe poder cargar)', async () => {
  const sw = cargarSW({ red: nunca });
  const res = await conGuarda(sw.pedir(PAGINA).then(() => 'resolvio', () => 'fallo'), 6000);
  assert.equal(res, AGOTADO, 'sin copia guardada debe seguir esperando a la red, no rendirse');
});

test('red sana: sirve lo fresco y lo guarda', async () => {
  const sw = cargarSW({ red: lenta(10, 'fresco'), cacheInicial: { 'pages-euskera-v5': { [PAGINA]: 'viejo' } } });
  const res = await conGuarda(sw.pedir(PAGINA), 5000);
  assert.notEqual(res, AGOTADO);
  assert.equal(res.cuerpo, 'fresco');
  assert.ok(sw.puestos.includes(PAGINA), 'debe refrescar la caché');
});

test('red que falla CON copia: sirve la copia', async () => {
  const sw = cargarSW({ red: () => Promise.reject(new Error('sin red')), cacheInicial: { 'pages-euskera-v5': { [PAGINA]: 'copia' } } });
  const res = await conGuarda(sw.pedir(PAGINA), 5000);
  assert.notEqual(res, AGOTADO);
  assert.equal(res.cuerpo, 'copia');
});

test('red que falla SIN copia de esa página: cae a la home guardada', async () => {
  const sw = cargarSW({ red: () => Promise.reject(new Error('sin red')), cacheInicial: { 'pages-euskera-v5': { [PAGINA]: 'home' } } });
  const res = await conGuarda(sw.pedir('https://euskera.crintech.pro/es/a1/'), 5000);
  assert.notEqual(res, AGOTADO);
  assert.equal(res.cuerpo, 'home');
});

test('la copia servida por plazo agotado se refresca en segundo plano', async () => {
  const sw = cargarSW({ red: lenta(6000, 'tardio'), cacheInicial: { 'pages-euskera-v5': { [PAGINA]: 'copia' } } });
  const res = await conGuarda(sw.pedir(PAGINA), 9000);
  assert.equal(res.cuerpo, 'copia', 'sirve lo guardado sin esperar');
  await new Promise((r) => setTimeout(r, 2000));
  assert.ok(sw.puestos.includes(PAGINA), 'la petición tardía debe actualizar la caché igualmente');
});

test('los recursos inmutables siguen sirviéndose desde caché al instante', async () => {
  const A = 'https://euskera.crintech.pro/_astro/app.abc123.js';
  const sw = cargarSW({ red: nunca, cacheInicial: { 'assets-euskera-v5': { [A]: 'bundle' } } });
  const res = await conGuarda(sw.pedir(A, { destination: 'script', mode: 'no-cors' }), 3000);
  assert.notEqual(res, AGOTADO);
  assert.equal(res.cuerpo, 'bundle');
});
