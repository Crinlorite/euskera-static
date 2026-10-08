/** Kaixo Jolas en la web de Kaixo: ruta de su página y marca del botón «Me interesa». */

/** Ruta de la página (tras el idioma). Provisional hasta que Crinlorite confirme el nombre público. */
export const RUTA_JOLAS = 'jolas/';

/** Marca en el dispositivo para no contar dos veces a la misma persona, como el progreso. */
export const MARCA_INTERES = 'kaixo.jolas.interes.v1';

/** De dónde llega el interés: la app de iOS, la de Android o la web. Lo dice el puente de la app. */
export function origenDe(plataforma) {
  return plataforma === 'ios' || plataforma === 'android' ? plataforma : 'web';
}
