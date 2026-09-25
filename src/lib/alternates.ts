import { getCollection } from 'astro:content';
import { ACTIVE_LOCALES, type LocaleCode } from '../i18n/config';
import { RUTAS_FIJAS, construye, separaLocale } from './alternates-puro.mjs';
import { temasDe, entradasDe, slugTema, localesConHiztegia, LOCALE_ENTRADAS } from './hiztegia';

export type Alternativa = { hreflang: string; href: string };

let cache: Promise<Map<string, Set<string>>> | undefined;

/**
 * Inventario: ruta (sin idioma, con barra final) -> idiomas en los que EXISTE.
 *
 * Se construye espejando los getStaticPaths de cada pagina, porque prometer una
 * traduccion que no existe es peor que no prometer ninguna. Las 108 paginas de
 * B1-C2/EGA solo existen en castellano, y dos lecciones sueltas no estan
 * traducidas (an y ko): si esto se generase mapeando prefijos a ciegas,
 * mandariamos a Google a 404.
 *
 * Se calcula una vez por build (2.789 paginas lo consultan).
 */
export function inventario(): Promise<Map<string, Set<string>>> {
  cache ??= (async () => {
    const mapa = new Map<string, Set<string>>();
    const activos = new Set<string>(ACTIVE_LOCALES);
    const pon = (ruta: string, locale: string) => {
      if (!activos.has(locale)) return;
      if (!mapa.has(ruta)) mapa.set(ruta, new Set());
      mapa.get(ruta)!.add(locale);
    };

    for (const locale of ACTIVE_LOCALES) for (const ruta of RUTAS_FIJAS) pon(ruta, locale);

    for (const nivel of await getCollection('levels')) {
      const [locale, code] = nivel.id.split('/');
      pon(`${code}/`, locale);
    }
    for (const unidad of await getCollection('units')) {
      const [locale, nivel] = unidad.id.split('/');
      pon(`${nivel}/${unidad.data.code}/`, locale);
    }
    for (const leccion of await getCollection('lessons')) {
      const [locale, nivel, unidad] = leccion.id.split('/');
      pon(`${nivel}/${unidad}/${leccion.data.code}/`, locale);
    }
    // El Hiztegia: indice y temas en los 18 idiomas, paginas por palabra solo
    // en castellano (ver src/lib/hiztegia.ts).
    for (const locale of localesConHiztegia()) {
      pon('hiztegia/', locale);
      for (const tema of temasDe(locale)) pon(`hiztegia/gaiak/${slugTema(tema.unidad)}/`, locale);
    }
    for (const entrada of entradasDe(LOCALE_ENTRADAS)) {
      pon(`hiztegia/${entrada.slug}/`, LOCALE_ENTRADAS);
    }
    return mapa;
  })();
  return cache;
}

/** Los <link rel="alternate"> que le tocan a una URL. Vacio si no procede. */
export async function alternativasDe(pathname: string): Promise<Alternativa[]> {
  if (pathname === '/') return construye('', ACTIVE_LOCALES as unknown as string[]);
  const { locale, ruta } = separaLocale(pathname);
  if (!locale) return [];                       // 404 y cualquier cosa rara: nada
  const locales = (await inventario()).get(ruta);
  return locales && locales.size ? construye(ruta, locales) : [];
}

export type { LocaleCode };
