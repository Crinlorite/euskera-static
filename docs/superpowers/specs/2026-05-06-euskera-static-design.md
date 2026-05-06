# Euskera Static — Design Specification

| Field | Value |
|---|---|
| Project | Euskera Static (Classic tier) |
| Repository | `github.com/Crinlorite/euskera-static` (public) |
| Domain | `euskera.crintech.pro` |
| Status | Design — pending implementation |
| Spec version | 1.0 |
| Date | 2026-05-06 |
| Author | Crinlorite |

## 1. Vision

A free, open, "eternal" portal to learn Euskera (Basque language). Built around a personal goal of *learning by teaching* — published lessons consolidate the author's own A1 progress, then grow with each level achieved. Designed so that, even if the author stops maintaining it, anyone can fork the repo, host it, and keep the knowledge alive.

### 1.1 Invariants

These are not nice-to-haves. They are inviolable design constraints:

1. **Free**. No paywalls, no upsells, no gating on the Classic tier.
2. **No login**. Zero accounts. Zero authentication. Zero personal data collection.
3. **No ads**. Not now, not ever, in the Classic tier.
4. **Open data**. All content (lessons, exercises, curriculum) lives as plain Markdown / YAML in the public repo. Anyone can clone, read, fork, and self-host.
5. **Eternal format**. Output is plain HTML/CSS/JS. No proprietary formats, no SaaS lock-in. The repo will outlive any single host. If Astro disappeared tomorrow, the `.md` files are still legible and `dist/*.html` still serve.

### 1.2 Tiers (Classic vs. Premium)

This spec defines **Classic**, the public-and-free-forever tier. A future **Premium** product (separate repository, separate subdomain, possibly with native iOS/Android apps and advanced personalized tutoring features) MAY exist as a complementary offering. Premium will never gate, restrict, or remove features from Classic. The Classic codebase and content remain MIT + CC BY-SA 4.0 in perpetuity.

## 2. Stack & Architecture

### 2.1 Stack

- **Astro 4+** with TypeScript (strict mode)
- **Svelte** for interactive islands (exercises, language picker, memory card UI). Lightweight, low-runtime-overhead.
- **CSS** with logical properties throughout (no `padding-left` / `margin-right` literals — use `padding-inline-start` / `margin-inline-end`). Required for free RTL support.
- **Self-hosted variable fonts** — Manrope (Latin/Cyrillic), Noto Sans Arabic (RTL), Noto Sans CJK (when relevant locales added).
- **Cloudflare Pages** for hosting (auto-deploy on push to `main`, no proxy on the DNS record).
- **No backend / no Functions in v0.0.** The site is 100% static.

### 2.2 Why Astro

- SSG output is plain static HTML; aligns with the "eternal" invariant.
- Content collections + Zod schemas give type-safe content authoring (TypeScript catches malformed lesson frontmatter at build time).
- Native i18n routing (`src/content/{collection}/{locale}/`).
- Islands architecture: only interactive components ship JavaScript; the rest of the site is pure HTML.
- Same family as `aovalhalla` (existing project), so contributor cognitive cost is low.

### 2.3 Repository layout

