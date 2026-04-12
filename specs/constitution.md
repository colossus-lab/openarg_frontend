# OpenArg Frontend Constitution

**Version**: 1.2.0
**Status**: Draft (reverse-engineered from codebase 2026-04-10, last updated 2026-04-11)
**Scope**: `openarg_frontend` repo. Backend constitution lives at `../../openarg_backend/specs/constitution.md`.

---

## Purpose

This document codifies the **non-negotiable principles** of the OpenArg frontend. Every `plan.md` for any feature must pass the "Constitution Check" before moving forward. Known deviations are explicitly listed in section 9 of each `plan.md`.

**The constitution is immutable by convention**: modifying it requires a semver version bump, written justification, and review of the impact on existing specs.

---

## 0. Keep It Simple (axiom)

**Simplicity beats cleverness, always.** This is the principal axiom — every other article must be read in its light.

Concretely, when designing or reviewing a change:

1. **Prefer the obvious solution.** If a junior engineer can read the spec and plan and understand why the code does what it does, the design is good. If it takes a seasoned engineer 20 minutes to follow the dance, the design is wrong even if it is technically correct.
2. **Add abstractions only when they pay rent.** Never introduce a hook, context provider, HOC, or helper for a hypothetical second caller. A second caller earns the abstraction; a first caller does not.
3. **Small files beat small components in big files.** Prefer splitting by responsibility over creating 30-line helpers inside 600-line modules. The `/api/chat/route.ts` monolith is a known offender tracked in [001-chat-bridge](001-chat-bridge/) DEBT-005.
4. **Data flow over control flow.** A unidirectional render pipeline is easier to reason about than a mesh of callbacks, refs, and effects. Prefer the former even if it takes more keystrokes.
5. **One way to do something.** If two hooks or components converge on the same outcome, delete one. Duplicate code is cheaper than duplicate semantics.
6. **Delete before you add.** When a `spec.md` or `plan.md` grows, ask what can be removed. If a section can go without losing information, remove it.
7. **When in doubt, write the dumbest version that works, ship it, and let usage teach you what to generalize.**

A spec that violates this axiom for a good reason must cite the reason inline ("complexity justified because X") and open a debt item to revisit once the assumption is validated. Complexity without justification is a bug in the design.

---

## 0.5. Spec → Code → Verify (axiom)

**Every change follows a three-step cadence, in strict order.** This is the second principal axiom alongside §0 Keep It Simple.

1. **Modify the spec first.** Before writing any production code, update the relevant `spec.md` / `plan.md` under `specs/` to describe the new behavior in WHAT/WHY terms. Add or edit FRs, update the output contract, append or strike tech-debt entries. If no spec section needs to change, the code probably doesn't need to change either — or the spec is incomplete, in which case complete it first.

2. **Then write the code.** Make it match the spec as-written, not the other way around. If you discover during coding that the spec is wrong, STOP, fix the spec, then return to the code. Do not diverge and reconcile later.

3. **Then verify.** Run `npm run lint && npm run test`, grep the diff against the spec's FRs to check for contradictions. Bump the spec's `Last synced with code` field. If verification reveals a mismatch, repair whichever side is wrong — usually it is the spec that under-specified a detail you had to invent while coding.

### Why the order matters

- Writing the spec first forces you to think in the **domain language** before you are tempted by implementation details. Implementation-first thinking produces specs that are thinly-disguised code commentary.
- The spec is the contract reviewers check the code against. If the spec arrives after the code, reviewers have nothing to check, and specs quietly rot into fiction.
- The first caller of a new abstraction is the spec itself: if you cannot defend the abstraction in FR form, you probably shouldn't add the code.
- Specs that move **after** code always lag. Specs that move **before** code stay current by construction.

### When you may bend this rule

- **Pure typo / rename / autoformat** — no spec change needed.
- **Test-only changes** that cover existing behavior — the spec already describes what's being tested.
- **Reverting a recent regression** to restore a previously-specified state — both sides can revert in the same commit.

### Never bend when

- You are adding a new `FR-NNN` or `SC-NNN`.
- You are changing an existing FR's acceptance criteria.
- You are closing a `[DEBT-NNN]` or `[CL-NNN]` entry — the strikethrough + `FIXED YYYY-MM-DD` marker lives in the spec and must land in the same commit as the code fix.
- You are touching a file that already has a sibling `spec.md` / `plan.md`.

