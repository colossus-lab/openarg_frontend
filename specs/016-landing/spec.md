# Spec: Landing Page (`/`)

**Type**: Reverse-engineered
**Status**: Draft
**Last synced with code**: 2026-04-11
**Layer scope**: Presentation (page)
**Related plan**: [./plan.md](./plan.md)

---

## 1. Context & Purpose

OpenArg's public home page (`/`). First contact of any unauthenticated visitor with the product. Explains what OpenArg is, what it does, and guides the user toward login. Intensively uses `reactbits/` components for animations (progressive fade-ins, gradient text, count-ups for stats, spotlight cards, etc.).

It is a page with heavy visual polish compared to the rest of the app. Target: visitors arriving from social networks, searches, or shares, who do not know what OpenArg is.

## 2. User Stories

### US-001 (P1) — Visitor understands what OpenArg is
**As** a new visitor, **I want** to understand in <10 seconds what OpenArg does, **so that** I can decide if I'm interested.

### US-002 (P1) — Visitor can log in easily
**As** an interested visitor, **I want** a visible "Ingresar" button on the landing, **so that** I can create my account with Google.

### US-003 (P2) — Attractive stats on what data the system covers
**As** a visitor, **I want** to see concrete numbers (indexed datasets, connected sources, etc.) **so that** I understand the scale of the product.

### US-004 (P2) — Features explained with examples
**As** a curious visitor, **I want** to see examples of questions I can ask the chat.

### US-005 (P3) — Animations + visual polish
**As** a visitor, **I want** a polished, modern visual experience, **so that** I perceive the product as serious.

## 3. Functional Requirements

- **FR-001**: `/` MUST be public (not protected by middleware).
- **FR-002**: MUST redirect to `/chat` if the user is already authenticated *(optional — may stay on the landing)*.
- **FR-003**: MUST render a prominent "Ingresar con Google" button.
- **FR-004**: MUST use `reactbits/` components for animations.
- **FR-005**: MUST have a hero section with the product's core message.
- **FR-006**: MUST show the pipeline phases (Estratega, Investigador, Analista, Redactor) as an explanatory feature.
- **FR-007**: MUST include at least 4 clickable "example questions" that navigate to `/login` (or `/chat` if already authed).
- **FR-008**: MUST have a dark theme applied consistently with the rest of the app.
- **FR-009**: MUST be responsive (mobile-first).
- **FR-010**: MUST load fast — first paint <2s on normal connection.

## 4. Success Criteria

- **SC-001**: First meaningful paint **<2s** on an average mobile connection.
- **SC-002**: LCP (Largest Contentful Paint) **<2.5s**.
- **SC-003**: CLS (Cumulative Layout Shift) **<0.1**.
- **SC-004**: Landing → login conversion clickthrough rate tracked (no metric today).
- **SC-005**: Landing bundle **<300 KB** gzipped.

## 5. Assumptions & Out of Scope

### Assumptions
- Visitors arrive without prior context about OpenArg.
- Most visitors access from desktop or modern mobile.
- SEO is relevant — the landing must be crawlable.

### Out of scope
- **Blog / posts** — no blog section.
- **Public documentation** — dev docs are elsewhere (repo README.md).
- **Multiple languages** — Spanish only (see `012-i18n/`).
- **A/B testing** of headlines / CTAs.
- **Contact form** — not implemented.

## 6. Open Questions

- **[RESOLVED CL-001]** — **NO redirect for authenticated users**. Verified: the landing (`src/app/page.tsx`) is completely public and does not do a `useSession()` check — it neither redirects to `/chat` nor shows different UI based on auth state. An already-logged-in user can view the landing if they navigate manually.
- **[RESOLVED CL-002]** — **Stats HARDCODED with `CountUp` animation**. Verified:
  - `page.tsx:90` → **32 portals** (hardcoded)
  - `page.tsx:97` → **16000+ datasets** (hardcoded, approx)
  - `page.tsx:103` → **<5s response time** (hardcoded, string from `es.json landing.trustResponseValue`)
  - **Zero fetches** — no API call on the landing. The numbers are aspirational/marketing, they do not reflect the real state of the system. **Implication**: they go stale as the catalog grows.
  - **Inconsistency**: the landing says "32 portals" but the chat subtitle says "30 portals". Two different values hardcoded in the same frontend.
- **[RESOLVED CL-003]** — **Yes, OpenGraph + Twitter are configured in `src/app/layout.tsx:30-68`.** `metadata` object exports `metadataBase`, `title`, `description`, `keywords` (including `datos abiertos`, `Argentina`, `transparencia`), `icons`, an `openGraph` block with `title/description/type/siteName/images` (1200×630 `/og-image.png`), and a `twitter` block with `card: 'summary_large_image'`. The values come from `messages.metadata.*` in `es.json`. No explicit `canonical` URL is set — only `metadataBase`. `DEBT-002` is therefore partially stale (OG/Twitter exist; canonical does not). (resolved 2026-04-11 via code inspection)
- **[RESOLVED CL-004]** — **No tracker.** Grep across `src/` for `gtag`, `google-analytics`, `plausible`, `posthog`, `mixpanel` returns zero matches. The only instrumentation present is `@sentry/nextjs` (error tracking). Also see frontend `000-architecture/CL-005`. (resolved 2026-04-11 via code inspection)

## 7. Tech Debt Discovered

- **[DEBT-001]** — **Landing bundle size** — if it uses all 13 reactbits + motion lib, it may be bloated. Verify with bundle analyzer.
- **[DEBT-002]** — **No verified SEO metadata** — check whether `layout.tsx` has `<meta>` tags for OG / Twitter.
- **[DEBT-003]** — **Hardcoded vs dynamic stats** — if hardcoded, they go stale. If dynamic, they fetch on every visit.
- **[DEBT-004]** — **No conversion tracking** — no metric for how many landers click "Ingresar".

---

**End of spec.md**
