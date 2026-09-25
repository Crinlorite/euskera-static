# Plan: SEO de la web de Kaixo — hreflang, descripciones y /android/ visible

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que Google sirva a cada persona la versión de Kaixo en SU idioma (hoy el 59 % de las búsquedas en castellano aterrizan en aragonés, catalán o asturiano), que cada una de las 2.789 páginas tenga una descripción propia, y que `/android/` vuelva a ser visible para rastreadores sin JavaScript — sin abrir ninguna grieta con la Guideline 2.3.10 de Apple.

**Architecture:** Un inventario único de rutas × locales (`src/lib/alternates.ts`, derivado de las colecciones de contenido + una lista corta de páginas fijas) alimenta `RootLayout.astro`, que emite `<link rel="alternate" hreflang>` en TODAS las páginas sin tocar cada página. Un verificador sobre `dist/` (`scripts/verificar-seo.mjs`) compara lo emitido con la **realidad del build** (qué ficheros existen) y se ejecuta dentro de `npm run build`: si el hreflang miente, Cloudflare Pages no despliega. Las descripciones salen de contenido que YA existe en 18 idiomas (primer párrafo de la lección, `description` de unidad/nivel, `lead` de las herramientas) más UNA clave nueva de UI.

**Tech Stack:** Astro 4.16 (content collections, `Astro.url`, `Astro.site`), Node 22 `node:test`, Cloudflare Pages (`npm run build` → `dist`, push a `main` = deploy), Search Console API por cuenta de servicio (`scripts/gsc_linea_base.py`).

**Spec:** este documento (secciones *Evidencia* y *Decisiones*) + nota del vault `content-vault/Kaixo/20260907 SEO — por qué Google enseña Kaixo en aragonés.md`.

## Restricciones globales

- **Nada se despliega sin el OK explícito del jefe** y siempre tras enseñárselo (previsualización en tailnet, puerto 11022). Push a `main` = producción en ~2 min.
- Trabajar como usuario `crint` (worktree nuevo `/home/crint/wt-seo`, rama `seo-hreflang`). Ficheros creados por root envenenan el repo. Commits: `sudo -u crint git -c user.name="Crinlorite" -c user.email="claude@crintech.pro" commit …`, **sin** Co-Authored-By.
- `es` es el locale por defecto; **`eu` NO es un locale de UI**. Los 18 locales activos son `ACTIVE_LOCALES` de `src/i18n/config.ts`. Toda clave nueva de `ui.ts` va en los 18 bloques (el tipo `StringKey` obliga): el bloque `es` usa comillas simples, el resto dobles; insertar junto a la línea `'site.tagline'` de cada bloque (18 apariciones).
- No prometer nunca EGA/B1+ en textos nuevos: «A1 y A2 completos, más niveles en camino».
- El verificador es la fuente de verdad: **no** se marca una tarea como hecha con el verificador en rojo.
- `dist/` actual (build del 30-ago, 2.789 páginas) sirve para poner el verificador en rojo ANTES de tocar nada.

---

## Evidencia (medida el 7-sep-2026, no deducida)

| Hecho | Dato | Cómo se midió |
|---|---|---|
| No hay `hreflang` en ninguna página ni en el sitemap | 0 etiquetas en portada, lección y `sitemap-0.xml` (2.789 URLs, sin `xhtml:link`) | `curl` + grep |
| Google sirve la lengua equivocada | **59 %** de las impresiones de consultas en castellano van a páginas que no son `/es/` (91 de 154, 28 días). «pelo en euskera» → `/an/…` pos 11,5; «altzariak traducción» → `/an/…` pos 6,9 | `scripts/gsc_linea_base.py` (Search Console API) |
| Cero clics | 323 impresiones (query×página), 0 clics; posiciones 4-20: 145 impresiones, 0 clics | ídem |
| Misma descripción en todas | `Aprende euskera, gratis y para todos.` en portada, lección y unidad; en la portada además **título = descripción** | `curl` |
| `/es/android/` vacío sin JS | 0 caracteres de texto en `<main>` fuera de `<template>`; el resto de páginas SÍ tienen texto (portada: 1.228 chars) | `curl` + strip |
| `&#39;` en el título aragonés | Es el escape estándar de Astro de un apóstrofo normal del frontmatter (`d'a casa`); un solo nivel de escape → navegadores y Google lo decodifican. **No es un bug**; se verifica visualmente en la SERP y punto | fuente `src/content/lessons/an/a1/09-mi-casa/02-altzariak.md` |
| Asimetría de locales | `es` tiene 257 rutas; los demás 148-149. Las 108 extra de `es` son B1/B2/C1/EGA/C2 (niveles bajo candado). Faltan 2 traducciones: `an` sin `a2/01-egoerak/04-agintera`, `ko` sin `a2/07-bidaiak-eta-garraioa/01-garraioa` | análisis del sitemap |
| Niveles bloqueados indexables | `/es/b1/…` sin `noindex`, con prosa completa en el HTML (4.296 bytes) y en el sitemap; el candado es solo client-side (`LevelGate.svelte`) | `dist/` |
| Build de Pages | proyecto `euskera`: `npm run build` → `dist`, rama `main` | API de Cloudflare |

## Decisiones de diseño

**D1 — hreflang en el `<head>` HTML, no en el sitemap.** Google acepta un solo método. El `i18n` de `@astrojs/sitemap` mapea prefijos a ciegas y crearía alternates hacia 404 para las 108 páginas que solo existen en `es` (y las 2 lecciones sin traducir). El HTML se genera desde el inventario real y es exacto página a página. Coste: ~19 `<link>` por página (~1,8 KB, brotli lo aplasta).

**D2 — Un inventario, en un sitio.** `src/lib/alternates.ts` construye `Map<ruta, Set<locale>>` a partir de `getCollection('levels'|'units'|'lessons')` (filtrado por `ACTIVE_LOCALES`, con las rutas montadas EXACTAMENTE como sus `getStaticPaths`: `${level}/`, `${level}/${unit.data.code}/`, `${level}/${unit}/${lesson.data.code}/`) más una lista fija de páginas que existen en los 18 locales (`''`, `sobre/`, `privacidad/`, `progreso/`, `android/`, `idioma/`, `feedback/`, `expedicion/`, `a1/simulakroa/`, `a1/mintzamena/` — verificado: todas hacen `ACTIVE_LOCALES.map`, y simulakroa/mintzamena solo para `a1`). **No se refactoriza ningún `getStaticPaths`**: el verificador comprueba contra el `dist` real, así que si el inventario diverge de la realidad, el build falla. Eso es lo que impide que el inventario se pudra.

