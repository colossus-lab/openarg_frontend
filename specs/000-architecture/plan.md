# Plan: Frontend Architecture (As-Built)

**Related spec**: [./spec.md](./spec.md)
**Type**: Reverse-engineered
**Status**: Draft
**Last synced with code**: 2026-04-10 (base commit `bb32576`)

---

## 1. Layer Mapping (Next.js-adapted)

The frontend is not classic hexagonal — it follows the Next.js App Router conventions. Mapping of conceptual layers:

| Conceptual layer | Folders / files | Role |
|---|---|---|
| **Presentation (Pages)** | `src/app/*/page.tsx`, `src/app/layout.tsx` | Server/Client components, UI entry points |
| **Presentation (Components)** | `src/components/**/*.tsx` | Reusable UI components |
| **Application (Route Handlers)** | `src/app/api/**/route.ts` | Orchestration: auth checks, rate limit, proxy to backend, SSE↔WS bridge |
| **Application (Hooks)** | `src/hooks/*.ts` | Client-side state orchestration + side effects |
| **Infrastructure (Lib)** | `src/lib/*.ts` | Auth helpers, rate limiter, logger, types |
| **Infrastructure (Middleware)** | `src/middleware.ts` | Pre-route auth gate |
| **Config** | `next.config.ts`, `tsconfig.json`, `package.json` | Build + typing + deps |
| **Static / assets** | `public/`, `messages/`, `data/` | Static files, i18n, seed data |
| **Styles** | `src/app/globals.css`, inline CSS in components | Dark theme + utilities |

There are no `ports/` or `adapters/` because the frontend does not need domain abstractions — all the domain logic lives in the backend.

## 2. Directory Structure (canonical)

```
openarg_frontend/
├── src/
│   ├── app/                             # App Router
│   │   ├── layout.tsx                   # Root layout + providers (Auth, UserSync, i18n, Theme)
│   │   ├── page.tsx                     # Landing (`/`) with reactbits animations
│   │   ├── globals.css                  # Dark theme, reset, utility classes
│   │   ├── global-error.tsx             # Global error boundary
│   │   ├── login/page.tsx               # Google OAuth button
│   │   ├── privacy/page.tsx             # ARCO privacy acceptance gate
│   │   ├── chat/page.tsx                # Main chat UI (775 lines)
│   │   ├── datasets/page.tsx            # Datasets browser
│   │   └── api/                         # Route handlers
│   │       ├── auth/[...nextauth]/route.ts   # NextAuth handler (LOCAL)
│   │       ├── chat/route.ts                 # SSE↔WS bridge (600 lines)
│   │       ├── conversations/route.ts        # List/create (proxy)
│   │       ├── conversations/[id]/route.ts   # Get/update/delete (proxy)
│   │       ├── feedback/route.ts             # PATCH feedback (proxy)
│   │       ├── users/sync/route.ts           # User upsert (proxy, IDOR-safe)
│   │       ├── users/me/route.ts             # Profile (proxy)
│   │       ├── users/me/data/route.ts        # ARCO export (proxy)
│   │       ├── users/me/settings/route.ts    # User settings (proxy)
│   │       ├── developers/keys/route.ts      # API keys CRUD (proxy)
│   │       ├── developers/keys/[keyId]/route.ts  # API key revoke (proxy)
│   │       ├── developers/usage/route.ts     # Usage stats (proxy)
│   │       ├── datasets/route.ts             # Datasets list/stats (proxy, cached 5min)
│   │       ├── taxonomy/route.ts             # Taxonomy (proxy, cached 5min)
│   │       └── transparency/route.ts         # Transparency report (proxy, cached 5min)
│   │
│   ├── components/                      # ~32 components
│   │   ├── AuthProvider.tsx             # NextAuth SessionProvider wrapper
│   │   ├── UserSyncProvider.tsx         # Sync user + privacy gate
│   │   ├── UserMenu.tsx                 # User dropdown
│   │   ├── ThemeToggle.tsx              # Dark/light switch
│   │   ├── ChatMessage.tsx              # Markdown renderer + GFM + feedback btns
│   │   ├── SourcePanel.tsx              # Collapsible sources
│   │   ├── DataChart.tsx                # Recharts wrapper
│   │   ├── ObservablePlotChart.tsx      # Observable Plot wrapper
│   │   ├── MapView.tsx                  # Leaflet map
│   │   ├── DocumentCards.tsx            # DDJJ / doc cards
│   │   ├── ConversationSidebar.tsx      # Conversation list + nav
│   │   ├── ChartErrorBoundary.tsx       # Chart fallback
│   │   ├── ApiKeyDialog.tsx             # API key CRUD modal
│   │   ├── ConfirmDialog.tsx            # Confirmation modal
│   │   ├── TaxonomyExplorer.tsx         # Datasets tree
│   │   ├── IntraRanking.tsx             # Ranking chart
│   │   ├── DataQualitySection.tsx       # Data quality summary
│   │   ├── DigitalizationGuide.tsx      # Digitalization guide
│   │   ├── AgentActivityBar.tsx         # Phase visualization (inline?)
│   │   └── reactbits/                   # 13 animation components
│   │       ├── BlurText.tsx, ClickSpark.tsx, CountUp.tsx, FadeIn.tsx,
│   │       ├── GradientText.tsx, ShinyText.tsx, DecryptedText.tsx,
│   │       ├── RotatingText.tsx, StarBorder.tsx, SpotlightCard.tsx,
│   │       ├── Magnet.tsx, Noise.tsx
│   │
│   ├── hooks/
│   │   ├── useSSEStream.ts              # SSE consumer + typewriter (~300 lines)
│   │   ├── useConversationState.ts      # Messages + loaded conversation state
│   │   └── useAutoResize.ts             # Textarea auto-resize
│   │
│   ├── lib/
│   │   ├── auth.ts                      # requireSession, backendHeaders, requireAdmin
│   │   ├── authOptions.ts               # NextAuth config (Google OAuth + allowlist)
│   │   ├── rateLimit.ts                 # In-memory per-user rate limiter (6 buckets)
│   │   ├── logger.ts                    # Custom logger (4 levels)
│   │   └── types.ts                     # TypeScript interfaces (StreamEvent, ChatMessage, etc.)
│   │
│   ├── i18n/
│   │   └── request.ts                   # next-intl config (hardcoded es)
│   │
│   └── middleware.ts                    # Auth gate for /chat, /datasets, /api/*
│
├── messages/
│   └── es.json                          # Spanish translations (14.5 KB)
│
├── public/                              # Static assets
├── data/                                # Static seed data
├── docs/                                # Repo docs
├── tests/                               # Vitest tests
├── scripts/                             # Utility scripts
├── package.json
├── package-lock.json
├── next.config.ts                       # Next.js + Sentry config
├── tsconfig.json
├── eslint.config.mjs
├── Dockerfile
├── sentry.client.config.ts              # Sentry client init
├── sentry.server.config.ts              # Sentry server init
├── CLAUDE.md                            # STALE — describes the old architecture that does not exist
└── .nvmrc                               # Node version pin (>=20)
```

