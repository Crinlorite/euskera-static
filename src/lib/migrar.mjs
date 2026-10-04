/**
 * Vuelta a la app de Android con el progreso (ver src/pages/app/migrar.astro).
 *
 * `intent://` y no `kaixo://` a secas: lleva el paquete, asi que solo puede
 * recibirlo la app de Kaixo, y trae una salida si la app no esta instalada
 * (alguien que abre esta pagina a mano): la portada de la web.
 */
export const PAQUETE_ANDROID = 'pro.crintech.euskera.twa';

export function destinoMigracion(hash, sitio = 'https://euskera.crintech.pro') {
  const salida = encodeURIComponent(`${sitio}/`);
  return `intent://migrar?p=${encodeURIComponent(hash ?? '')}`
    + `#Intent;scheme=kaixo;package=${PAQUETE_ANDROID};S.browser_fallback_url=${salida};end`;
}

/** Ficha de la app en la tienda de Android, abierta por la propia tienda. */
export const URL_VALORAR_ANDROID = `market://details?id=${PAQUETE_ANDROID}`;
