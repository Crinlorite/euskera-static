import type { LocaleCode } from '../i18n/config';
// App Kaixo en las tiendas — fuente ÚNICA de verdad (la usan el footer y la home).
// iOS PUBLICADA en la App Store (READY_FOR_SALE).
// Android PUBLICADA en Google Play desde el 28-ago-2026 (producción abierta al
// 4.º intento). La prueba cerrada sigue viva para validar novedades: ese es el
// sentido que conserva la página /[locale]/android/.
const APP_ID = 'id6784369966';

// Tienda de Apple POR PAÍS. Sin segmento de país, Apple manda a todo el mundo a
// la tienda de Estados Unidos (verificado: /app/<id> → 301 → /us/app/...).
//
// 🔴 TRAMPA: los códigos de la App Store son de PAÍS, no de idioma, y varios de
// nuestros locales chocan de la peor manera — llevan a una tienda REAL pero
// equivocada, así que parecen funcionar y no lo detectarías probando:
//   ca → Canadá (¡no catalán!)     ar → Argentina (¡no árabe!)
//   ja → Japón es "jp", no "ja"    ko → Corea es "kr", no "ko"
// Por eso el mapa es EXPLÍCITO y no se deriva nunca del código de idioma.
const TIENDA: Partial<Record<LocaleCode, string>> = {
  es: 'es', de: 'de', fr: 'fr', it: 'it', pl: 'pl', ro: 'ro', ru: 'ru',
  'pt-BR': 'br', 'zh-Hans': 'cn', ja: 'jp', ko: 'kr',
  // Lenguas de España → tienda española (es donde vive quien las lee).
  ca: 'es', gl: 'es', ast: 'es', an: 'es', oc: 'es',
  // Sin país propio evidente: se deja el mayor de su lengua.
  en: 'us',
  // ⚠️ No existe una tienda "árabe": nuestros lectores en árabe son, con mucha
  // probabilidad, arabófonos residentes en España aprendiendo euskera, así que
  // la española es mejor apuesta que cualquier país del Golfo. Revisable.
  ar: 'es',
};

export const appStoreUrl = (locale: LocaleCode) => `https://apps.apple.com/${TIENDA[locale] ?? 'us'}/app/${APP_ID}`;
export const appStoreReviewUrl = (locale: LocaleCode) =>
  `${appStoreUrl(locale)}?action=write-review`;

/** @deprecated Usa appStoreUrl(locale): sin país, Apple manda a la tienda de EE. UU. */
export const APP_STORE_URL = `https://apps.apple.com/app/${APP_ID}`;
export const IOS_LIVE = true;

export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=pro.crintech.euskera.twa';
export const ANDROID_LIVE = true;