```
euskera-static/
├── astro.config.mjs              # i18n config, integrations
├── tsconfig.json                 # strict mode
├── package.json
├── public/
│   ├── favicon.svg               # lauburu monochrome
│   ├── favicon-32.png
│   ├── favicon-192.png           # PWA install (Chrome / Android)
│   ├── favicon-512.png           # PWA splash / iOS share
│   ├── apple-touch-icon.png      # 180x180
│   ├── og-image.png              # 1200x630
│   ├── manifest.json             # PWA metadata
│   └── fonts/                    # self-hosted variable fonts per locale
├── src/
│   ├── content/
│   │   ├── config.ts             # Zod schemas for levels/units/lessons
│   │   ├── levels/
│   │   │   └── es/
│   │   │       ├── a1.yaml       # curriculum + metadata for level A1
│   │   │       ├── a2.yaml       # placeholder until level activates
│   │   │       └── ...
│   │   ├── units/
│   │   │   └── es/a1/
│   │   │       └── 01-saludos/
│   │   │           └── index.yaml
│   │   └── lessons/
│   │       └── es/a1/01-saludos/
│   │           ├── 01-kaixo.md
│   │           ├── 02-egun-on.md
│   │           └── ...
│   ├── pages/
│   │   ├── index.astro                                  # redirect → /es/
│   │   ├── [locale]/index.astro                         # home
│   │   ├── [locale]/sobre.astro                         # about + credits + license
│   │   ├── [locale]/idioma.astro                        # locale picker
│   │   ├── [locale]/progreso.astro                      # memory card export/import
│   │   ├── [locale]/[level]/index.astro                 # level: curriculum + units list
│   │   ├── [locale]/[level]/[unit]/index.astro          # unit: lessons list
│   │   └── [locale]/[level]/[unit]/[lesson].astro       # lesson page
│   ├── components/
│   │   ├── exercises/
│   │   │   ├── MultipleChoice.svelte
│   │   │   ├── FillInBlank.svelte
│   │   │   ├── Flashcards.svelte
│   │   │   └── MatchPairs.svelte
│   │   ├── layout/
│   │   │   ├── Header.astro
│   │   │   ├── Footer.astro
│   │   │   ├── MobileDrawer.svelte
│   │   │   ├── UnitSidebar.astro
│   │   │   └── LessonNav.astro
│   │   └── ui/
│   │       ├── Lauburu.svelte             # animated SVG (hero)
│   │       ├── Particles.svelte           # floating particles (hero only)
│   │       ├── LangPicker.svelte
│   │       └── ProgressBar.astro
│   ├── i18n/
│   │   ├── ui.ts                  # flat translation map per locale (UI strings)
│   │   └── config.ts              # LANGUAGES table: code, name, dir, beta, font
│   ├── stores/
│   │   └── progress.ts            # memory card: localStorage + export/import + migrators
│   └── styles/
│       ├── tokens.css             # design tokens (palette, fonts, spacing) as CSS custom properties
│       ├── base.css               # reset + logical properties + body defaults
│       └── transitions.css        # Astro view transitions, fade-ins
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-05-06-euskera-static-design.md   # this file
├── LICENSE                          # MIT (code)
├── LICENSE-CONTENT                  # CC BY-SA 4.0 (content)
└── README.md
```

**Note on `tools/`**: there is no `tools/` directory in this repo. Curriculum-source extraction utilities and any scraping scripts are maintained in a **separate private repository** (`github.com/Crinlorite/euskera-static-tools`). No scraping code, fetched PDFs, internal extraction notes, or curriculum-source markdown ever land in this public repo.

### 2.4 `.gitignore` excerpts (security-relevant)

```gitignore
# Internal sourcing — never publish
tools/
output/
docs/curriculum-source.md
docs/curriculum-source/
.scrape-cache/
*.scraping.log

# Build outputs
dist/
.astro/
node_modules/

# Env
.env
.env.*
!.env.example
```

## 3. Content Schema

Each level has a curriculum (semi-static; what a learner should know on completion). Units distribute the curriculum across digestible blocks. Lessons live inside units and contain content + exercises. Lessons declare which curriculum points they `cover`, so the level page can auto-generate a "this point is covered by lessons X, Y, Z" view.

### 3.1 Level (`src/content/levels/{locale}/{level}.yaml`)

```yaml
code: a1
name: A1 Maila
description: Nivel inicial. Comprensión y producción básica en situaciones cotidianas.
order: 1
status: active           # active | placeholder | upcoming
curriculum:
  - id: greetings
    title: Saludos y presentaciones
  - id: present-nor
    title: Presente intransitivo (NOR)
  - id: numbers-1-100
    title: Números del 1 al 100
  # ... ~30-50 curriculum points for a full A1
beta: false
```

### 3.2 Unit (`src/content/units/{locale}/{level}/{slug}/index.yaml`)

```yaml
code: 01-saludos
level: a1
title: Saludos y primeras palabras
order: 1
covers:                  # which curriculum points this unit addresses
  - greetings
  - present-nor          # partial coverage
description: Aprende a saludar, despedirte y presentarte en euskera.
estimatedMinutes: 45
```

### 3.3 Lesson (`src/content/lessons/{locale}/{level}/{unit}/{slug}.md`)

Frontmatter is structured (Zod-validated); body is Markdown with permitted custom components (exercise islands, callouts).

