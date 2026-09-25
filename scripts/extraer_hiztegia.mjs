#!/usr/bin/env node
/**
 * Extrae el vocabulario que YA esta escrito en el curso y lo deja en
 * src/data/hiztegia/<locale>.json, listo para las paginas del Hiztegia.
 *
 * POR QUE: la gente no busca "curso de euskera". Busca "pelo en euskera",
 * "altzariak traduccion", "hitzordua significado" (medido en Search Console el
 * 7-sep-2026). Es intencion de diccionario y nosotros ofrecemos un curso; el
 * vocabulario ya existe, solo esta enterrado dentro de lecciones largas.
 *
 * 🔴 REGLA QUE NO SE NEGOCIA: aqui no se inventa NADA. Cada palabra y cada
 * ejemplo sale de un fichero del repo y guarda de donde. Si una palabra no
 * tiene ejemplo de uso, la entrada lo dice; no se le fabrica uno.
 *
 * Fuentes, todas ya traducidas a los 18 idiomas:
 *   - tablas de vocabulario (la columna en euskera se localiza por la cabecera)
 *   - ejercicios flashcards / match-pairs del frontmatter
 *   - huecos de fill-in-blank, que dan frases de ejemplo reales
 *   - src/data/audio-eu.json, para saber que tiene voz grabada
 *
 * Uso: node scripts/extraer_hiztegia.mjs [--informe]
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const LOCALES = ['es', 'ca', 'gl', 'oc', 'ast', 'an', 'en', 'ar', 'fr', 'ro',
                 'pt-BR', 'de', 'it', 'ru', 'pl', 'zh-Hans', 'ja', 'ko'];

/** Como se llama el euskera en cada idioma (sale de site.name en i18n/ui.ts). */
const EUSKERA = {
  es: 'Euskera', ca: 'Basc', gl: 'Éuscaro', oc: 'Basc', ast: 'Vascu', an: 'Basco',
  en: 'Basque', ar: 'الباسكية', fr: 'Basque', ro: 'Bască', 'pt-BR': 'Basco',
  de: 'Baskisch', it: 'Basco', ru: 'Баскский', pl: 'Baskijski',
  'zh-Hans': '巴斯克语', ja: 'バスク語', ko: '바스크어',
};
// Toda etiqueta con la que alguna leccion encabeza la columna en euskera. Es la
// union de los 18 idiomas mas los alias sueltos: hay lecciones en asturiano o
// arabe que la rotulan "Euskera" a secas.
const ETIQUETAS_EU = new Set([
  ...Object.values(EUSKERA), 'Euskera', 'Euskara', 'Eusquera', 'eu',
].map((s) => s.normalize('NFC').trim().toLowerCase()));

/**
 * Como se rotula la columna de traduccion en cada idioma. Sale de mirar las
 * cabeceras REALES del contenido, no del nombre del locale: el portugues las
 * rotula "Português" (no "Português (Brasil)") y el chino "中文" (no "简体中文").
 */
const ETIQUETAS_TR = {
  es: ['castellano', 'español'], ca: ['català', 'catalán'], gl: ['galego'],
  oc: ['aranés', 'occitan'], ast: ['asturianu'], an: ['aragonés'],
  en: ['english'], ar: ['العربية'], fr: ['français'], ro: ['română'],
  'pt-BR': ['português', 'português (brasil)'], de: ['deutsch'], it: ['italiano'],
  ru: ['русский'], pl: ['polski'], 'zh-Hans': ['中文', '简体中文'],
  ja: ['日本語'], ko: ['한국어'],
};

/**
 * Los slugs de las unidades del A1 estan en CASTELLANO (09-mi-casa, 11-comprar,
 * 05-mi-pueblo) mientras que los del A2 estan en euskera (02-iragana,
 * 01-egoerak). Sin esta lista se colaban entradas como "mi casa" o "comprar"
 * haciendose pasar por palabras vascas.
 *
 * Es una lista a mano y a proposito: probe a distinguir los dos idiomas por
 * heuristica (cursivas del cuerpo, vocabulario ya verificado) y ninguna acerto
 * — descartaban altzariak y otorduak, que son euskera, y dejaban pasar agenda.
 * Una lista corta y revisable es mas honesta que una heuristica que finge saber.
 */
