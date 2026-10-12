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
- Lecciones A2: COMPLETO (10 unidades, 50 lecciones) hu+bg — 139 ficheros, 0 avisos
- Semillas del simulacro `scripts/seed_i18n/{hu,bg}.json` (check_seed_overlays ✓)
- Listas de idiomas, ui.ts (330 claves), diccionarios en línea (mas-apps, migrar, nivel, simulakroa, mintzamena)
- Jolas limitada a LOCALES_JOLAS (18): sin página hu/bg ni hreflang nuevos; contador intacto
- `aplicar` hu+bg, banco a1.{hu,bg}.json, Hiztegia {hu,bg}.json (926 entradas cada uno)
- Tests 74/74 · validate-parity ✓ · build 4503 páginas + verificar-seo OK · capturas revisadas

## Pendiente
- Desplegar SOLO con OK del usuario (push a main = producción) · borrar i18n-trabajo/ antes del merge
- Apps iOS/Android: LocaleRouter (hu/bg → su ruta) en una versión futura
- Insignias de tienda hu/bg: no hay ficheros, caen en las inglesas

## Hallazgos heredados (avisar al usuario, no arreglados aún salvo el 1)
1. ARREGLADO en esta rama: 12 títulos del temario A1 cortados en los 18 idiomas (comas sin comillas).
2. ~288 parejas de «emparejar» con el lado traducción en castellano en los 17 idiomas.
3. ~50 opciones de test en castellano sin traducir en los 17 idiomas (lista en idioma_nuevo.py).
- Heredado (todos los idiomas): en a2/10/05 x7 los pares tienen el lado eu en castellano («Unidad 06»…«Unidad 10»); debería ser euskera. No tocado (lado eu = copia de es).
4. validate-content: 14 «opciones duplicadas»/«traducciones duplicadas» en ar, de, en, fr, ko, pl, ro, ru (ninguno en hu/bg).
5. Miga de pan de la lección: «Unidad {n}» en castellano en los 20 idiomas y con el número de la LECCIÓN, no de la unidad
   ([lesson].astro:107, `sibs[0]?.data.order`). También «Nivel ·» en la página de nivel y «Unidad anterior».