### The bright line

Any PR that modifies `src/` without touching the corresponding `specs/` will be asked by reviewers to fix the drift before merging. The contributor contract in [`README.md#spec-driven-design-is-the-contract`](../README.md#spec-driven-design-is-the-contract) is the enforcement hook. This axiom exists because the disciplined cadence is cheap, the drift is expensive, and the only way not to skip it is to make it non-negotiable.

---

## I. Thin-Client Architecture

The frontend has **NO business logic**. Anything that isn't UI, auth, or basic orchestration lives in the backend. Specifically:

**The frontend IS responsible for**:
- Authentication (NextAuth + Google OAuth)
- UI rendering (React components, Next.js pages, animations)
- Client state management (conversations, real-time streaming)
- Per-user rate limiting by endpoint type
- Client input sanitization before proxying to the backend
- Protocol translation: browser ↔ SSE, backend ↔ WebSocket (the bridge)
- Client-side observability (Sentry, custom logger)

**The frontend is NOT responsible for**:
- Query pipeline (lives in `../../openarg_backend/specs/001-query-pipeline/`)
- Data connectors (backend `002-connectors/`)
- LLM calls (backend Bedrock / Gemini adapters)
- Database (everything lives in backend PostgreSQL + Redis)
- Semantic cache (backend)
- Vector search (backend)

**Consequence**: `lib/agents/`, `lib/connectors/`, `lib/gemini.ts`, `lib/firebase.ts` must not exist in the frontend. If they appear, it is an architectural error. The historical `CLAUDE.md` describes this old architecture that NO longer exists.

---

## II. Pinned Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.1.6 |
| UI | React | 19.2.3 |
| Language | TypeScript | 5.x |
| Runtime | Node.js | ≥20 |
| Auth | NextAuth | 4.24.13 |
| Primary charting | Recharts | 3.7.0 |
| Advanced charting | Observable Plot | 0.6.17 |
| Maps | Leaflet | 1.9.4 |
| Animations | motion | 12.35.0 |
| Markdown | react-markdown + remark-gfm + rehype-sanitize | 10.1 / 4.0 / 6.0 |
| Icons | react-icons | 5.5.0 |
| i18n | next-intl | 4.8.3 |
| Observability | @sentry/nextjs | 10.42.0 |
| Transport (backend) | ws | 8.19.0 |
| PDF (latent dep) | pdfjs-dist | 4.0.379 |
| Fonts | @fontsource/inter + @fontsource/jetbrains-mono | self-hosted |
| Testing | Vitest + React Testing Library | 4.1 / 16.3 |
| Linting | ESLint + eslint-config-next | 9.x / 16.1.6 |

---

## III. Client-Side State Management

1. **Hooks-only**: no Redux, no Zustand, no Jotai, no Recoil. Only `useState`, `useReducer`, `useRef`, `useCallback`, `useMemo` + custom hooks.
2. **Canonical custom hooks**:
   - `useConversationState` — messages, loaded conversation, active conversation ID, session ID
   - `useSSEStream` — SSE consumer, typewriter, abort control
   - `useAutoResize` — textarea auto-sizing
3. **`useRef` for state that must not trigger re-render**: active IDs, timestamps, streaming flags.
4. **Local storage**: only for the theme toggle. Do not persist messages or conversations in local storage (always server-side via backend).
5. **No global state**: if a component needs shared state, lift it to the common ancestor or pass it via provider. Do not create arbitrary global Contexts.

---

## IV. Routing & API Conventions

1. **App Router** (Next.js 16), **not Pages Router**.
2. **Server Components by default**, explicit `'use client'` when interactivity is needed.
3. **API routes as proxies**: almost all routes in `src/app/api/` are proxies to the backend with auth transformation. Zero local business logic except for the `/api/chat` bridge and NextAuth.
4. **All authenticated API routes** go through the `requireSession()` helper (`src/lib/auth.ts`) as a gate.
5. **Mandatory rate limiting**: every proxy route applies `checkRateLimit(email, endpoint, maxReq)` before the fetch to the backend.
6. **`backendHeaders(idToken)` helper** is the only authorized way to build headers for calling the backend — it guarantees a consistent `X-API-Key` service token plus `Authorization: Bearer <google_id_token>` forwarded from the NextAuth session. The backend validates that JWT against Google's JWKS (per `openarg_backend/specs/003-auth/spec.md` FR-007, enforced 2026-04-11).

---

## V. Chat Bridge Pattern (SSE ↔ WebSocket)

The chat flow is **unidirectional via the bridge** `/api/chat/route.ts`:

```
Browser ←──SSE──→ Frontend Bridge ←──WS primary──→ Backend
                                 ←──HTTP fallback─→
```

Rules:
1. **Browser speaks SSE** (`text/event-stream`) because it is simple, stateless on the connection level, and compatible with any HTTP client.
2. **Backend speaks WebSocket** as primary (`ws://.../api/v1/query/ws/smart`) because LangGraph `astream()` is WS-native.
3. **Mandatory fallback**: if WS does not connect within **8 seconds**, fall back to HTTP sync (`POST /api/v1/query/smart`).
4. **WS activity timeout**: 120s with no messages → consider the connection dead and return what has been accumulated.
5. **Event mapping**: the bridge translates backend `status` into the frontend's `phase_change` + `thinking`. The 4 visible phases are `planning → data_collection → analysis → synthesis`.
6. **User-facing strings in Spanish**: never forward raw backend strings to the browser; always map to humanized text.
7. **Whitelist of event types** from the bridge to the client: `phase_change, thinking, content, chart, sources, documents, map, clarification, error, conversation_saved, assistant_message_saved, done`.

---

## VI. Authentication

1. **NextAuth 4** with Google OAuth as the only provider.
2. **JWT sessions** (not database-backed), TTL **24 hours** (explicitly reduced from the default 30 days).
3. **Cookies**:
   - Prod: `__Secure-next-auth.session-token`, `httpOnly`, `sameSite=lax`, `secure=true`
   - Dev: `next-auth.session-token`, `httpOnly`, `sameSite=lax`, `secure=false`
4. **Mandatory middleware** at `src/middleware.ts` for protected routes (`/chat`, `/datasets`, `/api/*` except `/api/auth`).
5. **Access control** (in `authOptions.ts` `signIn` callback):
   - `ALLOWED_EMAILS` env var: comma-separated allowlist
   - `OPEN_BETA=true` + `OPEN_BETA_DOMAINS`: bypass the allowlist by domain
   - `ADMIN_EMAILS` env var: defines admins (infrastructure for `requireAdmin()`, not used yet)
6. **Identity to the backend**: always via `Authorization: Bearer <google_id_token>` injected by `backendHeaders(session.idToken)` in the server-side API routes. The NextAuth JWT callback persists `account.id_token` + `refresh_token` + `expires_at` on sign-in and refreshes the id_token via Google's token endpoint when expired. The backend validates the token itself against Google's JWKS — there is no trust in any header the client could set.
7. **`DISABLE_AUTH=true`** is allowed only in local dev. **Forbidden in production.** Guarded by a `NODE_ENV !== 'production'` check in `src/middleware.ts`.
8. **Backend JWT enforcement is live** (backend `FIX-005`, enforced 2026-04-11). The legacy `X-User-Email` header has been deleted from both the frontend helpers and the backend middleware. Admin-key endpoints (flush-cache, rescore, etc.) remain exempt from the Google JWT check and rely on their own `X-Admin-Key` header per backend FR-007a.

---

## VII. Security

1. **Mandatory input caps** on every endpoint that accepts user messages:
   - `MAX_MESSAGE_LENGTH=5000` (chat message)
   - `MAX_HISTORY_LENGTH=20` (entries)
   - `MAX_HISTORY_CONTENT=2000` (chars per entry)
2. **History sanitization**: only `user`/`assistant` roles allowed, content truncated.
3. **Per-user rate limiting** with 6 buckets:
   - `chat` (default 10/min), `conversations:get` (30/min), `conversations:post` (10/min)
   - `sync` (15/min), `feedback` (10/min), `datasets` (30/min)
4. **HTML sanitization** on markdown rendering via `rehype-sanitize` — `dangerouslySetInnerHTML` is forbidden except for the hardcoded theme script in `layout.tsx`.
5. **No `eval`**, no `new Function`, no inline event handlers built from input.
6. **Self-hosted fonts** (`@fontsource/*`) for CSP compliance.
7. **IDOR prevention**: always use the email from the JWT server-side, never accept the email from the body without verification.
8. **Secrets via env vars**, never in code. `.env.local` is gitignored.

---

## VIII. Styling & UX

1. **Mandatory dark theme** with the **Argentine flag** palette:
   - Primary celeste: `#74ACDF`
   - Sun accent: `#F6B40E`
   - Background: `#0A0E1A`
2. **Glassmorphism**: `backdrop-filter: blur(...)` for panels + cards.
3. **Spanish-first UX**: all user-visible text in Spanish. Code, comments, types, logs in English.
4. **Responsive**: mobile-first, tailwind-style breakpoints.
5. **Basic accessibility**: `aria-label` on buttons without text, `alt` on images, keyboard navigation.
6. **Opt-in animations**: `reactbits/` components are optional, not blocking if the motion lib fails.
7. **Charts with fallback**: `ChartErrorBoundary` wraps every chart — if a chart breaks, it does not bring down the page.

---

## IX. Observability

1. **Sentry configured** (`@sentry/nextjs`) — contrasts with the backend where this is still pending.
2. **Custom logger** (`src/lib/logger.ts`) with 4 levels: `debug` (dev only), `info` (dev only), `warn` (always), `error` (always).
3. **No direct console.log** outside the logger in production code.
4. **No third-party analytics** (no Google Analytics, no Mixpanel, etc.).
5. **In-memory rate limiter** — not exported to metrics, warning when scaling horizontally (not cluster-safe).

---

## X. Testing

1. **Vitest** as the only test runner (NOT Jest, NOT Mocha).
2. **React Testing Library** for component tests (NOT Enzyme).
3. **jsdom** as the test environment.
4. **`@testing-library/jest-dom` matchers** are allowed even though we are on Vitest.
5. **Target**: unit tests for hooks + component tests + smoke tests for routes. **No E2E in this repo** (that would live in a separate repo or Playwright in CI).

---

## XI. i18n

1. **`next-intl`** as the i18n framework.
2. **Spanish as default and only active locale** (hardcoded in `i18n/request.ts`).
3. **Messages** in `messages/es.json`.
4. **Multi-language is not implemented**. When needed, this requires:
   - Refactoring `request.ts` for dynamic detection (cookie, header, or URL segment)
   - Creating `messages/en.json`, `messages/pt.json`, etc.
   - Locale middleware
5. **Today**: every string is loaded via the `useTranslations('namespace')` hook; do not hardcode strings in components.

---

## XII. Deployment

1. **Docker build** with a `Dockerfile` at the repo root.
2. **Deploy target**: a Docker host running the backend stack (typically a single VM, co-located with the backend so they share a network).
3. **Env vars** are injected from a `.env` file provisioned by the deploy pipeline (never checked into the repo); the frontend reads the same secrets file the backend uses.
4. **Critical env vars**:
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
   - `OPENARG_BACKEND_URL`, `OPENARG_BACKEND_API_KEY`
   - `ALLOWED_EMAILS` or `OPEN_BETA=true` + `OPEN_BETA_DOMAINS`
   - `SENTRY_DSN` (optional)
   - `ADMIN_EMAILS` (optional)
5. **Next.js build** with `output: standalone` for a minimal Docker image.

---

## XIII. Git

1. **Do NOT add `Co-Authored-By`** to commits (same rule as the backend).
2. **PRs go to `staging`**, not `main`/`master`.
3. **Conventional Commits** optional but preferred (`feat:`, `fix:`, `perf:`, `chore:`, `docs:`).

---

## Compliance

Every `plan.md` under `specs/` MUST have a "Deviations from Constitution" section that:

1. Explicitly lists which principles are violated
2. For each violation: justification + tech debt ticket + `[DEBT-NNN]`
3. Indicates whether the violation is **temporary** (with a fix plan) or **accepted** (a conscious trade-off)

The `Constitution Check` is the gate before any forward SDD: before implementing a new feature, validate that the plan does not introduce undocumented new violations.

---

**End of constitution.md**