const CASTELLANO = new Set([
  'mi', 'y', 'vs', 'casa', 'pueblo', 'gente', 'comida', 'bar', 'saludos',
  'familia', 'basica', 'extendida', 'descripciones', 'direcciones', 'rutina',
  'diaria', 'pasado', 'reciente', 'comprar', 'restaurante', 'agenda',
  'presentaciones', 'preguntar', 'nombre', 'pronombres', 'personales',
  'posesivos', 'marcadores', 'intro',
]);

const NIVELES = ['a1', 'a2'];          // el resto esta bajo candado
const RAIZ = 'src/content/lessons';
const SALIDA = 'src/data/hiztegia';

const HOY = new Date().toISOString().slice(0, 10);
const audio = JSON.parse(readFileSync('src/data/audio-eu.json', 'utf8'));
const normal = (s) => s.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
const claveAudio = new Map(Object.keys(audio).map((k) => [normal(k), audio[k]]));

const limpiaCelda = (s) => s.replace(/[*_`]/g, '').replace(/<[^>]+>/g, '').trim();

/** Convierte "02-ile-eta-begiak" en un slug de URL a partir de la palabra. */
export function aSlug(s) {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * ¿Vale esta palabra como entrada de diccionario? Fuera lo que es gramatica
 * disfrazada de vocabulario: filas con parentesis explicativos, numeros,
 * conjugaciones enteras o titulos de tabla.
 */
function esPalabra(eu) {
  if (!eu || eu.length < 2 || eu.length > 40) return false;
  if (/[()\d:;/]/.test(eu)) return false;
  if (eu.split(' ').length > 3) return false;
  if (/^[A-ZÁÉÍÓÚÑ]/.test(eu) && eu.split(' ').length > 1) return false;
  return true;
}

function frontmatterYCuerpo(texto) {
  if (!texto.startsWith('---')) return ['', texto];
  const fin = texto.indexOf('\n---', 3);
  return [texto.slice(4, fin), texto.slice(fin + 4)];
}

/**
 * Filas de las tablas de vocabulario.
 *
 * 🔴 Solo se aceptan tablas cuya cabecera nombre A LA VEZ el euskera y el
 * idioma de destino. Sin esa exigencia se colaba basura: de las 355 tablas del
 * castellano, 129 tienen tres o mas columnas y casi todas son de gramatica
 * (Pronombre / Forma / Castellano). Y una tabla como
 * "| Castellano | Euskera | En... (instrumental) |" daba *itsasontziz* como
 * traduccion de *itsasontzia*, que es euskera traducido a euskera.
 */
function deTablas(cuerpo, locale) {
  const etiquetasTr = new Set(ETIQUETAS_TR[locale] ?? []);
  const out = [];
  const lineas = cuerpo.split('\n');
  for (let i = 0; i < lineas.length - 1; i++) {
    if (!/^\s*\|/.test(lineas[i]) || !/^\s*\|[\s:-]+\|/.test(lineas[i + 1] ?? '')) continue;
    const cab = lineas[i].split('|').slice(1, -1).map((c) => normal(limpiaCelda(c)));
    const cEu = cab.findIndex((c) => ETIQUETAS_EU.has(c));
    const cTr = cab.findIndex((c) => etiquetasTr.has(c));
    if (cEu < 0 || cTr < 0 || cEu === cTr) continue;
    for (let j = i + 2; j < lineas.length && /^\s*\|/.test(lineas[j]); j++) {
      const cel = lineas[j].split('|').slice(1, -1).map(limpiaCelda);
      if (cel.length <= Math.max(cEu, cTr)) continue;
      out.push({ eu: cel[cEu], tr: cel[cTr], fuente: 'tabla' });
    }
    i += 1;
  }
  return out;
}

/**
 * Pares de los ejercicios. El campo se llama `es` en los 18 idiomas, pero
 * contiene la lengua del locale.
 *
 * Hay DOS formatos de YAML en el contenido: el castellano usa el de una linea
 * (`- { eu: mahaia, es: mesa }`) y el resto el de bloque (`- eu: mahaia` /
 * `  es: mesa`). Solo leyendo el primero, los demas idiomas se quedaban con la
 * mitad de vocabulario.
 */
function deEjercicios(front) {
  const out = [];
  const quita = (s) => s.trim().replace(/^["']|["']$/g, '');
  for (const m of front.matchAll(/\{\s*eu:\s*([^,}]+?)\s*,\s*es:\s*([^}]+?)\s*\}/g)) {
    out.push({ eu: quita(m[1]), tr: quita(m[2]), fuente: 'ejercicio' });
  }
  for (const m of front.matchAll(/-\s*eu:\s*(.+?)\n\s*es:\s*(.+?)(?=\n)/g)) {
    out.push({ eu: quita(m[1]), tr: quita(m[2]), fuente: 'ejercicio' });
  }
  return out;
}

/**
 * El slug de una leccion o de una unidad ES el termino vasco que trata, y son
 * justo los que la gente busca: iragana, agintera, ahalera, altzariak... todos
 * salen en Search Console. Muchos no aparecen en ninguna tabla porque la
 * leccion los explica en prosa, asi que sin esto se quedaban fuera del hiztegia
 * las palabras mas buscadas.
 *
 * Lo que aporta no es una traduccion literal sino el tema, y la pagina lo dice
 * asi ("lo trata la leccion X"), no lo presenta como diccionario.
 */
function deSlug(codigo, titulo) {
  const hitza = codigo.replace(/^\d+-/, '').replace(/-/g, ' ').trim();
  if (!hitza || !titulo) return null;
  if (hitza.split(' ').some((w) => CASTELLANO.has(w))) return null;
  return { eu: hitza, tr: titulo, fuente: 'leccion' };
}

/** Frases de ejemplo: huecos de fill-in-blank ya rellenos y prompts. */
function frasesDe(front, cuerpo) {
  const frases = [];
  for (const m of front.matchAll(/prompt:\s*["']?(.+?)["']?\s*\n(?:[^\n]*\n)*?\s*answers:\s*\[([^\]]+)\]/g)) {
    const hueco = m[2].split(',')[0].trim().replace(/^["']|["']$/g, '');
    let frase = m[1].replace(/_{3,}/, hueco).trim();
    if (frase.includes('___')) continue;
    // Muchos enunciados son preguntas SOBRE la frase ("Alaia" significa...).
    // De esos vale la frase entrecomillada, no la pregunta.
    const entrecomillado = frase.match(/^["'\u201c\u00ab]([^"'\u201d\u00bb]{6,})["'\u201d\u00bb]/);
    if (entrecomillado) frase = entrecomillado[1].trim();
    else if (/significa|\?|\u2026/.test(frase)) continue;
    frases.push({ texto: frase, fuente: 'ejercicio' });
  }
  // Expresiones de tres columnas (euskera / traduccion / cuando se usa).
  for (const l of cuerpo.split('\n')) {
    if (!/^\s*\|/.test(l)) continue;
    const cel = l.split('|').slice(1, -1).map(limpiaCelda);
    if (cel.length >= 2 && cel[0] && cel[0].split(' ').length >= 2 && !/^[-: ]+$/.test(cel[0])) {
      frases.push({ texto: cel[0], traduccion: cel[1], fuente: 'tabla' });
    }
  }
  return frases;
}

function extrae(locale) {
  const entradas = new Map();
  const porUnidad = new Map();
  const frasesGlobales = [];

  for (const nivel of NIVELES) {
    const dirNivel = join(RAIZ, locale, nivel);
    if (!existsSync(dirNivel)) continue;
    for (const unidad of readdirSync(dirNivel)) {
      const dirUnidad = join(dirNivel, unidad);
      // El slug de la unidad tambien es un termino vasco buscado (iragana,
      // etorkizuna...). Su titulo esta en la coleccion de unidades.
      const fichaUnidad = join('src/content/units', locale, nivel, unidad, 'index.yaml');
      let tituloUnidad = '';
      if (existsSync(fichaUnidad)) {
        tituloUnidad = (readFileSync(fichaUnidad, 'utf8').match(/^title:\s*(.+)$/m)?.[1] ?? '')
          .trim().replace(/^["']|["']$/g, '');
      }
      const delSlugUnidad = deSlug(unidad, tituloUnidad);
      for (const fichero of readdirSync(dirUnidad).filter((f) => f.endsWith('.md'))) {
        const ruta = `${nivel}/${unidad}/${fichero.replace(/\.md$/, '')}`;
        const texto = readFileSync(join(dirUnidad, fichero), 'utf8');
        const [front, cuerpo] = frontmatterYCuerpo(texto);
        const titulo = (front.match(/^title:\s*(.+)$/m)?.[1] ?? '').trim().replace(/^["']|["']$/g, '');

        for (const f of frasesDe(front, cuerpo)) frasesGlobales.push({ ...f, leccion: ruta });

        const codigo = (front.match(/^code:\s*(.+)$/m)?.[1] ?? '').trim().replace(/^["']|["']$/g, '');
        const delSlug = deSlug(codigo, titulo);
        const paresUnidad = delSlugUnidad && fichero === readdirSync(dirUnidad).filter((f) => f.endsWith('.md'))[0]
          ? [delSlugUnidad] : [];
        for (const par of [...deTablas(cuerpo, locale), ...deEjercicios(front),
                           ...(delSlug ? [delSlug] : []), ...paresUnidad]) {
          const eu = par.eu?.trim();
          const tr = par.tr?.trim();
          if (!esPalabra(eu) || !tr) continue;
          const clave = normal(eu);
          if (!entradas.has(clave)) {
            entradas.set(clave, {
              hitza: eu, slug: aSlug(eu), traducciones: [], lecciones: [], unidades: [],
              audio: claveAudio.get(clave) ?? null, ejemplos: [],
            });
          }
          const e = entradas.get(clave);
          if (!e.traducciones.some((t) => normal(t.texto) === normal(tr))) {
            e.traducciones.push({ texto: tr, leccion: ruta, fuente: par.fuente });
          }
          if (!e.lecciones.includes(ruta)) e.lecciones.push(ruta);
          const u = `${nivel}/${unidad}`;
          if (!e.unidades.includes(u)) e.unidades.push(u);
          // El titulo del tema es el de la UNIDAD, no el de la leccion que se
          // este leyendo en ese momento.
          if (!porUnidad.has(u)) porUnidad.set(u, { unidad: u, titulo: tituloUnidad || titulo, palabras: [] });
          const pu = porUnidad.get(u);
          if (!pu.palabras.includes(clave)) pu.palabras.push(clave);
        }
      }
    }
  }

  // Ejemplos de uso: frases REALES que contienen la palabra. Prioridad: las que
  // tienen voz grabada, luego las de ejercicio, luego las de tabla.
  const grabadas = Object.keys(audio).filter((k) => k.split(' ').length >= 2)
    .map((k) => ({ texto: k, fuente: 'audio', audio: audio[k] }));
  const todas = [...grabadas, ...frasesGlobales];
  const orden = { audio: 0, ejercicio: 1, tabla: 2 };
  for (const e of entradas.values()) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}-])${e.hitza.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}-])`, 'iu');
    const encajan = todas
      .filter((f) => re.test(f.texto) && normal(f.texto) !== normal(e.hitza))
      .sort((a, b) => orden[a.fuente] - orden[b.fuente]);
    const vistos = new Set();
    for (const f of encajan) {
      const k = normal(f.texto);
      if (vistos.has(k)) continue;
      vistos.add(k);
      e.ejemplos.push({
        texto: f.texto, traduccion: f.traduccion ?? null,
        audio: f.audio ?? claveAudio.get(k) ?? null,
        origen: f.leccion ?? 'audio-eu.json',
      });
      if (e.ejemplos.length >= 3) break;
    }
  }

  return { entradas, porUnidad };
}

