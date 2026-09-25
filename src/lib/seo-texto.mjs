/**
 * Descripciones (meta description) a partir del contenido que YA existe.
 *
 * Hasta el 7-sep-2026 las 2.789 paginas compartian la misma frase, "Aprende
 * euskera, gratis y para todos.", que es lo que Google ensena bajo cada
 * resultado. No hacia falta escribir nada nuevo: cada leccion ya empieza
 * explicando de que va, en los 18 idiomas.
 *
 * Sin dependencias de Astro, para poder probarlo con `node --test`.
 */

// Un marcador de lista es simbolo + ESPACIO. Sin exigir el espacio, un parrafo
// japones que empieza con enfasis (*Euskal Herria*での...) se tomaria por lista.
const LISTA = /^([-*+]|\d+[.)])\s/;
const CJK = ['zh-Hans', 'ja', 'ko'];

/** Longitud minima aceptable de una descripcion en ese idioma. */
export function minimoDescripcion(locale) {
  return CJK.includes(locale) ? 25 : 50;
}

/** Quita marcado Markdown/HTML y normaliza espacios. */
export function sinMarcado(s) {
  return String(s)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]+/g, '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** El primer parrafo de prosa: ni encabezado, ni tabla, ni lista, ni codigo. */
export function primerParrafo(md) {
  let enCodigo = false;
  const parrafo = [];
  for (const cruda of String(md).split('\n')) {
    const l = cruda.trim();
    if (l.startsWith('```')) { enCodigo = !enCodigo; continue; }
    if (enCodigo) continue;
    if (!l) { if (parrafo.length) break; continue; }
    if (/^(#|\||>|<|import\s|:::)/.test(l) || LISTA.test(l)) {
      if (parrafo.length) break;
      continue;
    }
    parrafo.push(l);
  }
  return parrafo.length ? parrafo.join(' ') : null;
}

/**
 * Recorta a `max` respetando el idioma: primero por final de frase, si no por
 * palabra, y en chino/japones/coreano (que no separan con espacios) por
 * caracter. Nunca deja una palabra partida por la mitad.
 */
export function recorta(texto, max = 155) {
  const t = String(texto);
  if (t.length <= max) return t;
  const corte = t.slice(0, max);

  let frase = -1;
  for (const fin of ['. ', '! ', '? ', '。', '！', '？']) {
    const i = corte.lastIndexOf(fin);
    if (i > frase) frase = i + (fin.length > 1 ? 1 : 1);
  }
  if (frase >= 60) return corte.slice(0, frase + (corte[frase] === ' ' ? 0 : 1)).trim();

  const espacio = corte.lastIndexOf(' ');
  const base = espacio > 40 ? corte.slice(0, espacio) : corte.slice(0, max - 1);
  return base.replace(/[,;:.\-—\s]+$/, '') + '…';
}

/**
 * Cierra una descripcion que se ha quedado colgando en dos puntos, que es lo
 * que pasa cuando el parrafo continua en una lista ("...hace dos cosas:").
 * Primero intenta retroceder a la frase anterior completa; si eso deja el texto
 * demasiado corto, cierra con punto. 153 de 2.519 descripciones caian aqui.
 */
export function cierra(texto, minimo = 50) {
  const t = String(texto ?? '').trim();
  if (!/[:\uFF1A]$/.test(t)) return t;
  const cuerpo = t.slice(0, -1).trim();
  let fin = -1;
  for (const marca of ['. ', '! ', '? ', '\u3002', '\uFF01', '\uFF1F']) {
    const i = cuerpo.lastIndexOf(marca);
    if (i > fin) fin = i;
  }
  if (fin >= 0) {
    const recortado = cuerpo.slice(0, fin + 1).trim();
    if (recortado.length >= minimo) return recortado;
  }
  // Un punto latino detras de una frase en japones o chino canta; ese alfabeto
  // tiene el suyo.
  const cjk = /[\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/.test(cuerpo.slice(-1));
  return cuerpo + (cjk ? '\u3002' : '.');
}

/**
 * Deja un texto en su sitio: si se queda corto lo completa con el respaldo, y
 * si se pasa lo recorta. Hace falta porque las descripciones que ya existen en
 * el contenido van de 15 caracteres (chino) a 189 (nivel C1 en castellano).
 */
export function ajusta(texto, respaldo, minimo = 50, max = 155) {
  const t = String(texto ?? '').trim();
  const completo = t.length >= minimo ? t : `${t} ${String(respaldo ?? '').trim()}`.trim();
  return cierra(recorta(completo, max), minimo);
}

/**
 * Descripcion de una leccion: su primer parrafo, limpio y recortado. Si no da
 * la talla (leccion que arranca con tabla, o demasiado corta), el respaldo que
 * pase la pagina — que debe ser distinto para cada leccion, o el verificador
 * protesta por descripciones repetidas (regla D5).
 */
export function descripcionDeLeccion(cuerpo, respaldo, minimo = 50) {
  const p = primerParrafo(cuerpo ?? '');
  const limpio = p ? cierra(recorta(sinMarcado(p)), minimo) : '';
  return limpio.length >= minimo ? limpio : respaldo;
}
