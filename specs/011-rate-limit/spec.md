# Spec: Rate Limit (per-user, in-memory)

**Type**: Reverse-engineered
**Status**: Draft
**Last synced with code**: 2026-04-11
**Layer scope**: Infrastructure (lib)
**Related plan**: [./plan.md](./plan.md)

---

## 1. Context & Purpose

`src/lib/rateLimit.ts` implements an **in-memory per-user rate limiter** with 6 distinct buckets by endpoint type. Every authenticated proxy route invokes `checkRateLimit()` before fetching the backend, and returns 429 with a `Retry-After` header if the user is over the limit.

It is a **first-line protection** that prevents local abuse without loading the backend. The backend has its own rate limiting for the public API (Bearer token), but the frontend's authenticated routes rely solely on this mechanism.

## 2. Ubiquitous Language

| Term | Definition |
|---|---|
| **Bucket** | Group of endpoints that share the same limit (e.g. all reads use bucket `conversations:get`). |
| **Window** | Time span during which requests are counted (sliding window, default 60s). |
| **Sliding window** | A time window that moves with each request, not fixed to clock intervals. |
| **Per-user** | Store keys are `email:endpoint` — each user has their own counters. |
| **Fail-open** | If the store fails (corrupt state, etc.), allow the request (availability first). |

## 3. User Stories

### US-001 (P1) — Protect endpoints from abuse
**As the** system, **I want** to block any user who exceeds the configured limit for an endpoint, **so that** I can prevent abuse and runaway costs.

### US-002 (P1) — Return 429 with Retry-After
**As the** frontend client, **I want** to receive a clear 429 when the limit is exceeded, **so that** I can show a friendly message to the user.

### US-003 (P2) — Periodic cleanup
**As an** operator, **I need** the store to not grow indefinitely even though it's in-memory — clean up old entries.

## 4. Functional Requirements

- **FR-001**: MUST export function `checkRateLimit(userEmail, endpoint, maxRequests, windowMs=60000): boolean` that returns `true` if the user EXCEEDED the limit.
- **FR-002**: MUST keep a `Map<string, Entry>` in process memory.
- **FR-003**: The key MUST be `${userEmail}:${endpoint}`.
- **FR-004**: The entry MUST contain `{count: number, windowStart: number}`.
- **FR-005**: On check:
  - If `Date.now() - windowStart > windowMs` → reset (count=1, windowStart=now), return `false`
  - Else if `count >= maxRequests` → return `true` (exceeded)
  - Else → `count++`, return `false`
- **FR-006**: MUST export function `rateLimitResponse(): NextResponse` that returns 429 with:
  - `Content-Type: application/json`
  - `Retry-After: 60`
  - Body: `{error: "Demasiadas consultas. Esperá un momento antes de intentar de nuevo."}`
- **FR-007**: MUST run a cleanup job **every 5 minutes** that deletes entries with `windowStart < now - 5min`.
- **FR-008**: MUST use 6 canonical endpoint buckets:
  - `chat` — 10/min
  - `conversations:get` — 30/min
  - `conversations:post` — 10/min
  - `sync` — 15/min
  - `feedback` — 10/min
  - `datasets` — 30/min
- **FR-009**: Limits MUST be env-configurable: `RATE_LIMIT_CHAT`, `RATE_LIMIT_READ`, `RATE_LIMIT_WRITE`, `RATE_LIMIT_SYNC`.

## 5. Success Criteria

- **SC-001**: Exact enforcement under single-instance (no visible race conditions).
- **SC-002**: Cleanup prevents unbounded store growth (at least for inactive users).
- **SC-003**: Zero false positives — a legitimate user within the limit never gets a 429.
- **SC-004**: Per-request overhead **<1ms** (Map lookup + increment).

## 6. Assumptions & Out of Scope

### Assumptions
- **Single-instance deployment**: the rate limiter is in-memory and only works if there is a single Next.js process. If scaled horizontally, each instance has its own store and a user could exceed the limit × N instances.
- Timestamps are process-local (not UTC-consistent across instances).
- The store is lost on process restart — acceptable for rate limiting.

### Out of scope
- **Distributed rate limiting** (Redis-backed) — not implemented.
- **IP-based** rate limiting — per-user only.
- **Endpoint-specific headers** like `X-RateLimit-Remaining`, `X-RateLimit-Reset` — not returned in the response (only 429 + Retry-After).
- **Burst handling** with token bucket — only a simple sliding window.

## 7. Open Questions

- **[NEEDS CLARIFICATION CL-001]** — The defaults (10/min chat, 30/min read, etc.) — are they based on real traffic analysis or arbitrary values?
- **[RESOLVED CL-002]** — **Anonymous users don't reach the rate limiter in practice, but the fallback key collapses to `'anonymous'` (not `undefined`).** The NextAuth middleware at `src/middleware.ts` matches `/api/((?!auth).*)` and redirects unauthenticated calls to `/login` before any handler runs. For the theoretical case where a session exists without an email, the handlers use `session.user?.email || 'anonymous'` (e.g. `src/app/api/chat/route.ts:45`), so the key becomes `chat:anonymous` — a single shared bucket. Since middleware blocks anonymous access, this path is defensive, not exploitable today. (resolved 2026-04-11 via code inspection)
- **[RESOLVED CL-003]** — **No `X-RateLimit-*` headers exported.** `src/lib/rateLimit.ts:44-49` only returns `{ 'Content-Type': 'application/json', 'Retry-After': '60' }` on the 429 response — no `X-RateLimit-Limit`, no `X-RateLimit-Remaining`, no `X-RateLimit-Reset`. Happy-path responses include no quota info either. Tracked as `DEBT-002`. (resolved 2026-04-11 via code inspection)
- **[RESOLVED CL-004]** — **Hardcoded in the code, not configurable.** `src/lib/rateLimit.ts:52-57` runs `setInterval(() => { ... }, 5 * 60_000)` — a literal 5-minute interval with no env-var override (unlike `WINDOW_MS` which reads `process.env.RATE_LIMIT_WINDOW_MS`). Whether 5 min is the right value is a product/operations call; the "configurable?" part is code-answered: no. (resolved 2026-04-11 via code inspection)

## 8. Tech Debt Discovered

- **[DEBT-001]** — **In-memory only**: not cluster-safe. If scaled horizontally, each instance has its own bucket — a user can make N×(limit) requests with N instances.
- **[DEBT-002]** — **No informative headers** — the client doesn't know how many requests it has left before getting 429.
- **[DEBT-003]** — **Simple cleanup** — a cleanup every 5 min may leave old entries from users who made 1 request and never returned. Not a leak but still wasteful.
- **[DEBT-004]** — **Implicit fail-open** — if there is any error in `checkRateLimit`, it does not block. It should be explicit and log a warning.
- **[DEBT-005]** — **No metrics** — how many 429s are returned, which buckets are hottest, is not tracked.

---

**End of spec.md**