## 3. System Topology

```
                    ┌──────────────────────────┐
                    │    User Browser          │
                    │  (public web host)       │
                    └────────────┬─────────────┘
                                 │ HTTPS + SSE
                                 ▼
                    ┌──────────────────────────┐
                    │   Caddy (TLS + Proxy)    │
                    │   Same server as backend │
                    └────────────┬─────────────┘
                                 ▼
           ┌───────────────────────────────────────────┐
           │   Next.js 16 (openarg_frontend container) │
           │                                           │
           │   ┌─────────────────────────────────┐    │
           │   │ middleware.ts (auth gate)        │    │
           │   │  - getToken() from JWT cookie    │    │
           │   │  - Block /chat /datasets /api/*  │    │
           │   └──────┬──────────────────┬────────┘    │
           │          │                  │             │
           │          ▼                  ▼             │
           │   ┌──────────────┐    ┌──────────────┐   │
           │   │ Pages        │    │ API Routes   │   │
           │   │ /            │    │ /api/chat    │   │
           │   │ /login       │    │ /api/auth/*  │   │
           │   │ /chat        │    │ /api/conv..  │   │
           │   │ /datasets    │    │ /api/users.. │   │
           │   │ /privacy     │    │ /api/dev..   │   │
           │   └──────────────┘    │ /api/*       │   │
           │                       └──────┬───────┘   │
           │                              │           │
           │   ┌──────────────────────────┼────────┐  │
           │   │ requireSession()          │        │  │
           │   │ checkRateLimit()          │        │  │
           │   │ backendHeaders(email) ────┼──────┐ │  │
           │   └──────────────────────────┘     │ │  │
           └─────────────────────────────────────┼─┼──┘
                                                 │ │
                 ┌───────────────────────────────┘ │
                 │                                 │
                 ▼ WebSocket (primary)             ▼ HTTP (proxy)
        ws://backend/api/v1/query/ws/smart   POST/GET backend/api/v1/*
                 │                                 │
                 ▼ (fallback)                      │
        POST backend/api/v1/query/smart            │
                 │                                 │
                 └─────────────┬───────────────────┘
                               ▼
                    ┌──────────────────────────┐
                    │  openarg_backend (prod)  │
                    │  FastAPI + LangGraph     │
                    │  PostgreSQL + Redis      │
                    │  Celery workers          │
                    └──────────────────────────┘

External:
  ┌──────────────────┐      ┌──────────────────┐
  │  Google OAuth    │      │  Sentry          │
  │  (NextAuth flow) │      │  (error tracking)│
  └──────────────────┘      └──────────────────┘
```

