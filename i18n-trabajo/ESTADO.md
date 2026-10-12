# Húngaro (hu) y búlgaro (bg) — trabajo en curso (rama `idiomas-hu-bg`)

Traducción A MANO por la sesión Kaixo (el usuario pidió expresamente: nada de Gemini, inline).

## Flujo
1. `python3 scripts/idioma_nuevo.py extraer` → plantillas `i18n-trabajo/es/**.txt` (formato `@@ clave`).
   Lo que es euskera (idéntico en en/de/pl/ru) NO sale en la plantilla: se copia solo al montar.
2. Traducir a `i18n-trabajo/{hu,bg}/<misma ruta>.txt`, mismas claves. Cuerpo: conservar markdown,
   negritas/cursivas en euskera, tablas, `___`, `→`. Cabecera de tabla «Castellano» → «Magyar» / «Български»;
   «Euskera» se queda. Referencias al castellano (ser/estar…) se adaptan; si el validador pide un
   fragmento castellano que se quitó a propósito, se lista en `@@ _ok` al final del fichero.
3. `python3 scripts/idioma_nuevo.py validar <loc> [prefijo]` → 0 avisos antes de commitear.
4. Al final: `aplicar <loc>` escribe `src/content/{lessons,units,levels}/<loc>/`.

## Hecho
- UI (`ui/ui.txt`, 330 claves) hu+bg · niveles A1/A2 + 23 unidades hu+bg
- Lecciones A1: COMPLETO (13 unidades, 65 lecciones) hu+bg

## Pendiente
- Lecciones A2 08-10 (hu+bg) — 01 a 07 hechas
- `scripts/seed_i18n/{hu,bg}.json` (banco de simulacros; plantilla = es.json)
- Diccionarios en línea: mas-apps.mjs, migrar.astro, [level]/index.astro, simulakroa.astro, mintzamena.astro
  (Jolas: EXCLUIR hu/bg hasta que acabe la medición, la página está congelada)
- Listas de idiomas: config.ts, alternates-puro.mjs, store-badges.ts, appstore.ts, interes.mjs,
  extraer_hiztegia.mjs (+EUSKERA/ETIQUETAS_TR), build_bank.py, verificar-seo.mjs, tests
- ui.ts: añadir `'hu': {}, 'bg': {}` y fusionar con scripts/merge-ui.mjs (ui-tmp/<loc>.json)
- Regenerar banco y Hiztegia, validate-parity, build, preview; desplegar SOLO con OK del usuario
- Apps iOS/Android: LocaleRouter (hu/bg → su ruta) en una versión futura

## Hallazgos heredados (avisar al usuario, no arreglados aún salvo el 1)
1. ARREGLADO en esta rama: 12 títulos del temario A1 cortados en los 18 idiomas (comas sin comillas).
2. ~288 parejas de «emparejar» con el lado traducción en castellano en los 17 idiomas.
3. ~50 opciones de test en castellano sin traducir en los 17 idiomas (lista en idioma_nuevo.py).
