import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const es = JSON.parse(readFileSync(new URL('../src/data/hiztegia/es.json', import.meta.url), 'utf8'));
const audio = JSON.parse(readFileSync(new URL('../src/data/audio-eu.json', import.meta.url), 'utf8'));
const ficheros = new Set(Object.values(audio));

// Entradas ya publicadas (instantaneas de rutas): se quedan aunque el
// extractor afine y pierdan un ejemplo que era falso. Su URL esta indexada.
const fixtures = new URL('./fixtures/', import.meta.url);
const yaPublicadas = new Set(readdirSync(fixtures)
  .filter((f) => /^rutas-\d{4}-\d{2}-\d{2}\.txt$/.test(f))
  .flatMap((f) => readFileSync(new URL(f, fixtures), 'utf8').split('\n'))
  .map((r) => r.match(/^es\/hiztegia\/([^/]+)\/$/)?.[1]).filter(Boolean));

test('cada entrada tiene traduccion y cumple el umbral', () => {
  for (const e of es.entradas) {
    assert.ok(e.traducciones.length > 0, `${e.slug} sin traduccion`);
    const vale = e.ejemplos.length > 0 || e.lecciones.length >= 2
      || e.traducciones.some((t) => t.fuente === 'leccion') || yaPublicadas.has(e.slug);
    assert.ok(vale, `${e.slug} no cumple el umbral: seria una pagina vacia`);
  }
});

test('los slugs son unicos y sirven como URL', () => {
  const vistos = new Set();
  for (const e of es.entradas) {
    assert.ok(/^[a-z0-9-]+$/.test(e.slug), `slug no apto para URL: ${e.slug}`);
    assert.ok(!vistos.has(e.slug), `slug repetido: ${e.slug}`);
    vistos.add(e.slug);
  }
  assert.ok(!vistos.has('gaiak'), 'gaiak chocaria con la ruta de los temas');
});

test('🔴 NINGUN ejemplo esta inventado: todos vienen de un fichero del repo', () => {
  for (const e of es.entradas) {
    for (const ej of e.ejemplos) {
      assert.ok(ej.origen, `${e.slug}: ejemplo sin origen`);
      if (ej.origen === 'audio-eu.json') {
        assert.ok(ej.texto in audio || Object.keys(audio).some((k) => k.toLowerCase() === ej.texto.toLowerCase()),
          `${e.slug}: dice venir del banco de audio y no esta: ${ej.texto}`);
      } else {
        const ruta = new URL(`../src/content/lessons/es/${ej.origen}.md`, import.meta.url);
        assert.ok(existsSync(ruta), `${e.slug}: origen inexistente ${ej.origen}`);
      }
    }
  }
});

test('el audio que se anuncia existe de verdad en el banco', () => {
  for (const e of es.entradas) {
    if (e.audio) assert.ok(ficheros.has(e.audio), `${e.slug}: audio fantasma ${e.audio}`);
    for (const ej of e.ejemplos) {
      if (ej.audio) assert.ok(ficheros.has(ej.audio), `${e.slug}: ejemplo con audio fantasma`);
    }
  }
});

test('las lecciones que citan las entradas existen', () => {
  for (const e of es.entradas) {
    for (const ruta of e.lecciones) {
      assert.ok(existsSync(new URL(`../src/content/lessons/es/${ruta}.md`, import.meta.url)),
        `${e.slug}: leccion inexistente ${ruta}`);
    }
  }
});

test('los temas apuntan a palabras que existen', () => {
  const slugs = new Set(es.entradas.map((e) => e.slug));
  for (const tema of es.temas) {
    assert.ok(tema.palabras.length > 0, `${tema.unidad} sin palabras`);
    for (const p of tema.palabras) {
      if (p.pagina) assert.ok(slugs.has(p.slug), `${tema.unidad}: ${p.slug} dice tener pagina y no es una entrada`);
      assert.ok(p.tr, `${tema.unidad}/${p.slug} sin traduccion`);
    }
  }
});

test('los 18 idiomas tienen sus temas', () => {
  const locales = ['es', 'ca', 'gl', 'oc', 'ast', 'an', 'en', 'ar', 'fr', 'ro',
                   'pt-BR', 'de', 'it', 'ru', 'pl', 'zh-Hans', 'ja', 'ko'];
  for (const l of locales) {
    const d = JSON.parse(readFileSync(new URL(`../src/data/hiztegia/${l}.json`, import.meta.url), 'utf8'));
    assert.ok(d.temas.length >= 20, `${l}: solo ${d.temas.length} temas`);
    assert.equal(l === 'es', Boolean(d.entradas), `${l}: solo el castellano lleva entradas`);
  }
});

test('los ejemplos de prosa traen traduccion y no arrastran marcado', () => {
  const ikaskidea = es.entradas.find((e) => e.slug === 'ikaskidea');
  assert.ok(ikaskidea?.ejemplos.some((x) => x.texto === 'Duela hamar urte ikaskideak ginen.'
    && x.traduccion === 'Hace diez años éramos compañeros de clase.'), 'ikaskidea sin su frase de la leccion');
  for (const e of es.entradas) {
    for (const x of e.ejemplos) {
      assert.ok(!/[*`|<>_]/.test(x.texto + (x.traduccion ?? '')), `${e.slug}: marcado en "${x.texto}"`);
    }
  }
});

test('ninguna tabla da euskera traducido a euskera', () => {
  const pisu = es.entradas.find((e) => e.slug === 'pisukidea');
  assert.ok(!pisu?.ejemplos.some((x) => x.traduccion === 'pisukideekin'));
});
