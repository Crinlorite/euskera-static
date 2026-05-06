# Euskera Static — WOAH Redesign Spec

| Field | Value |
|---|---|
| Iteration on | v0.0 visual identity (spec 2026-05-06-euskera-static-design.md §7) |
| Type | Visual revision only (CSS, motion, typography). No structural change. |
| Date | 2026-05-06 |
| Status | Approved for implementation |

## Why

After v0.0 went live the visual layer read as too plain — "honest minimal" but lacking presence. User asked for "algo más WOAH" while keeping the cultural identity *minimalist* (Ikurriña palette + lauburu as logo/hero, but no decorative folclore patterns).

## Direction

**Big & Bold + Motion-rich** on top of the existing brand. Cultural cue lives in **color** (red + green Ikurriña) and the **lauburu logo/hero**, NOT in repeated geometric Basque motifs across the UI.

## Hard rules (do not break)

1. Lesson body content stays **clean and readable** — no parallax, no animated backgrounds, no gradient text. Typography hierarchy is allowed; reading-flow distractions are not.
2. Existing routes, layout grid, content schemas, memory card UX, and exercise components are out of scope. This is a CSS / motion / hero-layer revision only.
3. `prefers-reduced-motion: reduce` MUST disable every animation introduced here.
4. Logical CSS properties only (preserves RTL readiness from §6.5 of the original spec).
5. No new dependencies (no Framer Motion, no GSAP). Pure CSS + small Svelte for any interactive island.

## Concrete changes

### Hero (home only)
- Headline `Aprende euskera`: `clamp(3rem, 9vw, 7rem)`, weight 800, letter-spacing `-0.03em`. Subtle red→green text gradient.
- Animated **gradient mesh background**: 2-3 radial-gradient blobs in `--c-red-soft` and `--c-green-soft`, slow drift via CSS `@keyframes` (~20s loop).
- Lauburu enlarged to ~700px, opacity ~0.10–0.12, slower rotation (~45s/turn).
- Particles: scale to ~15 with 3 depth layers (small/fast, medium, large/slow) — different opacity and speeds, all CSS-only.
- Entrance stagger: headline (0ms) → sub (120ms delay) → CTA (240ms delay) using `@keyframes` slide-up + fade.
- Scroll-driven lauburu: opacity and scale grow slightly as the user scrolls within the hero (CSS scroll-driven animations where supported, with fallback).

### Levels grid (home + `/es/a1/`)
- Larger cards, more whitespace, layered shadows for depth.
- Active level card: glowing `--c-red` border (box-shadow with red bloom), slow pulse animation.
- Disabled levels (A2-C2): subtle `filter: blur(0.5px) grayscale(0.6)`, not just opacity.
- Hover: lift `translateY(-6px)`, shadow grows, red glow underneath.

### Unit page
- Unit number ("01", "02") rendered in display size (~5-6rem) with red→green gradient text.
- Sidebar of lessons: cleaner with hover glow (subtle red shadow on the link).

### Buttons
- Primary: pill (`border-radius: 999px`), gradient `--c-red` to `--c-red-strong`, shimmer overlay on hover (animated `linear-gradient` slide), lift 4px.
- Secondary: outline → fill animation on hover (background slides in from `inline-start`).

### Cards (generic)
- `border-radius` raised to 16px.
- Layered shadows: `0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.04)`.
- Hover: gradient border via `::after` pseudo-element with `linear-gradient` red→green.
- Lift `translateY(-2px)`, shadow grows.

### Typography (across the shell, NOT inside lesson `.prose`)
- Display headlines weight 800, tracking `-0.02em` to `-0.03em`.
- Section titles use a clearer hierarchy step (1.5x to 2x size jumps).
- Inline emphasis on Euskera words (italic Manrope) keeps current treatment.

### Motion glossary
- **Stagger fade-up**: opacity 0→1, translateY 20px→0, 400ms, ease-out, with `*-delay` per element.
- **Card hover lift**: 200ms transform + box-shadow.
- **Shimmer**: `background-position` animated 1s on hover.
- **Pulse**: opacity 0.95↔1.05 transform, 4s loop, `--c-red-strong` glow.
- **Drift** (mesh blobs): `transform` translate small range, 20s loop.
- **Ripple on CTA click**: SVG/CSS scaling circle from click point.
- All animations honor `prefers-reduced-motion: reduce`.

## Files affected

| File | Change |
|---|---|
| `src/styles/tokens.css` | Add new tokens: shadow tiers, gradient stops, motion durations, glow values |
| `src/styles/base.css` | Update `.btn-*`, `.card`, add new utilities (`.gradient-border`, `.glow-red`, etc.) |
| `src/styles/transitions.css` | Add stagger animations, drift keyframes, shimmer keyframes |
| `src/components/ui/Lauburu.svelte` | Adjust default size/opacity, slower rotation |
| `src/components/ui/Particles.svelte` | Bump count, add depth layers |
| `src/pages/[locale]/index.astro` | Hero markup: gradient mesh layer, stagger classes, larger headline; level cards new styling |
| `src/pages/[locale]/[level]/index.astro` | Larger unit number with gradient text, level header styling |
| `src/pages/[locale]/[level]/[unit]/index.astro` | Unit number display, hover glow |
| `src/components/layout/Header.astro` | Logo color refinement, header backdrop unchanged |

## Out of scope

- Service Worker / PWA enhancements (still v0.1)
- Lesson page redesign (legibility wins)
- New languages / RTL (pending v0.x)
- Native packaging (Premium tier, separate)

## Acceptance

- Visual diff matches the brief above (judged by the user on the deployed site).
- `npm run check` passes (0 errors).
- `npm run build` succeeds; new CSS chunks deploy to CF Pages.
- `prefers-reduced-motion` disables all introduced animations.
- Lighthouse mobile remains ≥ 90 in performance and accessibility.
