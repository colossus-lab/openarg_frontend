# Spec: Frontend Architecture (Macro)

**Type**: Reverse-engineered
**Status**: Draft
**Last synced with code**: 2026-04-11 (base commit `bb32576`)
**Hexagonal scope**: Full frontend
**Related plan**: [./plan.md](./plan.md)

---

## 1. Context & Purpose

The OpenArg frontend is a **Next.js 16 thin-client application** that provides the product's full user interface: conversational chat over Argentine public data, datasets catalog, developer portal for API keys, ARCO rights, and a public landing. **It contains no business logic**: every query, data retrieval, LLM call, and persistence lives in the backend (`openarg_backend`). The frontend is a **bridge + UI layer**: it translates protocols (SSE ↔ WebSocket), enforces auth (NextAuth Google OAuth), proxies authenticated requests to the backend, and renders results with animations and typewriter streaming.

It replaced a previous **self-contained** architecture that ran its own agent pipeline (planner, dataAgent, analysisAgent, memoryAgent) with direct Gemini calls and Firestore. That old architecture is **documented in the repo's `CLAUDE.md` but no longer exists in the code** — everything was migrated to the backend (see `[DEBT-001]`).

## 2. Ubiquitous Language

| Term | Definition |
|---|---|
| **Thin client** | An app whose only role is UI + auth + proxy to the backend. No business logic of its own. |
| **Bridge `/api/chat`** | Next.js route handler that translates SSE (browser) ↔ WebSocket (backend). It is the most complex piece of the frontend. |
| **Phase** | User-visible pipeline phase: `planning → data_collection → analysis → synthesis`. |
| **Thinking event** | A friendly Spanish message accompanying each phase ("Recorriendo los portales de datos..."). |
| **Typewriter reveal** | Char-by-char animation of the LLM response (28 chars/frame). |
| **Conversation** | Chat session identified by `conversation_id`, persisted in the backend. |
| **ARCO** | Legal user rights: Access, Rectification, Cancellation, Opposition. Exposed via `/users/me/*` endpoints. |
| **Allowlist** | Access control mechanism enforced in the NextAuth `signIn` callback. Active in staging (private alpha), bypassed in production. |

## 3. User Stories

### US-001 (P1) — Authentication with Google OAuth
**As a** visitor, **I want** to log in with my Google account, **so that** I can access the chat without creating another credential.

- Trigger: user clicks "Ingresar con Google" on `/login`
- Happy path: OAuth flow → NextAuth issues JWT → session active for 24h → redirect to `/chat`
- Edge case (staging): email is not in `ALLOWED_EMAILS` → `AccessDenied` error page
- Edge case (prod): `OPEN_BETA=true` → any email is allowed through

### US-002 (P1) — Conversational chat with streaming
**As an** authenticated user, **I want** to ask a question in Spanish and see the response appear progressively with progress indicators, **so that** I know the system is working and am not left waiting on a blank screen.

- Trigger: user types in the `/chat` textarea and presses Enter
- Happy path: SSE stream starts → phases appear (Estratega → Investigador → Analista → Redactor) → typewriter reveals the response → charts/maps/documents render → end
- Edge case: backend WS does not respond in 8s → fallback to HTTP sync with simulated phases
- Edge case: interrupted stream → typewriter shows what has been accumulated + an error message

### US-003 (P1) — Conversation history
**As a** user, **I want** to see my previous conversations in a sidebar and be able to resume them.

- Trigger: `ConversationSidebar` loads the list from the backend when opening `/chat`
- Happy path: click on an item → `loadConversation()` fetches detail + messages → renders in the chat
- Edge case: empty / deleted conversation → placeholder message

### US-004 (P1) — Switch conversations / start a new one
**As a** user, **I want** to be able to create a new conversation or switch between existing conversations.

### US-005 (P2) — Explore the datasets catalog
**As a** user, **I want** to navigate the available datasets catalog at `/datasets` with taxonomy and ranking.

- Trigger: click on `/datasets`
- Happy path: GET proxy to `/api/datasets/stats` → render TaxonomyExplorer + IntraRanking + DataQualitySection

### US-006 (P2) — Manage developer API keys
**As a** developer, **I want** to create, list, and revoke my API keys from a UI, **so that** I can integrate OpenArg into my own app.

- Trigger: user menu → "Developers" → API keys dialog
- Happy path: create key → show plaintext **only once** → copy → list masked keys → revoke
- Edge case: already has a key → revoke the previous one before creating a new one

### US-007 (P2) — Delete my account (ARCO erasure)
**As a** user, **I want** to delete my account and all my data from a UI, **so that** I can exercise my ARCO right.

### US-008 (P2) — Export my data (ARCO portability)
**As a** user, **I want** to download all my conversations and queries as JSON.