**D3 — Reglas de emisión.** Orden estable (`ACTIVE_LOCALES`); URLs absolutas con barra final (igual que la canónica); autorreferencia siempre incluida; `x-default` → `https://euskera.crintech.pro/` (la landing selectora de idioma) para el clúster de portada, y → la versión `es` para el resto de rutas (existe siempre: `es` es superconjunto). Páginas fuera del inventario (404) no emiten nada. La raíz `/` emite el clúster de portada con `x-default` apuntándose a sí misma.

**D4 — Códigos de idioma.** Se emiten tal cual (`pt-BR`, `zh-Hans` válidos). ⚠️ `ast` (asturiano) no tiene código ISO 639-1; Google puede ignorar esa etiqueta concreta. Se emite igual (Bing y otros la aceptan; una etiqueta ignorada no invalida el clúster). No hay nada que hacer.

**D5 — Descripciones desde contenido existente, sin traducir nada nuevo salvo una clave.**
| página | fuente |
|---|---|
| lección | primer párrafo de prosa del cuerpo Markdown, limpio y recortado a ≤155 caracteres; respaldo: `description` de su unidad |
| unidad | `unit.data.description` (existe, 18 locales) |
| nivel | `level.data.description` |
| portada, progreso, idioma, feedback, expedición | **nueva clave `site.description`** (×18) |
| sobre | `about.intro` |
| privacidad | `priv.intro` sin HTML |
| simulakroa, mintzamena | `c.lead` sin HTML |
| android | `beta.live.d` |
| raíz `/` | ya tiene la suya |
Regla de calidad (verificador): presente, 50-160 caracteres, sin etiquetas, distinta del título, y única entre lecciones/unidades/niveles del mismo locale.

**D6 — `/android/` sale del `<template>`.** Se comprobó que NINGÚN enlace a `/android/` es alcanzable dentro de la app: los únicos viven dentro de `<WebOnly>` (pie y portada); Header y MobileDrawer no la enlazan. Por tanto la página vuelve a HTML normal con `class="app-promo"` (segunda barrera CSS ya existente). `WebOnly` se queda **solo** para bloques dentro de páginas alcanzables desde la app (insignias). Regla escrita en el comentario del componente.

**D7 — Niveles bloqueados (B1/B2/C1/C2/EGA/expedición): `noindex,follow` + fuera del sitemap. ✅ APROBADO por el jefe el 7-sep («si no están públicas, no deberían indexarse»).** Hoy 109 páginas de contenido no validado pueden aparecer en Google y mandar a la gente a una pantalla de contraseña. Recomendación: sí. Se hace con una lista única `src/lib/locked.mjs` compartida por `gate.ts` y `astro.config.mjs`.

**D8 — SUSTITUIDA el 7-sep por la FASE 2 «Hiztegia» (ver sección al final). El mapa `lesson-eu.json` y el eyebrow ya no hacen falta: los enlaces cruzados lección ↔ hiztegia cumplen esa función sin canibalizar. (Texto original conservado como referencia:)** La palabra vasca en el título. La demanda es de diccionario («altzariak traducción», «pelo en euskera»), no de curso. 37 de 114 títulos ya llevan el término vasco entre paréntesis; 77 no. Un mapa **independiente del idioma** `src/data/lesson-eu.json` (`id → hitza`, 114 líneas, borrador automático desde los slugs, que ya son vascos: `02-altzariak` → `altzariak`) permite `<title>` = `Altzariak — Muebles y objetos de la casa · A1 · Euskera` y un *eyebrow* visible con la palabra sobre el `<h1>`. Requiere revisión humana de 114 líneas antes de desplegar. Separado de la fase 1 para no mezclar efectos.

**D9 — Medición.** Línea base guardada (7-sep). Métrica A: % de impresiones de consultas en castellano servidas con página no-`es` (59 % → objetivo < 15 % a +4 semanas). Métrica B: clics en posiciones 4-20 (0 → > 0). Se repite con el mismo script a +14 y +28 días. Google tarda semanas en releer ambos lados de cada par hreflang: **no esperar nada antes de 2-3 semanas.**

## Mapa de ficheros

- Create: `src/lib/alternates-puro.mjs` — funciones puras: `separaLocale`, `construye`, `RUTAS_FIJAS`, `SITIO` (sin dependencias de Astro → testeable con `node:test`).
- Create: `src/lib/alternates-puro.d.mts` — tipos para que `tsc --noEmit` (`npm run check`) no proteste.
- Create: `src/lib/alternates.ts` — `inventario()` (memoizado, usa `astro:content`) y `alternativasDe(pathname)`.
- Create: `src/lib/seo-texto.mjs` (+ `.d.mts`) — `sinMarcado`, `primerParrafo`, `recorta`, `descripcionDeLeccion`.
- Modify: `src/layouts/RootLayout.astro:31-51` — emitir hreflang tras la canónica; prop `noindex` (D7).
- Modify: `src/pages/[locale]/index.astro`, `sobre.astro`, `privacidad.astro`, `progreso.astro`, `idioma.astro`, `feedback/index.astro`, `expedicion/index.astro`, `android.astro`, `[level]/index.astro`, `[level]/[unit]/index.astro`, `[level]/[unit]/[lesson].astro`, `[level]/simulakroa.astro`, `[level]/mintzamena.astro` — pasar `description=`.
- Modify: `src/i18n/ui.ts` — clave `site.description` ×18 + unión `StringKey`.
- Modify: `src/pages/[locale]/android.astro:24-67` y `src/components/platform/WebOnly.astro` (comentario).
- Create: `scripts/verificar-seo.mjs` — verificador sobre `dist/`.
- Create: `tests/fixtures/rutas-2026-09-07.txt` — instantánea de las 2.789 rutas del build actual.
- Create: `tests/alternates.test.mjs`, `tests/seo-texto.test.mjs`.
- Modify: `package.json` — `"build": "astro build && node scripts/verificar-seo.mjs dist"`, `"verify:seo"`.
- (D7) Create `src/lib/locked.mjs`; Modify `src/lib/gate.ts`, `astro.config.mjs`, páginas de nivel/unidad/lección/expedición.
- (D8) Create `src/data/lesson-eu.json`, `scripts/borrador_hitzak.mjs`; Modify `[lesson].astro`.
- Ya creado (7-sep): `scripts/gsc_linea_base.py` — commitear en la Tarea 0.

---

### Tarea 0: Rama, verificador en ROJO e instantánea de rutas

**Files:** Create `scripts/verificar-seo.mjs`, `tests/fixtures/rutas-2026-09-07.txt`; Modify `package.json`; commit `scripts/gsc_linea_base.py`.

