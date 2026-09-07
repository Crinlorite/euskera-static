#!/usr/bin/env node
/**
 * Verifica sobre `dist/` que el SEO estructural dice la VERDAD.
 *
 * POR QUE EXISTE: hasta el 7-sep-2026 la web no emitia ni un solo `hreflang`,
 * y Google servia el 59 % de las busquedas en castellano con paginas en
 * aragones o catalan. El arreglo es facil; lo dificil es que SIGA siendo cierto
 * cuando alguien anada una pagina, un idioma o un nivel dentro de seis meses.
 *
 * Por eso esto no comprueba el codigo: comprueba el RESULTADO contra la
 * realidad del propio build (que ficheros existen de verdad en dist/). Si el
 * hreflang promete una traduccion que no existe, o una pagina se queda sin
 * descripcion, el build falla y Cloudflare Pages no despliega. Es la unica
 * forma de que el inventario no se pudra.
 *
 * Uso: node scripts/verificar-seo.mjs [dist]
 * Salida: 0 todo en orden, 1 hay fallos (informe agrupado por regla).
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
// El minimo sale del mismo sitio que lo usan las paginas: una copia aqui se
// desincronizaria en cuanto alguien anadiese un idioma sin espacios.
import { minimoDescripcion } from '../src/lib/seo-texto.mjs';
import { estaBloqueada } from '../src/lib/locked.mjs';

const SITIO = 'https://euskera.crintech.pro';
const DIST = process.argv[2] ?? 'dist';

// Mismo orden que ACTIVE_LOCALES en src/i18n/config.ts.
const LOCALES = ['es', 'ca', 'gl', 'oc', 'ast', 'an', 'en', 'ar', 'fr', 'ro',
                 'pt-BR', 'de', 'it', 'ru', 'pl', 'zh-Hans', 'ja', 'ko'];
const ES_LOCALE = new Set(LOCALES);
const MAX_DESC = 160;
const NIVELES = /^(a1|a2|b1|b2|c1|c2|ega)\//;

const paginas = [];
(function anda(dir) {
  for (const nombre of readdirSync(dir)) {
    const p = join(dir, nombre);
    if (statSync(p).isDirectory()) anda(p);
    else if (nombre.endsWith('.html')) paginas.push(p);
  }
})(DIST);

/** Ruta publica de un fichero del build: `dist/es/a1/index.html` -> `es/a1/`. */
const rutaDe = (fichero) =>
  relative(DIST, fichero).replaceAll('\\', '/').replace(/index\.html$/, '');

const parte = (rel) => {
  const seg = rel.split('/');
  return ES_LOCALE.has(seg[0])
    ? { locale: seg[0], ruta: seg.slice(1).join('/') }
    : { locale: null, ruta: rel };
};

// La VERDAD: que rutas existen en que idiomas, leida del propio build.
const verdad = new Map();
for (const f of paginas) {
  const { locale, ruta } = parte(rutaDe(f));
  if (!locale) continue;
  if (!verdad.has(ruta)) verdad.set(ruta, new Set());
  verdad.get(ruta).add(locale);
}

const fallos = new Map();
const falla = (regla, msg) => {
  if (!fallos.has(regla)) fallos.set(regla, []);
  fallos.get(regla).push(msg);
};

const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
// Astro escapa las comillas de los atributos como &#34;: si no se decodifican,
// una descripcion parece 5 caracteres mas larga por cada comilla y D2 miente.
const decodifica = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&(\w+);/g, (t, e) => ENTIDADES[e] ?? t);
const uno = (html, re) => { const m = html.match(re); return m ? m[1] : null; };

const vistas = new Map();   // descripcion -> primera pagina que la uso (por locale)