/**
 * Umbral anti-pagina-vacia: traduccion Y (audio O ejemplo O dos lecciones O dar
 * nombre a una leccion o unidad).
 *
 * Lo ultimo no es un colador: son justo las palabras que la gente busca
 * (iragana, agintera, altzariak salen en Search Console) y su pagina tiene algo
 * que decir de verdad — que leccion las ensena y con que otras palabras van.
 */
const publicable = (e) =>
  e.traducciones.length > 0 &&
  (e.ejemplos.length > 0 || e.lecciones.length >= 2 ||
   e.traducciones.some((t) => t.fuente === 'leccion'));
// ⛔ El audio NO cuenta para el umbral (25-sep-2026): las pronunciaciones por
// palabra estan pendientes de revision y el Hiztegia sale SIN ellas. Con el audio
// como motivo, 730 de 1.401 entradas tenian pagina propia solo por el; sin el se
// quedaban en palabra + traduccion + enlace, justo las paginas delgadas que Google
// castiga. Esas palabras siguen en las listas por tema, sin pagina propia.

mkdirSync(SALIDA, { recursive: true });
const informe = [];
for (const locale of LOCALES) {
  const { entradas, porUnidad } = extrae(locale);
  const lista = [...entradas.values()];

  // 🔴 Hay ejercicios de emparejar donde LOS DOS lados son euskera (lugar <->
  // deporte: frontoia <-> pilota, errepidea <-> txirrindularitza). Ahi el campo
  // `es` no es una traduccion, y publicarla seria decirle a alguien que
  // "errepidea" significa "txirrindularitza", que es falso. Se descartan las
  // traducciones que son a su vez una palabra vasca del propio curso.
  const vascas = new Set(lista.map((e) => normal(e.hitza)));
  const descartadas = [];
  for (const e of lista) {
    const buenas = e.traducciones.filter((t) => {
      const esVasca = vascas.has(normal(t.texto)) && normal(t.texto) !== normal(e.hitza);
      if (esVasca) descartadas.push(`${e.hitza} -> ${t.texto} (${t.leccion})`);
      return !esVasca;
    });
    e.traducciones = buenas;
  }
  if (locale === 'es') global.__descartadas = descartadas;

  // Colisiones de slug: se fusionan bajo la forma mas frecuente.
  const conEntrada = lista.filter(publicable);
  const porSlug = new Map();
  for (const e of conEntrada) {
    if (!porSlug.has(e.slug)) porSlug.set(e.slug, e);
    else {
      const otro = porSlug.get(e.slug);
      for (const t of e.traducciones) {
        if (!otro.traducciones.some((x) => normal(x.texto) === normal(t.texto))) otro.traducciones.push(t);
      }
      for (const l of e.lecciones) if (!otro.lecciones.includes(l)) otro.lecciones.push(l);
      for (const u of e.unidades) if (!otro.unidades.includes(u)) otro.unidades.push(u);
      otro.audio ??= e.audio;
      if (otro.ejemplos.length < 3) otro.ejemplos.push(...e.ejemplos.slice(0, 3 - otro.ejemplos.length));
    }
  }
  const finales = [...porSlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));

  const temas = [...porUnidad.values()].map((u) => ({
    ...u,
    palabras: u.palabras.map((c) => entradas.get(c)?.slug).filter(Boolean),
  })).sort((a, b) => a.unidad.localeCompare(b.unidad));

  // Solo el castellano lleva el diccionario completo: es el unico con paginas
  // por palabra (toda la demanda medida en Search Console es en castellano) y
  // guardar los 18 completos pesaba 9,5 MB en el repo. Los demas idiomas solo
  // necesitan sus listas por tema, con la palabra, su traduccion y si tiene voz.
  // Las listas por tema llevan TODAS las palabras con traduccion valida, tengan
  // pagina propia o no; `pagina` dice si se puede enlazar.
  const conPagina = new Set(finales.map((e) => e.slug));
  const temasRicos = [...porUnidad.values()].sort((a, b) => a.unidad.localeCompare(b.unidad)).map((u) => {
    const vistos = new Set();
    const palabras = [];
    for (const clave of u.palabras) {
      const e = entradas.get(clave);
      if (!e || !e.traducciones.length || vistos.has(e.slug)) continue;
      vistos.add(e.slug);
      palabras.push({ hitza: e.hitza, slug: e.slug, tr: e.traducciones[0].texto, pagina: conPagina.has(e.slug) });
    }
    return { unidad: u.unidad, titulo: u.titulo, palabras };
  }).filter((t) => t.palabras.length);
  writeFileSync(join(SALIDA, `${locale}.json`), JSON.stringify(
    locale === 'es'
      ? { locale, generado: HOY, entradas: finales, temas: temasRicos }
      : { locale, generado: HOY, temas: temasRicos },
    null, 0));

  const sinNada = lista.length - conEntrada.length;
  const conEj = finales.filter((e) => e.ejemplos.length).length;
  const conAudio = finales.filter((e) => e.audio).length;
  const varias = finales.filter((e) => e.traducciones.length > 1).length;
  informe.push({ locale, crudas: lista.length, publicadas: finales.length, descartadas: sinNada,
                 conEjemplo: conEj, conAudio, variasTraducciones: varias, temas: temas.length });
  console.log(`  ${locale.padEnd(8)} crudas ${String(lista.length).padStart(5)} -> publicadas ${String(finales.length).padStart(5)}` +
              ` (audio ${conAudio}, ejemplo ${conEj}, varias traducciones ${varias}) · temas ${temas.length}`);
}