**Produces:** `node scripts/verificar-seo.mjs <dist>` → código de salida 0/1 e informe por reglas: `H1` conjunto hreflang == realidad del dist · `H2` autorreferencia · `H3` x-default correcto · `H4` hrefs absolutos con barra final y fichero existente · `H5` canónica == URL propia · `H6` 404.html sin hreflang · `D1` descripción presente · `D2` 50-160 chars · `D3` sin `<` ni `&lt;` · `D4` ≠ título · `D5` única entre lecciones/unidades/niveles del locale · `R1` ninguna ruta de la instantánea ha desaparecido.

- [ ] **Paso 1: worktree limpio como crint**
```bash
cd /home/crint/projects/euskera-static && sudo -u crint git worktree add -b seo-hreflang /home/crint/wt-seo main
cd /home/crint/wt-seo && sudo -u crint npm ci --no-audit --no-fund 2>&1 | tail -2
```
- [ ] **Paso 2: instantánea de rutas del build actual (verdad de referencia)**
```bash
cd /home/crint/projects/euskera-static && find dist -name index.html | sed 's|^dist/||;s|index.html$||' | sort > /home/crint/wt-seo/tests/fixtures/rutas-2026-09-07.txt
wc -l /home/crint/wt-seo/tests/fixtures/rutas-2026-09-07.txt   # esperado: 2789
```
- [ ] **Paso 3: escribir `scripts/verificar-seo.mjs`** (esqueleto; el marcado lo generamos nosotros, así que regex determinista basta):
```js
#!/usr/bin/env node
// Verifica en dist/ que el SEO estructural dice la VERDAD. Se ejecuta dentro de
// `npm run build`: si falla, Cloudflare Pages no despliega. Reglas H*, D*, R1 (ver plan 2026-09-07).
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
const SITIO = 'https://euskera.crintech.pro';
const dist = process.argv[2] ?? 'dist';
const LOCALES = new Set(['es','ca','gl','ast','an','oc','en','ar','fr','ro','pt-BR','de','it','ru','pl','zh-Hans','ja','ko']);
const paginas = []; // { fichero, url, locale, ruta, html }
(function anda(d) { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) anda(p); else if (n === 'index.html') paginas.push(p); } })(dist);
const verdad = new Map(); // ruta → Set(locale)
for (const f of paginas) {
  const rel = relative(dist, f).replace(/index\.html$/, '').replaceAll('\\', '/');
  const [primero, ...resto] = rel.split('/');
  const locale = LOCALES.has(primero) ? primero : null;
  const ruta = locale ? resto.join('/') : rel;
  if (locale) (verdad.get(ruta) ?? verdad.set(ruta, new Set()).get(ruta)).add(locale);
}
const fallos = new Map(); const falla = (regla, msg) => (fallos.get(regla) ?? fallos.set(regla, []).get(regla)).push(msg);
const attr = (html, re) => [...html.matchAll(re)].map((m) => m[1]);
const descsPorLocale = new Map();
for (const f of paginas) {
  const html = readFileSync(f, 'utf8');
  const rel = relative(dist, f).replace(/index\.html$/, '');
  const url = `${SITIO}/${rel}`;
  const [primero, ...resto] = rel.split('/');
  const locale = LOCALES.has(primero) ? primero : null;
  const ruta = locale ? resto.join('/') : rel;
  const links = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => ({ lang: m[1], href: m[2] }));
  const esperado = new Set([...(verdad.get(ruta) ?? [])].map((l) => `${SITIO}/${l}/${ruta}`));
  if (rel === '') { for (const l of LOCALES) esperado.add(`${SITIO}/${l}/`); }
  const emitido = new Set(links.filter((l) => l.lang !== 'x-default').map((l) => l.href));
  if (rel === '404.html' || rel.startsWith('404')) { if (links.length) falla('H6', rel); continue; }
  if (locale || rel === '') {
    if ([...esperado].some((u) => !emitido.has(u)) || [...emitido].some((u) => !esperado.has(u))) falla('H1', `${rel}: esperado ${esperado.size}, emitido ${emitido.size}`);
    if (locale && !emitido.has(url)) falla('H2', rel);
    const xd = links.filter((l) => l.lang === 'x-default');
    const xdOk = ruta === '' ? `${SITIO}/` : (verdad.get(ruta)?.has('es') ? `${SITIO}/es/${ruta}` : null);
    if ((xdOk && (xd.length !== 1 || xd[0].href !== xdOk)) || (!xdOk && xd.length)) falla('H3', `${rel}: x-default ${xd.map((x) => x.href).join(',') || '(ninguno)'}`);
    for (const l of links) { if (!l.href.startsWith(SITIO + '/') || !l.href.endsWith('/')) falla('H4', `${rel} → ${l.href}`); else if (!existsSync(join(dist, l.href.slice(SITIO.length + 1), 'index.html'))) falla('H4', `${rel} → ${l.href} no existe`); }
  }
  const canon = attr(html, /<link rel="canonical" href="([^"]+)"/g)[0];
  if (canon !== url) falla('H5', `${rel}: canonical ${canon}`);
  const desc = attr(html, /<meta name="description" content="([^"]*)"/g)[0] ?? '';
  const titulo = attr(html, /<title>([^<]*)<\/title>/g)[0] ?? '';
  if (!desc) falla('D1', rel);
  else { if (desc.length < 50 || desc.length > 160) falla('D2', `${rel}: ${desc.length} chars`);
         if (/[<>]|&lt;|&gt;/.test(desc)) falla('D3', rel);
         if (desc.trim() === titulo.replace(/ · [^·]+$/, '').trim()) falla('D4', rel); }
  const esContenido = locale && /^(a1|a2|b1|b2|c1|c2|ega)\//.test(ruta) && !/(simulakroa|mintzamena)\/$/.test(ruta);
  if (esContenido && desc) { const k = `${locale}|${desc}`; if (descsPorLocale.has(k)) falla('D5', `${rel} repite la de ${descsPorLocale.get(k)}`); else descsPorLocale.set(k, rel); }
}
const instant = 'tests/fixtures/rutas-2026-09-07.txt';
if (existsSync(instant)) { const ahora = new Set(paginas.map((f) => relative(dist, f).replace(/index\.html$/, ''))); for (const r of readFileSync(instant, 'utf8').split('\n').filter(Boolean)) if (!ahora.has(r)) falla('R1', r); }
for (const [regla, lista] of [...fallos].sort()) { console.log(`  🔴 ${regla}: ${lista.length} fallos`); for (const m of lista.slice(0, 5)) console.log(`       ${m}`); }
console.log(fallos.size ? `\n  ✗ ${paginas.length} páginas revisadas, ${[...fallos.values()].reduce((a, b) => a + b.length, 0)} fallos` : `\n  ✓ ${paginas.length} páginas: hreflang, descripciones y rutas en orden`);
process.exit(fallos.size ? 1 : 0);
```
- [ ] **Paso 4: correrlo contra el dist actual → DEBE estar en rojo** (H1/H2/H3 en 2.788 páginas, D4 en portadas, D5 masivo). Copiar el dist viejo al worktree para eso: `cp -r /home/crint/projects/euskera-static/dist /home/crint/wt-seo/dist-viejo && node scripts/verificar-seo.mjs dist-viejo` (borrar `dist-viejo` después; no commitearlo).
- [ ] **Paso 5: `package.json`**: `"build": "astro build && node scripts/verificar-seo.mjs dist"`, `"verify:seo": "node scripts/verificar-seo.mjs dist"`. `"test"` se queda como está (los tests unitarios nuevos son `tests/*.test.mjs`).
- [ ] **Paso 6: commit** «SEO: verificador de hreflang/descripciones en el build + instantánea de rutas + línea base de Search Console» (incluye `scripts/gsc_linea_base.py`).

