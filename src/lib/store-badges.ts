// Insignias oficiales de las tiendas, POR IDIOMA.
// Regla de marca de Apple y de Google: la insignia debe ir en el idioma de la
// página. Descargadas de las fuentes oficiales y verificadas una a una a ojo
// (30-ago-2026):
//   Apple  → tools.applemediaservices.com/api/badges/download-on-the-app-store/black/<loc>?size=250x83
//   Google → play.google.com/intl/<intl>/badges/static/images/badges/<lang>_badge_web_generic.png
//
// Huecos reales comprobados: Apple NO tiene insignia en árabe ni en gallego
// (su endpoint devuelve la inglesa). Para gallego, asturiano, aragonés y
// occitano usamos la castellana, que es la lengua que ese lector entiende;
// para árabe, la inglesa que da el propio Apple.
import type { LocaleCode } from '../i18n/config';

const APPLE: Partial<Record<LocaleCode, string>> = {
  es: 'es', ca: 'ca', gl: 'es', oc: 'es', ast: 'es', an: 'es',
  en: 'en', ar: 'en', fr: 'fr', ro: 'ro', 'pt-BR': 'pt-BR', de: 'de',
  it: 'it', ru: 'ru', pl: 'pl', 'zh-Hans': 'zh-Hans', ja: 'ja', ko: 'ko',
};

const GOOGLE: Partial<Record<LocaleCode, string>> = {
  es: 'es', ca: 'ca', gl: 'gl', oc: 'es', ast: 'es', an: 'es',
  en: 'en', ar: 'ar', fr: 'fr', ro: 'ro', 'pt-BR': 'pt-BR', de: 'de',
  it: 'it', ru: 'ru', pl: 'pl', 'zh-Hans': 'zh-Hans', ja: 'ja', ko: 'ko',
};

export const appStoreBadge = (locale: LocaleCode) => `/badges/appstore-${APPLE[locale] ?? 'en'}.svg`;
export const playStoreBadge = (locale: LocaleCode) => `/badges/gplay-${GOOGLE[locale] ?? 'en'}.png`;
