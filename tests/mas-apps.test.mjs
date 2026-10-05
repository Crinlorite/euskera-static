import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APPS, TEXTOS, LOCALES_ACTIVOS, PLAY_HL, AVISO_PRIVACIDAD, TITULO_BETA, NOTA_MENORES, avisoPrivacidad, appsDe, seMuestraEn, tituloDe, rutaBeta, esBetaEnAndroid, dispositivoDe, enlaceDe } from '../src/lib/mas-apps.mjs';

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
    assert.ok(android, `${app.id} sin destino en Android`);
    assert.ok(android.startsWith('https://play.google.com/store/apps/details?id=') || android.startsWith('/app/'), android);
    assert.ok(!/apple/i.test(android), android);
    const otro = enlaceDe(app, 'otro');
    assert.ok(otro.startsWith(app.web), otro);
    assert.ok(!/apple\.com|play\.google|market:/i.test(otro), otro);
  }
});

test('en Android: tienda si la app es publica, guia de la beta si esta en prueba cerrada', () => {
  assert.ok(enlaceDe(aulixa, 'android').includes('id=com.crintechstudios.brainykidsacademy'));
  assert.ok(!esBetaEnAndroid(aulixa));
  // Aprenza no tiene ficha publica (404): jamas se enlaza la tienda, sino la guia.
  assert.ok(esBetaEnAndroid(aprenza));
  for (const l of ['es', 'ca', 'gl', 'ast', 'an', 'oc']) {
    assert.equal(enlaceDe(aprenza, 'android', { locale: l }), `/app/aprenza-beta/${l}/`);
    assert.equal(rutaBeta(aprenza, l), `/app/aprenza-beta/${l}/`);
    assert.ok(TITULO_BETA[l].startsWith('Aprenza'), l);
  }
  assert.ok(!/store\/apps\/details/.test(enlaceDe(aprenza, 'android', { locale: 'es' })));
  // Sin guia en ese idioma no hay destino: la tarjeta no sale.
  assert.equal(enlaceDe(aprenza, 'android', { locale: 'ja' }), null);
  // La guia de la beta es cosa de Android: en iPhone y en ordenador no se usa.
  assert.ok(enlaceDe(aprenza, 'ios', { locale: 'es' }).startsWith('https://apps.apple.com/'));
  assert.equal(enlaceDe(aprenza, 'otro', { locale: 'es' }), 'https://aprenza.app/');
  assert.equal(aprenza.playBeta.prueba, 'https://play.google.com/apps/testing/com.crintechstudios.aprenza');
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
      const url = enlaceDe(app, d, { pais: 'es', hl: 'es', locale: 'es' });
      if (!url) continue;
      if (url.startsWith('/')) { assert.ok(!url.includes('?'), url); continue; }
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
  assert.ok(avisoPrivacidad('fr').includes('Une autre app de Crintech'));
  assert.equal(avisoPrivacidad('eu'), null);
  // «app store» en minúscula es el nombre común en inglés; lo vetado son las marcas.
  for (const t of Object.values(AVISO_PRIVACIDAD)) {
    assert.ok(!/App Store/.test(t) && !/google|\bplay\b|android|iphone|apple/i.test(t), t);
  }
  // El título que cita el aviso es el que de verdad sale en el inicio.
  for (const l of LOCALES_ACTIVOS) {
    const titulo = tituloDe(l);
    assert.ok(titulo.includes('Crintech') && titulo.trim() === titulo, `${l}: «${titulo}»`);
    assert.ok(AVISO_PRIVACIDAD[l].includes(titulo), `${l}: el aviso no cita «${titulo}»`);
  }
});


test('que app sale en cada idioma', () => {
  const ids = (l) => appsDe(l).map((a) => a.id);
  // Lenguas de España: las dos (las apps están en castellano).
  for (const l of ['es', 'ca', 'gl', 'ast', 'an', 'oc']) assert.deepEqual(ids(l), ['aulixa', 'aprenza'], l);
  // En el resto, solo Aulixa: Aprenza es de la ESO y solo en castellano.
  for (const l of ['en', 'ro', 'zh-Hans', 'ar', 'fr', 'de', 'it', 'pt-BR', 'ru', 'pl', 'ja', 'ko']) {
    assert.deepEqual(ids(l), ['aulixa'], l);
  }
  assert.equal(LOCALES_ACTIVOS.length, 18);
});

test('donde Aulixa no esta en el idioma del lector, la tarjeta lo dice', () => {
  const pistas = { fr: /anglais.*espagnol/, de: /Englisch.*Spanisch/, it: /inglese.*spagnolo/, 'pt-BR': /inglês.*espanhol/,
    ru: /английском.*испанском/, pl: /angielsku.*hiszpańsku/, ja: /英語.*スペイン語/, ko: /영어.*스페인어/ };
  for (const [l, re] of Object.entries(pistas)) assert.ok(re.test(TEXTOS[l].apps.aulixa), `${l}: ${TEXTOS[l].apps.aulixa}`);
});


test('todo idioma activo tiene sus textos completos y su aviso de privacidad', () => {
  for (const l of LOCALES_ACTIVOS) {
    const t = TEXTOS[l];
    for (const k of ['antetitulo', 'entradilla']) assert.ok(t[k] && t[k].trim() === t[k], `${l}.${k}`);
    assert.ok(t.antes || t.despues, `${l}: titulo vacio`);
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

test('la guia de la beta avisa del caso de las cuentas de menores, en todos sus idiomas', () => {
  assert.deepEqual(Object.keys(NOTA_MENORES).sort(), Object.keys(TITULO_BETA).sort());
  for (const [l, nota] of Object.entries(NOTA_MENORES)) {
    assert.ok(nota.includes('Family Link'), l);
    // La pagina de soporte de Aprenza va SIN barra final: con barra responde vacio.
    assert.ok(nota.includes('href="https://aprenza.app/soporte"'), l);
    assert.equal((nota.match(/<a /g) ?? []).length, 1, l);
  }
});
