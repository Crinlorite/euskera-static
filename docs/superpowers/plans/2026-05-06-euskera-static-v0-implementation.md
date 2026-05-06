# Euskera Static v0.0 Foundation Ship — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship v0.0 of euskera.crintech.pro — Astro static site with locale-aware shell, content collections (level → unit → lesson), 4 working exercise types, memory-card export/import, lauburu-themed hero, manifest-only PWA, and 2 fully written A1 units (Saludos + Familia).

**Architecture:** Astro 4+ SSG, Svelte islands for interactivity, content collections with Zod schemas, native i18n routing (defaultLocale `es`, RTL-ready), CSS logical properties throughout, Manrope variable font self-hosted. Deploy via Cloudflare Pages on push to `main`.

**Tech Stack:** Astro 4.x · Svelte 4 · TypeScript strict · Manrope · CSS custom properties + logical properties · Cloudflare Pages · GitHub.

---

## Reference

Spec: [`docs/superpowers/specs/2026-05-06-euskera-static-design.md`](../specs/2026-05-06-euskera-static-design.md)

When this plan and the spec disagree, the spec wins — update the plan inline.

## Conventions for this plan

- **No unit tests in v0** (per spec §8.7). Quality gates: `tsc --noEmit`, `astro check`, `npm run build`. Manual smoke testing in dev for UX.
- **Commits are in author voice** (Castellano), no third-party attribution, no `Co-Authored-By` trailer.
- **Working directory** for all bash/PowerShell commands: `C:\Users\Crint\proyectos\euskera-static\`. Commands assume cwd is set.
- **Slug language:** Castilian — kebab-case, order-prefixed (`01-saludos`, `01-kaixo`).
- **Internal field names** in YAML/code are English (`code`, `level`, `covers`); user-visible strings are localized.

## Prerequisite (out of plan)

Curriculum extraction tooling lives in the private repo `Crinlorite/euskera-static-tools` and is not part of this plan. **Before Phase 10 (content authoring)**, run that tooling locally to produce a curriculum reference; reference materials never enter this public repo. If the tooling has not been built yet, write a separate plan for it before starting Phase 10. Phases 1–9 do not depend on it.

## File structure overview

```
euskera-static/
├── astro.config.mjs                              [Task 1]
├── tsconfig.json                                 [Task 1]
├── package.json                                  [Task 1]
├── LICENSE                                       [Task 2]
├── LICENSE-CONTENT                               [Task 2]
├── README.md                                     [pre-existing, expanded in Task 2]
├── .gitignore                                    [pre-existing]
├── public/
│   ├── favicon.svg, favicon-32.png, favicon-192.png, favicon-512.png  [Task 31]
│   ├── apple-touch-icon.png                      [Task 31]
│   ├── og-image.png                              [Task 31]
│   ├── manifest.json                             [Task 32]
│   ├── robots.txt                                [Task 33]
│   └── fonts/Manrope-Variable.woff2              [Task 4]
├── scripts/
│   └── generate-assets.py                        [Task 31]
├── src/
│   ├── content/config.ts                         [Task 10]
│   ├── content/levels/es/a1.yaml                 [Task 11, expanded Task 34]
│   ├── content/units/es/a1/01-saludos/index.yaml [Task 12]
│   ├── content/units/es/a1/02-familia/index.yaml [Task 39]
│   ├── content/lessons/es/a1/01-saludos/01..05.md  [Tasks 35-38]
│   ├── content/lessons/es/a1/02-familia/01..05.md  [Tasks 40-43]
│   ├── i18n/config.ts                            [Task 5]
│   ├── i18n/ui.ts                                [Task 5]
│   ├── stores/progress.ts                        [Tasks 20-22]
│   ├── styles/tokens.css                         [Task 3]
│   ├── styles/base.css                           [Task 3]
│   ├── styles/transitions.css                    [Task 30]
│   ├── layouts/RootLayout.astro                  [Task 6]
│   ├── components/layout/Header.astro            [Task 7]
│   ├── components/layout/Footer.astro            [Task 7]
│   ├── components/layout/MobileDrawer.svelte     [Task 8]
│   ├── components/layout/UnitSidebar.astro       [Task 16]
│   ├── components/layout/LessonNav.astro         [Task 17]
│   ├── components/ui/LangPicker.svelte           [Task 9]
│   ├── components/ui/Lauburu.svelte              [Task 28]
│   ├── components/ui/Particles.svelte            [Task 28]
│   ├── components/ui/ProgressBar.astro           [Task 15]
│   ├── components/exercises/types.ts             [Task 24]
│   ├── components/exercises/MultipleChoice.svelte [Task 24]
│   ├── components/exercises/FillInBlank.svelte   [Task 25]
│   ├── components/exercises/Flashcards.svelte    [Task 26]
│   ├── components/exercises/MatchPairs.svelte    [Task 27]
│   ├── components/exercises/ExercisesSection.svelte [Task 27]
│   └── pages/
│       ├── index.astro                           [Task 13]
│       ├── [locale]/index.astro                  [Task 13, hero in Task 29]
│       ├── [locale]/sobre.astro                  [Task 18]
│       ├── [locale]/idioma.astro                 [Task 19]
│       ├── [locale]/progreso.astro               [Task 23]
│       ├── [locale]/[level]/index.astro          [Task 14]
│       ├── [locale]/[level]/[unit]/index.astro   [Task 16]
│       └── [locale]/[level]/[unit]/[lesson].astro [Task 17]
└── docs/superpowers/{specs,plans}/               [pre-existing]
```

---

## Phase 1: Project foundation

### Task 1: Scaffold Astro + Svelte + TypeScript strict

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`
- Modify: none

- [ ] **Step 1: Initialize npm and install Astro + Svelte + integrations**

```powershell
npm init -y
npm install --save-exact astro@^4.16.0 svelte@^4.2.19 @astrojs/svelte@^5.7.2 @astrojs/sitemap@^3.2.1
npm install --save-dev --save-exact typescript@^5.6.3 @types/node@^22.7.5
```

Expected: `node_modules/` populated; `package.json` lists dependencies. (Versions are floors — if newer LTS-compatible exists, accept it but pin exactly.)

- [ ] **Step 2: Replace `package.json` scripts and metadata**

Open `package.json` and replace it entirely with:

```json
{
  "name": "euskera-static",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "astro dev",
    "start": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check && tsc --noEmit",
    "astro": "astro"
  },
  "dependencies": {
    "astro": "4.16.0",
    "svelte": "4.2.19",
    "@astrojs/svelte": "5.7.2",
    "@astrojs/sitemap": "3.2.1"
  },
  "devDependencies": {
    "typescript": "5.6.3",
    "@types/node": "22.7.5"
  }
}
```

(If your `npm install` resolved different exact versions, keep what's already in the file; only the scripts and metadata sections matter for this step.)

- [ ] **Step 3: Create `astro.config.mjs`**

```javascript
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://euskera.crintech.pro',
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'es',
    locales: ['es'],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
    },
  },
  integrations: [svelte(), sitemap()],
  build: {
    format: 'directory',
  },
});
```

Notes:
- Only `es` is in `locales` for v0.0; other locales are added when their content lands (per spec §6.1).
- `prefixDefaultLocale: true` means `/es/` is the canonical path; `/` redirects there.

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "verbatimModuleSyntax": true
  },
  "include": ["src/**/*", "astro.config.mjs"],
  "exclude": ["dist", "node_modules", ".astro"]
}
```

- [ ] **Step 5: Smoke-test build and dev server**

```powershell
npm run build
```

Expected: completes without errors; produces `dist/` (will be empty of pages — no `src/pages/` yet, that is fine).

```powershell
npm run dev
```

Expected: dev server starts at `http://localhost:4321`. Visit — you should see Astro's default 404 (no pages defined yet). Stop the server (Ctrl+C).

- [ ] **Step 6: Commit**

```powershell
git add package.json package-lock.json astro.config.mjs tsconfig.json
git commit -m "feat: scaffold Astro + Svelte + TypeScript strict"
```

---

### Task 2: Add LICENSE files and expand README

**Files:**
- Create: `LICENSE`, `LICENSE-CONTENT`
- Modify: `README.md`

- [ ] **Step 1: Create `LICENSE` (MIT)**

Standard MIT text with `Copyright (c) 2026 Crinlorite`. Copy from https://opensource.org/license/mit (or any canonical source) — replace `[year]` and `[fullname]` with `2026` and `Crinlorite`.

- [ ] **Step 2: Create `LICENSE-CONTENT` (CC BY-SA 4.0)**

Add a single line at the top:
```
Content (Markdown lessons, YAML curricula, exercise data) in this repository is licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0).
```

Then paste the full canonical CC BY-SA 4.0 legal text from https://creativecommons.org/licenses/by-sa/4.0/legalcode (plain-text version).

- [ ] **Step 3: Replace `README.md`**

```markdown
# Euskera Static

Portal gratuito y abierto para aprender euskera. Sin login, sin ads, sin paywalls. Datos abiertos. Formato eterno.

**Web:** [euskera.crintech.pro](https://euskera.crintech.pro) (próximamente)

## Estado

v0.0 en construcción. Ver el [diseño completo](docs/superpowers/specs/2026-05-06-euskera-static-design.md).

## Licencias

- **Código** (`src/`, `scripts/`, configs): [MIT](LICENSE)
- **Contenido** (`src/content/`, lecciones y currículum): [CC BY-SA 4.0](LICENSE-CONTENT)
- **Assets propios** (lauburu SVG, OG image, favicons): CC0

## Desarrollo

```
npm install
npm run dev
```

Build: `npm run build` → `dist/`. Type-check: `npm run check`.

## Contribuir

PRs bienvenidas, especialmente para traducciones nuevas y correcciones de contenido. Abre un issue para hablar de cambios grandes antes de implementarlos.
```

- [ ] **Step 4: Commit**

```powershell
git add LICENSE LICENSE-CONTENT README.md
git commit -m "docs: añade licencias MIT + CC BY-SA 4.0 y expande README"
```

---

## Phase 2: Design tokens, base styles, fonts

### Task 3: Create design tokens and base CSS

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/base.css`

- [ ] **Step 1: Create `src/styles/tokens.css`**

```css
:root {
  /* Brand — Ikurriña */
  --c-red: #D52B1E;
  --c-red-soft: #fef2f1;
  --c-red-strong: #b32218;
  --c-green: #00964B;
  --c-green-soft: #ebfaf2;
  --c-green-strong: #007038;

  /* Surface */
  --c-bg: #FFFFFF;
  --c-bg-alt: #FAFAF7;
  --c-bg-muted: #F5F5F2;

  /* Text */
  --c-text: #1A1A1A;
  --c-text-muted: #6B6B6B;
  --c-text-dim: #A0A0A0;

  /* Borders */
  --c-border: #E5E5E0;
  --c-border-strong: #C9C9C2;

  /* Spacing scale */
  --s-1: 0.25rem;
  --s-2: 0.5rem;
  --s-3: 0.75rem;
  --s-4: 1rem;
  --s-5: 1.5rem;
  --s-6: 2rem;
  --s-7: 3rem;
  --s-8: 4rem;

  /* Radius */
  --r-sm: 6px;
  --r-md: 8px;
  --r-lg: 12px;

  /* Shadow */
  --sh-card: 0 1px 3px rgba(0, 0, 0, 0.05);
  --sh-card-hover: 0 4px 12px rgba(0, 0, 0, 0.08);

  /* Type */
  --ff-sans: 'Manrope', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;

  /* Layout */
  --content-max: 720px;
  --shell-max: 1200px;

  /* RTL mirror flag (used by directional icons) */
  --rtl-mirror: 1;
}

[dir="rtl"] {
  --rtl-mirror: -1;
}
```

- [ ] **Step 2: Create `src/styles/base.css`**

```css
@import './tokens.css';

*, *::before, *::after { box-sizing: border-box; }

html, body { margin: 0; padding: 0; }

