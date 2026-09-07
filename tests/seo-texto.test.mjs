import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sinMarcado, primerParrafo, recorta, descripcionDeLeccion, minimoDescripcion }
  from '../src/lib/seo-texto.mjs';

const cuerpoDe = (ruta) => {
  const t = readFileSync(new URL(`../src/content/lessons/${ruta}`, import.meta.url), 'utf8');
  return t.startsWith('---') ? t.split('---').slice(2).join('---') : t;
};

test('limpia el marcado sin comerse el texto', () => {
  assert.equal(sinMarcado('La palabra es **altzaria** (plural *altzariak*).'),
    'La palabra es altzaria (plural altzariak).');
  assert.equal(sinMarcado('Mira [la tabla](/es/a1/) y ![foto](x.png) luego.'),
    'Mira la tabla y foto luego.');
  assert.equal(sinMarcado('Uno <em>dos</em> tres &amp; cuatro &#39;cinco&#39;'),
    "Uno dos tres & cuatro 'cinco'");
  assert.equal(sinMarcado('  varios\n  espacios   juntos '), 'varios espacios juntos');
});

test('el primer parrafo salta encabezados, tablas, listas y codigo', () => {
  const md = '## Titulo\n\n| a | b |\n|---|---|\n| x | y |\n\n- punto uno\n\nEsto es la prosa buena.\nY sigue.\n\nOtro parrafo.';
  assert.equal(primerParrafo(md), 'Esto es la prosa buena. Y sigue.');
  assert.equal(primerParrafo('```js\ncodigo();\n```\n\nProsa tras el codigo.'), 'Prosa tras el codigo.');
  assert.equal(primerParrafo('# Solo un titulo\n\n| a | b |'), null);
});

test('el enfasis con asterisco al inicio NO es una lista (caso real de japones)', () => {
  const md = '*Euskal Herria*での社会生活の大部分は、**taberna**が中心です。';
  assert.equal(primerParrafo(md), md);
  assert.equal(primerParrafo('* un elemento de lista\n* otro'), null);
});

test('recorta por frase completa y, si no puede, por palabra', () => {
  const largo = 'Primera frase corta pero suficientemente larga para servir de corte. ' +
    'Segunda frase que ya se pasa del limite permitido y hay que dejar fuera del resumen.';
  const r = recorta(largo);
  assert.ok(r.length <= 155);
  assert.ok(r.endsWith('.'), `deberia acabar en punto: ${r}`);
  const sinPuntos = 'palabra '.repeat(40).trim();
  const r2 = recorta(sinPuntos);
  assert.ok(r2.length <= 155 && r2.endsWith('…'));
  assert.ok(!r2.includes('palabr…'), 'no debe cortar a mitad de palabra');
  assert.equal(recorta('corto'), 'corto');
});

test('recorta texto japones, que no tiene espacios', () => {
  const ja = 'これは日本語の文です。'.repeat(20);
  const r = recorta(ja);
  assert.ok(r.length <= 155 && r.length > 100);
});

test('descripcion de una leccion real: el primer parrafo, limpio', () => {
  const d = descripcionDeLeccion(cuerpoDe('es/a1/09-mi-casa/02-altzariak.md'), 'respaldo');
  assert.ok(d.startsWith('Cada habitaci'), d);
  assert.ok(!d.includes('*') && !d.includes('|'), d);
  assert.ok(d.length >= 50 && d.length <= 155, `${d.length}: ${d}`);
});

test('sin prosa utilizable cae al respaldo', () => {
  assert.equal(descripcionDeLeccion('## Solo titulo\n\n| a | b |', 'el respaldo'), 'el respaldo');
  assert.equal(descripcionDeLeccion('Corto.', 'el respaldo'), 'el respaldo');
});

test('el minimo se relaja en chino, japones y coreano', () => {
  assert.equal(minimoDescripcion('es'), 50);
  assert.equal(minimoDescripcion('ja'), 25);
  assert.equal(minimoDescripcion('zh-Hans'), 25);
  const ja = '短い日本語の説明です。十分な長さです。もうちょっと。';
  assert.equal(descripcionDeLeccion(ja, 'respaldo', 25), ja);
});

test('ajusta completa lo corto y recorta lo largo', async () => {
  const { ajusta } = await import('../src/lib/seo-texto.mjs');
  // Caso real: la descripcion china de a1/02-familia mide 15 caracteres.
  assert.equal(ajusta('Familia en euskera.', 'Aprende euskera, gratis y para todos.'),
    'Familia en euskera. Aprende euskera, gratis y para todos.');
  const largo = 'x'.repeat(200);
  assert.ok(ajusta(largo, 'respaldo').length <= 155);
  const justo = 'Una descripcion que ya mide mas de cincuenta caracteres por si sola.';
  assert.equal(ajusta(justo, 'respaldo'), justo);
});

test('cierra las descripciones que quedan colgando en dos puntos', async () => {
  const { cierra } = await import('../src/lib/seo-texto.mjs');
  // Caso real (fr/a2/02-iragana/04): retrocede a la frase anterior completa.
  assert.equal(
    cierra("L'imparfait basque correspond au « je mangeais » du francais. Il sert a raconter :"),
    "L'imparfait basque correspond au « je mangeais » du francais.");
  // Caso real (es/a2/04): no hay frase anterior, se cierra con punto.
  assert.equal(
    cierra('En esta leccion completas la familia de las comparaciones con dos piezas:'),
    'En esta leccion completas la familia de las comparaciones con dos piezas.');
  assert.equal(cierra('Ya termina en punto.'), 'Ya termina en punto.');
  // Con un minimo bajo retrocede a la frase anterior...
  assert.equal(cierra('日本語の文です。これは続きます：', 5), '日本語の文です。');
  // ...y si no puede, cierra con el punto japones, no con el latino.
  assert.equal(cierra('日本語の文です。これは続きます：', 25), '日本語の文です。これは続きます。');
});