```yaml
---
code: 01-kaixo
unit: 01-saludos
level: a1
order: 1
title: Kaixo, agur y otros saludos
estimatedMinutes: 10
covers: [greetings]
exercises:
  - type: multiple-choice
    id: ex-01-kaixo-1
    prompt: ¿Qué significa "Kaixo"?
    options: [Hola, Adiós, Por favor, Gracias]
    answer: 0
    explanation: '"Kaixo" es el saludo informal más común en euskera, equivalente a "hola".'
  - type: flashcards
    id: ex-01-kaixo-2
    cards:
      - { eu: Kaixo, es: Hola }
      - { eu: Egun on, es: Buenos días }
      - { eu: Agur, es: Adiós }
---

# Kaixo, agur y otros saludos

En euskera, los saludos varían según la hora del día y el grado de formalidad...
```

### 3.4 Slugs

URL slugs are written in Castilian Spanish (`/es/a1/01-saludos/01-kaixo/`) for v0. When other locales are added, each locale's content folder defines its own slugs (e.g. `/eu/a1-maila/01-agurrak/01-kaixo/`). Slugs are kebab-case and prefixed with order numbers for stable ordering and predictable navigation.

### 3.5 Internal code conventions

Internal field names (`code`, `unit`, `level`, `covers`, etc.) are in English as a code-style convention. User-visible strings are localized.

## 4. Memory Card System

The memory card is the user-controlled, deviceless, serverless mechanism for transporting progress between devices. It is the literal embodiment of the "no login" invariant.

### 4.1 User experience

**Page `/es/progreso/`** (linked from header and footer):

**Save:**
- Single primary CTA: **"📥 Guardar mi progreso"**
- Modal opens with:
  - Read-only textarea containing the encoded hash
  - Three buttons: **📋 Copiar al portapapeles** · **💾 Descargar archivo** (`euskera-progreso-YYYY-MM-DD.txt`) · **📲 Compartir** (Web Share API → WhatsApp/iMessage/Mail/etc.)
- Help text: *"Pega esto en tus notas o mándatelo a ti mismo. Cuando vuelvas en otro dispositivo, pégalo en 'Restaurar progreso' y seguirás donde lo dejaste."*

**Restore:**
- Single primary CTA: **"📤 Restaurar progreso"**
- Modal opens with:
  - Editable textarea
  - Drop zone for `.txt` files
- If local progress exists: confirmation prompt — *"Esto sobrescribirá tu progreso actual. ¿Continuar?"*
- Validation errors are written without technical jargon: *"No reconozco este código. ¿Lo copiaste completo?"*
- Schema migration is silent + observable: a toast confirms restoration; if any lessons referenced in the hash no longer exist, an additional toast: *"Restaurado. Algunas lecciones ya no existen y se han saltado."*

### 4.2 Data shape (schema v1)

```typescript
interface ProgressV1 {
  schemaVersion: 1;
  createdAt: string;          // ISO 8601
  lastUpdated: string;
  lessons: {
    [lessonKey: string]: {    // e.g. "a1/01-saludos/01-kaixo"
      status: 'read' | 'completed';
      completedAt?: string;
      exercises: {
        [exerciseId: string]: {
          attempts: number;
          bestScore: number;  // 0-100
          lastAttemptAt: string;
        };
      };
    };
  };
  streak: {
    current: number;
    longest: number;
    lastStudiedDate: string;  // ISO date (no time)
  };
  preferences: {
    uiLocale?: string;
    theme?: 'light' | 'dark' | 'auto';
  };
}
```

### 4.3 Hash encoding

```
Progress object
  → JSON.stringify (no whitespace)
  → CompressionStream('deflate-raw')
  → base64url
  → exportable string
```

Decoding reverses the pipeline. Both `CompressionStream` and `DecompressionStream` are native browser APIs (Chrome 80+, Safari 16.4+, Firefox 113+); no external dependencies.

**Size estimates:**
- Typical user (10–20 lessons in progress): ~1–2 KB
- Heavy user (full A1 + B1 in progress, 100 lessons with exercise history): ~7 KB

Both are pasteable in any notes app, message, or email.

### 4.4 Schema migration

Each migration is a pure function `(old: ProgressVN) => ProgressVN+1`. Migrations chain; importing a v1 hash on a v3 site applies `migrate1to2` then `migrate2to3` before merging into local storage. A v3 hash imported on a v1 site (rare; likely user error) shows: *"Este código es de una versión más reciente. Actualiza la página."*

Lessons referenced in an imported hash but no longer existing in the current site are silently dropped, and the user is notified via toast.

### 4.5 Auto-save

