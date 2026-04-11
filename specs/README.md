# OpenArg Frontend Specs

OpenArg frontend specifications following an adapted **Spec-Driven Design**. Reverse-engineered from the existing code (2026-04-10).

## Relationship with the backend

The OpenArg frontend is a **thin client** that consumes the backend (`openarg_backend`). The backend specs live at `../openarg_backend/specs/`. Cross-references between specs:

- **Frontend → backend**: use relative paths (e.g., `../../openarg_backend/specs/001-query-pipeline/`)
- **Backend → frontend**: backend specs mention the frontend as a consumer without depending on specific files

## Key discovery from the reverse-engineering

The frontend's **`CLAUDE.md`** is **stale**. It describes an architecture with `lib/agents/` and `lib/connectors/` that **no longer exists** in the code. The frontend migrated from self-contained (with its own Gemini pipeline + connectors) to **thin-client with an SSE↔WebSocket bridge** to the backend.

Real state of the frontend (Apr 2026):
- **Does not have** `lib/agents/*`, `lib/connectors/*`, Gemini SDK, Firebase
- **Does have** NextAuth Google OAuth, SSE consumer of the backend WS, full UI
- Acts as a **bridge**: browser speaks SSE, backend speaks WebSocket, `/api/chat` translates

## Structure

```
specs/
├── README.md                           # this file
├── constitution.md                     # non-negotiable frontend principles
├── 000-architecture/                   # macro: thin-client + bridge pattern
├── 001-chat-bridge/                    # /api/chat SSE↔WS orchestrator [CORE]
├── 002-chat-ui/                        # chat/page.tsx + ChatMessage rendering
├── 003-sse-client/                     # useSSEStream hook + typewriter
├── 004-auth/                           # NextAuth Google OAuth + middleware + authOptions
├── 005-conversations/                  # Conversation CRUD proxy + ConversationSidebar
├── 006-developers-portal/              # API keys UI + ApiKeyDialog
├── 007-users-me/                       # ARCO endpoints + UserSyncProvider + privacy gate
├── 008-datasets-page/                  # /datasets + TaxonomyExplorer
├── 009-transparency-page/              # Transparency + DataQuality + IntraRanking
├── 010-api-proxies/                    # taxonomy, datasets, feedback proxy routes
├── 011-rate-limit/                     # lib/rateLimit.ts — 6 per-user buckets
├── 012-i18n/                           # next-intl + messages/es.json
├── 013-observability/                  # Sentry + lib/logger.ts
├── 014-visualization/                  # DataChart + MapView + DocumentCards + ObservablePlotChart
├── 015-reactbits/                      # Animation library (13 components)
└── 016-landing/                        # Home page + login
```

## Spec format

Each feature has **two files**: `spec.md` (WHAT/WHY, user-facing) + `plan.md` (HOW, as-built). Same format as the backend:

- **`spec.md`** sections: Context, Ubiquitous Language, User Stories, Functional Requirements, Success Criteria, Assumptions & Out of Scope, Open Questions (`[NEEDS CLARIFICATION CL-NNN]`), Tech Debt (`[DEBT-NNN]`)
- **`plan.md`** sections: Hexagonal/layer mapping, As-built Flow, External Deps, Persistence/State, Source Files, Deviations from Constitution

### Format rules
1. `spec.md` does not mention specific technology — speak in product/UX language
2. `plan.md` does not invent requirements — only describes what exists today
3. Tech debt is marked with `[DEBT-NNN]`, numbered locally per module
4. Ambiguities with `[NEEDS CLARIFICATION CL-NNN]`, never resolved by making things up
5. Specs point to real files with paths relative to the repo root
6. Cross-refs to the backend use `../../openarg_backend/specs/...`

## Current status

| Spec | Status |
|---|---|
| `constitution.md` | Draft |
| `000-architecture/` | Draft |
| Rest | TBD |

Code sync date: **2026-04-10** (base commit: `bb32576`)
