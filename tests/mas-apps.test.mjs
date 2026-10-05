import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APPS, TEXTOS, LOCALES_ACTIVOS, PLAY_HL, AVISO_PRIVACIDAD, avisoPrivacidad, appsDe, seMuestraEn, dispositivoDe, enlaceDe } from '../src/lib/mas-apps.mjs';

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
    const ios = enlaceDe(app, 'ios', { pais: 'es' });
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

test('cada idioma va a SU tienda: pais en la App Store, idioma de ficha en Google Play', () => {
  assert.equal(enlaceDe(aulixa, 'ios', { pais: 'es' }), 'https://apps.apple.com/es/app/id6782634156');
  assert.equal(enlaceDe(aprenza, 'ios', { pais: 'es' }), 'https://apps.apple.com/es/app/id6786163224');
  assert.equal(enlaceDe(aulixa, 'ios', { pais: 'ro' }), 'https://apps.apple.com/ro/app/id6782634156');
  assert.equal(enlaceDe(aulixa, 'ios', { pais: 'cn' }), 'https://apps.apple.com/cn/app/id6782634156');
  assert.equal(enlaceDe(aulixa, 'android', { hl: 'ro' }),
    'https://play.google.com/store/apps/details?id=com.crintechstudios.brainykidsacademy&hl=ro');
  assert.equal(PLAY_HL['zh-Hans'], 'zh-CN');
  // Play no tiene asturiano, aragones ni occitano: castellano.
  for (const l of ['ast', 'an', 'oc']) assert.equal(PLAY_HL[l], 'es', l);
  for (const l of LOCALES_ACTIVOS) assert.ok(PLAY_HL[l], `sin idioma de Play para ${l}`);
});

test('los enlaces van limpios: sin etiquetas de seguimiento ni identificadores', () => {
  for (const app of APPS) {
    for (const d of ['ios', 'android', 'otro']) {
      const url = enlaceDe(app, d, { pais: 'es', hl: 'es' });
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
  assert.ok(avisoPrivacidad('en').includes('Another app by Crintech'));
  assert.equal(avisoPrivacidad('fr'), null);
  // «app store» en minúscula es el nombre común en inglés; lo vetado son las marcas.
  for (const t of Object.values(AVISO_PRIVACIDAD)) {
    assert.ok(!/App Store/.test(t) && !/google|\bplay\b|android|iphone|apple/i.test(t), t);
  }
  // El título que cita el aviso es el que de verdad sale en el inicio.
  for (const l of LOCALES_ACTIVOS) {
    const t = TEXTOS[l];
    const titulo = `${t.antes} Crintech${t.despues ? ` ${t.despues}` : ''}`;
    assert.ok(AVISO_PRIVACIDAD[l].includes(titulo), `${l}: el aviso no cita «${titulo}»`);
  }
});


test('cada app sale solo en los idiomas en que existe', () => {
  const ids = (l) => appsDe(l).map((a) => a.id);
  // Lenguas de España: las dos (las apps están en castellano).
  for (const l of ['es', 'ca', 'gl', 'ast', 'an', 'oc']) assert.deepEqual(ids(l), ['aulixa', 'aprenza'], l);
  // Aulixa existe en inglés, rumano, chino y árabe; Aprenza es de la ESO y solo en castellano.
  for (const l of ['en', 'ro', 'zh-Hans', 'ar']) assert.deepEqual(ids(l), ['aulixa'], l);
  // Ninguna de las dos está en estos idiomas: no se anuncia lo que no se puede leer.
  for (const l of ['fr', 'de', 'it', 'pt-BR', 'ru', 'pl', 'ja', 'ko']) {
    assert.deepEqual(ids(l), [], l);
    assert.ok(!seMuestraEn(l), l);
    assert.equal(avisoPrivacidad(l), null, l);
  }
  assert.deepEqual([...LOCALES_ACTIVOS].sort(), ['an', 'ar', 'ast', 'ca', 'en', 'es', 'gl', 'oc', 'ro', 'zh-Hans']);
});

test('todo idioma activo tiene sus textos completos y su aviso de privacidad', () => {
  for (const l of LOCALES_ACTIVOS) {
    const t = TEXTOS[l];
    for (const k of ['antetitulo', 'antes', 'entradilla']) assert.ok(t[k] && t[k].trim() === t[k], `${l}.${k}`);
    for (const app of appsDe(l)) assert.ok(t.apps[app.id], `${l}: falta la línea de ${app.id}`);
    assert.ok(AVISO_PRIVACIDAD[l], `sin aviso de privacidad en ${l}`);
    assert.equal(avisoPrivacidad(l), AVISO_PRIVACIDAD[l]);
  }
});

test('los textos no nombran tiendas ni lo que Aulixa no puede decir', () => {
  const todo = Object.values(TEXTOS).map((t) => [t.antetitulo, t.antes, t.despues, t.entradilla, ...Object.values(t.apps)].join(' ')).join(' ')
    + APPS.map((a) => a.nombre).join(' ');
  for (const vetado of [/app\s?store/i, /google/i, /play\b/i, /android/i, /iphone/i, /cerebr/i, /brain/i, /nintendo/i, /lomloe/i, /gratis|free\b|gratuit/i]) {
    assert.ok(!vetado.test(todo), `aparece ${vetado}`);
  }
});