// Informe para revision humana. Va a docs/ y NO a /tmp: esta maquina vacia /tmp
// en cada arranque y esto es justo lo que hay que leer antes de publicar.
const esCompleto = JSON.parse(readFileSync(join(SALIDA, 'es.json'), 'utf8'));
const slugs = new Set(esCompleto.entradas.map((e) => e.slug));
const sospechosas = (global.__descartadas ?? []).map((x) => `\`${x}\``);
const varias = esCompleto.entradas.filter((e) => e.traducciones.length > 2)
  .map((e) => `\`${e.hitza}\`: ${e.traducciones.map((t) => t.texto).join(' / ')}`);
const sinNada = esCompleto.entradas.filter((e) => !e.audio && !e.ejemplos.length)
  .map((e) => e.hitza);

const md = [
  '# Hiztegia — informe de revision',
  '',
  `Generado por \`scripts/extraer_hiztegia.mjs\` el ${HOY}. **Leer esto antes de publicar.**`,
  '',
  'El extractor no inventa nada: toda palabra y todo ejemplo salen de un fichero',
  'del repo. Lo que no puede hacer es juzgar si una traduccion es *buena*. Aqui',
  'esta lo que conviene mirar con ojos humanos.',
  '',
  '## Cuanto sale de cada idioma',
  '',
  '| idioma | crudas | publicadas | con audio | con ejemplo | varias traducciones | temas |',
  '|---|---|---|---|---|---|---|',
  ...informe.map((i) => `| ${i.locale} | ${i.crudas} | ${i.publicadas} | ${i.conAudio} | ${i.conEjemplo} | ${i.variasTraducciones} | ${i.temas} |`),
  '',
  `## Traducciones DESCARTADAS por ser euskera (${sospechosas.length})`,
  '',
  'La supuesta traduccion era a su vez una palabra vasca del curso: ejercicios de',
  'emparejar lugar <-> deporte, o tablas de tres columnas donde dos son euskera.',
  'No se publican. Si alguna era correcta de verdad, hay que anadirla a mano.',
  '',
  ...(sospechosas.length ? sospechosas.map((x) => `- ${x}`) : ['- (ninguna)']),
  '',
  `## Entradas con mas de dos traducciones (${varias.length})`,
  '',
  'Puede ser polisemia legitima o mezcla de acepciones de lecciones distintas.',
  '',
  ...varias.slice(0, 60).map((x) => `- ${x}`),
  ...(varias.length > 60 ? [`- ... y ${varias.length - 60} mas`] : []),
  '',
  `## Entradas sin audio ni ejemplo (${sinNada.length})`,
  '',
  'Su pagina solo ofrece traduccion y leccion. Son candidatas a que se les grabe',
  'voz o se les escriba una frase, por el mismo camino que las lecciones.',
  '',
  '```',
  sinNada.join(', '),
  '```',
  '',
].join('\n');
mkdirSync('docs', { recursive: true });
writeFileSync('docs/hiztegia-informe.md', md);
console.log(`\n  informe -> docs/hiztegia-informe.md (${sospechosas.length} traducciones sospechosas, ${sinNada.length} sin audio ni ejemplo)`);