for (const f of paginas) {
  const rel = rutaDe(f);
  const html = readFileSync(f, 'utf8');
  const { locale, ruta } = parte(rel);
  const url = `${SITIO}/${rel}`;

  const enlaces = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"\s*\/?>/g)]
    .map((m) => ({ lang: m[1], href: m[2] }));

  // 404: no forma parte de ningun cluster de idiomas.
  if (rel.endsWith('404.html')) {
    if (enlaces.length) falla('H6', `${rel} emite ${enlaces.length} hreflang y no deberia`);
    continue;
  }

  const esRaiz = rel === '';
  if (locale || esRaiz) {
    const clave = esRaiz ? '' : ruta;
    const localesDe = verdad.get(clave) ?? new Set();
    const esperado = new Set([...localesDe].map((l) => `${SITIO}/${l}/${clave}`));
    const emitido = new Set(enlaces.filter((e) => e.lang !== 'x-default').map((e) => e.href));

    const faltan = [...esperado].filter((u) => !emitido.has(u));
    const sobran = [...emitido].filter((u) => !esperado.has(u));
    if (faltan.length || sobran.length) {
      falla('H1', `${rel}: esperados ${esperado.size}, emitidos ${emitido.size}` +
        (faltan.length ? ` - faltan ${faltan.length} (p.ej. ${faltan[0]})` : '') +
        (sobran.length ? ` - sobran ${sobran.length} (p.ej. ${sobran[0]})` : ''));
    }
    if (locale && !emitido.has(url)) falla('H2', `${rel} no se autorreferencia`);

    // x-default: la landing selectora para el cluster de portada; la version es
    // para el resto (es es superconjunto: si una ruta existe, existe en es).
    const xd = enlaces.filter((e) => e.lang === 'x-default');
    const esperadoXd = clave === '' ? `${SITIO}/`
      : localesDe.has('es') ? `${SITIO}/es/${clave}` : null;
    if (esperadoXd) {
      if (xd.length !== 1 || xd[0].href !== esperadoXd) {
        falla('H3', `${rel}: x-default ${xd.map((x) => x.href).join(', ') || '(ninguno)'} != ${esperadoXd}`);
      }
    } else if (xd.length) {
      falla('H3', `${rel}: x-default ${xd[0].href} en una ruta sin version es`);
    }

    for (const e of enlaces) {
      if (!e.href.startsWith(`${SITIO}/`) || !e.href.endsWith('/')) {
        falla('H4', `${rel} -> ${e.href} (absoluta con barra final)`);
      } else if (!existsSync(join(DIST, e.href.slice(SITIO.length + 1), 'index.html'))) {
        falla('H4', `${rel} -> ${e.href} NO EXISTE en el build`);
      }
    }
  } else if (enlaces.length) {
    falla('H1', `${rel}: pagina fuera de todo cluster emitiendo ${enlaces.length} hreflang`);
  }

  // A1: la pagina de Android promociona Google Play. Dentro de la app de iOS no
  // puede verse (Guideline 2.3.10 de Apple), y la unica barrera es una regla CSS
  // que DEBE viajar en el propio HTML: si viviera solo en la hoja externa y esa
  // no cargara, la pagina se pintaria y seria motivo de rechazo.
  if (/^[\w-]+\/android\/$/.test(rel)) {
    if (!/\.is-native-app\s+\.app-promo\s*\{[^}]*display:\s*none/.test(html)) {
      falla('A1', `${rel} no lleva la barrera 2.3.10 inline`);
    }
    if (!/class="[^"]*app-promo/.test(html)) falla('A1', `${rel} sin la clase app-promo`);
    const sinTpl = html.replace(/<template data-solo-web>[\s\S]*?<\/template>/g, '');
    const cuerpo = sinTpl.match(/<main[^>]*>([\s\S]*?)<\/main>/);
    const texto = cuerpo ? cuerpo[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
    if (texto.length < 500) falla('A1', `${rel} solo ${texto.length} caracteres visibles sin JavaScript`);
  }

  // N1: lo que esta detras del candado no se ofrece a Google, y lo que no lo
  // esta tampoco se esconde por accidente.
  const bloqueada = estaBloqueada(rel);
  const tieneNoindex = /<meta name="robots" content="noindex/.test(html);
  if (bloqueada && !tieneNoindex) falla('N1', `${rel} esta bajo candado y NO lleva noindex`);
  if (!bloqueada && tieneNoindex) falla('N1', `${rel} lleva noindex y no deberia`);

  // V1/V2: el Hiztegia esta en beta y se indexa desde el dia uno, asi que
  // ninguna de sus paginas puede ser un cascaron: entrada sin traduccion o tema
  // sin palabras darian exactamente las paginas delgadas que Google castiga.
  if (/^[\w-]+\/hiztegia\/[^/]+\/$/.test(rel) && !rel.includes('/gaiak/')) {
    if (!/class="principal"/.test(html)) falla('V1', `${rel} sin traduccion visible`);
    const tieneAlgo = /class="ejemplos"/.test(html) || /class="lista-lecciones"/.test(html)
      || /class="oir grande"/.test(html);
    if (!tieneAlgo) falla('V2', `${rel} no ofrece nada: ni ejemplo, ni leccion, ni audio`);
    if (!/class="badge-beta"/.test(html)) falla('V2', `${rel} sin el aviso de beta`);
  }
  if (/\/hiztegia\/gaiak\/[^/]+\/$/.test(rel)) {
    const filas = (html.match(/<tr[\s>]/g) ?? []).length;
    if (filas < 4) falla('V2', `${rel}: solo ${filas} filas de vocabulario`);
    if (!/class="badge-beta"/.test(html)) falla('V2', `${rel} sin el aviso de beta`);
  }

  const canonica = uno(html, /<link rel="canonical" href="([^"]+)"/);
  if (canonica !== url) falla('H5', `${rel}: canonica ${canonica ?? '(ninguna)'} != ${url}`);

  const desc = decodifica(uno(html, /<meta name="description" content="([^"]*)"/) ?? '');
  const titulo = decodifica(uno(html, /<title>([^<]*)<\/title>/) ?? '');
  if (!desc) {
    falla('D1', `${rel} sin descripcion`);
  } else {
    const min = minimoDescripcion(locale);
    if (desc.length < min || desc.length > MAX_DESC) {
      falla('D2', `${rel}: ${desc.length} caracteres (permitido ${min}-${MAX_DESC})`);
    }
    if (/[<>]/.test(desc)) falla('D3', `${rel}: la descripcion lleva marcado`);
    // El layout anade " . Euskera" al titulo; se quita para comparar.
    if (desc.trim() === titulo.replace(/\s·\s[^·]+$/, '').trim()) {
      falla('D4', `${rel}: descripcion identica al titulo`);
    }
    const esContenido = locale && NIVELES.test(ruta) && !/(simulakroa|mintzamena)\/$/.test(ruta);
    if (esContenido) {
      const k = `${locale} ${desc}`;
      if (vistas.has(k)) falla('D5', `${rel} repite la descripcion de ${vistas.get(k)}`);
      else vistas.set(k, rel);
    }
  }
}

