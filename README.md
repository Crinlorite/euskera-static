# Euskera Static

Curso de euskera gratuito y abierto: **A1 y A2 completos**, con la parte vehicular disponible en **18 idiomas**. Sin login, sin anuncios, sin paywalls, sin cookies de terceros. 100 % estático.

**Web:** [euskera.crintech.pro](https://euskera.crintech.pro) · web hermana de la app **Kaixo** ([App Store](https://apps.apple.com/app/id6784369966))

## Qué hay dentro

- **Cursos A1 (13 unidades) y A2 (10 unidades)** — lecciones con el euskera siempre delante y la explicación en tu idioma al lado.
- **Vocabulario con audio**: 1.672 locuciones en flashcards, juegos de parejas y exámenes.
- **Simulakro sortzailea**: generador de exámenes A1 infinitos sobre un banco de 262 preguntas, 823 tarjetas, 6 lecturas y 6 piezas de escucha. Cada examen sale de una semilla compartible por URL (`?s=`), con estructura fija de examen real: entzumena, irakurmena, gramatika, hiztegia e idazmena con corrección automática.
- **Ahoskera-gimnasioa (beta)**: gimnasio de pronunciación con reconocimiento de voz que corre **íntegro en tu navegador** — el audio nunca sale del dispositivo, no hay servidor.
- **Escalera oficial de niveles** A1 → C2 (HABE/EGA) y seguimiento de progreso (lecciones, racha, récord) guardado en tu dispositivo.

## Los 18 idiomas

El euskera que se enseña es **idéntico en todos los idiomas**; lo que cambia es la lengua vehicular (explicaciones, enunciados, interfaz). Castellano, inglés, francés, alemán, italiano, portugués, catalán, gallego, neerlandés, polaco, ucraniano, ruso, árabe (RTL), chino, japonés, coreano, hindi y turco.

La paridad no es una promesa: `npm run validate:parity` comprueba estructura, ejercicios y lados en euskera de cada locale contra el original (≈1.900 comprobaciones).

## Stack

- [Astro](https://astro.build) + islas [Svelte](https://svelte.dev) — ~2.700 páginas estáticas generadas.
- Sin backend: los ejercicios, el generador de exámenes y el progreso viven en el cliente.
- Deploy en Cloudflare Pages: `push` a `main` publica.

## Desarrollo

```sh
npm install
npm run dev
```

Build: `npm run build` → `dist/`. Type-check: `npm run check`. Paridad i18n: `npm run validate:parity`.

El contenido vive en `src/content/{lessons,units,levels}/<locale>/<nivel>/` y el banco de exámenes se regenera con `scripts/build_bank.py`.

## Licencias

- **Código** (`src/`, `scripts/`, configs): [MIT](LICENSE)
- **Contenido** (`src/content/`, lecciones y currículum): [CC BY-SA 4.0](LICENSE-CONTENT)
- **Assets propios** (lauburu SVG, OG image, favicons): CC0

## Contribuir

PRs bienvenidas, especialmente correcciones de contenido y mejoras de traducción. Abre un issue para hablar de cambios grandes antes de implementarlos.
