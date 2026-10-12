/** Kaixo Jolas en la web de Kaixo: ruta de su página y marca del botón «Me interesa». */

/** Ruta de la página (tras el idioma). Provisional hasta que Crinlorite confirme el nombre público. */
export const RUTA_JOLAS = 'jolas/';

/**
 * Idiomas con página de Jolas: los 18 que había al publicarla. Está CONGELADA
 * mientras dura la medición del botón «Me interesa» (oct-2026): un idioma nuevo
 * del sitio (hu, bg…) no la estrena ni añade hreflang a las 18 que ya hay.
 * Al acabar la medición se decide si entran.
 */
export const LOCALES_JOLAS = ['es', 'ca', 'gl', 'oc', 'ast', 'an', 'en', 'ar', 'fr', 'ro',
  'pt-BR', 'de', 'it', 'ru', 'pl', 'zh-Hans', 'ja', 'ko'];

export const hayJolas = (locale) => LOCALES_JOLAS.includes(locale);

/** Marca en el dispositivo para no contar dos veces a la misma persona, como el progreso. */
export const MARCA_INTERES = 'kaixo.jolas.interes.v1';

/** De dónde llega el interés: la app de iOS, la de Android o la web. Lo dice el puente de la app. */
export function origenDe(plataforma) {
  return plataforma === 'ios' || plataforma === 'android' ? plataforma : 'web';
}
