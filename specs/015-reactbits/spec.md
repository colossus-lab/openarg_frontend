# Spec: Reactbits (Animation Library)

**Type**: Reverse-engineered
**Status**: Draft
**Last synced with code**: 2026-04-10
**Layer scope**: Presentation (components)
**Related plan**: [./plan.md](./plan.md)

---

## 1. Context & Purpose

The `src/components/reactbits/` directory contains **13 animation / visual effect components** used mainly on the landing page (`/`) to give a premium feel and visual polish. They are not an external library — they are custom components based on the `motion` package (successor to framer-motion) and CSS animations.

They are **optional** and do not affect chat functionality, but they contribute significantly to the first impression of the product on the landing.

## 2. Components

| Component | Effect |
|---|---|
| `BlurText` | Word-by-word blur reveal |
| `ClickSpark` | Particle burst on click |
| `CountUp` | Numeric animation (0 → N) |
| `DecryptedText` | Char-by-char decryption-style reveal |
| `FadeIn` | Fade-in on scroll with delay + optional blur |
| `GradientText` | Text with animated gradient (3 rotating colors) |
| `Magnet` | Cursor-tracking magnet hover |
| `Noise` | Background noise texture |
| `RotatingText` | Cycle between staggered texts |
| `ShinyText` | Shiny sweep over text |
| `SpotlightCard` | Card with spotlight hover |
| `StarBorder` | Animated border with star pattern |

## 3. User Stories

### US-001 (P2) — Attractive landing
**As** a visitor, **when** I enter openarg.org, **I want** a landing with movement and visual polish, **so that** it feels like a serious/modern product.

### US-002 (P3) — Smooth transitions between sections
**As** a user, **when** I scroll the landing, **I want** progressive fade-ins and animations.

## 4. Functional Requirements

- **FR-001**: All components MUST be `'use client'` (animations require a browser).
- **FR-002**: MUST be optional — the page does not break if the motion lib fails.
- **FR-003**: MUST respect accessibility: check `prefers-reduced-motion` and disable animations if the user prefers it *[see DEBT-001]*.
- **FR-004**: MUST be tree-shakeable — each component importable individually.
- **FR-005**: MUST use dark theme + consistent Argentina palette.

## 5. Success Criteria

- **SC-001**: **Zero impact** on chat functionality — if the motion lib breaks, chat keeps working.
- **SC-002**: 60fps animation performance on modern hardware.
- **SC-003**: Accessibility respected with `prefers-reduced-motion` *[debt]*.

## 6. Open Questions

- **[RESOLVED CL-001]** — **11 of 12 reactbits are in use, 1 is dead code**. Verified via grep:
  - **USED** (11): `BlurText` (chat), `CountUp` (landing+datasets), `DecryptedText` (landing+login), `FadeIn` (landing+login+datasets), `GradientText` (landing+login), `Magnet` (login+datasets), `Noise` (landing+datasets), `RotatingText` (chat), `ShinyText` (landing+datasets), `SpotlightCard` (landing+datasets), `StarBorder` (landing).
  - **DEAD CODE** `ClickSpark` — **no imports anywhere** in `src/app/` or `src/components/`. Candidate for removal.
- **[NEEDS CLARIFICATION CL-002]** — Are there visual tests (Storybook, Chromatic) for these components? I don't see them in the listing.
- **[NEEDS CLARIFICATION CL-003]** — Are they 100% custom or inspired/copied from some external resource (e.g., reactbits.dev)?

## 7. Tech Debt Discovered

- **[DEBT-001]** — ~~**No respect for `prefers-reduced-motion`**~~ **FIXED 2026-04-10**: `BlurText`, `DecryptedText`, `FadeIn` now consume `useReducedMotion()` (hook in `src/hooks/useReducedMotion.ts` based on `useSyncExternalStore`). When the user prefers reduced motion, the components render the final text without animation.
- **[DEBT-002]** — ~~**`ClickSpark` dead code**~~ **FIXED 2026-04-10**: file deleted from `src/components/reactbits/` (the folder no longer contains it). Component list: 11 in use, 0 dead.
- **[DEBT-003]** — **No visual tests** — animation components are especially fragile to changes, but there are no regression tests.
- **[DEBT-004]** — **Bundle size overhead** — 13 components + `motion` lib (~40KB) just for the landing. Consider route-level code splitting if the landing is a minority of traffic.

---

**End of spec.md**