- Each interaction that changes state triggers a debounced (500ms) write to `localStorage` under key `euskera-static.progress.v1`.
- No "Saving…" spinner. No "Saved ✓" toast. Saves are assumed.
- If `localStorage` is unavailable (private browsing, restricted contexts): a discreet banner appears once per session — *"Modo invitado: tu progreso solo dura esta sesión. Exporta antes de cerrar."*

### 4.6 Progress UI cues

The site shows progress in three places, all calm and non-coercive:

1. **Unit sidebar:** ✓ in green next to completed lessons, empty circle otherwise.
2. **Level page:** progress bar showing `N/M lessons completed (P%)`.
3. **Header:** streak indicator (e.g., `🔥 7 días seguidos` in Castellano; localized per active UI locale) when current streak > 0.

What we explicitly do **not** do:
- No "you've broken your streak!" alerts.
- No XP, leagues, gems, or other gamification.
- No nag pop-ups.
- No engagement-maximizing dark patterns.

## 5. Exercise System

### 5.1 Types in MVP

| Type | Description | Frontmatter shape |
|---|---|---|
| **MultipleChoice** | One prompt, N options (typically 4), one correct. Click → immediate visual feedback (correct = green flash + bounce; incorrect = red soft + shows correct answer). | `prompt`, `options[]`, `answer` (index), `explanation?` |
| **FillInBlank** | Sentence with a blank, text input. Accepts variants (case-insensitive, accent-normalized; multiple correct answers possible). | `prompt`, `answers[]` |
| **Flashcards** | Pair list, flip-card UI (target ↔ source). Buttons "lo sabía" / "lo aprendo". The set is shuffled per session. | `cards[]: {eu, es}[]` |
| **MatchPairs** | Two columns; user matches by drag-drop or click-click. | `pairs[]: {eu, es}[]` |

### 5.2 Implementation

Each exercise type is a self-contained Svelte component (`src/components/exercises/<Type>.svelte`). Lesson pages render exercises by reading the `exercises` frontmatter array and instantiating the matching component as a `<{Type} client:visible />` island. Only exercises in the visible viewport hydrate; off-screen ones do not ship JS until scrolled into view.

Exercises receive their data as props and emit a `result` event on completion. The lesson page subscribes and forwards results to the progress store.

### 5.3 Future exercise types (post-MVP)

- **Listening** (when audio recordings exist; see §9).
- **Translation** (free-text translation with similarity scoring).
- **Conjugation** (auto-generated from a verb + tense + person).
- **Dictation** (audio + free text).

These are out of scope for v0.

## 6. Internationalization & RTL

### 6.1 Locale roadmap

| Locale code | Name | Direction | Phase | Notes |
|---|---|---|---|---|
| `es` | Castellano | LTR | **v0.0 — full** | Primary launch locale |
| `en` | English | LTR | v0.1 | UI translation + lessons re-narrated (not literal-translated) |
| `ar` | العربية | **RTL** | v0.2 | First RTL locale; validates RTL plumbing |
| `fr` | Français | LTR | v0.3 | |
| `ro` | Română | LTR | v0.4 | |
| `pt-BR` | Português (Brasil) | LTR | v0.5 | |
| `de` `it` `ru` `pl` `zh-Hans` `ja` `ko` | — | LTR | Community-driven | No active roadmap; PRs from native speakers welcomed |

**Display name rule:** for the `es` locale, the display name is "Castellano", **not** "Español". This is a deliberate cultural choice. The ISO code is unchanged.

### 6.2 Strings

| Type | Location | Format |
|---|---|---|
| UI strings (header, buttons, labels, validation messages) | `src/i18n/ui.ts` | Flat object per locale, EN fallback |
| Lesson content | `src/content/lessons/{locale}/...` | Markdown (one tree per locale) |
| Curriculum + units | `src/content/levels/{locale}/`, `src/content/units/{locale}/` | YAML |
| Exercise data | inside lesson frontmatter (same locale as lesson) | YAML |

### 6.3 Routing

```
/                              → 302 → /es/
/es/                           → home (Castellano)
/es/a1/                        → A1 level page (curriculum + units)
/es/a1/01-saludos/             → unit page (lessons list)
/es/a1/01-saludos/01-kaixo/    → lesson page
/en/, /ar/, ...                → analogous structures when those locales activate
```

