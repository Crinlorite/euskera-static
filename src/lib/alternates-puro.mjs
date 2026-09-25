/**
 * Reglas PURAS del hreflang, sin depender de Astro, para poder probarlas con
 * `node --test` (ver tests/alternates.test.mjs). La parte que necesita las
 * colecciones de contenido vive en alternates.ts.
 *
 * Contexto: hasta el 7-sep-2026 la web no emitia ningun hreflang y Google
 * servia el 59 % de las busquedas en castellano con paginas en aragones o
 * catalan, porque nada le decia que son la misma pagina en distintos idiomas.
 */

export const SITIO = 'https://euskera.crintech.pro';

/** Mismo contenido y MISMO ORDEN que ACTIVE_LOCALES en src/i18n/config.ts. */
export const LOCALES = ['es', 'ca', 'gl', 'oc', 'ast', 'an', 'en', 'ar', 'fr', 'ro',
                        'pt-BR', 'de', 'it', 'ru', 'pl', 'zh-Hans', 'ja', 'ko'];

export const POR_DEFECTO = 'es';

/**
 * Rutas que existen en TODOS los idiomas activos porque su getStaticPaths hace
 * `ACTIVE_LOCALES.map(...)`. Si se anade una pagina asi, va aqui; si no, el
 * verificador del build (regla H1) lo caza.
 */
export const RUTAS_FIJAS = [
  '', 'sobre/', 'privacidad/', 'progreso/', 'android/', 'idioma/',
  'feedback/', 'expedicion/', 'a1/simulakroa/', 'a1/mintzamena/',
];

/** `/an/a1/09-mi-casa/` -> { locale: 'an', ruta: 'a1/09-mi-casa/' }. */
export function separaLocale(pathname) {
  const seg = pathname.replace(/^\/+/, '').split('/');
  if (LOCALES.includes(seg[0])) return { locale: seg[0], ruta: seg.slice(1).join('/') };
  return { locale: null, ruta: seg.join('/') };
}

/**
 * Lista de <link rel="alternate"> para una ruta, dados los idiomas en los que
 * existe de verdad. Siempre incluye la autorreferencia: Google exige que cada
 * pagina del grupo se liste a si misma o ignora el grupo entero.
 */
export function construye(ruta, locales) {
  const hay = new Set(locales);
  const salida = LOCALES
    .filter((l) => hay.has(l))
    .map((l) => ({ hreflang: l, href: `${SITIO}/${l}/${ruta}` }));

  if (ruta === '') {
    // La raiz es la landing con selector de idioma: es el destino correcto
    // para quien no encaja en ninguno de los 18.
    salida.push({ hreflang: 'x-default', href: `${SITIO}/` });
  } else if (hay.has(POR_DEFECTO)) {
    salida.push({ hreflang: 'x-default', href: `${SITIO}/${POR_DEFECTO}/${ruta}` });
  }
  return salida;
}
