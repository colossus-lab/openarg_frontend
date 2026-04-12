# OpenArg Frontend Specs

Frontend specifications following **Spec-Driven Design** adapted to the thin-client architecture. Reverse-engineered from the existing code (2026-04-10).

## Relationship with the backend

The OpenArg frontend is a **thin client** that consumes the backend (`openarg_backend`). The backend specs live at `../openarg_backend/specs/`. Cross-references between specs:

- **Frontend → backend**: use relative paths (e.g., `../../openarg_backend/specs/001-query-pipeline/`)
- **Backend → frontend**: backend specs mention the frontend as a consumer without depending on specific files

**Contributor rule**: any PR that changes observable behavior must update the relevant `spec.md` / `plan.md` as part of the change. See the [README § Spec-Driven Design](../README.md#spec-driven-design) for the full contract.

## Module index

Modules with multiple distinct responsibilities are **decomposed into sub-modules** — in those cases the top-level `spec.md` is a compact index and detailed FRs / tech debt live in the child folders.

| # | Module | Sub-modules | Scope |
|---|---|---|---|
| 000 | [`000-architecture/`](000-architecture/) | — | Macro as-built: thin-client + bridge pattern, routing, env inventory. |
| 001 | [`001-chat-bridge/`](001-chat-bridge/) | **4 sub-modules** | `/api/chat` SSE ↔ WebSocket orchestrator — the core route handler. |
| 001a | [`001-chat-bridge/001a-ws-bridge/`](001-chat-bridge/001a-ws-bridge/) | — | `streamViaWebSocket`, connect/activity timeouts, WS event parsing. |
| 001b | [`001-chat-bridge/001b-http-fallback/`](001-chat-bridge/001b-http-fallback/) | — | `fetchSynchronous` + synthetic phases + HTTP error mapping. |
| 001c | [`001-chat-bridge/001c-event-mapping/`](001-chat-bridge/001c-event-mapping/) | — | `mapStatusStep` translation table + SSE whitelist + `minDisplayMs`. |
| 001d | [`001-chat-bridge/001d-conversation-lifecycle/`](001-chat-bridge/001d-conversation-lifecycle/) | — | Conversation create, user message save, `saveAssistantMessageWithRetry`. |
| 002 | [`002-chat-ui/`](002-chat-ui/) | — | `chat/page.tsx`, streaming UI, typewriter reveal. |
| 003 | [`003-sse-client/`](003-sse-client/) | — | `useSSEStream` hook, chunk-queue reveal, abort logic. |
| 004 | [`004-auth/`](004-auth/) | — | NextAuth Google OAuth + middleware + allowlist + privacy gate. |
| 005 | [`005-conversations/`](005-conversations/) | — | Conversation CRUD proxy + `ConversationSidebar`. |
| 006 | [`006-developers-portal/`](006-developers-portal/) | — | API keys UI + `ApiKeyDialog`. |
| 007 | [`007-users-me/`](007-users-me/) | — | ARCO endpoints (access / rectification / erasure / opposition) + `UserSyncProvider`. |
| 008 | [`008-datasets-page/`](008-datasets-page/) | — | `/datasets` + `TaxonomyExplorer` + intra-ranking. |
| 009 | [`009-transparency-page/`](009-transparency-page/) | — | Admin-gated transparency reports + data quality. |
| 010 | [`010-api-proxies/`](010-api-proxies/) | — | Taxonomy, datasets, feedback thin proxies. |
| 011 | [`011-rate-limit/`](011-rate-limit/) | — | `lib/rateLimit.ts` — 6 per-user buckets (in-memory). |
| 012 | [`012-i18n/`](012-i18n/) | — | `next-intl` + `messages/es.json` (Spanish-only today). |
| 013 | [`013-observability/`](013-observability/) | — | Sentry config + `lib/logger.ts`. |
| 014 | [`014-visualization/`](014-visualization/) | — | `DataChart` (Recharts), `MapView` (Leaflet), `ObservablePlotChart`, `DocumentCards`. |
| 015 | [`015-reactbits/`](015-reactbits/) | — | Animation library — 11 motion components used on landing + login. |
| 016 | [`016-landing/`](016-landing/) | — | Home page + login + hero stats. |

Cross-cutting artifact:

| Doc | Purpose |
|---|---|
| [`constitution.md`](constitution.md) | Non-negotiable principles: thin-client, SSE-only bridge, NextAuth gate, `Authorization: Bearer` forwarded from the NextAuth session to the backend (FIX-005 enforced), no business logic, typewriter a11y, IDOR prevention. |

## Key discovery from the reverse-engineering

The frontend's legacy `CLAUDE.md` used to describe an architecture with `lib/agents/` and `lib/connectors/` that **no longer exists** in the code. The frontend migrated from self-contained (with its own Gemini pipeline + connectors) to a **thin-client with an SSE ↔ WebSocket bridge** to the backend. The stale file has since been replaced with a stub that points here.

Real state of the frontend (Apr 2026):
- **Does not have** `lib/agents/*`, `lib/connectors/*`, Gemini SDK, Firebase.
- **Does have** NextAuth Google OAuth, SSE consumer of the backend WS, full UI, per-user rate limiter, Sentry, Recharts + Leaflet + Observable Plot visualization stack.
- Acts as a **bridge**: browser speaks SSE, backend speaks WebSocket, `/api/chat` translates protocols and maps events in both directions.

## Spec format

Each module has **two files**: `spec.md` (WHAT/WHY) + `plan.md` (HOW). Same format as the backend specs. When a module is decomposed, its top-level `spec.md` / `plan.md` become compact indices.

- **`spec.md`** sections: Context, Ubiquitous Language, User Stories, Functional Requirements, Success Criteria, Assumptions & Out of Scope, Open Questions (`[NEEDS CLARIFICATION CL-NNN]` / `[RESOLVED CL-NNN]`), Tech Debt (`[DEBT-NNN]` / `[DEBT-NNN] — FIXED YYYY-MM-DD`).
- **`plan.md`** sections: Hexagonal/layer mapping, As-built flow, External deps, Persistence/state, Source files, Deviations from constitution.

### Format rules

1. **`spec.md` does not mention specific technology** — speak in product/UX language.
2. **`plan.md` does not invent requirements** — only describes what exists today.
3. **Tech debt is marked with `[DEBT-NNN]`**, numbered locally per module.
4. **Ambiguities with `[NEEDS CLARIFICATION CL-NNN]`**, never resolved by guessing.
5. **Specs point to real files** with paths relative to the repo root.
6. **Cross-refs to the backend** use `../../openarg_backend/specs/...`.
7. **`Last synced with code`** must be bumped whenever a spec is touched alongside a code change.
8. **English only** across all specs (the i18n strings inside code blocks are implementation artifacts and stay as-is).

Code sync date: **2026-04-10** (base commit: `bb32576`)