### US-009 (P2) — Consult transparency reports
**As an** interested user, **I want** to see aggregated transparency reports for the system.

### US-010 (P2) — Send feedback on responses
**As a** user, **I want** to mark responses as useful/not useful and leave comments.

### US-011 (P2) — View the public landing
**As an** unauthenticated visitor, **I want** to see a landing page explaining what OpenArg is with engaging animations.

### US-012 (P3) — Admin panel (future)
**As an** administrator, **I want** access to admin endpoints protected by `ADMIN_EMAILS` for maintenance operations. *(Infrastructure exists but is not used yet)*.

## 4. Functional Requirements

### Architecture
- **FR-001**: The frontend MUST be a **thin client**: zero business logic, zero pipelines, zero direct LLM calls, zero DB connections.
- **FR-002**: All communication with the backend MUST go through the `backendHeaders()` helper (`src/lib/auth.ts`) which guarantees consistent headers.
- **FR-003**: The frontend MUST be compatible with the bridge architecture: browser speaks SSE, backend speaks WebSocket.

### Auth
- **FR-004**: MUST use NextAuth 4 with Google OAuth as the only provider.
- **FR-005**: MUST use JWT sessions with a 24-hour TTL (reduced from the default 30 days).
- **FR-006**: MUST enforce an email allowlist in staging via `ALLOWED_EMAILS` + the `signIn` callback.
- **FR-007**: MUST support allowlist bypass in production via `OPEN_BETA=true` + `OPEN_BETA_DOMAINS`.
- **FR-008**: MUST protect routes `/chat`, `/datasets`, `/api/*` (except `/api/auth`) via middleware.
- **FR-009**: MUST sync the user to the backend via `/api/users/sync`, forcing the email from the JWT (IDOR-safe).

### Routing & API
- **FR-010**: MUST use the Next.js 16 App Router (NOT the Pages Router).
- **FR-011**: Almost every route in `src/app/api/` MUST be a proxy to the backend. The only local exception: `/api/auth/[...nextauth]`.
- **FR-012**: All authenticated proxies MUST apply per-user rate limiting via `checkRateLimit()`.
- **FR-013**: All authenticated proxies MUST pass the `X-User-Email` from the JWT to the backend, never from the body.

### Chat Bridge
- **FR-014**: `/api/chat` MUST first try the WebSocket to the backend (`/api/v1/query/ws/smart`).
- **FR-015**: If WS does not connect within **8 seconds**, it MUST fall back to HTTP sync (`POST /api/v1/query/smart`).
- **FR-016**: If WS connects but does not emit messages for **120 seconds**, it MUST close and return what has been accumulated.
- **FR-017**: MUST translate `status` events from the backend to `phase_change` + `thinking` on the frontend with Spanish strings.
- **FR-018**: MUST apply a **whitelist of event types** when emitting to the browser: `phase_change, thinking, content, chart, sources, documents, map, clarification, error, conversation_saved, assistant_message_saved, done`.
- **FR-019**: MUST create the conversation in the backend BEFORE invoking the pipeline and emit `conversation_saved` immediately.
- **FR-020**: MUST save both the user message and the assistant response in the backend when the stream finishes.

### Security
- **FR-021**: MUST apply input caps: `MAX_MESSAGE_LENGTH=5000`, `MAX_HISTORY_LENGTH=20`, `MAX_HISTORY_CONTENT=2000`.
- **FR-022**: MUST sanitize history: only `user`/`assistant` roles allowed.
- **FR-023**: MUST sanitize markdown rendering via `rehype-sanitize` (no raw HTML from the LLM).
- **FR-024**: MUST use HttpOnly cookies with `sameSite=lax`, `secure=true` in prod.

