import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inlineMd } from '../src/lib/inline-md.ts';

test('cursiva, negrita y código', () => {
  assert.equal(inlineMd('*Bost eta erdiak dira*: con **-ak** no'), '<em>Bost eta erdiak dira</em>: con <strong>-ak</strong> no');
  assert.equal(inlineMd('el sufijo `-(e)ko`'), 'el sufijo <code>-(e)ko</code>');
});

test('escapa el HTML antes de dar formato', () => {
  assert.equal(inlineMd('<b>x</b> & "y"'), '&lt;b&gt;x&lt;/b&gt; &amp; &quot;y&quot;');
  assert.equal(inlineMd('*<img src=x onerror=alert(1)>*'), '<em>&lt;img src=x onerror=alert(1)&gt;</em>');
});

test('asterisco suelto se queda tal cual', () => {
  assert.equal(inlineMd('3 * 4'), '3 * 4');
  assert.equal(inlineMd('sin formato'), 'sin formato');
});

test('apóstrofo y negrita dentro de cursiva', () => {
  assert.equal(inlineMd("l'hora"), 'l&#39;hora');
  assert.equal(inlineMd('*egongo de**n***'), '<em>egongo de<strong>n</strong></em>');
});