### Tarea 1: hreflang en todas las páginas

**Files:** Create `src/lib/alternates-puro.mjs`, `src/lib/alternates-puro.d.mts`, `src/lib/alternates.ts`, `tests/alternates.test.mjs`; Modify `src/layouts/RootLayout.astro`.

**Interfaces:** `separaLocale(pathname: string) → { locale: string|null, ruta: string }` · `construye(ruta: string, locales: Iterable<string>) → { hreflang: string, href: string }[]` · `alternativasDe(pathname: string) → Promise<{hreflang, href}[]>`.

- [ ] **Paso 1: test unitario en rojo** (`tests/alternates.test.mjs`, estilo `node:test` + `assert/strict` como `tests/sw-network-timeout.test.mjs`):
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { separaLocale, construye } from '../src/lib/alternates-puro.mjs';
test('separa el locale de la ruta, con y sin locale', () => {
  assert.deepEqual(separaLocale('/an/a1/09-mi-casa/02-altzariak/'), { locale: 'an', ruta: 'a1/09-mi-casa/02-altzariak/' });
  assert.deepEqual(separaLocale('/pt-BR/'), { locale: 'pt-BR', ruta: '' });
  assert.deepEqual(separaLocale('/'), { locale: null, ruta: '' });
  assert.deepEqual(separaLocale('/404/'), { locale: null, ruta: '404/' });
});
test('clúster de portada: 18 locales + x-default a la raíz, en orden estable', () => {
  const alt = construye('', ['ko', 'es', 'an']);
  assert.deepEqual(alt.map((a) => a.hreflang), ['es', 'an', 'ko', 'x-default']);
  assert.equal(alt.at(-1).href, 'https://euskera.crintech.pro/');
});
test('ruta normal: x-default apunta a la versión es; sin es no hay x-default', () => {
  const con = construye('a1/09-mi-casa/02-altzariak/', ['es', 'an']);
  assert.equal(con.at(-1).href, 'https://euskera.crintech.pro/es/a1/09-mi-casa/02-altzariak/');
  assert.ok(con.every((a) => a.href.endsWith('/')));
  assert.equal(construye('b1/', ['es']).length, 2);                 // es + x-default
  assert.equal(construye('x/', ['fr']).some((a) => a.hreflang === 'x-default'), false);
});
test('ignora locales que no están activos', () => { assert.equal(construye('', ['es', 'eu', 'xx']).length, 2); });
```
Correr: `node --test tests/alternates.test.mjs` → FALLA (módulo inexistente).
- [ ] **Paso 2: `src/lib/alternates-puro.mjs`**
```js
// Reglas PURAS del hreflang (sin Astro) para poder probarlas con node:test.
// El orden de LOCALES es el de ACTIVE_LOCALES en src/i18n/config.ts: si cambia allí, cambiar aquí (el test D2/H1 del build lo cazaría).
export const SITIO = 'https://euskera.crintech.pro';
export const LOCALES = ['es','ca','gl','oc','ast','an','en','ar','fr','ro','pt-BR','de','it','ru','pl','zh-Hans','ja','ko'];
export const POR_DEFECTO = 'es';
// Páginas que existen en TODOS los locales activos (cada una hace ACTIVE_LOCALES.map en su getStaticPaths).
export const RUTAS_FIJAS = ['', 'sobre/', 'privacidad/', 'progreso/', 'android/', 'idioma/', 'feedback/', 'expedicion/', 'a1/simulakroa/', 'a1/mintzamena/'];
export function separaLocale(pathname) {
  const seg = pathname.replace(/^\/+/, '').split('/');
  if (LOCALES.includes(seg[0])) return { locale: seg[0], ruta: seg.slice(1).join('/') };
  return { locale: null, ruta: seg.join('/') };
}
export function construye(ruta, locales) {
  const hay = new Set(locales);
  const out = LOCALES.filter((l) => hay.has(l)).map((l) => ({ hreflang: l, href: `${SITIO}/${l}/${ruta}` }));
  if (ruta === '') out.push({ hreflang: 'x-default', href: `${SITIO}/` });
  else if (hay.has(POR_DEFECTO)) out.push({ hreflang: 'x-default', href: `${SITIO}/${POR_DEFECTO}/${ruta}` });
  return out;
}
```
⚠️ El orden de `LOCALES` debe ser el de `ACTIVE_LOCALES` (orden de declaración de `LANGUAGES`: es, ca, gl, oc, ast, an, en, ar, fr, ro, pt-BR, de, it, ru, pl, zh-Hans, ja, ko). Añadir un test que importe `LOCALES` y compare con la lista literal de `src/i18n/config.ts` leída como texto si se quiere blindar.
- [ ] **Paso 3: `.d.mts`** al lado: `export const SITIO: string; export const LOCALES: string[]; export const POR_DEFECTO: string; export const RUTAS_FIJAS: string[]; export function separaLocale(p: string): { locale: string | null; ruta: string }; export function construye(ruta: string, locales: Iterable<string>): { hreflang: string; href: string }[];`
- [ ] **Paso 4: `src/lib/alternates.ts`**
```ts
import { getCollection } from 'astro:content';
import { ACTIVE_LOCALES, type LocaleCode } from '../i18n/config';
import { RUTAS_FIJAS, construye, separaLocale } from './alternates-puro.mjs';
export type Alternativa = { hreflang: string; href: string };
let cache: Promise<Map<string, Set<LocaleCode>>> | undefined;
/** ruta (sin locale, con barra final) → locales en los que EXISTE. Se calcula una vez por build. */
export function inventario() {
  return (cache ??= (async () => {
    const m = new Map<string, Set<LocaleCode>>();
    const activos = new Set<string>(ACTIVE_LOCALES);
    const pon = (ruta: string, l: string) => { if (activos.has(l)) (m.get(ruta) ?? m.set(ruta, new Set()).get(ruta)!).add(l as LocaleCode); };
    for (const l of ACTIVE_LOCALES) for (const r of RUTAS_FIJAS) pon(r, l);
    for (const lv of await getCollection('levels')) pon(`${lv.data.code}/`, lv.id.split('/')[0]);
    for (const u of await getCollection('units')) { const [l, level] = u.id.split('/'); pon(`${level}/${u.data.code}/`, l); }
    for (const le of await getCollection('lessons')) { const [l, level, unit] = le.id.split('/'); pon(`${level}/${unit}/${le.data.code}/`, l); }
    return m;
  })());
}
export async function alternativasDe(pathname: string): Promise<Alternativa[]> {
  if (pathname === '/') return construye('', ACTIVE_LOCALES);
  const { locale, ruta } = separaLocale(pathname);
  if (!locale) return [];                                  // 404 y desconocidas: nada
  const locales = (await inventario()).get(ruta);
  return locales?.size ? construye(ruta, locales) : [];
}
```
- [ ] **Paso 5: `RootLayout.astro`** — en el frontmatter `import { alternativasDe } from '../lib/alternates';` y `const alternativas = await alternativasDe(Astro.url.pathname);`; tras `<link rel="canonical" …>`:
```astro
    {/* hreflang: le dice a Google qué versión servir en cada idioma. Sin esto (hasta el 7-sep-2026)
        el 59 % de las búsquedas en castellano aterrizaban en aragonés/catalán. El conjunto sale del
        inventario real (src/lib/alternates.ts) y scripts/verificar-seo.mjs lo coteja con dist/ en cada build. */}
    {alternativas.map((a) => <link rel="alternate" hreflang={a.hreflang} href={a.href} />)}