### UI / UX
- **FR-025**: MUST use a dark theme with the Argentine flag palette (celeste #74ACDF, sun #F6B40E, bg #0A0E1A).
- **FR-026**: MUST show visual phases during chat streaming.
- **FR-027**: MUST use a typewriter effect with `requestAnimationFrame` (28 chars/frame).
- **FR-028**: MUST render charts, maps, and structured documents when the backend sends them.
- **FR-029**: MUST support cancellation of in-flight streams (abort).
- **FR-030**: MUST be mobile-first responsive.

### State Management
- **FR-031**: MUST use **hooks-only** for state management. No Redux, Zustand, Jotai, Recoil.
- **FR-032**: Messages and conversation state MUST live in React state (`useConversationState` hook).
- **FR-033**: Streaming state MUST live in refs (`useSSEStream` hook) to avoid re-renders.

### Observability
- **FR-034**: MUST integrate Sentry for client-side and server-side error tracking.
- **FR-035**: MUST use the custom logger (`src/lib/logger.ts`) with 4 levels.
- **FR-036**: The rate limiter MUST be per-user, with 6 distinct buckets (chat, read, write, sync, feedback, datasets).

### i18n
- **FR-037**: MUST use `next-intl` as the i18n framework.
- **FR-038**: Spanish is the default and only active locale (hardcoded today).
- **FR-039**: All user-visible strings MUST be loaded via the `useTranslations()` hook, not hardcoded in components.

### Deployment
- **FR-040**: MUST build with Docker.
- **FR-041**: MUST support deployment to EC2 alongside the backend via docker-compose.
- **FR-042**: MUST support config differences per environment: staging (private with allowlist) vs. production (public).

## 5. Success Criteria

- **SC-001**: First paint of the landing page **<2 seconds** on a normal connection.
- **SC-002**: Chat stream starts (first `thinking` event) in **<500ms** after sending the message.
- **SC-003**: Typewriter maintains **60fps** during streaming under normal load.
- **SC-004**: WebSocket fallback to HTTP sync activates in ≤8s if WS fails — **zero users see the chat hang**.
- **SC-005**: Rate limits are enforced **100%** of the time under normal conditions (fail-open only if the rate limit store fails).
- **SC-006**: **Zero unauthenticated accesses** to protected routes — middleware blocks 100% of requests without a valid JWT.
- **SC-007**: **Zero XSS** in rendered markdown — 100% of LLM content sanitized by `rehype-sanitize`.
- **SC-008**: **Zero regressions** in phases UX when the backend adds new unmapped `status` steps (the bridge has a fallback to `"Procesando: {step}..."`).
- **SC-009**: Production build **<3 minutes** in CI.
- **SC-010**: `/chat` page bundle size **<500 KB** gzipped (lazy loading of Recharts, Observable Plot, Leaflet).

## 6. Assumptions & Out of Scope

### Assumptions
- The backend is reachable most of the time. The WS fallback covers transient outages.
- Users have modern browsers (ES2022+, SSE support, Fetch API with streams).
- Google OAuth is available (email/password and other providers are not supported).
- Mandatory HTTPS in production (SameSite=lax cookies, Secure flag, OAuth requirements).

### Out of scope (today)
- **SSR for the chat**: the chat is 100% client-side after the initial layout.
- **Offline mode / PWA**: no service worker, no offline caching.
- **Active internationalization**: Spanish only (i18n mechanism exists but is pinned).
- **Push notifications**: not implemented.
- **Native mobile app**: responsive web only.
- **Real-time collaboration**: each chat is individual, not multi-user.
- **In-house business logic**: everything is delegated to the backend by design.
- **Active admin panel**: infrastructure exists but there is no UI yet.
- **Anonymous chat**: there is a fallback to a random `sessionId` but it is considered dev-mode, not a use case.

## 7. Open Questions

- **[RESOLVED CL-001]** — **`pdfjs-dist` is NOT a dead dependency** (fixed 2026-04-10). A finer grep shows it is imported in `scripts/ingest-sesiones.mjs:33` and `scripts/extract-ddjj.mjs:11` (standalone ingestion scripts that populate the sesiones and DDJJ chunks). It is not imported from `src/`, so it does not enter the Next.js bundle — but it is legitimately used by build-time scripts. **Action**: keep the dep and document the use; the related debt was reformulated in DEBT-004.
- **[RESOLVED CL-002]** — **`requireAdmin()` DOES have 1 active endpoint**: `/api/transparency/route.ts:90` uses it to gate the transparency report. `ADMIN_EMAILS` (2 admins in the staging env) is the only mechanism. See `009-transparency-page/` for detail. **Admin panel UI**: does not exist yet (product gap).
- **[NEEDS CLARIFICATION CL-003]** — Multi-language roadmap: today Spanish is hardcoded. Any plan for English/Portuguese? Requires refactoring `i18n/request.ts`?
- **[NEEDS CLARIFICATION CL-004]** — Production and staging environment split: are they separate servers, or the same host with different configs? Operational detail not derivable from the tracked code.
- **[RESOLVED CL-005]** — **No analytics are configured in the code.** Recursive grep across `src/` for `gtag`, `google-analytics`, `plausible`, `posthog`, `mixpanel` returns zero matches. The only client-side instrumentation is `@sentry/nextjs` (error tracking, not analytics). Planning a tracker is a product decision — not answered by code. (resolved 2026-04-11 via code inspection)
- **[RESOLVED CL-006]** — **Effectively dead on the happy path.** The NextAuth middleware at `src/middleware.ts` matches `['/chat', '/datasets', '/api/((?!auth).*)']` and redirects unauthenticated requests to `/login`, so any caller reaching `useConversationState` already has a JWT and `userEmail` is set — the `crypto.randomUUID()` branch in `useConversationState.ts:62` can only fire during the brief initial render before `useEffect` updates `sessionIdRef.current` to the email (line 65-69). There is no public/anonymous chat entry point. It is a defensive init value, not a supported anonymous-chat feature. (resolved 2026-04-11 via code inspection)
- **[RESOLVED CL-007]** — **Current code still attaches the API key to the WS URL query param.** `src/lib/chat/wsBridge.ts:23-30` explicitly calls `url.searchParams.set('api_key', BACKEND_API_KEY)` inside `buildWsUrl()`. The changelog entry "Remove API key from WebSocket payload" likely referred to removing it from the WS *message body* (the first `send()` payload) — not from the URL. Whether the URL placement is acceptable is a security decision; the code-state is unambiguous. (resolved 2026-04-11 via code inspection)
- **[RESOLVED CL-008]** — **Backend now enforces it.** The backend has `src/app/application/common/privacy_gate.py::ensure_privacy_accepted(email, user_repo)` which raises `HTTPException(403, {"code": "PRIVACY_NOT_ACCEPTED", ...})` when `user.privacy_accepted_at is None`. It is called from `smart_query_v2_router.py` (see grep in backend). So a user with a valid JWT who skips `/privacy` in the frontend cannot bypass by calling the API directly — the request is rejected server-side. Anonymous callers are exempted. (resolved 2026-04-11 via code inspection)
- **[RESOLVED CL-009]** — **Configs exist and read DSN from env vars.** `sentry.client.config.ts` and `sentry.server.config.ts` at the repo root both call `Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN / SENTRY_DSN, enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN })` — so the SDK is wired, but it only activates if the env var is set at runtime. Whether prod actually has those env vars set is operational/external info (see project MEMORY note "Sentry DSN not configured"); the code side is unambiguous. (resolved 2026-04-11 via code inspection)

## 8. Tech Debt Discovered

- **[DEBT-001]** — **`CLAUDE.md` severely stale**. It describes an architecture with `lib/agents/` + `lib/connectors/` + Gemini + Firestore that **does not exist in the code**. Any new contributor will be confused. **High impact** — recommendation: delete the old CLAUDE.md or replace it with one that references `specs/constitution.md`.
- **[DEBT-002]** — **In-memory rate limiter** at `src/lib/rateLimit.ts` uses a `Map<string, Entry>` in the process. **Not cluster-safe**: if scaled horizontally, each instance would have its own bucket and a user could exceed the limit by multiplying requests by N instances. For a single-instance prod this is not a problem; when scaling it requires Redis or similar.
- **[DEBT-003]** — **Hardcoded Spanish locale** in `src/i18n/request.ts`: `const locale = 'es'`. Requires refactoring for multi-language (cookie, header, or URL segment detection).
- **[DEBT-004]** — **`pdfjs-dist` unused dependency**. It's in `package.json` without any imports. Either it is used (and I did not see it) or it is dead weight — several MB of bundle. Verify and clean up.
- **[DEBT-005]** — **Latent admin infrastructure**: `ADMIN_EMAILS`, `requireAdmin()` helper, but no endpoint or UI uses it. Unused code that can confuse people or fall into disuse.
- **[DEBT-006]** — **API key in the WS URL query param** contradicts the `CHANGELOG.md`. Possible regression — verify and remove if possible (the backend expects the `X-API-Key` header, not a query param, according to the backend specs).
- **[DEBT-007]** — **`useConversationState` falls back to `crypto.randomUUID()` as `sessionId`** when there is no session. It inadvertently allows "anonymous chat". If not intentional, remove.
- **[DEBT-008]** — **Message history truncation strategy**: the frontend only sends the last 6 messages with content truncated to 500 chars (not the full history). The backend has its own memory via Redis keyed by `conversation_id`. If the backend loses memory (restart, Redis down), the frontend history is insufficient to recover context. Risk: fragile conversational continuity on cold paths.
- **[DEBT-009]** — **Invisible Sentry configs**: `@sentry/nextjs` as a dep, `next.config.ts` wrapped, but I do not see `sentry.client.config.ts` or `sentry.server.config.ts` in `src/` (they may be at the root or at build time). Verify that it is actually reporting errors.
- **[DEBT-010]** — ~~**Message duplication risk**~~ **FIXED 2026-04-10**: `/api/chat/route.ts` now persists the assistant message from the `finally` block regardless of outcome (happy path, WS-emitted error, caught exception). Uses `saveAssistantMessageWithRetry` with 3 attempts and exponential backoff; on error paths the helper sends the partial content plus `errored: true`. See `001-chat-bridge/[DEBT-002]` for the full fix description.

---

**End of spec.md** — See [./plan.md](./plan.md) for the complete as-built topology.