Astro handles routing via `astro.config.mjs`:
```javascript
i18n: {
  defaultLocale: 'es',
  locales: ['es', 'en', 'ar', 'fr', 'ro', 'pt-BR', 'de', 'it', 'ru', 'pl', 'zh-Hans', 'ja', 'ko'],
  routing: { prefixDefaultLocale: true, redirectToDefaultLocale: true }
}
```

### 6.4 Beta flagging

Locales not yet reviewed by a native speaker carry `beta: true` in `LANGUAGES`. When a beta locale is active, the layout shows a discreet banner: *"Esta traducción está en beta — si ves algo raro, [avísanos]."* (link to a GitHub issue template). The flag drops once a native speaker signs off end-to-end.

### 6.5 RTL strategy

**Discipline rule (no exceptions):** all CSS uses logical properties.

- ✅ `padding-inline-start`, `margin-inline-end`, `border-inline-start: 4px solid red`
- ❌ `padding-left`, `margin-right`, `border-left`

`<html lang="ar" dir="rtl">` is set automatically by the layout based on the active locale's `dir` field in `LANGUAGES`. The browser mirrors all logical-property layouts without additional CSS. There are no `[dir="rtl"] { ... }` overrides.

**Directional icons** (next/prev arrows, breadcrumbs):
```css
.icon-direction-aware { transform: scaleX(var(--rtl-mirror, 1)); }
[dir="rtl"] { --rtl-mirror: -1; }
```