```
- [ ] **Paso 6: tests verdes + build + verificador**: `node --test tests/alternates.test.mjs` → OK. `sudo -u crint npm run build` → el verificador debe pasar H1-H6 (D* seguirán rojas hasta la Tarea 2: para no bloquear, ejecutar temporalmente `node scripts/verificar-seo.mjs dist` a mano y leer el informe; NO bajar reglas). Comprobar a mano: `grep -c 'hreflang' dist/an/a1/09-mi-casa/02-altzariak/index.html` → 19; `grep -c hreflang dist/es/b1/index.html` → 2; `grep -c hreflang dist/404.html` → 0; `grep hreflang dist/index.html | grep -c x-default` → 1.
- [ ] **Paso 7: `npm run check`** (astro check + tsc) limpio. **Commit** «hreflang en las 2.789 páginas desde un inventario único; x-default a la landing».

### Tarea 2: Descripciones propias

**Files:** Create `src/lib/seo-texto.mjs` (+ `.d.mts`), `tests/seo-texto.test.mjs`; Modify `src/i18n/ui.ts` y las 13 páginas listadas en el mapa.

- [ ] **Paso 1: tests en rojo** (`tests/seo-texto.test.mjs`): casos obligatorios —
  - primer párrafo real de `02-altzariak` (es) → empieza por «Cada habitación tiene su mobiliario.» y ≤155 chars;
  - cuerpo que empieza por `*Euskal Herria*での…` (énfasis con asterisco, caso real de `ja`) → es PROSA, no lista;
  - cuerpo que empieza por `## Título` y luego tabla `| a | b |` y luego prosa → devuelve la prosa;
  - `**negrita**`, `*cursiva*`, `[texto](url)`, `![alt](img)`, `<em>x</em>`, `&amp;` → texto limpio;
  - frase primera de 216 chars → recorte en límite de palabra + «…», longitud ≤155;
  - cuerpo sin prosa → devuelve el respaldo;
  - bloque de código ``` … ``` se salta.