// R1: ninguna ruta que existia el 7-sep-2026 puede desaparecer sin querer.
const instantanea = 'tests/fixtures/rutas-2026-09-07.txt';
if (existsSync(instantanea)) {
  const ahora = new Set(paginas.map(rutaDe));
  for (const r of readFileSync(instantanea, 'utf8').split('\n').filter(Boolean)) {
    if (!ahora.has(r)) falla('R1', `${r} ha desaparecido del build`);
  }
}

// N2: y tampoco se anuncian en el sitemap.
const mapa = join(DIST, 'sitemap-0.xml');
if (existsSync(mapa)) {
  const xml = readFileSync(mapa, 'utf8');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  for (const u of urls) {
    const ruta = u.replace(`${SITIO}/`, '');
    if (estaBloqueada(ruta)) falla('N2', `${ruta} sigue anunciada en el sitemap`);
  }
  if (!urls.includes(`${SITIO}/es/a1/`)) falla('N2', 'el sitemap ha perdido /es/a1/');
  console.log(`  sitemap: ${urls.length} URLs`);
}

const REGLAS = {
  H1: 'el conjunto de hreflang coincide con las traducciones que existen',
  H2: 'cada pagina se autorreferencia en su hreflang',
  H3: 'x-default correcto',
  H4: 'los hreflang son absolutos, con barra final y apuntan a algo que existe',
  H5: 'la canonica es la propia URL',
  H6: 'el 404 no emite hreflang',
  D1: 'toda pagina tiene descripcion',
  D2: 'la descripcion mide lo que debe',
  D3: 'la descripcion no lleva marcado',
  D4: 'la descripcion no es el titulo',
  D5: 'las paginas de contenido no repiten descripcion dentro de su idioma',
  R1: 'no ha desaparecido ninguna ruta',
  N1: 'las paginas bajo candado llevan noindex, y solo ellas',
  N2: 'el sitemap no anuncia lo que esta bajo candado',
  V1: 'toda entrada del hiztegia trae su traduccion',
  V2: 'ninguna pagina del hiztegia es un cascaron, y todas avisan de que estan en beta',
  A1: 'la pagina de Android es legible sin JavaScript y conserva su barrera 2.3.10',
};

let total = 0;
for (const regla of Object.keys(REGLAS)) {
  const lista = fallos.get(regla);
  if (!lista) continue;
  total += lista.length;
  console.log(`  [${regla}] ${REGLAS[regla]}: ${lista.length} fallo(s)`);
  for (const m of lista.slice(0, 4)) console.log(`       ${m}`);
  if (lista.length > 4) console.log(`       ... y ${lista.length - 4} mas`);
}
console.log(total
  ? `\n  FALLA: ${paginas.length} paginas revisadas, ${total} fallos`
  : `\n  OK: ${paginas.length} paginas con hreflang, descripciones y rutas en orden`);
process.exit(total ? 1 : 0);
