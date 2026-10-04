/**
 * Titulo, descripcion y migas de las entradas del Hiztegia.
 *
 * PRUEBA A/B (4-oct-2026). En su primera semana el Hiztegia tuvo 2.541
 * impresiones en Google y 1 clic (CTR 0,04 % en posicion 8; las lecciones, 0,73 %
 * en posicion 9). El resultado daba la respuesta entera y ninguna razon para
 * entrar. Hipotesis: abrir la descripcion con una frase REAL de la leccion.
 *
 *   grupo A  como estaba el 29-sep (control)
 *   grupo B  descripcion que abre con la frase, titulo que anuncia las frases
 *
 * Se mide con scripts/gsc_hiztegia_ab.py. Cuando haya veredicto, todas las
 * entradas pasan al grupo ganador y esto se simplifica.
 */
import { ajusta } from './seo-texto.mjs';

const MAX_DESCRIPCION = 155;
// " · Euskera" lo anade el layout; mas largo que esto Google lo corta.
const MAX_TITULO = 60;

/** Grupo de la prueba: estable por slug, mitad y mitad. */
export function grupoSeo(slug) {
  let h = 0;
  for (const c of slug) h = (h * 31 + c.codePointAt(0)) >>> 0;
  return h % 2 === 0 ? 'A' : 'B';
}

// Quita el punto final, pero no rompe unos puntos suspensivos.
const sinPuntoFinal = (s) => s.trim().replace(/(?<!\.)\.$/, '');
const cierraFrase = (s) => (/(\.\.\.|[?!…])$/.test(s) ? s : `${s}.`);

/**
 * La traduccion mas corta SIN parentesis: "hitzordua - cita en euskera" se lee;
 * "cita (acuerdo de hora con alguien)" se come el titulo y Google lo corta.
 */
export function cortaDe(traducciones) {
  const textos = (traducciones ?? []).map((tr) => tr.texto);
  return textos.filter((x) => x && !/[(),/]/.test(x)).sort((x, y) => x.length - y.length)[0]
    ?? (textos[0] ?? '').replace(/\s*\([^)]*\)/g, '').trim();
}

/**
 * Frases con traduccion que sirven para abrir un resultado de Google, en el
 * orden de calidad que ya trae el extractor. Fuera las filas de tabla que no
 * son una frase ("merkatua / supermerkatua") y las que solo repiten la palabra.
 */
const frasesTraducidas = (hitza, ejemplos) => (ejemplos ?? []).filter((x) =>
  x.traduccion && !/[/()|]/.test(x.texto + x.traduccion)
  && x.texto.trim().split(/\s+/).length > hitza.trim().split(/\s+/).length);

/**
 * La descripcion del grupo B: abre con una frase real y su traduccion. Devuelve
 * null si la entrada no tiene ninguna frase que quepa: esa entrada no entra en
 * la prueba y se queda como estaba, sea del grupo que sea.
 */
export function descripcionConFrase({ hitza, corta, ejemplos }) {
  if (!corta) return null;
  const c = corta.toLowerCase();
  const colas = [
    ` Así se usa ${hitza} («${c}») en euskera: frases reales con traducción y la lección donde se aprende.`,
    ` Así se usa ${hitza} («${c}») en euskera, con la lección donde se aprende.`,
    ` ${hitza}: «${c}» en euskera.`,
  ];
  for (const cola of colas) {
    for (const f of frasesTraducidas(hitza, ejemplos)) {
      const texto = `«${sinPuntoFinal(f.texto)}» — ${cierraFrase(sinPuntoFinal(f.traduccion))}${cola}`;
      if (texto.length <= MAX_DESCRIPCION) return texto;
    }
  }
  return null;
}

/** 'tratada' (B con frase), 'control' (A con frase) o 'fuera' (sin frase). */
export function brazo({ slug, hitza, corta, ejemplos }) {
  if (!descripcionConFrase({ hitza, corta, ejemplos })) return 'fuera';
  return grupoSeo(slug) === 'B' ? 'tratada' : 'control';
}

export function tituloEntrada({ hitza, corta, ejemplos, grupo }) {
  if (!corta) return hitza;
  const base = `${hitza} — ${corta.toLowerCase()} en euskera`;
  if (grupo !== 'B' || !descripcionConFrase({ hitza, corta, ejemplos })) return base;
  const conGancho = `${base}, con frases de ejemplo`;
  return conGancho.length <= MAX_TITULO ? conGancho : base;
}

export function descripcionEntrada({ hitza, principal, corta, ejemplos, grupo, respaldo, minimo }) {
  const conFrase = grupo === 'B' ? descripcionConFrase({ hitza, corta, ejemplos }) : null;
  if (conFrase) return conFrase;
  const clasica = principal
    ? `${hitza} significa «${principal}» en euskera. ${ejemplos?.length ? 'Con ejemplo de uso real y' : 'Con'} la lección donde se aprende, del curso gratuito de Kaixo.`
    : `${hitza}, vocabulario del curso de euskera de Kaixo.`;
  return ajusta(clasica, respaldo, minimo);
}

/** Migas para Google: curso > Hiztegia > palabra. */
export function migas({ sitio, locale, hitza, slug, hiztegia }) {
  const paso = (position, name, ruta) => ({ '@type': 'ListItem', position, name, item: `${sitio}${ruta}` });
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      paso(1, 'Kaixo', `/${locale}/`),
      paso(2, hiztegia, `/${locale}/hiztegia/`),
      paso(3, hitza, `/${locale}/hiztegia/${slug}/`),
    ],
  };
}
