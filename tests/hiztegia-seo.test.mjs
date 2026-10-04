import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { grupoSeo, tituloEntrada, descripcionEntrada, brazo, migas } from '../src/lib/hiztegia-seo.mjs';

const es = JSON.parse(readFileSync(new URL('../src/data/hiztegia/es.json', import.meta.url), 'utf8'));
const RESPALDO = 'Curso de euskera de Kaixo: lecciones cortas con ejercicios, de A1 a A2.';

const hitzordua = {
  hitza: 'hitzordua', principal: 'cita (acuerdo de hora con alguien)', corta: 'cita',
  ejemplos: [
    { texto: 'Hitzordua eman ahal didazu?', traduccion: '¿Me puede dar cita?' },
    { texto: 'Hitzordua eskatu nahi dut.', traduccion: 'Quiero pedir cita.' },
  ],
};

test('el grupo es estable y reparte las entradas en dos mitades', () => {
  assert.equal(grupoSeo('hitzordua'), grupoSeo('hitzordua'));
  const b = es.entradas.filter((e) => grupoSeo(e.slug) === 'B').length;
  const parte = b / es.entradas.length;
  assert.ok(parte > 0.42 && parte < 0.58, `reparto desequilibrado: ${parte}`);
});

test('grupo A: titulo y descripcion como estaban el 29-sep', () => {
  assert.equal(tituloEntrada({ ...hitzordua, grupo: 'A' }), 'hitzordua — cita en euskera');
  assert.equal(
    descripcionEntrada({ ...hitzordua, grupo: 'A', respaldo: RESPALDO }),
    'hitzordua significa «cita (acuerdo de hora con alguien)» en euskera. Con ejemplo de uso real y la lección donde se aprende, del curso gratuito de Kaixo.',
  );
});

test('grupo B: la descripcion abre con una frase real de la leccion y su traduccion', () => {
  const d = descripcionEntrada({ ...hitzordua, grupo: 'B', respaldo: RESPALDO });
  assert.ok(d.startsWith('«Hitzordua eman ahal didazu?» — ¿Me puede dar cita? Así se usa '), d);
  assert.ok(d.includes('hitzordua') && d.includes('«cita»'), d);
  assert.ok(d.length <= 160, `${d.length} caracteres`);
  assert.ok(!/\.\.|\?\./.test(d), `puntuacion doble: ${d}`);
});

test('grupo B: el titulo conserva el orden y anuncia las frases', () => {
  assert.equal(tituloEntrada({ ...hitzordua, grupo: 'B' }), 'hitzordua — cita en euskera, con frases de ejemplo');
});

test('grupo B sin frase traducida: se queda como el grupo A', () => {
  const sin = { hitza: 'zuek', principal: 'vosotros', corta: 'vosotros', ejemplos: [], grupo: 'B', respaldo: RESPALDO };
  assert.equal(tituloEntrada(sin), 'zuek — vosotros en euskera');
  assert.ok(descripcionEntrada(sin).startsWith('zuek significa «vosotros» en euskera.'));
  const soloEu = { ...sin, ejemplos: [{ texto: 'zuek zarete', traduccion: null }] };
  assert.equal(tituloEntrada(soloEu), 'zuek — vosotros en euskera');
});

test('grupo B: ninguna descripcion real se pasa de 160 ni repite puntuacion', () => {
  for (const e of es.entradas) {
    const principal = e.traducciones[0]?.texto ?? '';
    const d = descripcionEntrada({
      hitza: e.hitza, principal, corta: principal.replace(/\s*\([^)]*\)/g, '').trim(),
      ejemplos: e.ejemplos, grupo: 'B', respaldo: RESPALDO,
    });
    assert.ok(d.length >= 50 && d.length <= 160, `${e.slug}: ${d.length} -> ${d}`);
    assert.ok(!/\.\.(?!\.)|[?!…]\./.test(d.replace(/\.\.\./g, '…')), `${e.slug}: ${d}`);
  }
});

test('un titulo largo no se alarga mas', () => {
  const largo = { hitza: 'garrantzitsua da birziklatzea', principal: 'es importante reciclar siempre', corta: 'es importante reciclar siempre',
    ejemplos: hitzordua.ejemplos, grupo: 'B' };
  assert.ok(!tituloEntrada(largo).includes('frases de ejemplo'));
});

test('las migas llevan del curso a la palabra con URL absolutas', () => {
  const m = migas({ sitio: 'https://euskera.crintech.pro', locale: 'es', hitza: 'ura', slug: 'ura', hiztegia: 'Hiztegia' });
  assert.equal(m['@type'], 'BreadcrumbList');
  assert.deepEqual(m.itemListElement.map((i) => i.item), [
    'https://euskera.crintech.pro/es/',
    'https://euskera.crintech.pro/es/hiztegia/',
    'https://euskera.crintech.pro/es/hiztegia/ura/',
  ]);
  assert.deepEqual(m.itemListElement.map((i) => i.name), ['Kaixo', 'Hiztegia', 'ura']);
});

test('titulo y descripcion cambian juntos o no cambian', () => {
  for (const e of es.entradas) {
    const principal = e.traducciones[0]?.texto ?? '';
    const corta = principal.replace(/\s*\([^)]*\)/g, '').trim();
    const datos = { slug: e.slug, hitza: e.hitza, principal, corta, ejemplos: e.ejemplos, respaldo: RESPALDO };
    const b = brazo(datos);
    for (const grupo of ['A', 'B']) {
      const nueva = descripcionEntrada({ ...datos, grupo }).startsWith('«');
      const gancho = tituloEntrada({ ...datos, grupo }).includes('frases de ejemplo');
      if (grupo === 'A' || b === 'fuera') assert.ok(!nueva && !gancho, `${e.slug} cambia sin ser tratada`);
      else assert.ok(nueva, `${e.slug} deberia abrir con frase`);
      if (gancho) assert.ok(nueva, `${e.slug}: titulo con gancho y descripcion clasica`);
    }
  }
});

test('una fila de tabla no abre un resultado', () => {
  const d = descripcionEntrada({ hitza: 'supermerkatua', principal: 'supermercado', corta: 'supermercado',
    ejemplos: [{ texto: 'merkatua / supermerkatua', traduccion: 'mercado / supermercado' }], grupo: 'B', respaldo: RESPALDO });
  assert.ok(d.startsWith('supermerkatua significa'), d);
});