html {
  font-family: var(--ff-sans);
  color: var(--c-text);
  background: var(--c-bg);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

body { min-height: 100vh; }

a { color: inherit; text-decoration-thickness: 1px; text-underline-offset: 0.2em; }
a:hover { color: var(--c-red); }

img, svg { display: block; max-width: 100%; height: auto; }

button {
  font: inherit;
  color: inherit;
  background: none;
  border: 0;
  cursor: pointer;
}

input, textarea, select {
  font: inherit;
  color: inherit;
}

/* Layout helpers using logical properties only */
.container {
  max-width: var(--content-max);
  margin-inline: auto;
  padding-inline: var(--s-5);
}
.container-wide {
  max-width: var(--shell-max);
  margin-inline: auto;
  padding-inline: var(--s-5);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  min-height: 44px;
  padding-inline: var(--s-5);
  padding-block: var(--s-2);
  border-radius: var(--r-md);
  font-weight: 600;
  transition: transform 150ms, background-color 150ms, color 150ms;
  text-decoration: none;
}
.btn:hover { transform: translateY(-1px); }
.btn-primary {
  background: var(--c-red);
  color: #fff;
}
.btn-primary:hover { background: var(--c-red-strong); color: #fff; }
.btn-secondary {
  border: 1px solid var(--c-text);
  color: var(--c-text);
}
.btn-secondary:hover { background: var(--c-bg-alt); }

/* Card */
.card {
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: var(--r-lg);
  padding: var(--s-5);
  box-shadow: var(--sh-card);
  transition: transform 150ms, box-shadow 150ms;
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--sh-card-hover);
}

/* Direction-aware icon helper */
.icon-direction-aware { transform: scaleX(var(--rtl-mirror)); }

/* Visually hidden for a11y */
.sr-only {
  position: absolute;
  inline-size: 1px; block-size: 1px;
  padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}
```

- [ ] **Step 3: Commit**

```powershell
git add src/styles/
git commit -m "feat(styles): tokens y CSS base con propiedades lógicas"
```

---

### Task 4: Self-host Manrope variable font

**Files:**
- Create: `public/fonts/Manrope-Variable.woff2`, additions to `src/styles/base.css`

- [ ] **Step 1: Download Manrope-Variable.woff2**

Source: https://github.com/sharanda/manrope/raw/master/fonts/web/Manrope-Variable.woff2

Save as `public/fonts/Manrope-Variable.woff2`. Verify file size is around 100–130 KB.

(If network restricted: alternate via Google Fonts CSS API — `https://fonts.googleapis.com/css2?family=Manrope:wght@400..700&display=swap` — but self-hosting is required by spec §2.1 for the eternal invariant.)

- [ ] **Step 2: Append `@font-face` to `src/styles/base.css`**

Add at the **top** of the file (above `@import './tokens.css';`):

```css
@font-face {
  font-family: 'Manrope';
  src: url('/fonts/Manrope-Variable.woff2') format('woff2-variations');
  font-weight: 200 900;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-024F, U+0259, U+1E00-1EFF, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
```

- [ ] **Step 3: Verify font loads in dev**

```powershell
npm run dev
```

You won't see anything yet (no pages), but `astro check` should be clean. Check `http://localhost:4321/fonts/Manrope-Variable.woff2` resolves (200 OK). Stop server.

- [ ] **Step 4: Commit**

```powershell
git add public/fonts/Manrope-Variable.woff2 src/styles/base.css
git commit -m "feat(fonts): self-host Manrope variable"
```

---

## Phase 3: i18n base (config + UI strings)

### Task 5: Create i18n config and UI strings dictionary

**Files:**
- Create: `src/i18n/config.ts`, `src/i18n/ui.ts`

- [ ] **Step 1: Create `src/i18n/config.ts`**

```typescript
export type LocaleCode =
  | 'es' | 'en' | 'ar' | 'fr' | 'ro' | 'pt-BR'
  | 'de' | 'it' | 'ru' | 'pl' | 'zh-Hans' | 'ja' | 'ko';

export interface LocaleInfo {
  code: LocaleCode;
  name: string;            // display name in its own language
  dir: 'ltr' | 'rtl';
  status: 'active' | 'beta' | 'planned';
  font?: string;           // additional font CSS family if not Manrope
}

export const DEFAULT_LOCALE: LocaleCode = 'es';

export const LANGUAGES: Record<LocaleCode, LocaleInfo> = {
  'es': { code: 'es', name: 'Castellano', dir: 'ltr', status: 'active' },
  'en': { code: 'en', name: 'English', dir: 'ltr', status: 'planned' },
  'ar': { code: 'ar', name: 'العربية', dir: 'rtl', status: 'planned', font: 'Noto Sans Arabic' },
  'fr': { code: 'fr', name: 'Français', dir: 'ltr', status: 'planned' },
  'ro': { code: 'ro', name: 'Română', dir: 'ltr', status: 'planned' },
  'pt-BR': { code: 'pt-BR', name: 'Português (Brasil)', dir: 'ltr', status: 'planned' },
  'de': { code: 'de', name: 'Deutsch', dir: 'ltr', status: 'planned' },
  'it': { code: 'it', name: 'Italiano', dir: 'ltr', status: 'planned' },
  'ru': { code: 'ru', name: 'Русский', dir: 'ltr', status: 'planned' },
  'pl': { code: 'pl', name: 'Polski', dir: 'ltr', status: 'planned' },
  'zh-Hans': { code: 'zh-Hans', name: '简体中文', dir: 'ltr', status: 'planned', font: 'Noto Sans SC' },
  'ja': { code: 'ja', name: '日本語', dir: 'ltr', status: 'planned', font: 'Noto Sans JP' },
  'ko': { code: 'ko', name: '한국어', dir: 'ltr', status: 'planned', font: 'Noto Sans KR' },
};

export const ACTIVE_LOCALES: LocaleCode[] = (Object.values(LANGUAGES)
  .filter((l) => l.status === 'active' || l.status === 'beta')
  .map((l) => l.code));
```

- [ ] **Step 2: Create `src/i18n/ui.ts`**

```typescript
import type { LocaleCode } from './config';

type StringKey =
  | 'site.name' | 'site.tagline'
  | 'nav.home' | 'nav.levels' | 'nav.about' | 'nav.language' | 'nav.progress'
  | 'home.hero.title' | 'home.hero.sub' | 'home.cta.start'
  | 'levels.upcoming'
  | 'unit.lessons' | 'unit.estimated'
  | 'lesson.next' | 'lesson.prev'
  | 'lesson.completed' | 'lesson.read'
  | 'progress.streak.days'
  | 'progress.export.title' | 'progress.export.copy' | 'progress.export.download' | 'progress.export.share'
  | 'progress.export.help'
  | 'progress.import.title' | 'progress.import.do' | 'progress.import.invalid' | 'progress.import.overwrite'
  | 'progress.import.outdated' | 'progress.import.skipped'
  | 'guest.banner'
  | 'lang.choose' | 'lang.beta' | 'lang.upcoming' | 'lang.help-translate'
  | 'about.title'
  | 'beta.banner'
  | 'common.cancel' | 'common.continue' | 'common.close' | 'common.copy' | 'common.download'
  | 'sources.statement';

const STRINGS: Record<LocaleCode, Partial<Record<StringKey, string>>> = {
  'es': {
    'site.name': 'Euskera',
    'site.tagline': 'Aprende euskera, gratis y para todos.',
    'nav.home': 'Inicio',
    'nav.levels': 'Niveles',
    'nav.about': 'Sobre',
    'nav.language': 'Idioma',
    'nav.progress': 'Progreso',
    'home.hero.title': 'Aprende euskera',
    'home.hero.sub': 'Gratis · Sin login · Para todos',
    'home.cta.start': 'Empezar por el A1',
    'levels.upcoming': 'Próximamente',
    'unit.lessons': 'Lecciones',
    'unit.estimated': 'Tiempo estimado',
    'lesson.next': 'Siguiente',
    'lesson.prev': 'Anterior',
    'lesson.completed': 'Lección completada',
    'lesson.read': 'Leída',
    'progress.streak.days': 'días seguidos',
    'progress.export.title': 'Guardar mi progreso',
    'progress.export.copy': 'Copiar al portapapeles',
    'progress.export.download': 'Descargar archivo',
    'progress.export.share': 'Compartir',
    'progress.export.help': 'Pega esto en tus notas o mándatelo a ti mismo. Cuando vuelvas en otro dispositivo, pégalo en "Restaurar progreso" y seguirás donde lo dejaste.',
    'progress.import.title': 'Restaurar progreso',
    'progress.import.do': 'Importar',
    'progress.import.invalid': 'No reconozco este código. ¿Lo copiaste completo?',
    'progress.import.overwrite': 'Esto sobrescribirá tu progreso actual. ¿Continuar?',
    'progress.import.outdated': 'Este código es de una versión más reciente. Actualiza la página.',
    'progress.import.skipped': 'Restaurado. Algunas lecciones ya no existen y se han saltado.',
    'guest.banner': 'Modo invitado: tu progreso solo dura esta sesión. Exporta antes de cerrar.',
    'lang.choose': 'Elige tu idioma',
    'lang.beta': 'Beta',
    'lang.upcoming': 'Próximamente · ayúdanos en GitHub',
    'lang.help-translate': '¿Hablas este idioma? Ayúdanos a traducir',
    'about.title': 'Sobre el proyecto',
    'beta.banner': 'Esta traducción está en beta — si ves algo raro, avísanos.',
    'common.cancel': 'Cancelar',
    'common.continue': 'Continuar',
    'common.close': 'Cerrar',
    'common.copy': 'Copiar',
    'common.download': 'Descargar',
    'sources.statement': 'El currículum sigue los estándares CEFR oficiales para los niveles A1–C2 del euskera. Las explicaciones, ejemplos y ejercicios son material original. Vocabulario y reglas gramaticales son hechos lingüísticos de dominio público.',
  },
  // Other locales added as they activate; missing keys fall back to 'es' (see t() below).
  'en': {}, 'ar': {}, 'fr': {}, 'ro': {}, 'pt-BR': {},
  'de': {}, 'it': {}, 'ru': {}, 'pl': {}, 'zh-Hans': {}, 'ja': {}, 'ko': {},
};

export function t(locale: LocaleCode, key: StringKey): string {
  return STRINGS[locale]?.[key] ?? STRINGS['es']?.[key] ?? key;
}
```

- [ ] **Step 3: Verify type-check**

```powershell
npm run check
```

Expected: passes.

- [ ] **Step 4: Commit**

```powershell
git add src/i18n/
git commit -m "feat(i18n): config de locales y diccionario de strings UI (es)"
```

---

## Phase 4: Layout shell

### Task 6: RootLayout (locale-aware HTML, fonts, meta)

**Files:**
- Create: `src/layouts/RootLayout.astro`

- [ ] **Step 1: Create the layout**

```astro
---
import '../styles/base.css';
import { LANGUAGES, DEFAULT_LOCALE, type LocaleCode } from '../i18n/config';
import { t } from '../i18n/ui';
import Header from '../components/layout/Header.astro';
import Footer from '../components/layout/Footer.astro';

interface Props {
  locale?: LocaleCode;
  title: string;
  description?: string;
  ogImage?: string;
  bodyClass?: string;
}

const {
  locale = DEFAULT_LOCALE,
  title,
  description,
  ogImage = '/og-image.png',
  bodyClass = '',
} = Astro.props;

const info = LANGUAGES[locale];
const fullTitle = `${title} · ${t(locale, 'site.name')}`;
const desc = description ?? t(locale, 'site.tagline');
const canonical = new URL(Astro.url.pathname, Astro.site).toString();
---
<!doctype html>
<html lang={locale} dir={info.dir}>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#FFFFFF" />
    <title>{fullTitle}</title>
    <meta name="description" content={desc} />
    <link rel="canonical" href={canonical} />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/manifest.json" />
    <meta property="og:title" content={fullTitle} />
    <meta property="og:description" content={desc} />
    <meta property="og:image" content={new URL(ogImage, Astro.site).toString()} />
    <meta property="og:url" content={canonical} />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content={locale.replace('-', '_')} />
    <meta name="twitter:card" content="summary_large_image" />
  </head>
  <body class={bodyClass}>
    <a class="sr-only" href="#main">Saltar al contenido</a>
    <Header locale={locale} />
    <main id="main">
      <slot />
    </main>
    <Footer locale={locale} />
  </body>
</html>
```

- [ ] **Step 2: Type-check**

```powershell
npm run check
```

Expected: warns about `Header`/`Footer` not yet existing — that's fine; they're created in Task 7. If type-check fails hard, comment out the imports temporarily.

- [ ] **Step 3: Commit**

```powershell
git add src/layouts/RootLayout.astro
git commit -m "feat(layout): RootLayout consciente del locale (lang/dir, meta, OG)"
```

---

### Task 7: Header and Footer components

**Files:**
- Create: `src/components/layout/Header.astro`, `src/components/layout/Footer.astro`

- [ ] **Step 1: Create `src/components/layout/Header.astro`**

```astro
---
import { t } from '../../i18n/ui';
import type { LocaleCode } from '../../i18n/config';
import MobileDrawer from './MobileDrawer.svelte';

interface Props { locale: LocaleCode; }
const { locale } = Astro.props;

const navItems = [
  { href: `/${locale}/`, key: 'nav.home' as const },
  { href: `/${locale}/a1/`, key: 'nav.levels' as const, label: 'A1' },
  { href: `/${locale}/sobre/`, key: 'nav.about' as const },
  { href: `/${locale}/idioma/`, key: 'nav.language' as const },
  { href: `/${locale}/progreso/`, key: 'nav.progress' as const },
];
---
<header class="site-header">
  <div class="container-wide row">
    <a class="brand" href={`/${locale}/`}>
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        <use href="/favicon.svg#lauburu" />
      </svg>
      <span>{t(locale, 'site.name')}</span>
    </a>
    <nav class="primary-nav" aria-label="primary">
      <ul>
        {navItems.map((item) => (
          <li>
            <a href={item.href}>{item.label ?? t(locale, item.key)}</a>
          </li>
        ))}
      </ul>
    </nav>
    <MobileDrawer client:load locale={locale} />
  </div>
</header>

<style>
  .site-header {
    position: sticky;
    inset-block-start: 0;
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(8px);
    border-block-end: 1px solid var(--c-border);
    z-index: 50;
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--s-5);
    block-size: 64px;
  }
  .brand {
    display: inline-flex;
    align-items: center;
    gap: var(--s-2);
    font-weight: 700;
    text-decoration: none;
    color: var(--c-text);
  }
  .primary-nav {
    margin-inline-start: auto;
  }
  .primary-nav ul {
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
    gap: var(--s-5);
  }
  .primary-nav a {
    text-decoration: none;
    color: var(--c-text);
    font-weight: 500;
    padding-block: var(--s-2);
  }
  .primary-nav a:hover { color: var(--c-red); }
  @media (max-width: 768px) {
    .primary-nav { display: none; }
  }
</style>
```

- [ ] **Step 2: Create `src/components/layout/Footer.astro`**

```astro
---
import { t } from '../../i18n/ui';
import type { LocaleCode } from '../../i18n/config';

interface Props { locale: LocaleCode; }
const { locale } = Astro.props;
const year = new Date().getFullYear();
---
<footer class="site-footer">
  <div class="container-wide grid">
    <div>
      <strong>{t(locale, 'site.name')}</strong>
      <p>{t(locale, 'site.tagline')}</p>
    </div>
    <div>
      <h4>Proyecto</h4>
      <ul>
        <li><a href="https://github.com/Crinlorite/euskera-static" rel="noopener">GitHub</a></li>
        <li><a href={`/${locale}/sobre/`}>{t(locale, 'about.title')}</a></li>
      </ul>
    </div>
    <div>
      <h4>Licencias</h4>
      <ul>
        <li>Código: <a href="https://github.com/Crinlorite/euskera-static/blob/main/LICENSE" rel="noopener">MIT</a></li>
        <li>Contenido: <a href="https://github.com/Crinlorite/euskera-static/blob/main/LICENSE-CONTENT" rel="noopener">CC BY-SA 4.0</a></li>
      </ul>
    </div>
  </div>
  <div class="container-wide bottom">© {year} Crinlorite</div>
</footer>

<style>
  .site-footer {
    background: var(--c-bg-alt);
    border-block-start: 1px solid var(--c-border);
    margin-block-start: var(--s-8);
    padding-block: var(--s-6);
    color: var(--c-text-muted);
  }
  .grid {
    display: grid;
    grid-template-columns: 1.5fr 1fr 1fr;
    gap: var(--s-6);
  }
  .grid h4 { margin: 0 0 var(--s-2); color: var(--c-text); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; }
  .grid ul { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-2); }
  .grid a { color: inherit; }
  .bottom {
    margin-block-start: var(--s-5);
    padding-block-start: var(--s-3);
    border-block-start: 1px solid var(--c-border);
    font-size: 0.875rem;
  }
  @media (max-width: 720px) {
    .grid { grid-template-columns: 1fr; gap: var(--s-5); }
  }
</style>
```

- [ ] **Step 3: Commit**

```powershell
git add src/components/layout/Header.astro src/components/layout/Footer.astro
git commit -m "feat(layout): Header con nav y Footer con créditos y licencias"
```

---

### Task 8: MobileDrawer (Svelte island)

**Files:**
- Create: `src/components/layout/MobileDrawer.svelte`

- [ ] **Step 1: Create the component**

```svelte
<script lang="ts">
  import type { LocaleCode } from '../../i18n/config';
  import { t } from '../../i18n/ui';
  export let locale: LocaleCode;

  let open = false;

  const items = [
    { href: `/${locale}/`, key: 'nav.home' as const },
    { href: `/${locale}/a1/`, label: 'A1' },
    { href: `/${locale}/sobre/`, key: 'nav.about' as const },
    { href: `/${locale}/idioma/`, key: 'nav.language' as const },
    { href: `/${locale}/progreso/`, key: 'nav.progress' as const },
  ];
</script>

<button class="trigger" aria-label="Menú" aria-expanded={open} on:click={() => (open = !open)}>
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    {#if open}
      <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" stroke-width="2" fill="none" />
    {:else}
      <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" fill="none" />
    {/if}
  </svg>
</button>

{#if open}
  <div class="overlay" on:click={() => (open = false)} role="presentation"></div>
  <aside class="drawer" aria-label="Menú móvil">
    <ul>
      {#each items as item}
        <li><a href={item.href} on:click={() => (open = false)}>
          {'label' in item ? item.label : t(locale, item.key)}
        </a></li>
      {/each}
    </ul>
  </aside>
{/if}

<style>
  .trigger {
    display: none;
    margin-inline-start: auto;
    padding: var(--s-2);
    color: var(--c-text);
  }
  @media (max-width: 768px) {
    .trigger { display: inline-flex; }
  }
  .overlay {
    position: fixed; inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 60;
  }
  .drawer {
    position: fixed;
    inset-block: 0;
    inset-inline-end: 0;
    inline-size: min(80vw, 320px);
    background: var(--c-bg);
    z-index: 70;
    padding: var(--s-6);
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.1);
  }
  .drawer ul { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-3); }
  .drawer a {
    display: block;
    padding: var(--s-3);
    border-radius: var(--r-md);
    text-decoration: none;
    color: var(--c-text);
    font-weight: 500;
  }
  .drawer a:hover { background: var(--c-bg-alt); color: var(--c-red); }
</style>
```

- [ ] **Step 2: Type-check + commit**

```powershell
npm run check
git add src/components/layout/MobileDrawer.svelte
git commit -m "feat(layout): drawer móvil como isla Svelte"
```

---

### Task 9: LangPicker component

**Files:**
- Create: `src/components/ui/LangPicker.svelte`

- [ ] **Step 1: Create the component**

```svelte
<script lang="ts">
  import { LANGUAGES, type LocaleCode } from '../../i18n/config';
  import { t } from '../../i18n/ui';

  export let currentLocale: LocaleCode;

  const all = Object.values(LANGUAGES);

  function pick(code: LocaleCode, status: string) {
    if (status === 'planned') return;
    if (typeof document !== 'undefined') {
      document.cookie = `lang=${code}; path=/; max-age=31536000`;
    }
    if (typeof location !== 'undefined') {
      const path = location.pathname.replace(/^\/[a-zA-Z-]+/, `/${code}`);
      location.href = path;
    }
  }
</script>

<ul class="picker">
  {#each all as lang}
    <li class:active={lang.code === currentLocale} class:disabled={lang.status === 'planned'}>
      <button on:click={() => pick(lang.code, lang.status)} disabled={lang.status === 'planned'}>
        <span class="name" dir={lang.dir}>{lang.name}</span>
        {#if lang.status === 'beta'}<span class="badge beta">{t(currentLocale, 'lang.beta')}</span>{/if}
        {#if lang.status === 'planned'}<span class="badge planned">{t(currentLocale, 'lang.upcoming')}</span>{/if}
      </button>
    </li>
  {/each}
</ul>

<style>
  .picker { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-2); }
  button {
    inline-size: 100%;
    text-align: start;
    display: flex;
    align-items: center;
    gap: var(--s-3);
    padding: var(--s-3) var(--s-4);
    border: 1px solid var(--c-border);
    border-radius: var(--r-md);
    background: var(--c-bg);
    transition: background 150ms, border-color 150ms;
  }
  button:hover:not([disabled]) {
    background: var(--c-red-soft);
    border-color: var(--c-red);
  }
  .active button { border-color: var(--c-red); background: var(--c-red-soft); }
  .disabled button {
    color: var(--c-text-dim);
    cursor: not-allowed;
    opacity: 0.7;
  }
  .name { font-weight: 500; }
  .badge {
    margin-inline-start: auto;
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .beta { background: var(--c-green-soft); color: var(--c-green-strong); }
  .planned { background: var(--c-bg-muted); color: var(--c-text-muted); }
</style>
```

- [ ] **Step 2: Commit**

```powershell
git add src/components/ui/LangPicker.svelte
git commit -m "feat(i18n): selector de idiomas con badges beta/próximamente"
```

---

## Phase 5: Content collections (schemas + sample data)

### Task 10: Content collection config (Zod schemas)

**Files:**
- Create: `src/content/config.ts`

- [ ] **Step 1: Create the config**

```typescript
import { defineCollection, reference, z } from 'astro:content';

const exerciseBase = z.object({
  id: z.string().min(1),
  type: z.enum(['multiple-choice', 'fill-in-blank', 'flashcards', 'match-pairs']),
});

const multipleChoice = exerciseBase.extend({
  type: z.literal('multiple-choice'),
  prompt: z.string(),
  options: z.array(z.string()).min(2),
  answer: z.number().int().nonnegative(),
  explanation: z.string().optional(),
});

const fillInBlank = exerciseBase.extend({
  type: z.literal('fill-in-blank'),
  prompt: z.string(),  // use {{}} markers for the blank, e.g. "Kaixo, {{name}}!"
  answers: z.array(z.string()).min(1),
  explanation: z.string().optional(),
});

const flashcards = exerciseBase.extend({
  type: z.literal('flashcards'),
  cards: z.array(z.object({ eu: z.string(), es: z.string() })).min(1),
});

const matchPairs = exerciseBase.extend({
  type: z.literal('match-pairs'),
  pairs: z.array(z.object({ eu: z.string(), es: z.string() })).min(2),
});

const exercise = z.discriminatedUnion('type', [
  multipleChoice, fillInBlank, flashcards, matchPairs,
]);

export const levels = defineCollection({
  type: 'data',
  schema: z.object({
    code: z.string(),                       // e.g. 'a1'
    name: z.string(),                       // 'A1 Maila'
    description: z.string(),
    order: z.number().int().positive(),
    status: z.enum(['active', 'placeholder', 'upcoming']),
    curriculum: z.array(z.object({
      id: z.string(),
      title: z.string(),
    })).default([]),
    beta: z.boolean().default(false),
  }),
});

export const units = defineCollection({
  type: 'data',
  schema: z.object({
    code: z.string(),                       // '01-saludos'
    level: z.string(),                      // 'a1'
    title: z.string(),
    order: z.number().int().positive(),
    covers: z.array(z.string()).default([]),
    description: z.string(),
    estimatedMinutes: z.number().int().positive().default(30),
  }),
});

export const lessons = defineCollection({
  type: 'content',
  schema: z.object({
    code: z.string(),                       // '01-kaixo'
    unit: z.string(),                       // '01-saludos'
    level: z.string(),                      // 'a1'
    order: z.number().int().positive(),
    title: z.string(),
    estimatedMinutes: z.number().int().positive().default(10),
    covers: z.array(z.string()).default([]),
    exercises: z.array(exercise).default([]),
  }),
});

export const collections = { levels, units, lessons };
export type Exercise = z.infer<typeof exercise>;
```

- [ ] **Step 2: Type-check**

```powershell
npm run check
```

Expected: passes (no content yet — schemas are just types).

- [ ] **Step 3: Commit**

```powershell
git add src/content/config.ts
git commit -m "feat(content): schemas Zod para levels/units/lessons + ejercicios"
```

---

### Task 11: A1 level skeleton

**Files:**
- Create: `src/content/levels/es/a1.yaml`

- [ ] **Step 1: Create the file**

```yaml
code: a1
name: A1 Maila
description: Nivel inicial. Comprensión y producción básica en situaciones cotidianas.
order: 1
status: active
beta: false
curriculum:
  # Saludos y comunicación social
  - { id: greetings, title: Saludos y despedidas (kaixo, hepa, agur, gero arte) }
  - { id: courtesy, title: Cortesía y aula (mesedez, eskerrik asko, ez horregatik, errepikatu) }
  # Presentaciones e identidad
  - { id: introductions, title: Presentaciones (Ni X naiz, Nire izena X da, Zein da zure izena?) }
  - { id: personal-data, title: Datos personales (izena, abizena, adina, jaioterria, telefonoa, emaila) }
  - { id: ages, title: 'Edad: ... urte ditut/ditu/dituzte' }
  # Verbos básicos
  - { id: izan-nor, title: 'Verbo "izan" (NOR): naiz, haiz, da, gara, zara, zarete, dira' }
  - { id: izan-negation, title: 'Negación: ez antepuesto al verbo (ez naiz, ez da, ez gara)' }
  - { id: egon-nor, title: 'Verbo "egon" (NOR): nago, hago, dago, gaude, zaude, zaudete, daude' }
  - { id: izan-vs-egon, title: 'Distinción izan/egon: cualidad vs estado pasajero' }
  - { id: ukan-basic, title: 'Verbo "ukan" (NOR-NORK) — tener: dut, duzu, du, dugu, duzue, dute' }
  - { id: ukan-plural-objects, title: 'Objeto plural en ukan: ditut, dituzu, ditu, ...' }
  - { id: partitive-rik, title: 'Partitivo -rik en negación con objeto indefinido' }
  - { id: gustatzen-zait, title: '"Gustatzen zait/zaio" — verbo de gusto (introducción NOR-NORI)' }
  # Pronombres y demostrativos
  - { id: personal-pronouns, title: Pronombres personales (ni, hi, zu, hura, gu, zuek, haiek) }
  - { id: demonstratives, title: Demostrativos hau/hori/hura y plurales hauek/horiek/haiek }
  - { id: possessives, title: Posesivos (nire, hire, zure, haren/bere, gure, zuen, haien/beren) }
  # Familia
  - { id: family-types, title: 'Tipos de familia (guraso bakarrekoa, bikote mistoa, ezkonduta)' }
  - { id: family-basics, title: Familia (aita, ama, seme, alaba, anaia, arreba/ahizpa) }
  - { id: family-extended, title: Familia extendida (aitona, amona, osaba, izeba, lehengusu, iloba) }
  # Origen, residencia, ubicación
  - { id: origin-koa, title: 'Procedencia: Nongoa zara? → X-koa naiz (-(e)ko sufijo)' }
  - { id: residence-an, title: 'Residencia: Non bizi zara? → X-(e)an bizi naiz' }
  - { id: countries-nationalities, title: Países comunes y nacionalidades }
  - { id: companions-rekin, title: 'Sociativo: Norekin bizi zara? → X-(r)ekin (familiarekin, bakarrik)' }
  # Casos del euskera
  - { id: nor-case, title: 'Caso NOR (absolutivo): -A singular, -AK plural' }
  - { id: nork-case, title: 'Caso NORK (ergativo): -AK singular, -EK plural' }
  - { id: nori-case, title: 'Caso NORI (dativo): -ARI singular, -EI plural' }
  - { id: noren-case, title: 'Genitivo NOREN: posesión -(r)en (Beñaten aita)' }
  - { id: locative-non, title: 'Locativo NON: -(e)n (Bilbon, Donostian, Madrilen)' }
  # Descripciones y profesiones
  - { id: physical-description, title: 'NOLAKOA da? — descripción física con izan + adjetivo+A' }
  - { id: mental-states, title: 'NOLA dago? — estado pasajero con egon + adjetivo sin -A (pozik, triste)' }
  - { id: hair-eyes, title: 'Pelo y ojos (ile beltza, begi urdinak, ile motza/luzea)' }
  - { id: character, title: 'Carácter (alaia, jatorra, isila, langilea, lasaia)' }
  - { id: professions, title: 'Profesiones (ikaslea, irakaslea, sukaldaria, mediku, langabea, jubilatua)' }
  # Vocabulario temático
  - { id: numbers-1-20, title: Números del 1 al 20 }
  - { id: numbers-1-100, title: Números del 1 al 100 (sistema vigesimal) }
  - { id: colors, title: Colores (zuria, beltza, gorria, urdina, horia, berdea) }
  - { id: days-of-week, title: Días de la semana (astelehena → igandea) }
  - { id: months, title: Meses del año (urtarrila → abendua) }
  - { id: seasons, title: Estaciones (udaberria, uda, udazkena, negua) }
  - { id: time-basics, title: 'Decir la hora (Hamabiak dira, sei eta erdiak)' }
  - { id: time-expressions, title: 'Tiempo: lehen/orain/gero, atzo/gaur/bihar/etzi' }
  - { id: body-parts, title: Partes del cuerpo (burua, eskua, hanka, sabela) }
  - { id: health-basics, title: 'Salud básica (... mina daukat, sukarra, eztula)' }
  - { id: clothes, title: Ropa básica (alkandora, galtza, soineko, jertse, zapatak) }
  - { id: places-town, title: 'Lugares del pueblo (taberna, merkatua, hondartza, eliza, banketxea)' }
  - { id: directions, title: 'Direcciones (jo ezkerrera, segi aurrera, gainean/azpian)' }
  - { id: food-bar, title: 'Bar y comida (kafe hutsa, kafesnea, zuritoa, ogitartekoa, sagardoa)' }
  - { id: meals, title: 'Comidas del día (gosaria, hamaiketakoa, bazkaria, afaria)' }
  - { id: common-verbs, title: 'Verbos básicos (sartu/irten, jan, edan, ikusi, joan, etorri)' }
  - { id: questions-basic, title: 'Preguntas básicas (zer, nor, non, noiz, zenbat, nola)' }
  - { id: celebrations, title: 'Felicitaciones (Zorionak, Urte askotarako, Topa egin)' }
```

- [ ] **Step 2: Build to validate schema**

```powershell
npm run build
```

Expected: Astro reports 1 entry in `levels` collection. If schema mismatch, fix the YAML (or schema) until it passes.

- [ ] **Step 3: Commit**

```powershell
git add src/content/levels/
git commit -m "content(a1): currículum del nivel A1"
```

---

### Task 12: Sample unit (01-saludos)

**Files:**
- Create: `src/content/units/es/a1/01-saludos/index.yaml`

- [ ] **Step 1: Create the file**

```yaml
code: 01-saludos
level: a1
title: Saludos y primeras palabras
order: 1
description: Aprende a saludar, despedirte y presentarte en euskera.
estimatedMinutes: 50
covers:
  - greetings
  - introductions
  - personal-pronouns
  - izan-nor
  - countries-nationalities
```

- [ ] **Step 2: Build**

```powershell
npm run build
```

Expected: 1 unit entry validates.

- [ ] **Step 3: Commit**

```powershell
git add src/content/units/
git commit -m "content(a1): unidad 01 — Saludos y primeras palabras (metadata)"
```

---

## Phase 6: Page templates

### Task 13: Root redirect + locale home

**Files:**
- Create: `src/pages/index.astro`, `src/pages/[locale]/index.astro`

- [ ] **Step 1: Create `src/pages/index.astro` (root redirect)**

```astro
---
return Astro.redirect('/es/');
---
```

- [ ] **Step 2: Create `src/pages/[locale]/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import RootLayout from '../../layouts/RootLayout.astro';
import { ACTIVE_LOCALES, type LocaleCode } from '../../i18n/config';
import { t } from '../../i18n/ui';

export async function getStaticPaths() {
  return ACTIVE_LOCALES.map((locale) => ({ params: { locale } }));
}

const { locale } = Astro.params as { locale: LocaleCode };
const levels = (await getCollection('levels')).filter((l) =>
  // path is e.g. 'es/a1' — keep entries for current locale
  l.id.startsWith(`${locale}/`)
).sort((a, b) => a.data.order - b.data.order);
---
<RootLayout locale={locale} title={t(locale, 'site.tagline')}>
  <section class="hero">
    <div class="container">
      <h1>{t(locale, 'home.hero.title')}</h1>
      <p class="sub">{t(locale, 'home.hero.sub')}</p>
      <a class="btn btn-primary" href={`/${locale}/a1/`}>{t(locale, 'home.cta.start')}</a>
    </div>
  </section>

  <section class="container levels">
    <h2>{t(locale, 'nav.levels')}</h2>
    <ul class="level-list">
      {levels.map((level) => (
        <li>
          <a class="card level-card" href={`/${locale}/${level.data.code}/`}>
            <span class="level-code">{level.data.name}</span>
            <span class="level-desc">{level.data.description}</span>
          </a>
        </li>
      ))}
      {['a2', 'b1', 'b2', 'c1', 'c2'].filter((c) => !levels.some((l) => l.data.code === c)).map((code) => (
        <li>
          <div class="card level-card disabled" aria-disabled="true">
            <span class="level-code">{code.toUpperCase()}</span>
            <span class="level-desc">{t(locale, 'levels.upcoming')}</span>
          </div>
        </li>
      ))}
    </ul>
  </section>
</RootLayout>

<style>
  .hero {
    padding-block: var(--s-8);
    text-align: center;
  }
  .hero h1 { font-size: clamp(2rem, 5vw, 3.5rem); margin: 0 0 var(--s-3); letter-spacing: -0.02em; }
  .sub { color: var(--c-text-muted); margin: 0 0 var(--s-5); }
  .levels { padding-block-end: var(--s-8); }
  .levels h2 { margin-block-end: var(--s-5); }
  .level-list {
    list-style: none; margin: 0; padding: 0;
    display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: var(--s-4);
  }
  .level-card {
    display: grid;
    gap: var(--s-2);
    text-decoration: none;
    color: inherit;
  }
  .level-code { font-weight: 700; font-size: 1.25rem; }
  .level-desc { color: var(--c-text-muted); font-size: 0.9rem; }
  .level-card.disabled { opacity: 0.6; cursor: not-allowed; }
</style>
```

- [ ] **Step 3: Smoke-test**

```powershell
npm run dev
```

Visit `http://localhost:4321/`. Should redirect to `/es/`. Should render hero + levels list (only A1 active, A2-C2 disabled). Stop server.

- [ ] **Step 4: Commit**

```powershell
git add src/pages/index.astro src/pages/[locale]/index.astro
git commit -m "feat(pages): home con redirect raíz y listado de niveles"
```

---

### Task 14: Level page

**Files:**
- Create: `src/pages/[locale]/[level]/index.astro`

- [ ] **Step 1: Create the file**

```astro
---
import { getCollection } from 'astro:content';
import RootLayout from '../../../layouts/RootLayout.astro';
import { ACTIVE_LOCALES, type LocaleCode } from '../../../i18n/config';
import { t } from '../../../i18n/ui';

export async function getStaticPaths() {
  const allLevels = await getCollection('levels');
  return allLevels
    .filter((l) => ACTIVE_LOCALES.some((loc) => l.id.startsWith(`${loc}/`)))
    .map((l) => {
      const [locale, code] = l.id.split('/');
      return { params: { locale, level: code }, props: { level: l } };
    });
}

const { locale, level: levelSlug } = Astro.params as { locale: LocaleCode; level: string };
const { level } = Astro.props;

const allUnits = await getCollection('units');
const units = allUnits
  .filter((u) => u.id.startsWith(`${locale}/${levelSlug}/`))
  .sort((a, b) => a.data.order - b.data.order);

const allLessons = await getCollection('lessons');
const lessonsByUnit = new Map<string, number>();
for (const u of units) {
  const count = allLessons.filter((l) => l.id.startsWith(`${locale}/${levelSlug}/${u.data.code}/`)).length;
  lessonsByUnit.set(u.data.code, count);
}
---
<RootLayout locale={locale} title={level.data.name}>
  <article class="container">
    <header class="level-header">
      <h1>{level.data.name}</h1>
      <p>{level.data.description}</p>
    </header>

    <section class="units">
      <h2>Unidades</h2>
      {units.length === 0 ? (
        <p>{t(locale, 'levels.upcoming')}</p>
      ) : (
        <ul class="unit-list">
          {units.map((u) => (
            <li>
              <a class="card unit-card" href={`/${locale}/${levelSlug}/${u.data.code}/`}>
                <span class="unit-num">{u.data.order.toString().padStart(2, '0')}</span>
                <span class="unit-body">
                  <strong>{u.data.title}</strong>
                  <span class="unit-meta">
                    {lessonsByUnit.get(u.data.code) ?? 0} {t(locale, 'unit.lessons').toLowerCase()} ·
                    ~{u.data.estimatedMinutes} min
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>

    <section class="curriculum">
      <h2>Currículum</h2>
      <ol>
        {level.data.curriculum.map((c) => <li>{c.title}</li>)}
      </ol>
    </section>
  </article>
</RootLayout>

<style>
  .level-header { padding-block: var(--s-6); border-block-end: 1px solid var(--c-border); }
  .level-header h1 { margin: 0 0 var(--s-2); font-size: 2.5rem; }
  .units, .curriculum { padding-block: var(--s-6); }
  .unit-list { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-3); }
  .unit-card { display: grid; grid-template-columns: auto 1fr; gap: var(--s-4); align-items: center; text-decoration: none; color: inherit; }
  .unit-num {
    font-weight: 700;
    font-size: 1.5rem;
    color: var(--c-red);
    inline-size: 48px;
    text-align: center;
  }
  .unit-body { display: grid; gap: var(--s-1); }
  .unit-meta { color: var(--c-text-muted); font-size: 0.9rem; }
  .curriculum ol { padding-inline-start: var(--s-5); color: var(--c-text-muted); display: grid; gap: var(--s-1); }
</style>
```

- [ ] **Step 2: Smoke-test**

```powershell
npm run dev
```

Visit `/es/a1/` — should show A1 header, "Unidades" with 1 entry (saludos), and curriculum list.

- [ ] **Step 3: Commit**

```powershell
git add src/pages/[locale]/[level]/index.astro
git commit -m "feat(pages): página de nivel con unidades y currículum"
```

---

### Task 15: ProgressBar component (used by level/unit/lesson pages)

**Files:**
- Create: `src/components/ui/ProgressBar.astro`

- [ ] **Step 1: Create the component**

```astro
---
interface Props {
  value: number;       // 0..100
  label?: string;
}
const { value, label } = Astro.props;
const clamped = Math.max(0, Math.min(100, value));
---
<div class="bar" role="progressbar" aria-valuenow={clamped} aria-valuemin="0" aria-valuemax="100" aria-label={label}>
  <div class="fill" style={`inline-size: ${clamped}%`}></div>
</div>

<style>
  .bar {
    inline-size: 100%;
    block-size: 6px;
    background: var(--c-bg-muted);
    border-radius: 3px;
    overflow: hidden;
  }
  .fill {
    block-size: 100%;
    background: var(--c-green);
    transition: inline-size 200ms;
  }
</style>
```

- [ ] **Step 2: Commit**

```powershell
git add src/components/ui/ProgressBar.astro
git commit -m "feat(ui): componente ProgressBar"
```

---

### Task 16: Unit page + UnitSidebar

**Files:**
- Create: `src/pages/[locale]/[level]/[unit]/index.astro`, `src/components/layout/UnitSidebar.astro`

- [ ] **Step 1: Create `src/components/layout/UnitSidebar.astro`**

```astro
---
import type { CollectionEntry } from 'astro:content';
import type { LocaleCode } from '../../i18n/config';

interface Props {
  locale: LocaleCode;
  levelCode: string;
  unitCode: string;
  lessons: CollectionEntry<'lessons'>[];
  currentLessonCode?: string;
}
const { locale, levelCode, unitCode, lessons, currentLessonCode } = Astro.props;
---
<aside class="unit-sidebar" aria-label="Lecciones de la unidad">
  <ol>
    {lessons.map((l) => (
      <li class:list={[{ active: l.data.code === currentLessonCode }]}>
        <a href={`/${locale}/${levelCode}/${unitCode}/${l.data.code}/`}>
          <span class="check" data-lesson-key={`${levelCode}/${unitCode}/${l.data.code}`} aria-hidden="true">○</span>
          <span class="title">{l.data.title}</span>
        </a>
      </li>
    ))}
  </ol>
</aside>

<script>
  // After hydration, ask the progress store which lessons are completed
  // and replace the bullet for those entries.
  import('/src/stores/progress.ts').then(({ getProgress }) => {
    const p = getProgress();
    document.querySelectorAll<HTMLElement>('[data-lesson-key]').forEach((el) => {
      const key = el.getAttribute('data-lesson-key');
      if (key && p.lessons[key]?.status === 'completed') {
        el.textContent = '✓';
        el.classList.add('done');
      }
    });
  });
</script>

<style>
  .unit-sidebar ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: var(--s-1);
  }
  .unit-sidebar a {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--s-3);
    padding: var(--s-3);
    border-radius: var(--r-md);
    text-decoration: none;
    color: var(--c-text);
    border-inline-start: 3px solid transparent;
  }
  .unit-sidebar a:hover { background: var(--c-bg-alt); }
  li.active a {
    background: var(--c-red-soft);
    border-inline-start-color: var(--c-red);
  }
  .check {
    inline-size: 1.5em;
    text-align: center;
    color: var(--c-text-dim);
  }
  .check.done { color: var(--c-green); }
</style>
```

- [ ] **Step 2: Create `src/pages/[locale]/[level]/[unit]/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import RootLayout from '../../../../layouts/RootLayout.astro';
import UnitSidebar from '../../../../components/layout/UnitSidebar.astro';
import { ACTIVE_LOCALES, type LocaleCode } from '../../../../i18n/config';
import { t } from '../../../../i18n/ui';

export async function getStaticPaths() {
  const allUnits = await getCollection('units');
  return allUnits
    .filter((u) => ACTIVE_LOCALES.some((loc) => u.id.startsWith(`${loc}/`)))
    .map((u) => {
      const [locale, levelCode] = u.id.split('/');
      return {
        params: { locale, level: levelCode, unit: u.data.code },
        props: { unit: u },
      };
    });
}

const { locale, level: levelCode, unit: unitCode } = Astro.params as {
  locale: LocaleCode; level: string; unit: string;
};
const { unit } = Astro.props;

const allLessons = await getCollection('lessons');
const lessons = allLessons
  .filter((l) => l.id.startsWith(`${locale}/${levelCode}/${unitCode}/`))
  .sort((a, b) => a.data.order - b.data.order);
---
<RootLayout locale={locale} title={unit.data.title}>
  <article class="container-wide unit-grid">
    <header class="unit-header">
      <p class="crumb"><a href={`/${locale}/${levelCode}/`}>{levelCode.toUpperCase()}</a> · Unidad {unit.data.order}</p>
      <h1>{unit.data.title}</h1>
      <p>{unit.data.description}</p>
      <p class="meta">{lessons.length} {t(locale, 'unit.lessons').toLowerCase()} · ~{unit.data.estimatedMinutes} min</p>
    </header>
    <UnitSidebar locale={locale} levelCode={levelCode} unitCode={unitCode} lessons={lessons} />
  </article>
</RootLayout>

<style>
  .unit-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--s-6);
    padding-block: var(--s-6);
  }
  .crumb { color: var(--c-text-muted); margin: 0 0 var(--s-2); }
  .crumb a { color: inherit; }
  h1 { margin: 0 0 var(--s-3); }
  .meta { color: var(--c-text-muted); font-size: 0.9rem; }
</style>
```

- [ ] **Step 3: Commit**

```powershell
git add src/components/layout/UnitSidebar.astro src/pages/[locale]/[level]/[unit]/index.astro
git commit -m "feat(pages): página de unidad y sidebar de lecciones con marcas de completadas"
```

---

### Task 17: Lesson page + LessonNav

**Files:**
- Create: `src/components/layout/LessonNav.astro`, `src/pages/[locale]/[level]/[unit]/[lesson].astro`

- [ ] **Step 1: Create `src/components/layout/LessonNav.astro`**

```astro
---
import type { LocaleCode } from '../../i18n/config';
import { t } from '../../i18n/ui';

interface Props {
  locale: LocaleCode;
  prevHref?: string;
  prevTitle?: string;
  nextHref?: string;
  nextTitle?: string;
}
const { locale, prevHref, prevTitle, nextHref, nextTitle } = Astro.props;
---
<nav class="lesson-nav" aria-label="Navegación entre lecciones">
  {prevHref ? (
    <a class="prev" href={prevHref}>
      <svg class="icon-direction-aware" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2" fill="none" />
      </svg>
      <span>
        <small>{t(locale, 'lesson.prev')}</small>
        <strong>{prevTitle}</strong>
      </span>
    </a>
  ) : <div></div>}
  {nextHref ? (
    <a class="next" href={nextHref}>
      <span>
        <small>{t(locale, 'lesson.next')}</small>
        <strong>{nextTitle}</strong>
      </span>
      <svg class="icon-direction-aware" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" fill="none" />
      </svg>
    </a>
  ) : <div></div>}
</nav>

<style>
  .lesson-nav {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--s-3);
    margin-block: var(--s-7);
  }
  .lesson-nav a {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    padding: var(--s-4);
    border: 1px solid var(--c-border);
    border-radius: var(--r-lg);
    text-decoration: none;
    color: inherit;
    background: var(--c-bg);
    transition: border-color 150ms, transform 150ms;
  }
  .lesson-nav a:hover { border-color: var(--c-red); transform: translateY(-2px); }
  .next { text-align: end; justify-content: end; }
  small { display: block; color: var(--c-text-muted); font-size: 0.8rem; }
  strong { display: block; }
</style>
```

- [ ] **Step 2: Create `src/pages/[locale]/[level]/[unit]/[lesson].astro`**

```astro
---
import { getCollection } from 'astro:content';
import RootLayout from '../../../../layouts/RootLayout.astro';
import UnitSidebar from '../../../../components/layout/UnitSidebar.astro';
import LessonNav from '../../../../components/layout/LessonNav.astro';
import ExercisesSection from '../../../../components/exercises/ExercisesSection.svelte';
import { ACTIVE_LOCALES, type LocaleCode } from '../../../../i18n/config';

export async function getStaticPaths() {
  const allLessons = await getCollection('lessons');
  return allLessons
    .filter((l) => ACTIVE_LOCALES.some((loc) => l.id.startsWith(`${loc}/`)))
    .map((l) => {
      const [locale, levelCode, unitCode] = l.id.split('/');
      return {
        params: { locale, level: levelCode, unit: unitCode, lesson: l.data.code },
        props: { lesson: l },
      };
    });
}

const { locale, level: levelCode, unit: unitCode, lesson: lessonCode } = Astro.params as {
  locale: LocaleCode; level: string; unit: string; lesson: string;
};
const { lesson } = Astro.props;
const { Content } = await lesson.render();

const allLessons = await getCollection('lessons');
const sibs = allLessons
  .filter((l) => l.id.startsWith(`${locale}/${levelCode}/${unitCode}/`))
  .sort((a, b) => a.data.order - b.data.order);
const idx = sibs.findIndex((l) => l.data.code === lessonCode);
const prev = idx > 0 ? sibs[idx - 1] : undefined;
const next = idx >= 0 && idx < sibs.length - 1 ? sibs[idx + 1] : undefined;
const lessonKey = `${levelCode}/${unitCode}/${lessonCode}`;
---
<RootLayout locale={locale} title={lesson.data.title}>
  <div class="container-wide lesson-grid">
    <UnitSidebar locale={locale} levelCode={levelCode} unitCode={unitCode} lessons={sibs} currentLessonCode={lessonCode} />
    <article class="lesson">
      <header>
        <p class="crumb">
          <a href={`/${locale}/${levelCode}/`}>{levelCode.toUpperCase()}</a> ·
          <a href={`/${locale}/${levelCode}/${unitCode}/`}>Unidad {sibs[0]?.data.order ?? ''}</a>
        </p>
        <h1>{lesson.data.title}</h1>
        <p class="meta">~{lesson.data.estimatedMinutes} min</p>
      </header>
      <div class="prose"><Content /></div>
      {lesson.data.exercises.length > 0 && (
        <ExercisesSection
          client:load
          exercises={lesson.data.exercises}
          lessonKey={lessonKey}
        />
      )}
      <LessonNav
        locale={locale}
        prevHref={prev ? `/${locale}/${levelCode}/${unitCode}/${prev.data.code}/` : undefined}
        prevTitle={prev?.data.title}
        nextHref={next ? `/${locale}/${levelCode}/${unitCode}/${next.data.code}/` : undefined}
        nextTitle={next?.data.title}
      />
    </article>
  </div>
</RootLayout>

<style>
  .lesson-grid {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: var(--s-6);
    padding-block: var(--s-6);
  }
  @media (max-width: 900px) {
    .lesson-grid { grid-template-columns: 1fr; }
  }
  .lesson { max-width: 720px; }
  .crumb { color: var(--c-text-muted); margin: 0 0 var(--s-2); }
  .crumb a { color: inherit; }
  .meta { color: var(--c-text-muted); }
  .prose :global(h2) { margin-block: var(--s-6) var(--s-3); }
  .prose :global(p) { margin-block: var(--s-3); }
  .prose :global(ul), .prose :global(ol) { padding-inline-start: var(--s-5); }
  .prose :global(em) { font-style: italic; }
  .prose :global(code) { background: var(--c-bg-muted); padding: 0 0.3em; border-radius: 4px; font-style: italic; font-family: inherit; }
  .prose :global(table) { border-collapse: collapse; margin-block: var(--s-4); }
  .prose :global(th), .prose :global(td) { border: 1px solid var(--c-border); padding: var(--s-2) var(--s-3); }
  .prose :global(th) { background: var(--c-bg-alt); }
</style>
```

- [ ] **Step 3: Commit**

```powershell
git add src/components/layout/LessonNav.astro src/pages/[locale]/[level]/[unit]/[lesson].astro
git commit -m "feat(pages): página de lección con sidebar, contenido y navegación prev/next"
```

---

### Task 18: About page (sobre)

**Files:**
- Create: `src/pages/[locale]/sobre.astro`

- [ ] **Step 1: Create the page**

```astro
---
import RootLayout from '../../layouts/RootLayout.astro';
import { ACTIVE_LOCALES, type LocaleCode } from '../../i18n/config';
import { t } from '../../i18n/ui';

export async function getStaticPaths() {
  return ACTIVE_LOCALES.map((locale) => ({ params: { locale } }));
}

const { locale } = Astro.params as { locale: LocaleCode };
---
<RootLayout locale={locale} title={t(locale, 'about.title')}>
  <article class="container prose">
    <h1>{t(locale, 'about.title')}</h1>

    <p>
      Este es un proyecto personal de aprendizaje colaborativo: aprender euskera
      enseñándolo. Lo que voy aprendiendo, lo voy publicando aquí, ordenado por
      niveles del MCER (A1 → C2). Es gratis, sin login, sin ads, y siempre lo será.
    </p>

    <h2>Filosofía</h2>
    <ul>
      <li><strong>Gratis</strong> y sin paywalls.</li>
      <li><strong>Sin login</strong>. Tu progreso vive en tu navegador y lo puedes exportar.</li>
      <li><strong>Sin ads</strong>. Sin tracking. Sin patrones oscuros.</li>
      <li><strong>Datos abiertos</strong>: las lecciones son archivos Markdown; cualquiera puede clonarlas, forkearlas o auto-hostearlas.</li>
      <li><strong>Eterno</strong>: el código es estático. Aunque desaparezca el mantenedor, el repo sigue vivo y cualquier persona puede continuarlo.</li>
    </ul>

    <h2>Fuentes</h2>
    <p>{t(locale, 'sources.statement')}</p>

    <h2>Licencias</h2>
    <ul>
      <li>Código: <a href="https://github.com/Crinlorite/euskera-static/blob/main/LICENSE" rel="noopener">MIT</a>.</li>
      <li>Contenido: <a href="https://github.com/Crinlorite/euskera-static/blob/main/LICENSE-CONTENT" rel="noopener">CC BY-SA 4.0</a> — libre para usar, compartir y adaptar con atribución y bajo la misma licencia.</li>
    </ul>

    <h2>Contribuir</h2>
    <p>
      ¿Detectaste un error? ¿Tienes ideas? Abre un issue o un PR en
      <a href="https://github.com/Crinlorite/euskera-static" rel="noopener">GitHub</a>.
      Las traducciones a otros idiomas son especialmente bienvenidas.
    </p>
  </article>
</RootLayout>

<style>
  .prose { padding-block: var(--s-6); }
  .prose h1 { margin: 0 0 var(--s-4); }
  .prose h2 { margin-block: var(--s-6) var(--s-2); }
  .prose ul { padding-inline-start: var(--s-5); display: grid; gap: var(--s-2); }
</style>
```

- [ ] **Step 2: Commit**

```powershell
git add src/pages/[locale]/sobre.astro
git commit -m "feat(pages): página 'Sobre el proyecto' con filosofía, fuentes y licencias"
```

---

### Task 19: Locale picker page (idioma)

**Files:**
- Create: `src/pages/[locale]/idioma.astro`

- [ ] **Step 1: Create the page**

```astro
---
import RootLayout from '../../layouts/RootLayout.astro';
import LangPicker from '../../components/ui/LangPicker.svelte';
import { ACTIVE_LOCALES, type LocaleCode } from '../../i18n/config';
import { t } from '../../i18n/ui';

export async function getStaticPaths() {
  return ACTIVE_LOCALES.map((locale) => ({ params: { locale } }));
}

const { locale } = Astro.params as { locale: LocaleCode };
---
<RootLayout locale={locale} title={t(locale, 'nav.language')}>
  <article class="container">
    <h1>{t(locale, 'lang.choose')}</h1>
    <p class="hint">{t(locale, 'lang.help-translate')}: <a href="https://github.com/Crinlorite/euskera-static" rel="noopener">GitHub</a></p>
    <LangPicker client:load currentLocale={locale} />
  </article>
</RootLayout>

<style>
  article { padding-block: var(--s-6); }
  h1 { margin: 0 0 var(--s-3); }
  .hint { color: var(--c-text-muted); margin: 0 0 var(--s-5); }
</style>
```

- [ ] **Step 2: Commit**

```powershell
git add src/pages/[locale]/idioma.astro
git commit -m "feat(pages): página de selección de idioma"
```

---

## Phase 7: Memory card system

### Task 20: Progress store types and localStorage I/O

**Files:**
- Create: `src/stores/progress.ts`

- [ ] **Step 1: Create the store with types and `getProgress` / `setProgress`**

```typescript
export const STORAGE_KEY = 'euskera-static.progress.v1';
export const SCHEMA_VERSION = 1 as const;

export interface ExerciseResult {
  attempts: number;
  bestScore: number;       // 0..100
  lastAttemptAt: string;   // ISO datetime
}

export interface LessonProgress {
  status: 'read' | 'completed';
  completedAt?: string;
  exercises: Record<string, ExerciseResult>;
}

export interface Streak {
  current: number;
  longest: number;
  lastStudiedDate: string; // ISO date (YYYY-MM-DD)
}

export interface Preferences {
  uiLocale?: string;
  theme?: 'light' | 'dark' | 'auto';
}

export interface ProgressV1 {
  schemaVersion: 1;
  createdAt: string;
  lastUpdated: string;
  lessons: Record<string, LessonProgress>;
  streak: Streak;
  preferences: Preferences;
}

export type ProgressAny = ProgressV1; // future versions union here

function emptyProgress(): ProgressV1 {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    createdAt: now,
    lastUpdated: now,
    lessons: {},
    streak: { current: 0, longest: 0, lastStudiedDate: '' },
    preferences: {},
  };
}

export function isStorageAvailable(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    const probe = '__probe__';
    localStorage.setItem(probe, probe);
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function getProgress(): ProgressV1 {
  if (!isStorageAvailable()) return emptyProgress();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyProgress();
  try {
    const parsed = JSON.parse(raw) as ProgressAny;
    return migrate(parsed);
  } catch {
    return emptyProgress();
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function setProgress(p: ProgressV1) {
  if (!isStorageAvailable()) return;
  p.lastUpdated = new Date().toISOString();
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  }, 500);
}

// Forward-only migrator. v1 is identity for now; add cases as schema grows.
export function migrate(p: ProgressAny): ProgressV1 {
  if (p.schemaVersion === 1) return p;
  // future: if (p.schemaVersion === 2) return migrate1to2(p);
  return emptyProgress();
}

export function recordLessonRead(lessonKey: string): ProgressV1 {
  const p = getProgress();
  if (!p.lessons[lessonKey]) {
    p.lessons[lessonKey] = { status: 'read', exercises: {} };
  }
  bumpStreak(p);
  setProgress(p);
  return p;
}

export function recordLessonCompleted(lessonKey: string): ProgressV1 {
  const p = getProgress();
  if (!p.lessons[lessonKey]) p.lessons[lessonKey] = { status: 'completed', exercises: {} };
  p.lessons[lessonKey].status = 'completed';
  p.lessons[lessonKey].completedAt = new Date().toISOString();
  bumpStreak(p);
  setProgress(p);
  return p;
}

export function recordExerciseResult(
  lessonKey: string,
  exerciseId: string,
  score: number,
): ProgressV1 {
  const p = getProgress();
  if (!p.lessons[lessonKey]) p.lessons[lessonKey] = { status: 'read', exercises: {} };
  const ex = p.lessons[lessonKey].exercises[exerciseId] ?? { attempts: 0, bestScore: 0, lastAttemptAt: '' };
  ex.attempts += 1;
  ex.bestScore = Math.max(ex.bestScore, Math.round(score));
  ex.lastAttemptAt = new Date().toISOString();
  p.lessons[lessonKey].exercises[exerciseId] = ex;
  bumpStreak(p);
  setProgress(p);
  return p;
}

function bumpStreak(p: ProgressV1) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  if (p.streak.lastStudiedDate === today) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (p.streak.lastStudiedDate === yesterday) {
    p.streak.current += 1;
  } else {
    p.streak.current = 1;
  }
  p.streak.longest = Math.max(p.streak.longest, p.streak.current);
  p.streak.lastStudiedDate = today;
}
```

- [ ] **Step 2: Type-check**

```powershell
npm run check
```

Expected: passes.

- [ ] **Step 3: Commit**

```powershell
git add src/stores/progress.ts
git commit -m "feat(progress): store con tipos, localStorage debounced y registros de lección/ejercicio"
```

---

### Task 21: Hash encoder + decoder (compress + base64url)

**Files:**
- Modify: `src/stores/progress.ts` (append)

- [ ] **Step 1: Append encode/decode helpers**

Add to the bottom of `src/stores/progress.ts`:

```typescript
// ---------- Hash encoding ----------

function bytesToBase64Url(bytes: Uint8Array): string {
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function base64UrlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = (s + pad).replaceAll('-', '+').replaceAll('_', '/');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function streamThrough(input: Uint8Array, transform: TransformStream<Uint8Array, Uint8Array>): Promise<Uint8Array> {
  const stream = new Response(new Blob([input as BlobPart])).body!.pipeThrough(transform);
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

export async function exportHash(p: ProgressV1 = getProgress()): Promise<string> {
  const json = JSON.stringify(p);
  const encoded = new TextEncoder().encode(json);
  // CompressionStream may not be defined in older runtimes — fall back to raw base64
  if (typeof CompressionStream === 'undefined') {
    return 'P0.' + bytesToBase64Url(encoded);
  }
  const compressed = await streamThrough(encoded, new CompressionStream('deflate-raw'));
  return 'P1.' + bytesToBase64Url(compressed);
}

export interface ImportResult {
  ok: boolean;
  reason?: 'invalid' | 'outdated';
  imported?: ProgressV1;
  skippedLessonKeys?: string[];
}

export async function importHash(hash: string, knownLessonKeys: Set<string>): Promise<ImportResult> {
  hash = hash.trim();
  if (!hash) return { ok: false, reason: 'invalid' };
  let payload: ProgressAny;
  try {
    if (hash.startsWith('P1.')) {
      const bytes = base64UrlToBytes(hash.slice(3));
      const expanded = await streamThrough(bytes, new DecompressionStream('deflate-raw'));
      payload = JSON.parse(new TextDecoder().decode(expanded));
    } else if (hash.startsWith('P0.')) {
      const bytes = base64UrlToBytes(hash.slice(3));
      payload = JSON.parse(new TextDecoder().decode(bytes));
    } else {
      // Tolerate raw JSON for very old or hand-crafted hashes
      payload = JSON.parse(hash);
    }
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  if (!payload || typeof payload !== 'object' || !('schemaVersion' in payload)) {
    return { ok: false, reason: 'invalid' };
  }
  if ((payload as ProgressAny).schemaVersion > SCHEMA_VERSION) {
    return { ok: false, reason: 'outdated' };
  }
  const migrated = migrate(payload);
  // Drop unknown lesson keys
  const skipped: string[] = [];
  for (const key of Object.keys(migrated.lessons)) {
    if (!knownLessonKeys.has(key)) {
      skipped.push(key);
      delete migrated.lessons[key];
    }
  }
  setProgress(migrated);
  return { ok: true, imported: migrated, skippedLessonKeys: skipped };
}
```

- [ ] **Step 2: Type-check**

```powershell
npm run check
```

Expected: passes.

- [ ] **Step 3: Commit**

```powershell
git add src/stores/progress.ts
git commit -m "feat(progress): exportHash/importHash con deflate-raw + base64url y validación"
```

---

### Task 22: Helper to enumerate known lesson keys at build time

**Files:**
- Create: `src/lib/lessonKeys.ts`

- [ ] **Step 1: Create the helper**

```typescript
import { getCollection } from 'astro:content';

export async function listLessonKeys(locale: string): Promise<string[]> {
  const all = await getCollection('lessons');
  // Lesson id format: 'es/a1/01-saludos/01-kaixo'
  // Internal key shape used by progress store: 'a1/01-saludos/01-kaixo' (locale-agnostic)
  return all
    .filter((l) => l.id.startsWith(`${locale}/`))
    .map((l) => l.id.split('/').slice(1).join('/'));
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/lib/lessonKeys.ts
git commit -m "feat(progress): helper para listar lesson keys conocidos"
```

---

### Task 23: Progress page UI (export/import)

**Files:**
- Create: `src/pages/[locale]/progreso.astro`, `src/components/progress/ProgressDashboard.svelte`

- [ ] **Step 1: Create `src/components/progress/ProgressDashboard.svelte`**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import {
    getProgress, exportHash, importHash, isStorageAvailable,
    type ProgressV1,
  } from '../../stores/progress';
  import { t } from '../../i18n/ui';
  import type { LocaleCode } from '../../i18n/config';

  export let locale: LocaleCode;
  export let knownLessonKeys: string[];

  let progress: ProgressV1 | null = null;
  let exportedHash = '';
  let importValue = '';
  let banner = '';
  let modalMode: 'none' | 'export' | 'import' = 'none';

  onMount(async () => {
    if (!isStorageAvailable()) {
      banner = t(locale, 'guest.banner');
    }
    progress = getProgress();
    exportedHash = await exportHash(progress);
  });

  async function refresh() {
    progress = getProgress();
    exportedHash = await exportHash(progress);
  }

  async function copyHash() {
    if (typeof navigator === 'undefined') return;
    await navigator.clipboard.writeText(exportedHash);
    banner = t(locale, 'common.copy') + ' ✓';
  }

  function downloadHash() {
    const blob = new Blob([exportedHash], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `euskera-progreso-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function shareHash() {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: 'Mi progreso de euskera',
          text: exportedHash,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      await copyHash();
    }
  }

  async function handleImport() {
    const known = new Set(knownLessonKeys);
    const existing = getProgress();
    const hasExisting = Object.keys(existing.lessons).length > 0;
    if (hasExisting && !confirm(t(locale, 'progress.import.overwrite'))) return;
    const result = await importHash(importValue, known);
    if (!result.ok) {
      banner = result.reason === 'outdated'
        ? t(locale, 'progress.import.outdated')
        : t(locale, 'progress.import.invalid');
      return;
    }
    if ((result.skippedLessonKeys?.length ?? 0) > 0) {
      banner = t(locale, 'progress.import.skipped');
    } else {
      banner = '✓';
    }
    importValue = '';
    modalMode = 'none';
    await refresh();
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { importValue = String(reader.result ?? ''); };
    reader.readAsText(file);
  }
</script>

{#if banner}
  <div class="banner" role="status">{banner}</div>
{/if}

{#if progress}
  <section class="summary">
    <div class="card">
      <strong>{Object.keys(progress.lessons).length}</strong>
      <span>lecciones empezadas</span>
    </div>
    <div class="card">
      <strong>{progress.streak.current}</strong>
      <span>{t(locale, 'progress.streak.days')}</span>
    </div>
    <div class="card">
      <strong>{progress.streak.longest}</strong>
      <span>récord</span>
    </div>
  </section>
{/if}

<section class="actions">
  <button class="btn btn-primary" on:click={() => (modalMode = 'export')}>
    📥 {t(locale, 'progress.export.title')}
  </button>
  <button class="btn btn-secondary" on:click={() => (modalMode = 'import')}>
    📤 {t(locale, 'progress.import.title')}
  </button>
</section>

{#if modalMode === 'export'}
  <div class="modal-overlay" on:click={() => (modalMode = 'none')} role="presentation"></div>
  <dialog class="modal" open>
    <h3>{t(locale, 'progress.export.title')}</h3>
    <textarea readonly>{exportedHash}</textarea>
    <p class="help">{t(locale, 'progress.export.help')}</p>
    <div class="actions">
      <button class="btn btn-primary" on:click={copyHash}>📋 {t(locale, 'progress.export.copy')}</button>
      <button class="btn btn-secondary" on:click={downloadHash}>💾 {t(locale, 'progress.export.download')}</button>
      <button class="btn btn-secondary" on:click={shareHash}>📲 {t(locale, 'progress.export.share')}</button>
      <button class="btn btn-secondary" on:click={() => (modalMode = 'none')}>{t(locale, 'common.close')}</button>
    </div>
  </dialog>
{/if}

{#if modalMode === 'import'}
  <div class="modal-overlay" on:click={() => (modalMode = 'none')} role="presentation"></div>
  <dialog class="modal" open>
    <h3>{t(locale, 'progress.import.title')}</h3>
    <textarea
      bind:value={importValue}
      placeholder="P1.eJyrVkpJ…"
      on:dragover|preventDefault
      on:drop={onDrop}
    ></textarea>
    <div class="actions">
      <button class="btn btn-primary" on:click={handleImport} disabled={!importValue.trim()}>
        {t(locale, 'progress.import.do')}
      </button>
      <button class="btn btn-secondary" on:click={() => (modalMode = 'none')}>{t(locale, 'common.cancel')}</button>
    </div>
  </dialog>
{/if}

<style>
  .banner { padding: var(--s-3) var(--s-4); background: var(--c-green-soft); color: var(--c-green-strong); border-radius: var(--r-md); margin-block-end: var(--s-4); }
  .summary { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: var(--s-3); margin-block-end: var(--s-5); }
  .summary .card { display: grid; gap: var(--s-1); text-align: center; }
  .summary strong { font-size: 2rem; }
  .summary span { color: var(--c-text-muted); font-size: 0.9rem; }
  .actions { display: flex; flex-wrap: wrap; gap: var(--s-3); margin-block: var(--s-4); }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100; }
  .modal { position: fixed; inset: 50% auto auto 50%; transform: translate(-50%, -50%); inline-size: min(90vw, 600px); padding: var(--s-5); border: 0; border-radius: var(--r-lg); z-index: 101; box-shadow: 0 12px 40px rgba(0,0,0,0.2); }
  .modal h3 { margin: 0 0 var(--s-3); }
  .modal textarea { inline-size: 100%; min-block-size: 140px; padding: var(--s-3); border: 1px solid var(--c-border); border-radius: var(--r-md); font-family: ui-monospace, monospace; font-size: 0.875rem; }
  .help { color: var(--c-text-muted); font-size: 0.9rem; }
</style>
```

- [ ] **Step 2: Create `src/pages/[locale]/progreso.astro`**

```astro
---
import RootLayout from '../../layouts/RootLayout.astro';
import ProgressDashboard from '../../components/progress/ProgressDashboard.svelte';
import { ACTIVE_LOCALES, type LocaleCode } from '../../i18n/config';
import { t } from '../../i18n/ui';
import { listLessonKeys } from '../../lib/lessonKeys';

export async function getStaticPaths() {
  return ACTIVE_LOCALES.map((locale) => ({ params: { locale } }));
}

const { locale } = Astro.params as { locale: LocaleCode };
const knownLessonKeys = await listLessonKeys(locale);
---
<RootLayout locale={locale} title={t(locale, 'nav.progress')}>
  <article class="container">
    <h1>{t(locale, 'nav.progress')}</h1>
    <ProgressDashboard client:load locale={locale} knownLessonKeys={knownLessonKeys} />
  </article>
</RootLayout>

<style>
  article { padding-block: var(--s-6); }
  h1 { margin: 0 0 var(--s-4); }
</style>
```

- [ ] **Step 3: Commit**

```powershell
git add src/components/progress/ProgressDashboard.svelte src/pages/[locale]/progreso.astro
git commit -m "feat(progress): página /progreso con export/import (copia, descarga, compartir, drop)"
```

---

## Phase 8: Exercise components

### Task 24: Exercise types + MultipleChoice

**Files:**
- Create: `src/components/exercises/types.ts`, `src/components/exercises/MultipleChoice.svelte`

- [ ] **Step 1: Create `src/components/exercises/types.ts`**

```typescript
export interface ExerciseResultEvent {
  exerciseId: string;
  score: number;        // 0..100
  finished: boolean;
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}
```

- [ ] **Step 2: Create `src/components/exercises/MultipleChoice.svelte`**

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let id: string;
  export let prompt: string;
  export let options: string[];
  export let answer: number;
  export let explanation: string | undefined = undefined;

  let chosen: number | null = null;
  const dispatch = createEventDispatcher<{ result: { exerciseId: string; score: number; finished: boolean } }>();

  function pick(i: number) {
    if (chosen !== null) return;
    chosen = i;
    const correct = i === answer;
    dispatch('result', { exerciseId: id, score: correct ? 100 : 0, finished: true });
  }
</script>

<div class="ex">
  <p class="prompt">{prompt}</p>
  <ul>
    {#each options as opt, i}
      <li>
        <button
          class="opt"
          class:correct={chosen !== null && i === answer}
          class:wrong={chosen === i && i !== answer}
          disabled={chosen !== null}
          on:click={() => pick(i)}
        >
          <span class="dot"></span>{opt}
        </button>
      </li>
    {/each}
  </ul>
  {#if chosen !== null && chosen !== answer}
    <p class="hint">Era: <strong>{options[answer]}</strong></p>
  {/if}
  {#if chosen !== null && explanation}
    <p class="explain">{explanation}</p>
  {/if}
</div>

<style>
  .ex { padding: var(--s-5); border: 1px solid var(--c-border); border-radius: var(--r-lg); margin-block: var(--s-4); }
  .prompt { font-weight: 600; margin: 0 0 var(--s-3); }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-2); }
  .opt {
    inline-size: 100%;
    text-align: start;
    padding: var(--s-3);
    border: 1px solid var(--c-border);
    border-radius: var(--r-md);
    background: var(--c-bg);
    transition: background-color 200ms, border-color 200ms, transform 200ms;
    display: flex; align-items: center; gap: var(--s-3);
  }
  .opt:hover:not([disabled]) { border-color: var(--c-text-dim); }
  .opt[disabled] { cursor: default; opacity: 0.85; }
  .dot { inline-size: 1rem; block-size: 1rem; border-radius: 50%; border: 2px solid var(--c-border); }
  .correct { background: var(--c-green-soft); border-color: var(--c-green); animation: bounce 200ms; }
  .correct .dot { border-color: var(--c-green); background: var(--c-green); }
  .wrong { background: var(--c-red-soft); border-color: var(--c-red); }
  .hint { color: var(--c-green-strong); margin-block-start: var(--s-3); }
  .explain { color: var(--c-text-muted); margin-block-start: var(--s-2); font-size: 0.9rem; }
  @keyframes bounce {
    0% { transform: scale(1); } 50% { transform: scale(1.03); } 100% { transform: scale(1); }
  }
</style>
```

- [ ] **Step 3: Commit**

```powershell
git add src/components/exercises/types.ts src/components/exercises/MultipleChoice.svelte
git commit -m "feat(exercises): MultipleChoice con feedback verde/rojo"
```

---

### Task 25: FillInBlank exercise

**Files:**
- Create: `src/components/exercises/FillInBlank.svelte`

- [ ] **Step 1: Create the component**

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { normalize } from './types';

  export let id: string;
  export let prompt: string;        // contains "___" where the blank goes
  export let answers: string[];     // first one is canonical, rest are accepted variants
  export let explanation: string | undefined = undefined;

  let value = '';
  let result: 'pending' | 'correct' | 'wrong' = 'pending';
  const dispatch = createEventDispatcher<{ result: { exerciseId: string; score: number; finished: boolean } }>();

  const before = prompt.split('___')[0] ?? prompt;
  const after = prompt.split('___')[1] ?? '';

  function check() {
    if (result !== 'pending') return;
    const v = normalize(value);
    const ok = answers.some((a) => normalize(a) === v);
    result = ok ? 'correct' : 'wrong';
    dispatch('result', { exerciseId: id, score: ok ? 100 : 0, finished: true });
  }
</script>

<div class="ex" class:correct={result === 'correct'} class:wrong={result === 'wrong'}>
  <p class="prompt">
    <span>{before}</span>
    <input
      type="text"
      bind:value
      on:keydown={(e) => e.key === 'Enter' && check()}
      disabled={result !== 'pending'}
      autocapitalize="off"
      autocomplete="off"
      autocorrect="off"
      spellcheck="false"
      placeholder="___"
    />
    <span>{after}</span>
  </p>
  <button class="btn btn-primary" on:click={check} disabled={result !== 'pending' || !value.trim()}>
    Comprobar
  </button>
  {#if result === 'wrong'}
    <p class="hint">Era: <strong>{answers[0]}</strong></p>
  {/if}
  {#if result !== 'pending' && explanation}
    <p class="explain">{explanation}</p>
  {/if}
</div>

<style>
  .ex { padding: var(--s-5); border: 1px solid var(--c-border); border-radius: var(--r-lg); margin-block: var(--s-4); transition: background 200ms; }
  .ex.correct { background: var(--c-green-soft); border-color: var(--c-green); }
  .ex.wrong { background: var(--c-red-soft); border-color: var(--c-red); }
  .prompt { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--s-2); font-size: 1.1rem; margin: 0 0 var(--s-3); }
  input {
    min-inline-size: 8em;
    padding: var(--s-2) var(--s-3);
    border: 1px solid var(--c-border);
    border-radius: var(--r-sm);
    font-size: 1rem;
  }
  input:focus { outline: 2px solid var(--c-text); outline-offset: 1px; border-color: var(--c-text); }
  .hint { color: var(--c-green-strong); }
  .explain { color: var(--c-text-muted); font-size: 0.9rem; }
</style>
```

- [ ] **Step 2: Commit**

```powershell
git add src/components/exercises/FillInBlank.svelte
git commit -m "feat(exercises): FillInBlank con normalización (case + tildes)"
```

---

### Task 26: Flashcards exercise

**Files:**
- Create: `src/components/exercises/Flashcards.svelte`

- [ ] **Step 1: Create the component**

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let id: string;
  export let cards: Array<{ eu: string; es: string }>;

  function shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  let deck = shuffle(cards);
  let i = 0;
  let flipped = false;
  let known = 0;

  const dispatch = createEventDispatcher<{ result: { exerciseId: string; score: number; finished: boolean } }>();

  function flip() { flipped = !flipped; }
  function mark(knew: boolean) {
    if (knew) known += 1;
    flipped = false;
    if (i < deck.length - 1) {
      i += 1;
    } else {
      const score = Math.round((known / deck.length) * 100);
      dispatch('result', { exerciseId: id, score, finished: true });
      // start over visually but exercise is recorded
      deck = shuffle(cards);
      i = 0;
      known = 0;
    }
  }
</script>

<div class="ex">
  <p class="meta">Tarjeta {i + 1} de {deck.length}</p>
  <button class="card" on:click={flip}>
    {#if !flipped}
      <span class="front">{deck[i].eu}</span>
      <small>(toca para ver traducción)</small>
    {:else}
      <span class="back">{deck[i].es}</span>
      <small>(toca para ocultar)</small>
    {/if}
  </button>
  <div class="actions">
    <button class="btn btn-secondary" on:click={() => mark(false)}>Lo aprendo</button>
    <button class="btn btn-primary" on:click={() => mark(true)}>Lo sabía</button>
  </div>
</div>

<style>
  .ex { padding: var(--s-5); border: 1px solid var(--c-border); border-radius: var(--r-lg); margin-block: var(--s-4); }
  .meta { color: var(--c-text-muted); font-size: 0.875rem; margin: 0 0 var(--s-3); text-align: center; }
  .card {
    inline-size: 100%;
    min-block-size: 180px;
    border: 1px solid var(--c-border);
    border-radius: var(--r-lg);
    background: var(--c-bg-alt);
    display: grid;
    place-items: center;
    gap: var(--s-2);
    padding: var(--s-6);
    transition: transform 200ms;
  }
  .card:hover { transform: translateY(-1px); }
  .front, .back { font-size: 1.6rem; font-weight: 700; }
  .back { font-style: italic; color: var(--c-text-muted); font-weight: 500; }
  small { color: var(--c-text-muted); font-size: 0.8rem; }
  .actions { display: flex; gap: var(--s-3); margin-block-start: var(--s-4); justify-content: center; }
</style>
```

- [ ] **Step 2: Commit**

```powershell
git add src/components/exercises/Flashcards.svelte
git commit -m "feat(exercises): Flashcards con flip y barajado por sesión"
```

---

### Task 27: MatchPairs + ExercisesSection wrapper

**Files:**
- Create: `src/components/exercises/MatchPairs.svelte`, `src/components/exercises/ExercisesSection.svelte`

- [ ] **Step 1: Create `src/components/exercises/MatchPairs.svelte`**

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let id: string;
  export let pairs: Array<{ eu: string; es: string }>;

  type Side = 'left' | 'right';
  interface Item { side: Side; text: string; pairIndex: number; matched: boolean; }

  function shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  let left: Item[] = shuffle(pairs.map((p, i) => ({ side: 'left' as Side, text: p.eu, pairIndex: i, matched: false })));
  let right: Item[] = shuffle(pairs.map((p, i) => ({ side: 'right' as Side, text: p.es, pairIndex: i, matched: false })));
  let selected: Item | null = null;
  let mistakes = 0;

  const dispatch = createEventDispatcher<{ result: { exerciseId: string; score: number; finished: boolean } }>();

  function pick(item: Item) {
    if (item.matched) return;
    if (!selected) { selected = item; return; }
    if (selected.side === item.side) { selected = item; return; }
    if (selected.pairIndex === item.pairIndex) {
      selected.matched = true;
      item.matched = true;
      left = [...left];
      right = [...right];
      selected = null;
      const allMatched = left.every((l) => l.matched);
      if (allMatched) {
        const score = Math.max(0, 100 - mistakes * 10);
        dispatch('result', { exerciseId: id, score, finished: true });
      }
    } else {
      mistakes += 1;
      selected = null;
    }
  }
</script>

<div class="ex">
  <p class="meta">Empareja cada palabra con su traducción.</p>
  <div class="grid">
    <ul>
      {#each left as item}
        <li>
          <button
            class:selected={selected === item}
            class:matched={item.matched}
            disabled={item.matched}
            on:click={() => pick(item)}
          >{item.text}</button>
        </li>
      {/each}
    </ul>
    <ul>
      {#each right as item}
        <li>
          <button
            class:selected={selected === item}
            class:matched={item.matched}
            disabled={item.matched}
            on:click={() => pick(item)}
          >{item.text}</button>
        </li>
      {/each}
    </ul>
  </div>
  {#if mistakes > 0}<p class="hint">Errores: {mistakes}</p>{/if}
</div>

<style>
  .ex { padding: var(--s-5); border: 1px solid var(--c-border); border-radius: var(--r-lg); margin-block: var(--s-4); }
  .meta { color: var(--c-text-muted); margin: 0 0 var(--s-3); }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-3); }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-2); }
  button {
    inline-size: 100%;
    padding: var(--s-3);
    border: 1px solid var(--c-border);
    border-radius: var(--r-md);
    background: var(--c-bg);
    text-align: center;
    transition: background 150ms, border-color 150ms;
    min-block-size: 44px;
  }
  button:hover:not([disabled]) { border-color: var(--c-text-dim); }
  button.selected { background: var(--c-red-soft); border-color: var(--c-red); }
  button.matched { background: var(--c-green-soft); border-color: var(--c-green); color: var(--c-green-strong); }
  .hint { color: var(--c-text-muted); margin-block-start: var(--s-3); font-size: 0.9rem; }
</style>
```

- [ ] **Step 2: Create `src/components/exercises/ExercisesSection.svelte`**

```svelte
<script lang="ts">
  import MultipleChoice from './MultipleChoice.svelte';
  import FillInBlank from './FillInBlank.svelte';
  import Flashcards from './Flashcards.svelte';
  import MatchPairs from './MatchPairs.svelte';
  import { recordExerciseResult, recordLessonRead, recordLessonCompleted } from '../../stores/progress';
  import { onMount } from 'svelte';

  type ExerciseShape =
    | { type: 'multiple-choice'; id: string; prompt: string; options: string[]; answer: number; explanation?: string }
    | { type: 'fill-in-blank'; id: string; prompt: string; answers: string[]; explanation?: string }
    | { type: 'flashcards'; id: string; cards: Array<{ eu: string; es: string }> }
    | { type: 'match-pairs'; id: string; pairs: Array<{ eu: string; es: string }> };

  export let exercises: ExerciseShape[];
  export let lessonKey: string;

  const completed = new Set<string>();

  onMount(() => recordLessonRead(lessonKey));

  function onResult(event: CustomEvent<{ exerciseId: string; score: number; finished: boolean }>) {
    const { exerciseId, score, finished } = event.detail;
    recordExerciseResult(lessonKey, exerciseId, score);
    if (finished) completed.add(exerciseId);
    if (completed.size === exercises.length) {
      recordLessonCompleted(lessonKey);
    }
  }
</script>

<section class="exercises">
  <h2>Ejercicios</h2>
  {#each exercises as ex (ex.id)}
    {#if ex.type === 'multiple-choice'}
      <MultipleChoice
        id={ex.id}
        prompt={ex.prompt}
        options={ex.options}
        answer={ex.answer}
        explanation={ex.explanation}
        on:result={onResult}
      />
    {:else if ex.type === 'fill-in-blank'}
      <FillInBlank
        id={ex.id}
        prompt={ex.prompt}
        answers={ex.answers}
        explanation={ex.explanation}
        on:result={onResult}
      />
    {:else if ex.type === 'flashcards'}
      <Flashcards id={ex.id} cards={ex.cards} on:result={onResult} />
    {:else if ex.type === 'match-pairs'}
      <MatchPairs id={ex.id} pairs={ex.pairs} on:result={onResult} />
    {/if}
  {/each}
</section>

<style>
  .exercises { margin-block: var(--s-7); }
  .exercises h2 { margin-block-end: var(--s-4); }
</style>
```

- [ ] **Step 3: Commit**

```powershell
git add src/components/exercises/MatchPairs.svelte src/components/exercises/ExercisesSection.svelte
git commit -m "feat(exercises): MatchPairs y wrapper que enlaza con el store de progreso"
```

---

## Phase 9: Visual flair

### Task 28: Lauburu (animated SVG) and Particles

**Files:**
- Create: `src/components/ui/Lauburu.svelte`, `src/components/ui/Particles.svelte`

- [ ] **Step 1: Create `src/components/ui/Lauburu.svelte`**

The lauburu is composed of 4 comma-shaped strokes rotated 90° each. Use a single `<g>` and rotate it with CSS.

```svelte
<script lang="ts">
  export let size: number = 200;
  export let opacity: number = 0.08;
  export let monochrome: boolean = false;

  // Color set: red, green, red, green for the 4 lobes when not monochrome
  const colors = monochrome ? ['#1A1A1A', '#1A1A1A', '#1A1A1A', '#1A1A1A'] : ['#D52B1E', '#00964B', '#D52B1E', '#00964B'];
</script>

<svg viewBox="-100 -100 200 200" width={size} height={size} style="opacity: {opacity}" aria-hidden="true">
  <defs>
    <path id="lobe" d="M0 0 C 30 -10, 60 -30, 80 -60 C 60 -30, 30 -5, 0 0 Z" />
  </defs>
  <g class="spin">
    {#each [0, 90, 180, 270] as angle, i}
      <use href="#lobe" transform={`rotate(${angle})`} fill={colors[i]} />
    {/each}
  </g>
</svg>

<style>
  svg { display: block; }
  .spin {
    transform-origin: center;
    animation: spin 30s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
</style>
```

- [ ] **Step 2: Create `src/components/ui/Particles.svelte`**

```svelte
<script lang="ts">
  type Particle = { left: number; size: number; dur: number; delay: number; color: string };
  const particles: Particle[] = [
    { left: 10, size: 8, dur: 18, delay: 0, color: 'var(--c-red)' },
    { left: 25, size: 6, dur: 22, delay: 3, color: 'var(--c-green)' },
    { left: 42, size: 10, dur: 16, delay: 1, color: 'var(--c-red)' },
    { left: 58, size: 7, dur: 24, delay: 5, color: 'var(--c-green)' },
    { left: 72, size: 9, dur: 20, delay: 2, color: 'transparent' },
    { left: 86, size: 5, dur: 19, delay: 4, color: 'var(--c-red)' },
  ];
</script>

<div class="layer" aria-hidden="true">
  {#each particles as p}
    <span
      class="dot"
      class:outline={p.color === 'transparent'}
      style={`left: ${p.left}%; inline-size: ${p.size}px; block-size: ${p.size}px; background: ${p.color}; animation-duration: ${p.dur}s; animation-delay: ${p.delay}s;`}
    ></span>
  {/each}
</div>

<style>
  .layer { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
  .dot {
    position: absolute;
    inset-block-end: -10%;
    border-radius: 50%;
    opacity: 0.4;
    animation: rise linear infinite;
  }
  .dot.outline { background: transparent !important; border: 1px solid var(--c-text-muted); }
  @keyframes rise {
    from { transform: translateY(0); opacity: 0.4; }
    to { transform: translateY(-110vh); opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) { .dot { animation: none; opacity: 0.2; } }
</style>
```

- [ ] **Step 3: Commit**

```powershell
git add src/components/ui/Lauburu.svelte src/components/ui/Particles.svelte
git commit -m "feat(ui): lauburu animado y partículas Ikurriña"
```

---

### Task 29: Hero section with lauburu + particles in home

**Files:**
- Modify: `src/pages/[locale]/index.astro`

- [ ] **Step 1: Edit the home to integrate hero visuals**

Replace the `<section class="hero">` block with:

```astro
import Lauburu from '../../components/ui/Lauburu.svelte';
import Particles from '../../components/ui/Particles.svelte';
```

(Add to the imports block at the top.)

Replace the hero markup:

```astro
<section class="hero">
  <div class="hero-bg">
    <Lauburu client:load size={520} opacity={0.07} />
    <Particles client:load />
  </div>
  <div class="container hero-inner">
    <h1>{t(locale, 'home.hero.title')}</h1>
    <p class="sub">{t(locale, 'home.hero.sub')}</p>
    <a class="btn btn-primary" href={`/${locale}/a1/`}>{t(locale, 'home.cta.start')}</a>
  </div>
</section>
```

Replace the `.hero` styles with:

```css
.hero {
  position: relative;
  overflow: hidden;
  padding-block: var(--s-8) var(--s-7);
  text-align: center;
}
.hero-bg {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
  z-index: 0;
}
.hero-inner { position: relative; z-index: 1; }
```

(Keep `.hero h1`, `.sub`, etc., as they were.)

- [ ] **Step 2: Smoke-test**

```powershell
npm run dev
```

Visit `/es/`. Should see the lauburu rotating slowly behind the headline, with a few floating particles. Stop server.

- [ ] **Step 3: Commit**

```powershell
git add src/pages/[locale]/index.astro
git commit -m "feat(home): hero con lauburu rotando y partículas Ikurriña"
```

---

### Task 30: Page transitions + scroll fade-ins

**Files:**
- Create: `src/styles/transitions.css`
- Modify: `src/layouts/RootLayout.astro` (add `<ViewTransitions />`, link transitions.css)

- [ ] **Step 1: Create `src/styles/transitions.css`**

```css
.fade-in {
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 400ms ease-out, transform 400ms ease-out;
}
.fade-in.in {
  opacity: 1;
  transform: translateY(0);
}
@media (prefers-reduced-motion: reduce) {
  .fade-in, .fade-in.in { opacity: 1; transform: none; transition: none; }
}
```

- [ ] **Step 2: Modify `src/layouts/RootLayout.astro`**

In the imports section add:
```astro
import { ViewTransitions } from 'astro:transitions';
import '../styles/transitions.css';
```

In `<head>`, add:
```astro
<ViewTransitions />
```

After `<slot />` (just before `</main>`), add inline scroll-fade behavior — but cleaner is to register a global script. Add at the end of body:

```astro
<script>
  const obs = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        obs.unobserve(e.target);
      }
    }
  }, { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('.fade-in').forEach((el) => obs.observe(el));
</script>
```

(This re-runs on each Astro view-transition navigation because Astro re-attaches inline scripts.)

- [ ] **Step 3: Commit**

```powershell
git add src/styles/transitions.css src/layouts/RootLayout.astro
git commit -m "feat(visual): astro:transitions y fade-in al scroll con prefers-reduced-motion"
```

---

## Phase 10: Asset generation

### Task 31: Generate favicons + OG image (Pillow script)

**Files:**
- Create: `scripts/generate-assets.py`, `public/favicon.svg`, `public/favicon-32.png`, `public/favicon-192.png`, `public/favicon-512.png`, `public/apple-touch-icon.png`, `public/og-image.png`

- [ ] **Step 1: Create `public/favicon.svg`**

A simple lauburu monochrome (the four-lobed Basque cross). Write the SVG by hand — same `<defs>` as the Svelte version but as a static, monochrome file.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -100 200 200">
  <defs>
    <path id="lauburu" d="M0 0 C 30 -10, 60 -30, 80 -60 C 60 -30, 30 -5, 0 0 Z" fill="#1A1A1A"/>
  </defs>
  <g>
    <use href="#lauburu" transform="rotate(0)"/>
    <use href="#lauburu" transform="rotate(90)"/>
    <use href="#lauburu" transform="rotate(180)"/>
    <use href="#lauburu" transform="rotate(270)"/>
  </g>
</svg>
```

- [ ] **Step 2: Create `scripts/generate-assets.py`**

```python
"""Generate raster icons and OG image from the canonical lauburu SVG.
Run once after changes to favicon.svg or branding. Outputs commit to public/.

Requirements: pip install pillow cairosvg
"""
from pathlib import Path
import io
from PIL import Image, ImageDraw, ImageFont
import cairosvg

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public'
SVG = PUBLIC / 'favicon.svg'

def render_svg_png(out: Path, size: int) -> None:
    png_bytes = cairosvg.svg2png(url=str(SVG), output_width=size, output_height=size)
    Image.open(io.BytesIO(png_bytes)).save(out, optimize=True)
    print(f'wrote {out.name}')

def make_og_image(out: Path) -> None:
    W, H = 1200, 630
    img = Image.new('RGB', (W, H), '#FFFFFF')
    draw = ImageDraw.Draw(img)
    # Lauburu on left, sized 360
    lauburu_png = cairosvg.svg2png(url=str(SVG), output_width=360, output_height=360)
    lauburu = Image.open(io.BytesIO(lauburu_png)).convert('RGBA')
    img.paste(lauburu, (90, (H - 360) // 2), lauburu)
    # Text
    try:
        font_title = ImageFont.truetype(str(PUBLIC / 'fonts' / 'Manrope-Variable.woff2'), 96)
        font_sub = ImageFont.truetype(str(PUBLIC / 'fonts' / 'Manrope-Variable.woff2'), 36)
    except Exception:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()
    draw.text((520, 220), 'Aprende euskera', fill='#1A1A1A', font=font_title)
    draw.text((520, 340), 'Gratis · Sin login · Para todos', fill='#6B6B6B', font=font_sub)
    draw.text((520, 470), 'euskera.crintech.pro', fill='#D52B1E', font=font_sub)
    img.save(out, optimize=True)
    print(f'wrote {out.name}')

if __name__ == '__main__':
    render_svg_png(PUBLIC / 'favicon-32.png', 32)
    render_svg_png(PUBLIC / 'favicon-192.png', 192)
    render_svg_png(PUBLIC / 'favicon-512.png', 512)
    render_svg_png(PUBLIC / 'apple-touch-icon.png', 180)
    make_og_image(PUBLIC / 'og-image.png')
```

- [ ] **Step 3: Run the script (locally)**

```powershell
python -m pip install pillow cairosvg
python scripts/generate-assets.py
```

Expected: 5 PNGs created in `public/`. Verify visually.

(If `cairosvg` install fails on Windows, alternative: open the SVG in a browser, screenshot/export at each size with a tool like Inkscape, save manually.)

- [ ] **Step 4: Commit**

```powershell
git add scripts/generate-assets.py public/favicon.svg public/favicon-32.png public/favicon-192.png public/favicon-512.png public/apple-touch-icon.png public/og-image.png
git commit -m "feat(assets): lauburu SVG + script generador de favicons + OG image"
```

---

## Phase 11: PWA + SEO

### Task 32: PWA manifest

**Files:**
- Create: `public/manifest.json`

- [ ] **Step 1: Create the manifest**

```json
{
  "name": "Euskera",
  "short_name": "Euskera",
  "description": "Aprende euskera, gratis y para todos.",
  "start_url": "/es/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#FFFFFF",
  "theme_color": "#FFFFFF",
  "orientation": "portrait-primary",
  "lang": "es",
  "icons": [
    { "src": "/favicon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/favicon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/favicon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- [ ] **Step 2: Commit**

```powershell
git add public/manifest.json
git commit -m "feat(pwa): manifest.json para Add to Home Screen"
```

---

### Task 33: robots.txt + sitemap (sitemap is auto from @astrojs/sitemap)

**Files:**
- Create: `public/robots.txt`

- [ ] **Step 1: Create the robots file**

```
User-agent: *
Allow: /

Sitemap: https://euskera.crintech.pro/sitemap-index.xml
```

- [ ] **Step 2: Smoke-test build**

```powershell
npm run build
```

Expected: `dist/sitemap-index.xml` and `dist/sitemap-0.xml` are generated by `@astrojs/sitemap`. Open them and confirm URLs are present.

- [ ] **Step 3: Commit**

```powershell
git add public/robots.txt
git commit -m "feat(seo): robots.txt apuntando al sitemap-index"
```

---

## Phase 12: A1 content (2 units, 10 lessons)

> **Authoring note:** These lesson drafts are based on standard CEFR A1 competencies. During execution, refine wording and exercises against the curriculum reference produced from the private tooling repo. Vocabulary and grammar shown are linguistic facts (public domain). Do not paste any external explanatory prose verbatim.

### Task 34: Unit 02 metadata (familia)

**Files:**
- Create: `src/content/units/es/a1/02-familia/index.yaml`

- [ ] **Step 1: Create the file**

```yaml
code: 02-familia
level: a1
title: La familia
order: 2
description: Vocabulario y patrones para hablar de tu familia y la de otros.
estimatedMinutes: 55
covers:
  - family-basics
  - family-extended
  - possessives
  - ukan-basic
  - numbers-1-20
```

- [ ] **Step 2: Build + commit**

```powershell
npm run build
git add src/content/units/
git commit -m "content(a1): unidad 02 — La familia (metadata)"
```

---

### Task 35: Lesson 01-saludos/01-kaixo

**Files:**
- Create: `src/content/lessons/es/a1/01-saludos/01-kaixo.md`

- [ ] **Step 1: Create the file**

```markdown
---
code: 01-kaixo
unit: 01-saludos
level: a1
order: 1
title: Kaixo, agur y otros saludos
estimatedMinutes: 10
covers: [greetings, courtesy]
exercises:
  - id: ex-01-kaixo-mc1
    type: multiple-choice
    prompt: ¿Qué significa "Kaixo"?
    options: [Hola, Adiós, Por favor, Gracias]
    answer: 0
    explanation: '"Kaixo" es el saludo más común en euskera, equivalente a "hola".'
  - id: ex-01-kaixo-mc2
    type: multiple-choice
    prompt: Es de noche y te encuentras a un amigo. ¿Cómo le saludas?
    options: [Egun on, Arratsalde on, Gabon, Agur]
    answer: 2
    explanation: '"Gabon" se usa por la noche, también para "buenas noches" al despedirse.'
  - id: ex-01-kaixo-mc3
    type: multiple-choice
    prompt: '"Aspaldiko" significa…'
    options: ["¡Hasta mañana!", "¡Cuánto tiempo sin verte!", "Buenas tardes", "De nada"]
    answer: 1
    explanation: '"Aspaldiko" se usa al reencontrarte con alguien tras tiempo sin verle.'
  - id: ex-01-kaixo-fc
    type: flashcards
    cards:
      - { eu: Kaixo, es: Hola }
      - { eu: Hepa / Aupa, es: '¡Hola! (informal)' }
      - { eu: Egun on, es: Buenos días }
      - { eu: Eguerdi on, es: Buen mediodía }
      - { eu: Arratsalde on, es: Buenas tardes }
      - { eu: Gabon, es: Buenas noches }
      - { eu: Aspaldiko, es: '¡Cuánto tiempo!' }
      - { eu: Agur, es: Adiós }
      - { eu: Gero arte, es: Hasta luego }
      - { eu: Bihar arte, es: Hasta mañana }
      - { eu: Ondo ibili, es: Que vaya bien }
      - { eu: Eskerrik asko, es: Muchas gracias }
      - { eu: Ez horregatik, es: De nada }
  - id: ex-01-kaixo-mp
    type: match-pairs
    pairs:
      - { eu: Kaixo, es: Hola }
      - { eu: Agur, es: Adiós }
      - { eu: Egun on, es: Buenos días }
      - { eu: Gabon, es: Buenas noches }
      - { eu: Gero arte, es: Hasta luego }
      - { eu: Eskerrik asko, es: Muchas gracias }
---

En euskera, los saludos cambian según el momento del día. La fórmula universal y la más común es **Kaixo**, que se usa a cualquier hora con casi cualquier persona — igual que el "hola" en castellano. **Hepa** o **Aupa** son alternativas aún más informales, sobre todo entre gente joven y amigos.

## Saludos por momento del día

| Cuándo | Euskera | Castellano |
|---|---|---|
| Mañana, hasta el mediodía | *Egun on* | Buenos días |
| Mediodía / hora de comer | *Eguerdi on* | Buen mediodía |
| Tarde, después de comer | *Arratsalde on* | Buenas tardes |
| Noche y despedida nocturna | *Gabon* | Buenas noches |
| Cualquier momento | *Kaixo* / *Hepa* / *Aupa* | Hola |

`On` significa "bueno", y aparece en muchos saludos: *egun on* literalmente es "día bueno".

## Reencontrarse

Cuando ves a alguien que llevabas tiempo sin ver, el saludo natural es **Aspaldiko!** ("¡cuánto tiempo!").

## Despedidas

La despedida más universal es **Agur**, equivalente a "adiós". También son frecuentes:

- **Gero arte** — hasta luego
- **Bihar arte** — hasta mañana
- **Hurrengora arte** — hasta la próxima
- **Ondo ibili** / **Ondo segi** — que vaya bien (literal: "anda bien")

## "Gracias" y "de nada"

Dos frases que vas a usar constantemente:

- **Eskerrik asko** (o **Mila esker**) — muchas gracias
- **Ez horregatik** — de nada

> **Nota cultural:** en Euskal Herria mucha gente alterna castellano y euskera con naturalidad. Empezar la conversación con *Kaixo* o *Egun on* es una manera amable de mostrar que conoces el idioma.
```

- [ ] **Step 2: Build + commit**

```powershell
npm run build
git add src/content/lessons/
git commit -m "content(a1): lección saludos básicos (kaixo, egun on, agur)"
```

---

### Task 36: Lesson 01-saludos/02-presentaciones

**Files:**
- Create: `src/content/lessons/es/a1/01-saludos/02-presentaciones.md`

- [ ] **Step 1: Create the file**

```markdown
---
code: 02-presentaciones
unit: 01-saludos
level: a1
order: 2
title: Presentarte (Ni X naiz)
estimatedMinutes: 10
covers: [introductions, izan-nor]
exercises:
  - id: ex-02-pres-fb1
    type: fill-in-blank
    prompt: 'Ni Mikel ___.'
    answers: [naiz]
    explanation: '"Naiz" es la forma de "izan" (ser/estar) para "yo".'
  - id: ex-02-pres-mc1
    type: multiple-choice
    prompt: Quieres decir "Soy Maialen". ¿Cómo lo dices?
    options: [Ni Maialen naiz, Ni Maialen da, Ni Maialen zara, Ni Maialen gara]
    answer: 0
    explanation: 'Para 1ª persona del singular usamos "naiz".'
  - id: ex-02-pres-fc
    type: flashcards
    cards:
      - { eu: Ni naiz, es: Yo soy }
      - { eu: Zu zara, es: Tú eres }
      - { eu: Hura da, es: Él/ella es }
      - { eu: Zer moduz?, es: ¿Qué tal? }
      - { eu: Ondo, eskerrik asko, es: Bien, gracias }
---

Para presentarte en euskera basta una fórmula muy simple: **Ni** (yo) + tu nombre + **naiz** (soy).

## El patrón

| Euskera | Castellano |
|---|---|
| *Ni Mikel naiz.* | Soy Mikel. |
| *Ni Maialen naiz.* | Soy Maialen. |
| *Ni Aitor naiz.* | Soy Aitor. |

El verbo **izan** ("ser/estar") cambia según la persona. Por ahora memoriza solo tres formas:

- *Ni* + **naiz** → yo soy
- *Zu* + **zara** → tú eres
- *Hura* + **da** → él/ella es

> En euskera no hay género gramatical en el verbo: *Hura da* sirve igual para "él es" o "ella es". Lo aclara el contexto o el nombre.

## "¿Qué tal?"

Una vez te has presentado, lo natural es preguntar cómo está la otra persona:

- *Zer moduz?* → ¿Qué tal?
- *Ondo, eskerrik asko.* → Bien, gracias.
- *Ni ere ondo.* → Yo también bien.

Con esas tres frases ya puedes mantener un saludo educado completo.
```

- [ ] **Step 2: Commit**

```powershell
npm run build
git add src/content/lessons/
git commit -m 'content(a1): lección presentarte (Ni X naiz, Zer moduz)'
```

---

### Task 37: Lesson 01-saludos/03-preguntar-nombre

**Files:**
- Create: `src/content/lessons/es/a1/01-saludos/03-preguntar-nombre.md`

- [ ] **Step 1: Create the file**

```markdown
---
code: 03-preguntar-nombre
unit: 01-saludos
level: a1
order: 3
title: Preguntar el nombre
estimatedMinutes: 10
covers: [introductions]
exercises:
  - id: ex-03-pn-mc1
    type: multiple-choice
    prompt: ¿Cómo preguntas "¿Cómo te llamas?" en euskera?
    options: [Zein da zure izena?, Nongoa zara?, Zer moduz?, Egun on?]
    answer: 0
    explanation: '"Zein" significa "cuál"; "izena" significa "el nombre"; literalmente "¿Cuál es tu nombre?".'
  - id: ex-03-pn-fb1
    type: fill-in-blank
    prompt: 'Nire izena Maialen ___.'
    answers: [da]
    explanation: '"Da" es la forma de "izan" (ser) para 3ª persona; el sujeto aquí es "izena".'
  - id: ex-03-pn-fc
    type: flashcards
    cards:
      - { eu: izen, es: nombre }
      - { eu: nire, es: mi }
      - { eu: zure, es: tu (de ti) }
      - { eu: bere, es: su (de él/ella) }
      - { eu: 'Zein da zure izena?', es: ¿Cómo te llamas? }
      - { eu: Nire izena Mikel da, es: Mi nombre es Mikel }
---

Hay dos maneras igualmente correctas de preguntar el nombre:

- **Zein da zure izena?** — "¿Cuál es tu nombre?"
- **Zure izena zein da?** — el orden de las palabras puede variar; ambas son naturales.

## Estructura

- **Zein** = cuál / qué (en preguntas de elección)
- **izena** = el nombre (la `-a` final es el artículo "el/la")
- **zure** = tu / tuyo
- **da** = es

## Cómo responder

Tienes dos opciones, igualmente válidas:

1. **Nire izena Mikel da.** — "Mi nombre es Mikel."
2. **Mikel naiz.** — "Soy Mikel." (el patrón de la lección anterior)

> Los posesivos básicos son *nire* (mi), *zure* (tu), *bere* (su). Los verás muchas veces más adelante — empieza a familiarizarte con ellos ya.
```

- [ ] **Step 2: Commit**

```powershell
npm run build
git add src/content/lessons/
git commit -m 'content(a1): lección preguntar el nombre (Zein da zure izena)'
```

---

### Task 38: Lesson 01-saludos/04-pronombres-personales

**Files:**
- Create: `src/content/lessons/es/a1/01-saludos/04-pronombres-personales.md`

- [ ] **Step 1: Create the file**

```markdown
---
code: 04-pronombres-personales
unit: 01-saludos
level: a1
order: 4
title: Pronombres personales
estimatedMinutes: 10
covers: [personal-pronouns, izan-nor]
exercises:
  - id: ex-04-pp-mp
    type: match-pairs
    pairs:
      - { eu: ni, es: yo }
      - { eu: zu, es: tú/usted }
      - { eu: hura, es: él/ella }
      - { eu: gu, es: nosotros }
      - { eu: zuek, es: vosotros }
      - { eu: haiek, es: ellos/ellas }
  - id: ex-04-pp-fb1
    type: fill-in-blank
    prompt: 'Gu Bilbon ___ (somos).'
    answers: [gara]
    explanation: 'Para "nosotros" la forma de "izan" es "gara".'
  - id: ex-04-pp-mc1
    type: multiple-choice
    prompt: ¿Cuál es la forma de "ser/estar" para "vosotros"?
    options: [naiz, zara, gara, zarete, dira]
    answer: 3
    explanation: 'Vosotros = zuek; la forma del verbo es "zarete".'
  - id: ex-04-pp-mc2
    type: multiple-choice
    prompt: '¿Cómo dices "Yo no soy estudiante"?'
    options: [Ni ikaslea naiz, Ni ez naiz ikaslea, Ez ni ikaslea naiz, Ni ikaslea ez naiz]
    answer: 1
    explanation: 'En euskera la negación va: SUJETO + ez + VERBO + atributo.'
---

En euskera estándar (*euskara batua*) hay siete pronombres personales:

| Pronombre | Quién | Verbo "izan" (NOR) |
|---|---|---|
| **ni** | yo | naiz |
| **hi** | tú (informal/cercano) | haiz |
| **zu** | tú (estándar) | zara |
| **hura** / **bera** | él, ella | da |
| **gu** | nosotros, nosotras | gara |
| **zuek** | vosotros, vosotras | zarete |
| **haiek** | ellos, ellas | dira |

> No existe distinción de género: *hura* sirve para él y ella; *haiek* para ellos y ellas. **Bera** es una variante muy frecuente de *hura* en habla cotidiana.

## Hi vs zu (importante)

En euskera hay dos formas de "tú":

- **zu** → tú estándar. Es lo que se usa en clase, con desconocidos, con compañeros de trabajo, con todo el mundo en cualquier registro neutro. **En A1 usa siempre `zu`.**
- **hi** → tú íntimo (*hitano*). Solo entre amigos cercanos, familia, o en algunos pueblos como registro habitual. Tiene su propia conjugación (`haiz`, `duk`/`dun` con marca de género del oyente). No la trabajamos en A1.

Si dudas, **usa `zu`** — funciona siempre.

## Negación

Para negar, antepones **ez** al verbo:

- *Ni ez naiz Mikel.* — Yo no soy Mikel.
- *Hau ez da nire kalea.* — Esta no es mi calle.
- *Gu ez gara ikasleak.* — Nosotros no somos estudiantes.

## Patrón completo

- **Ni** ikaslea **naiz**. — Yo soy estudiante.
- **Zu** irakaslea **zara**. — Tú eres profesor/a.
- **Hura** medikua **da**. — Él/ella es médico.
- **Gu** lagunak **gara**. — Nosotros somos amigos.
- **Zuek** anaiak **zarete**. — Vosotros sois hermanos.
- **Haiek** umeak **dira**. — Ellos son niños.
```

- [ ] **Step 2: Commit**

```powershell
npm run build
git add src/content/lessons/
git commit -m 'content(a1): lección pronombres personales y conjugación de izan (NOR)'
```

---

### Task 39: Lesson 01-saludos/05-nongoa-zara

**Files:**
- Create: `src/content/lessons/es/a1/01-saludos/05-nongoa-zara.md`

- [ ] **Step 1: Create the file**

```markdown
---
code: 05-nongoa-zara
unit: 01-saludos
level: a1
order: 5
title: De dónde eres y dónde vives
estimatedMinutes: 12
covers: [origin-koa, residence-an, countries-nationalities, locative-non]
exercises:
  - id: ex-05-nz-mc1
    type: multiple-choice
    prompt: '¿Qué quiere decir "Nongoa zara?"'
    options: [¿Cómo te llamas?, ¿De dónde eres?, ¿Qué edad tienes?, ¿Dónde vives?]
    answer: 1
    explanation: '"Nongoa" combina "non" (dónde) + sufijo de procedencia.'
  - id: ex-05-nz-fb1
    type: fill-in-blank
    prompt: 'Bilbo + -koa = ___ (de Bilbao).'
    answers: [Bilbokoa, bilbokoa]
    explanation: 'El sufijo "-ko" indica procedencia/pertenencia; con la "-a" del artículo queda "-koa".'
  - id: ex-05-nz-fb2
    type: fill-in-blank
    prompt: 'Vivo en Donostia = Donostia___ bizi naiz.'
    answers: [n]
    explanation: 'Para residencia se usa el locativo `-(e)n` ("en"). Donostia + -n = Donostian (la "a" final se mantiene).'
  - id: ex-05-nz-mc2
    type: multiple-choice
    prompt: '¿Cómo dices "¿Dónde vives?"'
    options: [Nongoa zara?, Non bizi zara?, Nor zara?, Zer egiten duzu?]
    answer: 1
    explanation: '"Non" es "dónde", "bizi zara" es "vives" — literal: "¿Dónde vives?"'
  - id: ex-05-nz-fc
    type: flashcards
    cards:
      - { eu: 'Nongoa zara?', es: ¿De dónde eres? }
      - { eu: Bilbokoa naiz, es: Soy de Bilbao }
      - { eu: Iruñekoa naiz, es: Soy de Pamplona }
      - { eu: Espainiakoa naiz, es: Soy de España }
      - { eu: 'Non bizi zara?', es: ¿Dónde vives? }
      - { eu: Bilbon bizi naiz, es: Vivo en Bilbao }
      - { eu: Donostian bizi naiz, es: Vivo en Donostia }
      - { eu: Madrilen bizi naiz, es: Vivo en Madrid }
---

Esta lección cubre dos preguntas que se confunden a menudo: **de dónde eres** (origen) y **dónde vives** (residencia actual). En euskera se construyen con sufijos distintos.

## Origen: Nongoa zara? → ...koa naiz

Para el origen usa **Nongoa zara?** y responde con el lugar + sufijo **`-(e)ko`** (con artículo: `-koa`):

| Lugar | Procedencia |
|---|---|
| Bilbo | Bilbo**koa** naiz (Soy de Bilbao) |
| Donostia | Donostia**koa** naiz (Soy de Donostia) |
| Iruñea | Iruñe**koa** naiz (Soy de Pamplona) |
| Madril | Madril**goa** naiz |
| Espainia | Espainia**koa** naiz |
| Argentina | Argentina**koa** naiz |

> Tras consonante el sufijo se adapta ortográficamente (*Madril* → *Madrilgoa*). Con la práctica sale solo.

## Residencia: Non bizi zara? → ...n bizi naiz

Para dónde vives ahora usa **Non bizi zara?** ("¿dónde vives?") + lugar con locativo **`-(e)n`**:

| Lugar | Residencia |
|---|---|
| Bilbo | Bilbo**n** bizi naiz |
| Donostia | Donostia**n** bizi naiz |
| Iruñea | Iruñea**n** bizi naiz |
| Madril | Madril**en** bizi naiz |

> Acabados en `-a` orgánica (Donostia) mantienen la `a`. Acabados en consonante (Madril) intercalan `-e-`.

## Las dos cosas en una conversación

> — *Kaixo! Zein da zure izena?* — Hola, ¿cómo te llamas?
> — *Ni Maialen naiz. Eta zu?* — Soy Maialen. ¿Y tú?
> — *Mikel naiz. **Nongoa zara?*** — Soy Mikel. ¿De dónde eres?
> — ***Iruñekoa naiz**, baina **Bilbon bizi naiz** orain.* — Soy de Pamplona, pero vivo en Bilbao ahora.

## Vocabulario útil

- **herri** — pueblo
- **hiri** — ciudad
- **herrialde** — comarca / región
- **estatu** — estado / país
- **norekin bizi zara?** — ¿con quién vives? → *Bakarrik bizi naiz* (vivo solo) / *Gurasoekin bizi naiz* (vivo con mis padres)
```

- [ ] **Step 2: Build + commit**

```powershell
npm run build
git add src/content/lessons/
git commit -m 'content(a1): lección Nongoa zara (procedencia con -koa y -tarra)'
```

This closes Unit 01 — `/es/a1/01-saludos/` should now show 5 lessons.

---

### Task 40: Lesson 02-familia/01-familia-basica

**Files:**
- Create: `src/content/lessons/es/a1/02-familia/01-familia-basica.md`

- [ ] **Step 1: Create the file**

```markdown
---
code: 01-familia-basica
unit: 02-familia
level: a1
order: 1
title: Familia básica
estimatedMinutes: 12
covers: [family-basics]
exercises:
  - id: ex-fb-mp
    type: match-pairs
    pairs:
      - { eu: aita, es: padre }
      - { eu: ama, es: madre }
      - { eu: anaia, es: hermano (de un hombre o de una mujer) }
      - { eu: arreba, es: hermana (la dice un hombre) }
      - { eu: ahizpa, es: hermana (la dice una mujer) }
      - { eu: seme, es: hijo }
      - { eu: alaba, es: hija }
  - id: ex-fb-mc1
    type: multiple-choice
    prompt: Maialen tiene una hermana. ¿Cómo se llama "hermana" desde el punto de vista de Maialen?
    options: [arreba, ahizpa, anaia, ama]
    answer: 1
    explanation: 'En euskera, una mujer llama "ahizpa" a su hermana; un hombre la llama "arreba".'
  - id: ex-fb-fc
    type: flashcards
    cards:
      - { eu: aita, es: padre }
      - { eu: ama, es: madre }
      - { eu: anaia, es: hermano }
      - { eu: arreba, es: hermana (de él) }
      - { eu: ahizpa, es: hermana (de ella) }
      - { eu: seme, es: hijo }
      - { eu: alaba, es: hija }
      - { eu: gurasoak, es: padres (los) }
      - { eu: anai-arrebak, es: hermanos y hermanas }
---

El euskera tiene una particularidad muy interesante en el vocabulario familiar: **la palabra para "hermana" depende de quién hable**.

## Vocabulario base

| Euskera | Castellano |
|---|---|
| *aita* | padre |
| *ama* | madre |
| *gurasoak* | los padres |
| *seme* | hijo |
| *alaba* | hija |
| *seme-alabak* | hijos e hijas |

## El detalle de "hermano/a"

- **anaia** — hermano (lo dicen tanto hombres como mujeres)
- **arreba** — hermana, **dicha por un hombre**
- **ahizpa** — hermana, **dicha por una mujer**

Por tanto:

> **Mikel** dice: *"Nire arreba Maialen da."* (Mi hermana es Maialen.)
> **Maialen** dice: *"Nire ahizpa Naia da."* (Mi hermana es Naia.)
> Tanto Mikel como Maialen dicen: *"Nire anaia Aitor da."* (Mi hermano es Aitor.)

Esto refleja una distinción muy antigua del euskera. No tiene equivalente directo en castellano y se aprende por uso. Si te equivocas al principio, no pasa nada — todo el mundo te entenderá.

## Plurales útiles

- **anai-arrebak** — hermanos y hermanas (forma genérica, sin distinción)
- **gurasoak** — los padres
- **seme-alabak** — hijos e hijas
```

- [ ] **Step 2: Commit**

```powershell
npm run build
git add src/content/lessons/
git commit -m 'content(a1): lección familia básica (aita, ama, anaia/arreba/ahizpa)'
```

---

### Task 41: Lesson 02-familia/02-aiton-amonak

**Files:**
- Create: `src/content/lessons/es/a1/02-familia/02-aiton-amonak.md`

- [ ] **Step 1: Create the file**

```markdown
---
code: 02-aiton-amonak
unit: 02-familia
level: a1
order: 2
title: Aiton-amonak (abuelos)
estimatedMinutes: 10
covers: [family-extended]
exercises:
  - id: ex-aa-fc
    type: flashcards
    cards:
      - { eu: aitona, es: abuelo }
      - { eu: amona, es: abuela }
      - { eu: aiton-amonak, es: los abuelos }
      - { eu: biloba, es: nieto/a }
      - { eu: bilobak, es: los nietos }
  - id: ex-aa-fb1
    type: fill-in-blank
    prompt: 'Mis abuelos = nire ___.'
    answers: [aiton-amonak]
    explanation: '"Aiton-amonak" combina aitona + amona en plural — convención frecuente en euskera para parejas.'
  - id: ex-aa-mc1
    type: multiple-choice
    prompt: '"Biloba" es...'
    options: [el sobrino, el nieto, el primo, el suegro]
    answer: 1
    explanation: '"Biloba" es nieto/nieta. No tiene marca de género.'
---

Los abuelos en euskera son **aitona** (abuelo) y **amona** (abuela). En plural, se prefiere la forma combinada **aiton-amonak**, que significa "abuelos" (los dos juntos).

## Vocabulario

| Euskera | Castellano |
|---|---|
| *aitona* | abuelo |
| *amona* | abuela |
| *aiton-amonak* | los abuelos (ambos) |
| *biloba* | nieto/nieta |
| *bilobak* | los nietos |

## El patrón "X-Y-ak"

El euskera tiene una forma elegante de hablar de parejas/grupos del mismo tipo combinando ambos términos en plural:

- **anai-arrebak** — hermanos y hermanas
- **aiton-amonak** — abuelos
- **seme-alabak** — hijos e hijas

> Cuando quieras decir "mis abuelos vinieron a casa", basta con **Nire aiton-amonak etxera etorri ziren** — sin tener que decir "abuelo y abuela".

## Frases útiles

- *Nire aitona Joxe da.* — Mi abuelo es Joxe.
- *Amona oso atsegina da.* — La abuela es muy amable.
- *Bi biloba ditu.* — Tiene dos nietos.
```

- [ ] **Step 2: Commit**

```powershell
npm run build
git add src/content/lessons/
git commit -m 'content(a1): lección abuelos y nietos (aiton-amonak, biloba)'
```

---

### Task 42: Lesson 02-familia/03-posesivos

**Files:**
- Create: `src/content/lessons/es/a1/02-familia/03-posesivos.md`

- [ ] **Step 1: Create the file**

```markdown
---
code: 03-posesivos
unit: 02-familia
level: a1
order: 3
title: Posesivos (nire, zure, bere…)
estimatedMinutes: 10
covers: [possessives]
exercises:
  - id: ex-pos-mp
    type: match-pairs
    pairs:
      - { eu: nire, es: mi/mío }
      - { eu: zure, es: tu/tuyo }
      - { eu: bere, es: su (de él/ella) }
      - { eu: gure, es: nuestro }
      - { eu: zuen, es: vuestro }
      - { eu: beren, es: su (de ellos) }
  - id: ex-pos-fb1
    type: fill-in-blank
    prompt: 'Mi madre = ___ ama.'
    answers: [nire, Nire]
  - id: ex-pos-mc1
    type: multiple-choice
    prompt: ¿Cómo dices "nuestra casa" en euskera?
    options: [nire etxea, zure etxea, gure etxea, beren etxea]
    answer: 2
    explanation: '"Gure" es el posesivo de "nosotros".'
---

Los posesivos en euskera se colocan **antes del sustantivo**, igual que en castellano. No cambian de forma según el género del objeto poseído (no hay "mío/mía", solo *nire*).

## Tabla completa

| Persona | Posesivo | Ejemplo | Castellano |
|---|---|---|---|
| ni | **nire** | nire ama | mi madre |
| zu | **zure** | zure aita | tu padre |
| hura | **bere** | bere arreba | su hermana (de él/ella) |
| gu | **gure** | gure etxea | nuestra casa |
| zuek | **zuen** | zuen lagunak | vuestros amigos |
| haiek | **beren** | beren autoa | su coche (de ellos) |

> Cuando un sustantivo va con posesivo no lleva el artículo "-a" añadido, pero sí cuando va sin posesivo: *nire ama* (mi madre) vs. *ama* — pero "la madre" sería *amaren* en otra estructura. En A1 te basta con la forma con posesivo, **siempre sin artículo**.

## Familia + posesivos

Combina lo aprendido para describir a tu familia:

- *Nire aita Patxi da.* — Mi padre es Patxi.
- *Zure ama nongoa da?* — ¿De dónde es tu madre?
- *Bere arreba Donostiakoa da.* — Su hermana es de Donostia.
- *Gure aiton-amonak Bilbon bizi dira.* — Nuestros abuelos viven en Bilbao.
```

- [ ] **Step 2: Commit**

```powershell
npm run build
git add src/content/lessons/
git commit -m 'content(a1): lección posesivos (nire, zure, bere, gure, zuen, beren)'
```

---

### Task 43: Lesson 02-familia/04-familia-extendida

**Files:**
- Create: `src/content/lessons/es/a1/02-familia/04-familia-extendida.md`

- [ ] **Step 1: Create the file**

```markdown
---
code: 04-familia-extendida
unit: 02-familia
level: a1
order: 4
title: Familia extendida
estimatedMinutes: 10
covers: [family-extended]
exercises:
  - id: ex-fe-mp
    type: match-pairs
    pairs:
      - { eu: osaba, es: tío }
      - { eu: izeba, es: tía }
      - { eu: lehengusu, es: primo }
      - { eu: lehengusina, es: prima }
      - { eu: iloba, es: sobrino/a }
  - id: ex-fe-mc1
    type: multiple-choice
    prompt: '"Lehengusu" es...'
    options: [primo, hermano, abuelo, suegro]
    answer: 0
  - id: ex-fe-fc
    type: flashcards
    cards:
      - { eu: osaba, es: tío }
      - { eu: izeba, es: tía }
      - { eu: lehengusu, es: primo }
      - { eu: lehengusina, es: prima }
      - { eu: iloba, es: sobrino, sobrina }
      - { eu: aitaginarreba, es: suegro }
      - { eu: amaginarreba, es: suegra }
      - { eu: koinatu, es: cuñado }
      - { eu: koinata, es: cuñada }
---

Más allá de padres, hermanos e hijos, la familia se extiende con tíos, primos, sobrinos y la familia política. Aquí tienes el vocabulario más usado.

## Tíos y primos

| Euskera | Castellano |
|---|---|
| *osaba* | tío |
| *izeba* | tía |
| *lehengusu* | primo |
| *lehengusina* | prima |
| *iloba* | sobrino/a (también "nieto/a" en algunos dialectos — el contexto decide) |

## Familia política

| Euskera | Castellano |
|---|---|
| *aitaginarreba* | suegro |
| *amaginarreba* | suegra |
| *koinatu* | cuñado |
| *koinata* | cuñada |
| *errain* | nuera |
| *suhi* | yerno |

## Patrones de uso

- *Nire osaba Bilbon bizi da.* — Mi tío vive en Bilbao.
- *Bere lehengusina hamabi urte ditu.* — Su prima tiene doce años.
- *Zure koinata euskalduna da?* — ¿Tu cuñada es vasca?

> Las palabras para familia política se forman a menudo combinando palabras existentes (*aita-* + *ginarreba*). No hace falta memorizar la lógica interna; con el uso se asientan.
```

- [ ] **Step 2: Commit**

```powershell
npm run build
git add src/content/lessons/
git commit -m 'content(a1): lección familia extendida (osaba, izeba, lehengusu, koinatu...)'
```

---

### Task 44: Lesson 02-familia/05-zenbat-senide

**Files:**
- Create: `src/content/lessons/es/a1/02-familia/05-zenbat-senide.md`

- [ ] **Step 1: Create the file**

```markdown
---
code: 05-zenbat-senide
unit: 02-familia
level: a1
order: 5
title: ¿Cuántos hermanos tienes? (Zenbat senide?)
estimatedMinutes: 12
covers: [ukan-basic, numbers-1-20]
exercises:
  - id: ex-zs-fb1
    type: fill-in-blank
    prompt: 'Tengo dos hermanos = Bi anaia ___.'
    answers: [ditut]
    explanation: '"Ditut" = "yo tengo (a varios)" — forma de "ukan" (tener) NOR-NORK.'
  - id: ex-zs-mc1
    type: multiple-choice
    prompt: '¿Cómo se dice "tres" en euskera?'
    options: [bat, bi, hiru, lau]
    answer: 2
  - id: ex-zs-fc
    type: flashcards
    cards:
      - { eu: bat, es: uno }
      - { eu: bi, es: dos }
      - { eu: hiru, es: tres }
      - { eu: lau, es: cuatro }
      - { eu: bost, es: cinco }
      - { eu: hamar, es: diez }
      - { eu: 'Zenbat senide zara?', es: ¿Cuántos hermanos sois? }
      - { eu: senide, es: hermano/a (genérico) }
      - { eu: dut, es: tengo (1 cosa) }
      - { eu: ditut, es: tengo (varias cosas) }
      - { eu: ez dut anaiarik, es: no tengo hermanos (negación con -rik) }
      - { eu: 'Zenbat urte dituzu?', es: '¿Cuántos años tienes?' }
---

Para hablar de cuántos miembros tiene una familia, usamos:

- **Zenbat senide zara?** → "¿Cuántos hermanos sois?" (literal: "¿Cuántos hermanos eres/sois?")
- **Familia handi(a)/txiki(a) bat dut.** → "Tengo una familia grande/pequeña."

## Números del 1 al 10

| Número | Euskera |
|---|---|
| 1 | *bat* |
| 2 | *bi* |
| 3 | *hiru* |
| 4 | *lau* |
| 5 | *bost* |
| 6 | *sei* |
| 7 | *zazpi* |
| 8 | *zortzi* |
| 9 | *bederatzi* |
| 10 | *hamar* |

## Decir cuántos tienes

Aquí entra una primera forma del verbo **ukan** (tener), que veremos a fondo en próximas lecciones:

- **Anaia bat dut.** — Tengo un hermano.
- **Bi anaia ditut.** — Tengo dos hermanos.
- **Hiru seme ditut.** — Tengo tres hijos.
- **Ez dut anaiarik.** — No tengo hermanos. (forma negativa)

> **dut** se usa cuando lo que tienes es **una sola cosa** o un sustantivo en singular. **ditut** se usa cuando son **varias cosas**. Es como la diferencia entre "tengo un libro" (singular) y "tengo libros" (plural).

## Frases típicas en presentaciones

- *Familia handi bat dut: bi anaia eta arreba bat.* — Tengo una familia grande: dos hermanos y una hermana.
- *Senide bakar bat naiz.* — Soy hijo único.
- *Zure familia handia da?* — ¿Tu familia es grande?
```

- [ ] **Step 2: Commit**

```powershell
npm run build
git add src/content/lessons/
git commit -m 'content(a1): lección zenbat senide (números 1-10 y ukan básico)'
```

This closes Unit 02. The site now has 10 lessons with full exercise data.

---

## Phase 13: Deploy

### Task 45: Cloudflare Pages connection + DNS

This task is **partially manual** — you log in to Cloudflare and click through the UI. The plan is here to track it.

- [ ] **Step 1: Push everything**

```powershell
git push origin main
```

Verify on https://github.com/Crinlorite/euskera-static that the latest commit is visible.

- [ ] **Step 2: Connect repo to Cloudflare Pages**

In the Cloudflare dashboard:

1. *Workers & Pages* → *Create application* → *Pages* → *Connect to Git*
2. Select `Crinlorite/euskera-static`
3. Production branch: `main`
4. Build settings:
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node version: set env var `NODE_VERSION = 20`
5. Save and Deploy

Wait for the first build to complete. The default `*.pages.dev` URL should serve the site.

- [ ] **Step 3: Custom domain**

In *Workers & Pages → euskera-static → Custom domains*:

1. Add custom domain: `euskera.crintech.pro`
2. Cloudflare will provision a CNAME — **with no proxy** (orange cloud off; gray cloud on). Proxied DNS on `*.crintech.pro` triggers redirect loops in our setup; keep DNS-only here.

Once DNS propagates (usually < 1 minute), the site is reachable at `https://euskera.crintech.pro`.

- [ ] **Step 4: Verify SSL**

Visit `https://euskera.crintech.pro/` in a clean browser. Should redirect to `/es/`. SSL must show as valid (no mixed content warnings).

(No commit for this task — it's a deployment configuration step.)

---

### Task 46: Production smoke test + Lighthouse

- [ ] **Step 1: Manual smoke checklist** (on a phone if possible)

Mark each as you verify:

- [ ] `/` → redirects to `/es/`
- [ ] `/es/` shows hero with lauburu visible (rotating slowly) and CTA "Empezar por el A1"
- [ ] `/es/a1/` shows curriculum and 2 unit cards (Saludos, Familia)
- [ ] `/es/a1/01-saludos/` shows 5 lessons in sidebar
- [ ] `/es/a1/01-saludos/01-kaixo/` renders prose, all 4 exercise types attempt-able
- [ ] Multiple choice gives green/red feedback
- [ ] Fill-in-blank accepts variants ("Kaixo", "kaixo", "kãixo")
- [ ] Flashcards flip and advance
- [ ] Match-pairs marks pairs in green
- [ ] After completing all exercises in a lesson, the sidebar of that unit shows ✓ green next to the lesson on next visit
- [ ] `/es/progreso/` shows summary, export modal works (copy + download + share)
- [ ] Import modal accepts the just-exported hash and replaces progress without errors
- [ ] `/es/idioma/` shows locale list with `Castellano` active and others as "Próximamente"
- [ ] `/es/sobre/` renders philosophy and license info
- [ ] Mobile drawer opens and closes cleanly under 768px width
- [ ] Page transitions don't flash blank
- [ ] OG image renders correctly when sharing the URL on WhatsApp / Telegram

- [ ] **Step 2: Lighthouse mobile audit**

Run Chrome DevTools Lighthouse against `/es/` and `/es/a1/01-saludos/01-kaixo/` (mobile, simulated):

| Category | Target |
|---|---|
| Performance | ≥ 90 |
| Accessibility | ≥ 90 |
| Best Practices | ≥ 90 |
| SEO | ≥ 90 |

Address regressions before tagging the release.

- [ ] **Step 3: Tag v0.0**

```powershell
git tag -a v0.0 -m "Foundation ship: shell + 2 unidades A1 + memory card + 4 ejercicios"
git push origin v0.0
```

- [ ] **Step 4: Update README to mark v0.0 live**

Replace in `README.md`:

```markdown
## Estado

v0.0 en construcción. Ver el [diseño completo](docs/superpowers/specs/2026-05-06-euskera-static-design.md).
```

with:

```markdown
## Estado

**v0.0 — vivo en [euskera.crintech.pro](https://euskera.crintech.pro).** Foundation ship: shell, 2 unidades del A1 (Saludos + Familia), 4 tipos de ejercicios, memory card. El A1 se completará en versiones siguientes.

Ver el [diseño completo](docs/superpowers/specs/2026-05-06-euskera-static-design.md) y el [plan de implementación](docs/superpowers/plans/2026-05-06-euskera-static-v0-implementation.md).
```

- [ ] **Step 5: Commit**

```powershell
git add README.md
git commit -m "docs: README anuncia v0.0 vivo"
git push origin main
```

---

## Self-review checklist (run before announcing the plan complete)

- [ ] Every spec section in §§1–11 has a task or set of tasks: stack (Tasks 1–4), content schema (10–12, 34, 39, 35–44), memory card (20–23), exercises (24–27), i18n+RTL (5, 6, 9), visual identity (3, 4, 28–30, 31), operations (2, 32–33, 45–46).
- [ ] No `TBD`, `TODO`, "implement later", "see Task N" without code.
- [ ] Type names consistent: `ProgressV1`, `LessonProgress`, `ExerciseResult`, `ExerciseResultEvent` are defined in Task 20/24 and reused unchanged.
- [ ] Function names consistent: `exportHash`, `importHash`, `getProgress`, `setProgress`, `recordLessonRead`, `recordLessonCompleted`, `recordExerciseResult`, `migrate` — match between definition and usage.
- [ ] No third-party tool attribution in any committed file. Commit messages are in Castilian, in author voice. No `Co-Authored-By` trailers.
- [ ] Curriculum extraction tooling stays out of this repo (defensive `.gitignore` patterns + private repo for the actual code).
- [ ] RTL discipline is enforced from Task 3 onward (logical properties only).

## Next plan (out of scope here)

After v0.0 ships, follow-up plans (write each as you reach it):

1. **Service Worker (v0.1 PWA)** — network-first HTML, cache-first assets, versioned `CACHE_NAME`.
2. **A1 content fill** — add Units 03–10 incrementally (one plan per 2-unit batch).
3. **English locale (v0.1)** — translate UI strings + author EN versions of Units 01–02.
4. **Arabic locale + RTL validation (v0.2)** — first RTL ship.
5. **Mobile packaging** — TWA via PWABuilder for Android, Capacitor wrapper for iOS.

Each of those is its own brainstorm → spec → plan cycle.