## 4. Key Flows

### 4.1 Auth flow (login)
```
1. User → /login → click "Ingresar con Google"
2. Frontend → redirect to Google OAuth
3. Google → callback to /api/auth/callback/google (NextAuth)
4. NextAuth → signIn callback in authOptions.ts
   ├── If OPEN_BETA=true → allow (verify OPEN_BETA_DOMAINS if present)
   └── If OPEN_BETA=false → verify email is in ALLOWED_EMAILS → allow or AccessDenied
5. NextAuth → issue JWT (24h TTL) → set HttpOnly cookie
6. Frontend → redirect to /chat (or callbackUrl)
7. UserSyncProvider → POST /api/users/sync → backend upserts user
8. If privacy not accepted → redirect to /privacy
```

### 4.2 Chat flow (SSE ↔ WS bridge) — see spec `001-chat-bridge/` for full detail
```
1. User types message in /chat/page.tsx
2. useSSEStream.sendMessage(body, onEvent) → fetch POST /api/chat
3. /api/chat/route.ts:
   a. requireSession() → validates JWT
   b. checkRateLimit('chat') → 10/min per user
   c. Sanitize message + history
   d. Create conversation in backend
   e. Save user message in backend
   f. PRIMARY: buildWsUrl() → new WebSocket(wsUrl) with 8s timeout
      - ws.on('message') → parse event → map to SSE event → send via ReadableStream
      - status steps → phase_change + thinking
      - chunk → content
      - complete → sources/charts/documents/map
   g. FALLBACK (if WS fails): fetch POST /api/v1/query/smart → sync response → emit simulated phases
4. Browser receives SSE events via useSSEStream
5. Typewriter reveals text in requestAnimationFrame (28 chars/frame)
6. At the end, save assistant message in backend
7. send 'done' event → close stream
```

### 4.3 ARCO erasure flow (delete user)
```
1. User → UserMenu → "Eliminar cuenta"
2. ConfirmDialog → confirm
3. DELETE /api/users/me → proxy to DELETE /api/v1/users/me
4. Backend cascade deletes conversations, messages, user_queries
5. Frontend → NextAuth signOut() → redirect to /
```

## 5. Route Inventory

### API Routes

| Path | Method | Type | Backend endpoint | Rate limit |
|---|---|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | **LOCAL** | — (NextAuth internal) | — |
| `/api/chat` | POST | **BRIDGE** | `ws://backend/api/v1/query/ws/smart` + fallback `/api/v1/query/smart` | `chat` (10/min) |
| `/api/conversations` | GET | Proxy | `GET /api/v1/conversations` | `conversations:get` (30/min) |
| `/api/conversations` | POST | Proxy | `POST /api/v1/conversations/` | `conversations:post` (10/min) |
| `/api/conversations/[id]` | GET | Proxy | `GET /api/v1/conversations/{id}` | `conversations:get` |
| `/api/conversations/[id]` | POST | Proxy | `POST /api/v1/conversations/{id}/messages` | `conversations:post` |
| `/api/conversations/[id]` | DELETE | Proxy | `DELETE /api/v1/conversations/{id}` | `conversations:post` |
| `/api/feedback` | PATCH | Proxy | `PATCH /api/v1/conversations/{id}/messages/{msgId}/feedback` | `feedback` (10/min) |
| `/api/users/sync` | POST | Proxy (IDOR-safe) | `POST /api/v1/users/sync` | `sync` (15/min) |
| `/api/users/me` | GET | Proxy | `GET /api/v1/users/me` | `conversations:get` |
| `/api/users/me` | DELETE | Proxy | `DELETE /api/v1/users/me` | `conversations:post` |
| `/api/users/me/data` | GET | Proxy | `GET /api/v1/users/me/data` | `conversations:get` |
| `/api/users/me/settings` | GET/PATCH | Proxy | `.../settings` | `conversations:get` / `post` |
| `/api/developers/keys` | GET/POST | Proxy | `.../developers/keys` | `conversations:get` / `post` |
| `/api/developers/keys/[keyId]` | DELETE | Proxy | `.../developers/keys/{id}` | `conversations:post` |
| `/api/developers/usage` | GET | Proxy | `.../developers/usage` | `conversations:get` |
| `/api/datasets` | GET | Proxy (cache 5min) | `/api/v1/datasets` or `/api/v1/datasets/stats` | `datasets` (30/min) |
| `/api/taxonomy` | GET | Proxy (cache 5min) | `/api/v1/taxonomy` | `datasets` |
| `/api/transparency` | GET | Proxy (cache 5min) | `/api/v1/transparency` | `datasets` |

