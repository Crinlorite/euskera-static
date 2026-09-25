import { ACTIVE_LOCALES, type LocaleCode } from '../i18n/config';

/**
 * Acceso a los datos del Hiztegia (los genera scripts/extraer_hiztegia.mjs a
 * partir del contenido del curso; se commitean, para que el diff sea la
 * revision).
 *
 * Solo el castellano trae el diccionario completo: es el unico con paginas por
 * palabra, porque toda la demanda medida en Search Console es en castellano.
 * Los demas idiomas traen sus listas por tema.
 */

export type Traduccion = { texto: string; leccion: string; fuente: string };
export type Ejemplo = { texto: string; traduccion: string | null; audio: string | null; origen: string };

export type Entrada = {
  hitza: string;
  slug: string;
  traducciones: Traduccion[];
  lecciones: string[];
  unidades: string[];
  audio: string | null;
  ejemplos: Ejemplo[];
};

/** `pagina`: si la palabra tiene pagina propia (solo en castellano y si pasa el umbral). */
export type PalabraDeTema = { hitza: string; slug: string; tr: string; pagina: boolean };
export type Tema = { unidad: string; titulo: string; palabras: PalabraDeTema[] };

type Fichero = { locale: string; generado: string; entradas?: Entrada[]; temas: Tema[] };

const ficheros = import.meta.glob<Fichero>('../data/hiztegia/*.json', { eager: true, import: 'default' });

const porLocale = new Map<string, Fichero>();
for (const [ruta, datos] of Object.entries(ficheros)) {
  porLocale.set(ruta.replace(/.*\//, '').replace(/\.json$/, ''), datos as Fichero);
}

/** El idioma con paginas por palabra. Ampliarlo exige generar su diccionario completo. */
export const LOCALE_ENTRADAS: LocaleCode = 'es';

export const localesConHiztegia = (): LocaleCode[] =>
  ACTIVE_LOCALES.filter((l) => porLocale.has(l));

export const temasDe = (locale: string): Tema[] => porLocale.get(locale)?.temas ?? [];

export const entradasDe = (locale: string): Entrada[] => porLocale.get(locale)?.entradas ?? [];

export const generadoEl = (locale: string): string => porLocale.get(locale)?.generado ?? '';

/** El codigo de unidad tal y como va en la URL: "a1/09-mi-casa" -> "a1-09-mi-casa". */
export const slugTema = (unidad: string): string => unidad.replace('/', '-');
export const deSlugTema = (slug: string): string => slug.replace('-', '/');

/** Ruta de la leccion a la que pertenece una entrada. */
export const rutaLeccion = (locale: string, leccion: string): string => `/${locale}/${leccion}/`;

/** Otras palabras de las mismas lecciones, para tejer la malla interna. */
export function vecinas(locale: string, entrada: Entrada, cuantas = 8): PalabraDeTema[] {
  const suyas = new Set(entrada.unidades);
  const fuera = new Set([entrada.slug]);
  const out: PalabraDeTema[] = [];
  for (const tema of temasDe(locale)) {
    if (!suyas.has(tema.unidad)) continue;
    for (const p of tema.palabras) {
      if (fuera.has(p.slug) || !p.pagina) continue;
      fuera.add(p.slug);
      out.push(p);
      if (out.length >= cuantas) return out;
    }
  }
  return out;
}
