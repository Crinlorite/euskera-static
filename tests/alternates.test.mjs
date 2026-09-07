import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { separaLocale, construye, LOCALES, SITIO } from '../src/lib/alternates-puro.mjs';

test('separa el locale de la ruta, con y sin locale', () => {
  assert.deepEqual(separaLocale('/an/a1/09-mi-casa/02-altzariak/'),
    { locale: 'an', ruta: 'a1/09-mi-casa/02-altzariak/' });
  assert.deepEqual(separaLocale('/pt-BR/'), { locale: 'pt-BR', ruta: '' });
  assert.deepEqual(separaLocale('/zh-Hans/sobre/'), { locale: 'zh-Hans', ruta: 'sobre/' });
  assert.deepEqual(separaLocale('/'), { locale: null, ruta: '' });
  assert.deepEqual(separaLocale('/404/'), { locale: null, ruta: '404/' });
});

test('cluster de portada: x-default a la landing, en orden estable', () => {
  const alt = construye('', ['ko', 'es', 'an']);
  assert.deepEqual(alt.map((a) => a.hreflang), ['es', 'an', 'ko', 'x-default']);
  assert.equal(alt.at(-1).href, `${SITIO}/`);
  assert.equal(alt[0].href, `${SITIO}/es/`);
});

test('ruta normal: x-default apunta a la version es', () => {
  const con = construye('a1/09-mi-casa/02-altzariak/', ['es', 'an']);
  assert.equal(con.at(-1).hreflang, 'x-default');
  assert.equal(con.at(-1).href, `${SITIO}/es/a1/09-mi-casa/02-altzariak/`);
  assert.ok(con.every((a) => a.href.startsWith(`${SITIO}/`) && a.href.endsWith('/')));
});

test('una ruta que solo existe en es emite es + x-default y nada mas', () => {
  const alt = construye('b1/', ['es']);
  assert.deepEqual(alt.map((a) => a.hreflang), ['es', 'x-default']);
});

test('sin version es no se inventa x-default', () => {
  assert.equal(construye('x/', ['fr']).some((a) => a.hreflang === 'x-default'), false);
});

test('ignora locales que no estan activos (eu no es idioma de interfaz)', () => {
  assert.deepEqual(construye('', ['es', 'eu', 'xx']).map((a) => a.hreflang), ['es', 'x-default']);
});

test('LOCALES esta sincronizado con ACTIVE_LOCALES de i18n/config.ts', () => {
  // El orden y el contenido salen del mismo sitio: si alguien anade un idioma
  // en config.ts y se olvida de aqui, esta prueba lo caza antes que el build.
  const config = readFileSync(new URL('../src/i18n/config.ts', import.meta.url), 'utf8');
  const declarados = [...config.matchAll(/^\s*'([\w-]+)':\s*\{\s*code:/gm)].map((m) => m[1]);
  const activos = declarados.filter((code) => {
    const bloque = config.slice(config.indexOf(`'${code}': { code:`));
    return /status:\s*'(active|beta)'/.test(bloque.slice(0, bloque.indexOf('\n')));
  });
  assert.deepEqual(LOCALES, activos);
});
