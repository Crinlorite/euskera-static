import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validaInteres, diaUTC, sumaInteres, SQL_SUMA } from '../functions/api/_lib/interes.mjs';
import { origenDe, MARCA_INTERES, RUTA_JOLAS } from '../src/lib/jolas.mjs';

const lee = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8');

test('solo pasan idioma y origen conocidos; lo demas se ignora', () => {
  assert.deepEqual(validaInteres({ locale: 'fr', origen: 'ios' }), { ok: true, locale: 'fr', origen: 'ios' });
  assert.deepEqual(validaInteres({ locale: 'xx', origen: 'tele' }), { ok: true, locale: 'es', origen: 'web' });
  assert.deepEqual(validaInteres({}), { ok: true, locale: 'es', origen: 'web' });
  for (const malo of [null, 'texto', 7, []]) assert.equal(validaInteres(malo).ok, false);
});

test('aunque el cuerpo traiga datos personales, no salen de la validacion', () => {
  const v = validaInteres({ locale: 'es', origen: 'web', email: 'a@b.es', ip: '1.2.3.4', id: 'abc', userAgent: 'x', turnstileToken: 't' });
  assert.deepEqual(Object.keys(v).sort(), ['locale', 'ok', 'origen']);
});

test('el contador suma por dia, idioma y origen, y no guarda nada mas', async () => {
  const filas = new Map(); const llamadas = [];
  const db = { prepare(sql) { return { bind(...args) { return { async run() {
    llamadas.push({ sql, args }); const k = args.join('|'); filas.set(k, (filas.get(k) ?? 0) + 1);
  } }; } }; } };
  const dia = new Date('2026-10-06T23:30:00Z');
  await sumaInteres(db, { locale: 'es', origen: 'ios' }, dia);
  await sumaInteres(db, { locale: 'es', origen: 'ios' }, dia);
  await sumaInteres(db, { locale: 'fr', origen: 'web' }, dia);
  assert.deepEqual([...filas], [['2026-10-06|es|ios', 2], ['2026-10-06|fr|web', 1]]);
  for (const l of llamadas) assert.equal(l.args.length, 3, 'solo dia, idioma y origen');
  assert.equal(diaUTC(dia), '2026-10-06');
  assert.ok(SQL_SUMA.includes('ON CONFLICT(dia, locale, origen) DO UPDATE SET n = n + 1'));
});

test('ni el esquema ni la funcion tienen donde guardar un dato personal', () => {
  const esquema = lee('../schema-interes.sql').replace(/--.*$/gm, '');
  const columnas = [...esquema.matchAll(/^\s*(\w+)\s+(?:TEXT|INTEGER)/gm)].map((m) => m[1]);
  assert.deepEqual(columnas, ['dia', 'locale', 'origen', 'n']);
  const funcion = lee('../functions/api/interes.ts').replace(/\/\/.*$/gm, '');
  for (const vetado of [/CF-Connecting-IP/i, /x-forwarded-for/i, /user-agent/i, /remoteip/i, /email/i, /cookie/i]) {
    assert.ok(!vetado.test(funcion), `la funcion toca ${vetado}`);
  }
});

test('el origen lo dice el puente de la app; sin puente es la web', () => {
  assert.equal(origenDe('ios'), 'ios');
  assert.equal(origenDe('android'), 'android');
  assert.equal(origenDe(undefined), 'web');
  assert.equal(origenDe('otra-cosa'), 'web');
  assert.ok(MARCA_INTERES.startsWith('kaixo.') && RUTA_JOLAS.endsWith('/'));
});

test('los textos de Jolas existen en los 18 idiomas y no prometen avisos ni piden datos', () => {
  const textos = JSON.parse(lee('../src/data/jolas.json'));
  assert.equal(Object.keys(textos).length, 18);
  for (const [l, t] of Object.entries(textos)) {
    for (const k of ['titulo', 'entradilla', 'pacto', 'habitante', 'boton', 'anotado', 'error', 'nota', 'tarjeta', 'privacidad']) {
      assert.ok(typeof t[k] === 'string' && t[k].trim() === t[k] && t[k].length > 1, `${l}.${k}`);
    }
    assert.equal(t.pilares.length, 3, l);
    const visible = [t.titulo, t.entradilla, t.pacto, t.habitante, t.boton, t.anotado, t.error, t.nota, t.tarjeta, ...t.pilares.flat()].join(' ');
    // Se ve dentro de las apps: ni tiendas, ni plataformas, ni precios.
    assert.ok(!/App Store|Google|Android|iPhone|iOS|€|\$|\d+[.,]\d\d/.test(visible), `${l}: nombra tienda, plataforma o precio`);
    assert.ok(!/@/.test(visible), `${l}: pide o enseña un correo`);
    assert.ok(t.privacidad.includes('Turnstile'), `${l}: el parrafo de privacidad no nombra la comprobacion contra robots`);
  }
  // En castellano, comprobable palabra a palabra: nada de avisar ni de listas.
  const es = textos.es; const todo = [es.boton, es.anotado, es.nota, es.habitante, es.tarjeta].join(' ').toLowerCase();
  for (const p of ['avis', 'lista', 'apúntate', 'correo electrónico']) assert.ok(!todo.includes(p), `es: «${p}»`);
});
