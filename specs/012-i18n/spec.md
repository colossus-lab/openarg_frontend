# Spec: i18n (next-intl)

**Type**: Reverse-engineered
**Status**: Draft
**Last synced with code**: 2026-04-11
**Layer scope**: Infrastructure (config) + Static data
**Related plan**: [./plan.md](./plan.md)

---

## 1. Context & Purpose

Frontend internationalization framework using **`next-intl` v4.8**. Currently **hardcoded to Spanish** — the mechanism exists and supports multi-language, but `src/i18n/request.ts` pinned the locale to `'es'`. Strings live in `messages/es.json` (~14.5 KB) and are accessed via the `useTranslations()` hook from next-intl.

This is latent structural tech debt: if English/Portuguese support is ever desired, it requires refactoring `request.ts` for dynamic detection (cookie, header, or URL segment) + creating `messages/en.json`, `messages/pt.json`, etc.

## 2. User Stories

### US-001 (P1) — All visible text in Spanish
**As** an Argentine user, **I want** the entire UI in Rioplatense Spanish, **so that** the product feels local.

### US-002 (P2) — Strings maintainable from a single place
**As** a contributor, **I want** all visible strings in `messages/es.json` and not hardcoded in components, **so that** I can change them without touching code.

### US-003 (P3) — Multi-language (future)
**As** a future operator, **when** we want to support English or Portuguese, **I want** the framework to already be in place.

## 3. Functional Requirements

- **FR-001**: MUST use `next-intl` v4.8+ as the framework.
- **FR-002**: `src/i18n/request.ts` MUST export `getRequestConfig` with `locale` and `messages`.
- **FR-003**: Locale MUST be `'es'` (hardcoded for now).
- **FR-004**: Messages MUST be loaded from `messages/es.json`.
- **FR-005**: Every component with visible strings MUST use `useTranslations('namespace')` instead of hardcoding.
- **FR-006**: `src/app/layout.tsx` MUST set `<html lang="es-AR">`.
- **FR-007**: `messages/es.json` MUST be organized by namespaces: `landing.`, `chat.`, `chatMessage.`, `login.`, `agents.`, etc.

## 4. Success Criteria

- **SC-001**: **Zero hardcoded strings** in components — everything via `useTranslations()`.
- **SC-002**: Message loading **<50ms** (it's a small JSON).
- **SC-003**: Build succeeds with i18n active.

## 5. Assumptions & Out of Scope

### Assumptions
- Only Spanish for now — zero demand for other languages.
- Rioplatense Argentine (use of "vos", "querés") vs neutral Spanish.
- Strings don't change with locale (no complex gender/pluralization).

### Out of scope
- **English**, **Portuguese**, **French** — none supported.
- **Date/number localization** — doesn't use next-intl's advanced formatting.
- **Server-side locale detection** — no locale middleware.
- **User preference override** — user cannot change language.

## 6. Open Questions

- **[NEEDS CLARIFICATION CL-001]** — When (if ever) is multi-language planned? Roadmap?
- **[NEEDS CLARIFICATION CL-002]** — Are all strings in `es.json`? A quick grep should verify that no strings are hardcoded in components.
- **[RESOLVED CL-003]** — **13 top-level namespaces:** `metadata`, `landing`, `login`, `chat`, `privacy`, `datasets`, `userMenu`, `chatMessage`, `sources`, `agents`, `privacyBanner`, `themeToggle`, `common` — verified with `python3 -c "import json; print(list(json.load(open('messages/es.json')).keys()))"`. The earlier reviewer's list was incomplete (missed `metadata`, `privacy`, `datasets`, `userMenu`, `sources`, `privacyBanner`, `themeToggle`, `common`). (resolved 2026-04-11 via code inspection)

## 7. Tech Debt Discovered

- **[DEBT-001]** — **Hardcoded locale** in `request.ts` — the framework can support multi-language but isn't used today. Future refactor requires changes to middleware, detection, and additional files.
- **[DEBT-002]** — **No fallback** if `messages/es.json` cannot be loaded — the import fails at runtime. Should have a fallback or error boundary.
- **[DEBT-003]** — **Potentially hardcoded strings** in some components — not verified. Should have a linter that enforces use of `useTranslations()`.
- **[DEBT-004]** — **`es` vs `es-AR`**: the framework locale is `es`, but the `<html lang>` is `es-AR`. Minor inconsistency.

---

**End of spec.md**