**Per-locale fonts** (loaded only for the active locale's character set, never bundled together):
| Locale | Font | License |
|---|---|---|
| `es` `en` `fr` `ro` `pt-BR` `de` `it` `pl` `ru` | Manrope (variable) | OFL |
| `ar` | Noto Sans Arabic (variable) | OFL |
| `zh-Hans` | Noto Sans SC | OFL |
| `ja` | Noto Sans JP | OFL |
| `ko` | Noto Sans KR | OFL |

All fonts are self-hosted in `public/fonts/`. CSS `@font-face` declarations are guarded by `unicode-range` so the browser only requests the appropriate font for the active script.

### 6.6 Memory card and locale changes

The progress hash stores lesson keys (`a1/01-saludos/01-kaixo`), not localized strings. Switching locales preserves all progress. If a lesson is not yet translated to the active locale but is available in another, the unit page shows it with a discreet badge: *"Solo disponible en Castellano"* (or the locale name appropriate to the active UI).

## 7. Visual Identity

### 7.1 Palette

```css
/* Brand — derived from the Ikurriña */
--c-red:           #D52B1E;
--c-red-soft:      #fef2f1;
--c-red-strong:    #b32218;
--c-green:         #00964B;
--c-green-soft:    #ebfaf2;
--c-green-strong:  #007038;

/* Surface */
--c-bg:            #FFFFFF;
--c-bg-alt:        #FAFAF7;
--c-bg-muted:      #F5F5F2;

/* Text */
--c-text:          #1A1A1A;   /* AAA contrast on white (16:1) */
--c-text-muted:    #6B6B6B;
--c-text-dim:      #A0A0A0;

/* Borders */
--c-border:        #E5E5E0;
--c-border-strong: #C9C9C2;
```

**Semantic mapping:**
- Red = primary action and exercise-incorrect feedback.
- Green = success, completed, streak, exercise-correct feedback.
- Background is white in all sections — no creamy or grey alternatives.

### 7.2 Typography

- **Manrope** (variable, weights 400–700) for everything except code.
- Hero / large titles: weight 700, letter-spacing -0.02em.
- Headings (h2–h4): weight 600.
- Body / lesson prose: weight 400, line-height 1.7.
- Captions / metadata: weight 500, size 0.875rem.
- Inline emphasis on Euskera words (within Castilian explanations): italic Manrope (no monospace; Euskera vocabulary should feel literary, not technical).

### 7.3 Effects

**Hero (home page only):**
- Animated lauburu SVG (Basque four-pointed cross): slow rotation (~30s/turn), opacity 0.08, large scale, positioned as a background layer behind hero content. CSS-only animation.
- 5–7 floating particles in Ikurriña colors (3 red, 2 green, 2 white-with-border), low opacity (~0.4), slow drift. CSS-only.
- Total effects budget: < 2 KB CSS, 0 JS.

**Rest of the site (lessons, exercises, profile, settings):** restrained.
- White background, content centered with `max-width: 720px` for comfortable reading.
- Cards: `border-radius: 12px`, `box-shadow: 0 1px 3px rgba(0,0,0,0.05)`, subtle lift on hover (`translateY(-2px)`, 150ms).
- Page transitions via Astro's `astro:transitions` (fade-slide, ~200ms).
- Scroll-triggered fade-ins via `IntersectionObserver` for long sections.

**Exercise feedback:**
- Correct: card briefly fills with `--c-green-soft`, green check icon, micro-bounce (`scale 1 → 1.03 → 1`, 200ms). No sound. No popup.
- Incorrect: card fills with `--c-red-soft` (no shake — would feel punitive). Correct answer appears below in green: *"Era: X"*.

### 7.4 Component styles

| Component | Style |
|---|---|
| Primary button | Background `--c-red`, white text, min 44×44px (touch target), `border-radius: 8px`, hover `--c-red-strong` + lift |
| Secondary button | Outline `--c-text`, transparent fill, hover `--c-bg-alt` |
| Lesson card | White, `border: 1px solid --c-border`, hover lift, ✓ badge in green when completed |
| Exercise input | Border `--c-border`, focus border `--c-text`, font-size 1rem (prevents iOS zoom-on-focus), generous padding |
| Unit sidebar | Vertical list, ✓ green / ○ empty bullets, active lesson with `background: --c-red-soft` and `border-inline-start: 3px solid --c-red` |
| Progress bar | `background: --c-bg-muted`, fill `--c-green`, height 6px, `border-radius: 3px` |
| Lauburu icon | Reused: hero animation, favicon, OG image, app icons |

### 7.5 Mobile-first

Layout is mobile-first; the site is expected to be used primarily on phones (commute, breaks, downtime).

- Container max-width 720px on desktop; lateral padding 1.5rem on mobile.
- Hamburger drawer (Svelte) below 768px.
- Bottom navigation considered for v0.x: 🏠 Home / 📚 Lecciones / 📊 Progreso. Decision deferred to implementation.
- All touch targets ≥ 44×44px.
- No hover-only affordances; everything reachable by tap.

### 7.6 Marketing assets

- **OG image** (`public/og-image.png`, 1200×630): white background, large Ikurriña-colored lauburu on the left, "Aprende Euskera" in Manrope 700 dark grey, subtitle "Gratis · Sin login · Para todos", URL `euskera.crintech.pro`.
- **Favicons:** monochrome SVG lauburu (#1A1A1A), PNG 32×32, PNG 512×512, Apple touch icon 180×180. Generated via a local Python script (Pillow), committed to `public/`.
- **Twitter Card** + **OG meta**: pointing to canonical URL, `og:locale` per page.

## 8. Operations

### 8.1 Deploy

| Aspect | Setup |
|---|---|
| Hosting | Cloudflare Pages |
| Trigger | Auto-deploy on push to `main` |
| Build command | `npm run build` |
| Output dir | `dist/` |
| Node version | LTS (currently 20.x) — pinned in `package.json` `engines` |
| DNS | Cloudflare (no proxy on the record — proxy causes redirect loops) |
| PR previews | Enabled (Cloudflare Pages defaults) |
| Functions | None in v0 (site is fully static) |

### 8.2 Licensing

| Layer | License | Rationale |
|---|---|---|
| Code (everything in `src/`, build configs) | **MIT** | Allow forks, derived tools, community contributions without friction |
| Content (lessons, units, curriculum, translations) | **CC BY-SA 4.0** | Free use / share / adapt with attribution and same-license sharing — keeps any derivatives equally open |
| Generated assets (own-art SVGs, OG image, favicons) | **CC0** | Public domain; no restrictions |

The repo contains:
- `LICENSE` — MIT
- `LICENSE-CONTENT` — CC BY-SA 4.0
- `README.md` — clearly explains which license covers which directory

### 8.3 Sourcing & content provenance

The curriculum reflects the **standard CEFR (Common European Framework of Reference) competencies for Euskera at each level (A1–C2)**. Vocabulary lists, grammar rules, declension and conjugation tables are linguistic facts of public domain and are not copyrightable. Explanations, examples, exercises, and pedagogical narration are **original work** produced by the maintainer and licensed under CC BY-SA 4.0.

Any external materials consulted during planning (curriculum reference documents from public educational sources) serve as **planning input** only — to determine which competencies belong at which level and which vocabulary topics are conventional at each stage. No verbatim text, exercise prompts, or pedagogical examples from external materials are reproduced in the published site.

The internal toolset that performs any extraction or curriculum-mapping work lives in a **separate private repository** (`euskera-static-tools`). It is not part of this public repository and is not referenced by name or URL in any public-facing surface.

The `Sobre el proyecto` page on the site states:
> *"El currículum sigue los estándares CEFR oficiales para los niveles A1–C2 del euskera. Las explicaciones, ejemplos y ejercicios son material original. Vocabulario y reglas gramaticales son hechos lingüísticos de dominio público."*

### 8.4 MVP — what ships in v0.0 (foundation ship)

The "foundation ship" goes live to production with the engine fully working but content intentionally minimal. The motor is alive; content fills in incrementally afterward.

| Category | v0.0 scope |
|---|---|
| Shell | Header (logo + locale picker), footer (credits + GitHub link + license), mobile drawer, responsive layout, page transitions |
| Pages | `/es/`, `/es/sobre/`, `/es/idioma/`, `/es/progreso/` |
| Levels | `/es/a1/` active. A2–C2 visible as "Próximamente" placeholders, disabled |
| A1 content | Full A1 curriculum. **2 fully written units** (~10 lessons total) — saludos + familia |
| Exercises | All 4 types working end-to-end (MultipleChoice, FillInBlank, Flashcards, MatchPairs) with visual feedback and auto-save |
| Memory card | Export / import / migrate / share, schema v1, validated and tested |
| i18n | `es` active. Locale picker shows others as "Próximamente · ayúdanos en GitHub" with link |
| PWA | `manifest.json` + 192/512 icons + Apple touch icon → installable. **No Service Worker in v0.0** (deliberate — see §8.5) |
| SEO | Meta tags, OG image, sitemap.xml, robots.txt, hreflang structure prepared |
| Assets | Self-made lauburu SVG, OG image, favicons |

### 8.5 PWA roadmap

| Version | Adds | Effort |
|---|---|---|
| v0.0 | Manifest + icons (installable; no offline) | Included in MVP |
| v0.1 | Service Worker — network-first for HTML, cache-first for static assets, versioned `CACHE_NAME` bumped per release | ~½ day |
| v0.2 | Optional "Download for offline" button per level: pre-caches all lesson HTML + assets for that level into the SW | ~½ day |

**Service Worker discipline (carried over from prior project incident):** never cache-first on HTML that references hashed bundles. Always network-first for navigations. Bump `CACHE_NAME` on every release that changes assets. This is in place to avoid a known caching-bug class observed in another project.

### 8.6 Mobile packaging (post-MVP)

| Platform | Approach | Effort |
|---|---|---|
| Android | TWA (Trusted Web Activity) via PWABuilder + Bubblewrap | ~1 day + Play Console setup |
| iOS | PWABuilder iOS wrapper or Capacitor wrapper for App Store distribution | ~1–2 days + Apple Developer cert |

Both consume the same deployed PWA. No separate codebase. iOS notification limitations are accepted.

### 8.7 Quality gates (CI)

| Check | When |
|---|---|
| `tsc --noEmit` (TypeScript typecheck) | Each PR |
| `astro check` | Each PR |
| `npm run build` (build success) | Each PR |
| Lighthouse mobile (perf / a11y / best-practices ≥ 90) | Manual, before each release tag |
| HTML / accessibility validation | Manual, before each release tag |
| RTL visual regression | When `ar` locale activates |

No unit tests in v0. Content is content; exercises are data-driven. Bugs surface via use.

## 9. Out of Scope (v0)

The following are explicitly **not** built in v0 and are deferred to later versions or to the future Premium tier:

- **Advanced tutoring features** (conversational practice, automated error analysis, personalized exercise generation) — Premium territory.
- **Native iOS / Android apps in Kotlin / Swift** — Premium territory; v0–v0.x rely on PWA wrappers.
- **Audio recordings of pronunciation** — listed for v0.x once recordings exist and a Listening exercise type is added.
- **User accounts and cross-device sync via server** — explicitly excluded by invariant 2 ("no login"). Cross-device transfer is via memory card.
- **Forum / comments / community features** — out of scope. GitHub Issues is the feedback channel.
- **Analytics with personal data** — never. If analytics is added at all, only privacy-preserving aggregate (e.g., Cloudflare Web Analytics, no cookies, no fingerprinting).

## 10. Decisions Log (key tradeoffs)

| Decision | Alternatives considered | Rationale |
|---|---|---|
| Astro over vanilla HTML/CSS/JS | Pure HTML (celtiberos style), Vite+React (Royal Forge style) | Astro's content collections + i18n suit a structured learning portal with growing content; static output preserves "eternal" invariant |
| Svelte for islands over React | React, vanilla JS | Smaller runtime, simpler authoring for small interactive components; not constrained by other Crintech projects' choices |
| MIT + CC BY-SA 4.0 over more permissive (CC BY) for content | CC BY, CC0 for content | Same-license requirement keeps derivatives open — protects the "eternal" invariant against silos that might fork-and-close |
| Memory card via deflate-raw + base64url over JSON | Plain JSON in textarea, encrypted blob | Compression keeps hashes pasteable in messages; base64url is URL-safe; no encryption needed (data is not sensitive) |
| RTL on day 1 over deferred | Add RTL when first RTL locale arrives | Adding RTL retroactively requires rewriting all CSS; doing it from day 1 is ~10–15% extra discipline with no rewrite later |
| "Castellano" display name over "Español" for `es` | "Español", "Spanish" | Cultural fit with Basque Country context; ISO code unchanged |
| Service Worker in v0.1 not v0.0 | Ship SW from day 1 | Avoid a known cache-related bug class until the SW configuration is deliberate; manifest-only PWA is still installable |
| Tools/sourcing in private separate repo over local-only | All-local, mixed in the public repo | Versioned history without exposing extraction details; clean separation between the eternal Classic site and the operational toolkit |
| Foundation ship (engine + 2 units) over content-heavy v0 | A1 fully complete in v0 | Engine validated end-to-end early; content fill is incremental and transparent to users |

## 11. Open questions

None at spec close. Items deferred to implementation:

- Bottom navigation on mobile — decided during implementation, based on visual review of the prototype.
- Concrete font weights for the lauburu hero — fine-tuned visually after first render.
- Exact error-message copy for memory card edge cases — written during implementation, reviewed by the author.

## Appendix A. File-by-file v0.0 manifest

Files committed at v0.0 release tag:

```
.gitignore
README.md
LICENSE
LICENSE-CONTENT
package.json
package-lock.json
astro.config.mjs
tsconfig.json
public/
  favicon.svg, favicon-32.png, favicon-192.png, favicon-512.png, apple-touch-icon.png
  og-image.png
  manifest.json
  fonts/Manrope-Variable.woff2
src/
  content/
    config.ts
    levels/es/a1.yaml ... c2.yaml
    units/es/a1/01-saludos/index.yaml
    units/es/a1/02-familia/index.yaml
    lessons/es/a1/01-saludos/<5 .md files>
    lessons/es/a1/02-familia/<5 .md files>
  pages/
    index.astro
    [locale]/index.astro
    [locale]/sobre.astro
    [locale]/idioma.astro
    [locale]/progreso.astro
    [locale]/[level]/index.astro
    [locale]/[level]/[unit]/index.astro
    [locale]/[level]/[unit]/[lesson].astro
  components/
    exercises/MultipleChoice.svelte, FillInBlank.svelte, Flashcards.svelte, MatchPairs.svelte
    layout/Header.astro, Footer.astro, MobileDrawer.svelte, UnitSidebar.astro, LessonNav.astro
    ui/Lauburu.svelte, Particles.svelte, LangPicker.svelte, ProgressBar.astro
  i18n/
    ui.ts, config.ts
  stores/
    progress.ts
  styles/
    tokens.css, base.css, transitions.css
docs/superpowers/specs/
  2026-05-06-euskera-static-design.md
```

## Appendix B. Glossary

| Term | Definition |
|---|---|
| **Lauburu** | Basque four-pointed cross, a traditional symbol; used in the brand mark |
| **Ikurriña** | The flag of the Basque Country; provides the project's color palette |
| **Memory card** | The user-controlled progress hash exportable as a string; replaces server-side accounts |
| **Foundation ship** | A v0.0 deployment where the engine is fully working but content is intentionally minimal; content fills in incrementally |
| **Classic tier** | This project — public, free forever, MIT + CC BY-SA. Distinguished from a possible future Premium tier |
| **CEFR** | Common European Framework of Reference for Languages — the standard scale used to label levels A1, A2, B1, B2, C1, C2 |
| **NOR / NOR-NORK / NOR-NORI-NORK** | Basque verb paradigms (intransitive, transitive, ditransitive). Mentioned as curriculum points |