- [ ] **Paso 2: `src/lib/seo-texto.mjs`**
```js
// Descripciones (meta description) a partir del contenido que YA existe. Sin Astro: testeable con node:test.
const LISTA = /^([-*+]|\d+[.)])\s/;           // marcador de lista = símbolo + ESPACIO (así «*Euskal Herria*…» sigue siendo prosa)
export function sinMarcado(s) {
  return s.replace(/```[\s\S]*?```/g, ' ').replace(/<[^>]+>/g, ' ').replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`~]+/g, '').replace(/^#{1,6}\s*/gm, '').replace(/^>\s?/gm, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}
export function primerParrafo(md) {
  const lineas = md.split('\n'); let enCodigo = false, parrafo = [];
  for (const cruda of lineas) {
    const l = cruda.trim();
    if (l.startsWith('```')) { enCodigo = !enCodigo; continue; }
    if (enCodigo) continue;
    if (!l) { if (parrafo.length) break; continue; }
    if (/^(#|\||>|<|import\s|:::)/.test(l) || LISTA.test(l)) { if (parrafo.length) break; continue; }
    parrafo.push(l);
  }
  return parrafo.length ? parrafo.join(' ') : null;
}
export function recorta(texto, max = 155) {
  if (texto.length <= max) return texto;
  const corte = texto.slice(0, max);
  const frase = Math.max(corte.lastIndexOf('. '), corte.lastIndexOf('! '), corte.lastIndexOf('? '));
  if (frase >= 60) return corte.slice(0, frase + 1);
  return corte.slice(0, corte.lastIndexOf(' ')).replace(/[,;:—-]+$/, '') + '…';
}
export function descripcionDeLeccion(cuerpo, respaldo) {
  const p = primerParrafo(cuerpo ?? '');
  const limpio = p ? recorta(sinMarcado(p)) : '';
  return limpio.length >= 50 ? limpio : respaldo;
}
```
- [ ] **Paso 3: clave `site.description` ×18** en `ui.ts` (unión `StringKey` + 18 bloques, junto a `site.tagline`). Borradores (el ejecutor escribe los 18 con este sentido; ≤155 chars; en cada lengua «en euskera y <esa lengua>»):
  - es: `Curso de euskera gratuito desde cero: niveles A1 y A2 completos, cada lección en euskera y castellano, con voz real, ejercicios y exámenes. Sin cuentas ni anuncios.`
  - en: `Free Basque course from scratch: complete A1 and A2 levels, every lesson in Basque and English, with real voice, exercises and exams. No accounts, no ads.`
  - ca: `Curs d'euskera gratuït des de zero: nivells A1 i A2 complets, cada lliçó en euskera i català, amb veu real, exercicis i exàmens. Sense comptes ni anuncis.`
  - gl: `Curso de éuscaro gratuíto desde cero: niveis A1 e A2 completos, cada lección en éuscaro e galego, con voz real, exercicios e exames. Sen contas nin anuncios.`
  - fr: `Cours de basque gratuit depuis zéro : niveaux A1 et A2 complets, chaque leçon en basque et en français, avec voix réelle, exercices et examens. Sans compte ni publicité.`
  - pt-BR: `Curso de basco gratuito do zero: níveis A1 e A2 completos, cada lição em basco e português, com voz real, exercícios e provas. Sem contas nem anúncios.`
  - it: `Corso di basco gratuito da zero: livelli A1 e A2 completi, ogni lezione in basco e italiano, con voce reale, esercizi ed esami. Senza account né pubblicità.`
  - de: `Kostenloser Baskischkurs von Null: komplette Niveaus A1 und A2, jede Lektion auf Baskisch und Deutsch, mit echter Stimme, Übungen und Prüfungen. Ohne Konto, ohne Werbung.`
  - oc, ast, an, ar, ro, ru, pl, zh-Hans, ja, ko: mismo sentido; las tres peninsulares con el mismo cuidado que el resto de sus bloques (están marcadas *beta* y así lo anuncia el banner).
- [ ] **Paso 4: pasar `description=`** en cada página (ver tabla D5). Lección: en `[lesson].astro`, localizar la unidad propia (ya se buscan `prevUnit`/`nextUnit` en las líneas 55-75; reutilizar `getCollection('units')` con id `${locale}/${levelCode}/${unitCode}/index` — comprobar el id real con un `console.log` puntual) y `description={descripcionDeLeccion(lesson.body, unidad?.data.description ?? t(locale, 'site.description'))}`. Portada: `title` se queda (`site.tagline`), `description={t(locale,'site.description')}`. privacidad/simulakroa/mintzamena: `sinMarcado(...)` sobre `priv.intro` / `c.lead`.
- [ ] **Paso 5: build + verificador en VERDE completo** (`sudo -u crint npm run build` termina con «✓ 2789 páginas…»). Si D2 falla por descripciones cortas (< 50) en alguna lengua CJK (chino/japonés miden pocos caracteres), bajar el mínimo **solo** para `zh-Hans`/`ja`/`ko` a 25 y documentarlo en el verificador, no quitar la regla.
- [ ] **Paso 6: muestreo humano**: imprimir 10 descripciones al azar de `es`, `an`, `ja`, `ar` (`grep -h -o '<meta name="description" content="[^"]*"' dist/{es,an,ja,ar}/a1/*/0*/index.html | shuf -n 10`) y leerlas. Que no haya restos de Markdown ni frases cortadas a mitad de palabra.
- [ ] **Paso 7: `npm run check` + commit** «Descripciones propias en las 2.789 páginas a partir del contenido existente».

### Tarea 3: `/android/` visible para rastreadores

**Files:** Modify `src/pages/[locale]/android.astro:24-67`, `src/components/platform/WebOnly.astro` (comentario).

- [ ] **Paso 1:** en `android.astro` sustituir `<WebOnly>` … `</WebOnly>` por `<div class="app-promo">` … `</div>` y quitar el import si queda sin uso.
- [ ] **Paso 2:** añadir al comentario de `WebOnly.astro`: «REGLA DE USO (7-sep-2026): WebOnly es para BLOQUES dentro de páginas alcanzables desde la app (insignias en portada y pie). Nunca para páginas enteras: un rastreador sin JavaScript las ve VACÍAS (así nos pasó con /android/ — Search Console la daba por desactualizada). Una página que no tiene ningún enlace fuera de un WebOnly no es alcanzable desde la app: le basta la clase .app-promo».
- [ ] **Paso 3: verificación**: build; `python3 -c "import re;h=open('dist/es/android/index.html').read();h=re.sub(r'<template data-solo-web>.*?</template>','',h,flags=re.S);m=re.search(r'<main[^>]*>(.*?)</main>',h,re.S);print(len(' '.join(re.sub(r'<[^>]+>',' ',m.group(1)).split())))"` → > 500. Y la barrera in-app: `grep -c 'is-native-app .app-promo' dist/es/android/index.html` → 1; `grep -o 'href="/es/android/"' dist/es/index.html dist/es/a1/index.html | wc -l` → 0 fuera de templates (comprobar que las apariciones están dentro de `<template data-solo-web>`).
- [ ] **Paso 4: commit** «/android/ vuelve a ser HTML normal: WebOnly solo para bloques, nunca páginas».

### Tarea 4 (APROBADA — D7): niveles bloqueados fuera del índice

**Files:** Create `src/lib/locked.mjs` (+ `.d.mts`); Modify `src/lib/gate.ts` (importa la lista de ahí), `astro.config.mjs` (`sitemap({ filter: (url) => !BLOQUEADA.test(new URL(url).pathname) })` con `BLOQUEADA = /^\/[a-zA-Z-]+\/(b1|b2|c1|c2|ega|expedicion)\//`), `RootLayout.astro` (prop `noindex?: boolean` → `<meta name="robots" content="noindex,follow">`), páginas `[level]/index.astro`, `[level]/[unit]/index.astro`, `[lesson].astro`, `expedicion/index.astro` (pasan `noindex={LOCKED_PATHS.includes(levelCode)}` / `noindex`).

- [ ] Añadir al verificador la regla `N1`: toda página cuya ruta empiece por un segmento bloqueado lleva el meta robots, y ninguna otra; y `N2`: `dist/sitemap-0.xml` no contiene esas URLs (y sí contiene `/es/a1/`).
- [ ] Build verde → commit «B1-C2/EGA y expedición: noindex + fuera del sitemap hasta que se validen».
- [ ] ⚠️ Efecto colateral deseado: esas URLs irán desapareciendo de Google en semanas. Si el jefe las quiere indexadas cuando se desbloqueen, basta quitar el segmento de `locked.mjs`.

### Tarea 5 — RETIRADA (sustituida por la Fase 2 «Hiztegia», plan aparte). Se conserva solo como referencia; NO ejecutar

**Files:** Create `src/data/lesson-eu.json`, `scripts/borrador_hitzak.mjs`, `tests/titulo-leccion.test.mjs`; Modify `[lesson].astro`, `src/lib/seo-texto.mjs` (`tituloConHitza`).

- [ ] **Paso 1:** `scripts/borrador_hitzak.mjs` genera el borrador: para cada lección `es`, `hitza` = slug sin el número (`02-ile-eta-begiak` → `ile eta begiak`), y marca `revisar: true` si esa cadena NO aparece (sin distinguir mayúsculas) en el cuerpo `es` de la lección. Salida `src/data/lesson-eu.json`: `{ "a1-home-2": { "hitza": "altzariak" }, … }`.
- [ ] **Paso 2:** **el jefe revisa** las marcadas `revisar` (y de paso el resto). Nada se despliega sin esa revisión: son términos en euskera y aquí no se inventa nada.
- [ ] **Paso 3:** `tituloConHitza({ title, hitza })`: si `title` ya contiene `hitza` (insensible a mayúsculas) → `title`; si no → `${Hitza} — ${title}`. Test: «Pelo y ojos (ile eta begiak)» no se duplica; «Muebles y objetos de la casa» → «Altzariak — Muebles y objetos de la casa»; título resultante ≤ 70 chars (si excede, no se antepone).
- [ ] **Paso 4:** `[lesson].astro`: `title={tituloConHitza(...)}` (RootLayout añade ` · Euskera`), y un `<p class="eyebrow">` con la hitza sobre el `<h1>` (mismo estilo que los eyebrows existentes; el `<h1>` NO cambia).
- [ ] **Paso 5:** build verde, muestreo visual de 5 lecciones en la previsualización, commit «Lecciones: la palabra vasca que la gente busca, en el título».

### Tarea 6: Previsualizar, desplegar, verificar en vivo, medir

- [ ] **Previsualización** (regla de la casa): `cd /home/crint/wt-seo && sudo -u crint npx --yes wrangler pages dev dist --ip 100.80.17.14 --port 11022` dentro de tmux `kaixo-preview` (recordar `-t "=kaixo-preview"`). Enseñar al jefe: `http://100.80.17.14:11022/es/a1/09-mi-casa/02-altzariak/` (ver código fuente: 19 hreflang + descripción) y `/es/android/`. Esperar su OK.
- [ ] **Merge y push** (solo con OK): `sudo -u crint git checkout main && sudo -u crint git merge --ff-only seo-hreflang && sudo -u crint git push origin main`. Pages construye con el verificador dentro: si falla, no despliega (mirar el log del deploy por la API si tarda > 4 min).
- [ ] **Verificación en vivo** (usar `--resolve euskera.crintech.pro:443:104.21.33.227` si toca ventana de bloqueos de LaLiga):
  `curl -s https://euskera.crintech.pro/an/a1/09-mi-casa/02-altzariak/ | grep -c hreflang` → 19 · `…/es/ | grep -o 'x-default[^>]*'` → raíz · `…/es/android/` texto sin JS > 500 · descripciones distintas en 3 páginas.
- [ ] **Search Console**: nada que «enviar» (URLs iguales). Opcional: volver a enviar el sitemap desde la API para acelerar el recrawl. Crear tarjeta en el tablón: «SEO Kaixo: medir con `scripts/gsc_linea_base.py` el 21-sep y el 5-oct; métrica A < 15 %, métrica B > 0».
- [ ] **Hub**: nota fechada en `content-vault/Kaixo/` con lo desplegado y la línea base; `cd /home/crint/projects/crintech-hub && python3 build.py`.

## Hallazgos colaterales (NO tocar en este plan; van al tablón)

1. **`/es/c2/` es un nivel sin unidades**: las 5 unidades y 23 lecciones de EGA declaran `level: ega` y viven en `/es/ega/…`, pero no existe página de nivel `/es/ega/` y `/es/c2/` no las lista → contenido huérfano (bajo candado, por eso nadie lo vio).
2. **2 lecciones sin traducir**: `an` → `a2/01-egoerak/04-agintera`; `ko` → `a2/07-bidaiak-eta-garraioa/01-garraioa`. Comprobar que `LessonNav` no enlaza a un 404 desde las vecinas.
3. `expedicion/index.astro` tiene el título sin traducir («Aitonaren Hitzak — Modo Expedición») en los 18 locales.
4. `kaixo-promo/` (generador de vídeo reconstruido) sigue sin git.
5. La rama `plus` añade `/plus/`: al mergearla habrá que añadirla a `RUTAS_FIJAS` (el verificador lo exigirá: H1 fallará hasta entonces — es la red de seguridad funcionando).

## Riesgos y trampas conocidas

- Google tarda **semanas**: necesita releer las dos páginas de cada par. No juzgar antes del 21-sep; veredicto el 5-oct.
- Si a las 6 semanas Google sigue eligiendo `an` para consultas en castellano, es que agrupa las versiones como duplicados y elige canónica por su cuenta; entonces el siguiente paso es diferenciar más los textos (títulos con la lengua explícita), no tocar el hreflang.
- `ast` puede ser ignorado por Google (sin ISO 639-1). Inofensivo.
- Los `.mjs` importados desde `.ts`/`.astro`: si `npm run check` protesta por tipos, el `.d.mts` al lado lo resuelve; no activar `allowJs` global.
- No commitear `dist/`, `dist-viejo/` ni `.wrangler/`.
- Los ficheros creados por root envenenan git: todo como `crint`.
- El verificador dentro de `npm run build` alarga el build unos segundos; si Pages fallara por tiempo (no debería: 2.789 ficheros pequeños), mover la verificación a un paso previo local y documentarlo.

## Decisiones del jefe (7-sep-2026)

1. **D7 `noindex` para B1-C2/EGA/expedición: SÍ.** «Están bajo candado; si no están públicas no deberían indexarse.»
2. **Fase 2: no «la palabra en el título», sino un Hiztegia por palabra con ejemplos de uso, en beta**, guiado por lo que la gente busca. «No podemos ser un traductor, pero sí ofrecer respuestas y absorber visitas… no un diccionario sin más, sino ejemplos de cómo se usa.» Planteamiento abajo; **pendiente su OK al planteamiento concreto** antes de ejecutar.
3. **Todo pasa por tailnet antes de desplegar**, «para ver si rompemos algo». Fases 1-4 juntas en el primer despliegue; la Fase 2 en rama y despliegue aparte.

---

## FASE 2 — «Hiztegia» (beta): respuestas por palabra, con contexto real

**Idea:** la gente no busca «curso de euskera»; busca «pelo en euskera», «altzariak traducción», «hitzordua significado». Hoy esa demanda cae en una lección larga en aragonés. Una página por palabra que responda en dos líneas —traducción, pronunciación con voz real, **cómo se usa** con frases del propio curso— y que lleve a la lección donde se aprende de verdad. No es un traductor: **solo contesta lo que el curso ya enseña**, y lo dice («beta»).

**Lo que ya existe (medido el 7-sep, `es` A1+A2):**
| dato | cifra |
|---|---|
| pares euskera ↔ traducción en tablas y ejercicios | 1.670 filas + 2.147 pares → **2.605 palabras/expresiones únicas** |
| tras filtrar ruido (paréntesis, dígitos, > 3 palabras, filas de gramática) | **1.645 candidatas** |
| con **audio propio** (voz real, `audio-eu.json`, 1.672 mp3) | **1.310** |
| con al menos **un ejemplo de uso real** ya escrito (frase grabada que la contiene: 403 · enunciado de ejercicio: 335 · expresión de tabla: 258 · prosa de la lección: 165) | **673 (40 %)** |
| en ≥ 2 lecciones | 263 |
| pasan el umbral «audio o ejemplo o ≥ 2 lecciones» | **1.392** |
| unidades A1+A2 con vocabulario (mediana 87 palabras/unidad) | 23 de 23 |
| tablas traducidas en los 18 locales (verificado fr/ja/ar/an) | sí |
| coste de build medido en Pages | 47 ms/página (130 s las 2.789 actuales) |

**Reglas innegociables:**
- **Ninguna frase inventada.** Cada ejemplo lleva `origen` (fichero y línea del repo). Si una palabra no tiene ejemplo en el curso, la entrada lo dice y no lo simula. Los ejemplos NUEVOS que pida la demanda entran por el **mismo pipeline de validación que las lecciones**, nunca directos.
- **Beta visible**: badge «Hiztegia · beta» en cada página + enlace al formulario de feedback con la palabra prefijada (`/es/feedback/?hitza=…`). El feedback ya tiene Turnstile.
- **Umbral anti-página-vacía**: solo se genera entrada si tiene traducción Y (audio O ejemplo O ≥ 2 lecciones). El resto solo aparece en las páginas de tema.
- Indexable desde el día 1 (el objetivo es absorber visitas); «beta» es una etiqueta de UX, no un `noindex`.

**Alcance v1 (`es` primero, porque TODA la demanda medida es en castellano y porque el build no da para más):**
- `/es/hiztegia/` — índice A-Z (por palabra vasca) y por tema.
- `/{locale}/hiztegia/gaiak/{unidad}/` — 23 temas × 18 locales = 414 páginas ricas (todo el vocabulario de la unidad, con audio). `gaiak` no es una palabra del vocabulario (comprobado), así que no colisiona con las entradas.
- `/es/hiztegia/{hitza}/` — ~1.392 entradas. Slug = palabra en minúsculas sin diacríticos; las 32 colisiones detectadas son mayúscula/minúscula (`Ni`/`ni`) → se fusionan.
- Coste: ≈ +1.830 páginas ≈ **+85 s de build** (total ≈ 3,5 min; el límite de Pages son 20). **Las entradas en los 18 locales NO caben en Pages** (≈ +37 min): si la v1 funciona, la salida es construir en lynx y publicar `dist` con `wrangler pages deploy` (sin límite), o extender solo a `ca`/`gl`/`en`.

**Anatomía de una entrada** (`/es/hiztegia/altzariak/`):
1. `h1` **altzariak** · traducción(es) con la lección de la que salen (si dos lecciones dan sentidos distintos, se listan ambos con su fuente).
2. ▶ audio (si existe).
3. **Cómo se usa** — hasta 3 frases reales (prioridad: grabadas con voz > ejercicio > tabla > prosa), cada una con enlace a su lección y audio si lo hay.
4. **Apréndela en contexto** → lección y unidad (el embudo al curso y a la app).
5. **De la misma lección** — 6-8 palabras enlazadas (malla interna).
6. Badge beta + «¿Está mal? Dínoslo» · insignias de la app (dentro de `WebOnly`).
- `<title>`: `Altzariak — muebles en euskera · Hiztegia · Euskera` (sirve a la vez «altzariak traducción» y «muebles en euskera»). Descripción templada ≤ 155 (mini-helper `tf(locale, clave, {vars})`, 4 claves nuevas ×18).
- Cada lección gana al final un bloque «Hiztegia de esta lección» (enlaces a sus entradas): la malla en los dos sentidos.

**Datos y trazabilidad:** `scripts/extraer_hiztegia.mjs` (determinista) → `src/data/hiztegia/{locale}.json` **commiteado** (el diff es la revisión) + `docs/hiztegia-informe.md` con lo dudoso (traducciones múltiples contradictorias, entradas sin audio ni ejemplo, filas sospechosas de gramática). Fuentes: tablas cuya cabecera empiece por el nombre del idioma vasco en ese locale (`site.name` o «Euskara»), `flashcards.cards`, `match-pairs.pairs` (el campo se llama `es` pero contiene la lengua del locale; verificado), `fill-in-blank` con el hueco relleno, `audio-eu.json`.

**Encaje con la Fase 1:** las rutas nuevas entran en el inventario de hreflang desde la MISMA función que alimenta sus `getStaticPaths` (entradas: solo `es` → autorreferencia + x-default; temas: clúster de 18). El verificador suma reglas `V1` (toda entrada con traducción), `V2` (toda entrada cumple el umbral), `V3` (todo ejemplo con `origen` existente en el repo), `V4` (slugs únicos).

**Estudiar lo que buscan → decidir qué añadir:** `scripts/gsc_linea_base.py --palabras`: de cada consulta extrae la palabra («X en euskera», «cómo se dice X en euskera», «X traducción|significado», «X euskera») y la cruza con el índice → informe mensual de **cubiertas / sin cubrir / cubiertas sin ejemplo**. Lo sin cubrir es la cola de contenido, por orden de impresiones. Tarjeta mensual en el tablón. **Este bucle es la parte que de verdad hace crecer la cosa; el diccionario es solo la primera respuesta.**

**Medición específica:** clics e impresiones en páginas `/hiztegia/` (hoy 0: no existen); % de consultas-palabra que aterrizan en `/es/`; veredicto a 6-8 semanas del despliegue.

**Riesgos y cómo se cierran:** páginas delgadas → umbral + ejemplos + audio + malla; canibalización lección/entrada → intenciones distintas y enlaces cruzados; homónimos → una entrada, varias acepciones con fuente; una traducción errónea → ya estaba en la lección, y ahora el feedback por palabra la saca a la luz; build → medido, cabe.

**Qué necesita del jefe:** OK a este planteamiento y a los nombres `hiztegia` / `gaiak`; 20-30 min revisando `docs/hiztegia-informe.md` antes del despliegue; y la previsualización en tailnet como siempre.

**Secuencia:** Fase 1 (Tareas 0-4 y 6) → tailnet → despliegue → **rama aparte `hiztegia`** con su propio plan de tareas (se escribe cuando el jefe dé el OK a este planteamiento) → tailnet → despliegue. Esfuerzo estimado de la Fase 2: 2-3 días de trabajo, no dos meses: el 90 % del contenido ya está escrito.
