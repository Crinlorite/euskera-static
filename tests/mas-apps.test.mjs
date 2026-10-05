import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APPS, TEXTOS, LOCALES_ACTIVOS, AVISO_PRIVACIDAD, avisoPrivacidad, seMuestraEn, dispositivoDe, enlaceDe } from '../src/lib/mas-apps.mjs';

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  android: 'Mozilla/5.0 (Linux; Android 13; SM-N986B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0 Mobile Safari/537.36',
  appAndroid: 'Mozilla/5.0 (Linux; Android 13; SM-N986B; wv) AppleWebKit/537.36 Chrome/133.0 Mobile Safari/537.36 KaixoAndroid/2.0.0',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0 Safari/537.36',
};
const [aulixa, aprenza] = APPS;

test('el puente de la app manda sobre el aparato', () => {
  assert.equal(dispositivoDe({ plataforma: 'ios', ua: UA.android }), 'ios');
  assert.equal(dispositivoDe({ plataforma: 'android', ua: UA.iphone }), 'android');
});

test('sin puente decide el aparato', () => {
  assert.equal(dispositivoDe({ ua: UA.iphone }), 'ios');
  assert.equal(dispositivoDe({ ua: UA.ipad, toques: 5 }), 'ios');
  assert.equal(dispositivoDe({ ua: UA.android }), 'android');
  assert.equal(dispositivoDe({ ua: UA.appAndroid }), 'android');
  assert.equal(dispositivoDe({ ua: UA.mac, toques: 0 }), 'otro');
  assert.equal(dispositivoDe({ ua: UA.windows }), 'otro');
  assert.equal(dispositivoDe(), 'otro');
});

test('cada dispositivo recibe SU tienda y ninguna otra', () => {
  for (const app of APPS) {
    const ios = enlaceDe(app, 'ios', 'es');
    assert.ok(ios.startsWith('https://apps.apple.com/es/app/id'), ios);
    assert.ok(!/google|play\./i.test(ios), ios);
    const android = enlaceDe(app, 'android');
    if (android) {
      assert.ok(android.startsWith('https://play.google.com/store/apps/details?id='), android);
      assert.ok(!/apple/i.test(android), android);
    }
    const otro = enlaceDe(app, 'otro');
    assert.ok(otro.startsWith(app.web), otro);
    assert.ok(!/apple\.com|play\.google|market:/i.test(otro), otro);
  }
});

test('en Android solo salen las apps publicadas en Google Play', () => {
  assert.ok(enlaceDe(aulixa, 'android').includes('id=com.crintechstudios.brainykidsacademy'));
  assert.equal(enlaceDe(aprenza, 'android'), null);
});

test('la App Store lleva el pais del idioma, no el de EE. UU.', () => {
  assert.equal(enlaceDe(aulixa, 'ios', 'es'), 'https://apps.apple.com/es/app/id6782634156');
  assert.equal(enlaceDe(aprenza, 'ios', 'es'), 'https://apps.apple.com/es/app/id6786163224');
});

test('los enlaces van limpios: sin etiquetas de seguimiento ni identificadores', () => {
  for (const app of APPS) {
    for (const d of ['ios', 'android', 'otro']) {
      const url = enlaceDe(app, d, 'es');
      if (!url) continue;
      assert.ok(!/utm_|referrer|[?&](ct|pt|mt|ref|src|campaign)=/i.test(url), `${app.id}/${d}: ${url}`);
      assert.equal(new URL(url).hash, '', url);
    }
  }
  assert.equal(enlaceDe(aulixa, 'otro'), 'https://aulixa.app/');
  assert.equal(enlaceDe(aulixa, 'android'), 'https://play.google.com/store/apps/details?id=com.crintechstudios.brainykidsacademy');
});

test('la privacidad avisa de los destinos nuevos sin nombrar tiendas, solo donde sale el bloque', () => {
  const es = avisoPrivacidad('es');
  assert.ok(es.includes('Más apps de Crintech') && es.includes('no registra'), es);
  assert.equal(avisoPrivacidad('en'), null);
  for (const t of Object.values(AVISO_PRIVACIDAD)) {
    assert.ok(!/app\s?store|google|\bplay\b|android|iphone|apple/i.test(t), t);
  }
});

test('solo se muestra en los idiomas activados, y todos tienen sus cinco textos', () => {
  assert.deepEqual(LOCALES_ACTIVOS, ['es']);
  assert.ok(seMuestraEn('es'));
  for (const l of ['en', 'fr', 'ja', 'ca', 'gl']) assert.ok(!seMuestraEn(l), l);
  for (const [l, t] of Object.entries(TEXTOS)) {
    assert.equal(t.length, 5, l);
    assert.ok(t.every((x) => x && x.trim() === x), l);
  }
});

test('los textos no nombran tiendas ni lo que Aulixa no puede decir', () => {
  const todo = Object.values(TEXTOS).flat().join(' ') + APPS.map((a) => a.nombre).join(' ');
  for (const vetado of [/app\s?store/i, /google/i, /play\b/i, /android/i, /iphone/i, /cerebr/i, /brain/i, /nintendo/i, /lomloe/i, /gratis/i]) {
    assert.ok(!vetado.test(todo), `aparece ${vetado}`);
  }
});
