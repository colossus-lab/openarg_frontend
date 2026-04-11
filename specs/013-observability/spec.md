# Spec: Observability (Sentry + Logger)

**Type**: Reverse-engineered
**Status**: Draft
**Last synced with code**: 2026-04-11
**Layer scope**: Infrastructure (lib + config)
**Related plan**: [./plan.md](./plan.md)

---

## 1. Context & Purpose

Frontend observability infrastructure: **Sentry** (`@sentry/nextjs`) for client + server error tracking, and a **custom logger** (`src/lib/logger.ts`) with 4 levels for consistent logging across route handlers + components.

Unlike the backend (where Sentry is open tech debt), the frontend **does have Sentry configured** — at least as a dependency and wrapping in `next.config.ts`. It remains to verify that the real DSN is set in prod.

## 2. User Stories

### US-001 (P1) — Client-side errors reported to Sentry
**As** an operator, **I want** any exception in the user's browser to be reported automatically to Sentry, **so that** I can detect bugs without the user having to report them.

### US-002 (P1) — Server-side errors (route handlers) reported
**As** an operator, **I want** errors in the API route handlers to also be reported.

### US-003 (P2) — Structured logging in dev
**As** a developer, **I want** `logger.debug` and `logger.info` to print to the console in dev but not in prod (reduced noise).

### US-004 (P2) — Error boundary UI
**As** a user, **I want** to see a friendly error page when something breaks, not a blank screen.

## 3. Functional Requirements

### Sentry
- **FR-001**: `@sentry/nextjs` MUST be in `package.json` dependencies.
- **FR-002**: `next.config.ts` MUST be wrapped with `withSentryConfig(nextConfig, ...)`.
- **FR-003**: `sentry.client.config.ts` and `sentry.server.config.ts` MUST exist at the repo root (or `src/`).
- **FR-004**: MUST read `SENTRY_DSN` from the env. If not set, it does not report (silent).
- **FR-005**: MUST capture unhandled exceptions + promise rejections automatically.

### Custom Logger
- **FR-006**: `src/lib/logger.ts` MUST export `logger` with 4 methods: `debug`, `info`, `warn`, `error`.
- **FR-007**: `debug` + `info` MUST print only if `process.env.NODE_ENV !== 'production'`.
- **FR-008**: `warn` + `error` MUST ALWAYS print (in all environments).
- **FR-009**: The methods must accept multiple args (varargs): `logger.error('msg', err, context)`.

### Error Boundary
- **FR-010**: `src/app/global-error.tsx` MUST exist as Next.js's global error boundary.
- **FR-011**: When triggered, it MUST render a friendly page in Spanish with a retry option.
- **FR-012**: MUST report the error to Sentry if configured.

## 4. Success Criteria

- **SC-001**: **100% of unhandled exceptions** reach Sentry (if DSN is configured).
- **SC-002**: Debug logs do NOT appear in the prod console.
- **SC-003**: Global error boundary prevents blank screens 100% of the time.

## 5. Assumptions & Out of Scope

### Assumptions
- The Sentry DSN is provided via env var in prod.
- Sentry SaaS is accessible (there is no self-hosted instance).

### Out of scope
- **Distributed tracing** (OpenTelemetry, Datadog APM, etc.).
- **User analytics** (Mixpanel, Amplitude, etc.).
- **Performance monitoring** (custom Core Web Vitals beyond what Sentry provides).
- **Session replay**.
- **Frontend custom metrics** — no equivalent to the backend `MetricsCollector`.

## 6. Open Questions

- **[RESOLVED CL-001]** — **Configs verified at repo root** (not in `src/`). `sentry.client.config.ts` uses `NEXT_PUBLIC_SENTRY_DSN` + `tracesSampleRate: 0.1` + `replaysOnErrorSampleRate: 0.1` + **`replaysSessionSampleRate: 0`** (session replays disabled — good privacy practice). `sentry.server.config.ts` similar with server-side `SENTRY_DSN`. **Enabled conditionally on DSN presence**: if the DSN is not set, Sentry does not initialize (silent no-op). `next.config.ts:20` applies `withSentryConfig(withNextIntl(nextConfig), {...})`. Functionally correct — pending confirmation that the real DSN is set in the prod env.
- **[NEEDS CLARIFICATION CL-002]** — Is there a real DSN configured in prod? If not, the Sentry wrapping does nothing — silent reports.
- **[RESOLVED CL-003]** — **`process.env.NODE_ENV`** — i.e. only `development` / `production` / `test`. Both `sentry.client.config.ts:5` and `sentry.server.config.ts:5` set `environment: process.env.NODE_ENV`. Staging is **not** distinguished from production in Sentry: both deploys run Next.js with `NODE_ENV=production`, so errors from either environment would land in the same Sentry bucket unless custom config is added. (resolved 2026-04-11 via code inspection)
- **[RESOLVED CL-004]** — **No filters are configured.** Both `sentry.client.config.ts` and `sentry.server.config.ts` only set `dsn`, `environment`, `tracesSampleRate`, `replays*SampleRate` and `enabled`. There is **no** `ignoreErrors`, `denyUrls`, `beforeSend` hook or similar. Any error from a browser extension or bot will reach Sentry with no filtering. (resolved 2026-04-11 via code inspection)

## 7. Tech Debt Discovered

- **[DEBT-001]** — **Minimalist custom logger** — only console.log wrappers, no structured logging (JSON format), no context stacks. If the backend uses structlog, the frontend has no parallel.
- **[DEBT-002]** — ~~Invisible Sentry configs~~ **RESOLVED 2026-04-10**: configs verified at repo root. See resolved CL-001 above. The `sentry.{client,server}.config.ts` files exist, use different env vars for the DSN (`NEXT_PUBLIC_SENTRY_DSN` client-side, `SENTRY_DSN` server-side), and have session replays disabled.
- **[DEBT-003]** — **No analytics** — no usage tracking (which features are used, how many logins, etc.). Operationally blind except for errors.
- **[DEBT-004]** — **No custom metrics** for the rate limiter, bridge fallback rate, chat response time — all invisible.

---

**End of spec.md**