### Page Routes

| Path | File | Protection | Notes |
|---|---|---|---|
| `/` | `app/page.tsx` | Public | Landing with reactbits animations |
| `/login` | `app/login/page.tsx` | Public | Google OAuth button |
| `/privacy` | `app/privacy/page.tsx` | Public | ARCO privacy gate |
| `/chat` | `app/chat/page.tsx` | Protected (middleware) | Main chat UI (775 lines) |
| `/datasets` | `app/datasets/page.tsx` | Protected (middleware) | Datasets browser |

## 6. External Dependencies

| Dependency | Purpose | Critical |
|---|---|---|
| **Google OAuth** | Auth via NextAuth | Yes — without it no one can log in |
| **OpenArg backend** (`openarg_backend`) | All business logic + data | Yes — the frontend is useless without the backend |
| **PostgreSQL + Redis + Celery** | Via the backend | Yes (transitive) |
| **Sentry** | Error tracking | No — optional with `SENTRY_DSN` env var |
| **CDN fonts (@fontsource)** | Inter + JetBrains Mono | No — self-hosted, zero runtime dep |

## 7. Environment Variables

### Required
```bash
# NextAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=...           # JWT signing secret
NEXTAUTH_URL=https://...      # Callback URL (your deployed host)

# Backend
OPENARG_BACKEND_URL=http://...   # default: http://localhost:8081
OPENARG_BACKEND_API_KEY=...      # X-API-Key to call the backend
```

### Access control
```bash
# Staging (active allowlist)
ALLOWED_EMAILS=email1@x.com,email2@y.com,...
OPEN_BETA=false

# Production (bypass)
OPEN_BETA=true
OPEN_BETA_DOMAINS=domain1.com,domain2.com  # optional, filters by domain

# Admin (future, infrastructure ready but unused)
ADMIN_EMAILS=admin1@x.com,admin2@y.com
```

### Rate limits (defaults)
```bash
RATE_LIMIT_CHAT=10           # req/min
RATE_LIMIT_READ=30           # req/min
RATE_LIMIT_WRITE=10          # req/min
RATE_LIMIT_SYNC=15           # req/min
MAX_MESSAGE_LENGTH=5000      # chars
MAX_HISTORY_CONTENT=2000     # chars per entry
MAX_HISTORY_LENGTH=20        # entries
```

### Optional
```bash
SENTRY_DSN=https://...       # If you want to report errors to Sentry
DISABLE_AUTH=true            # LOCAL DEV ONLY — bypasses auth
```

## 8. Source Files (entry points)

| File | Role |
|---|---|
| `src/app/layout.tsx` | Root layout, providers (Auth, UserSync, i18n, Theme), Sentry init |
| `src/app/page.tsx` | Landing (`/`) |
| `src/app/chat/page.tsx` | Main chat UI (775 lines) |
| `src/app/api/chat/route.ts` | **SSE↔WS BRIDGE** (600 lines — the central piece) |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth handler |
| `src/middleware.ts` | Global auth gate |
| `src/lib/auth.ts` | `requireSession`, `backendHeaders`, `requireAdmin` helpers |
| `src/lib/authOptions.ts` | NextAuth config + Google OAuth + allowlist callback |
| `src/lib/rateLimit.ts` | In-memory per-user rate limiter |
| `src/lib/types.ts` | TypeScript contracts (StreamEvent, ChatMessage, ChartData, etc.) |
| `src/hooks/useSSEStream.ts` | SSE consumer + typewriter |
| `src/hooks/useConversationState.ts` | Messages + conversation state |
| `package.json` | Dependencies + scripts |
| `next.config.ts` | Next.js + Sentry wrapping |
| `Dockerfile` | Production image |
| `messages/es.json` | Spanish translations |

## 9. Deviations from Constitution

- **Principle XI (i18n)**: Spanish hardcoded in `i18n/request.ts` — violates the "multi-language ready" principle but is an accepted decision until there is demand.
- **Principle VII (Security) — rate limiter**: the in-memory rate limiter is NOT cluster-safe. Accepted as long as the deploy is single-instance.
- **Principle IX (Observability)**: Sentry is configured as a dep but the `sentry.*.config.ts` files live at the repo root, not in `src/`. We need to verify that they are actually being loaded.
- **Principle I (Thin client)** — `/api/chat/route.ts` has non-trivial bridge logic (event mapping, phase simulation, conversation management). Technically it is orchestration, not business logic, but it is the only file with real complexity in the frontend.
- **Principle VI (Auth)**: the `X-User-Email` header trust model is suboptimal but is kept until `../../openarg_backend/specs/FIX_BACKLOG.md#fix-005` (JWT validation server-side) is implemented.

---

**End of plan.md** — See [./spec.md](./spec.md) for user stories, FRs, and detailed debt.
