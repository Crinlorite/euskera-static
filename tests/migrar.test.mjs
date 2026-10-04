import { test } from 'node:test';
import assert from 'node:assert/strict';
import { destinoMigracion, URL_VALORAR_ANDROID } from '../src/lib/migrar.mjs';
import { esDeServicio, estaBloqueada, fueraDeBuscadores } from '../src/lib/locked.mjs';

test('la vuelta a la app lleva el progreso y solo puede recibirla Kaixo', () => {
  const d = destinoMigracion('P1.eJyrVkpJ-_abc');
  assert.ok(d.startsWith('intent://migrar?p=P1.eJyrVkpJ-_abc#Intent;'), d);
  assert.ok(d.includes(';scheme=kaixo;'), d);
  assert.ok(d.includes(';package=pro.crintech.euskera.twa;'), d);
  assert.ok(d.endsWith(';end'), d);
});

test('sin progreso vuelve igual, con el codigo vacio', () => {
  assert.ok(destinoMigracion('').startsWith('intent://migrar?p=#Intent;'));
  assert.ok(destinoMigracion(null).startsWith('intent://migrar?p=#Intent;'));
});

test('un codigo con caracteres raros no rompe el enlace', () => {
  const d = destinoMigracion('P1.a+b/c=;end#x');
  assert.equal(d.split('#Intent;').length, 2, d);
  assert.ok(d.includes('p=P1.a%2Bb%2Fc%3D%3Bend%23x#Intent;'), d);
});

test('si la app no esta instalada, la salida es la portada', () => {
  assert.ok(destinoMigracion('x').includes('S.browser_fallback_url=https%3A%2F%2Feuskera.crintech.pro%2F;'));
});

test('valorar en Android abre la tienda, no una web', () => {
  assert.equal(URL_VALORAR_ANDROID, 'market://details?id=pro.crintech.euskera.twa');
});

test('las paginas de servicio no se indexan y no son paginas bajo candado', () => {
  assert.ok(esDeServicio('/app/migrar/'));
  assert.ok(esDeServicio('app/migrar/'));
  assert.ok(!estaBloqueada('/app/migrar/'));
  assert.ok(fueraDeBuscadores('/app/migrar/'));
  assert.ok(fueraDeBuscadores('/es/b1/'));
  for (const r of ['/es/', '/es/a1/', '/es/android/', '/es/hiztegia/ura/', '/']) {
    assert.ok(!esDeServicio(r) && !fueraDeBuscadores(r), r);
  }
});
