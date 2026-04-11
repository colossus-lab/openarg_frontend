# OpenArg Frontend

**⚠️ This file is a stub.** The canonical architecture documentation lives in `specs/`.

- **Start here**: [`specs/README.md`](./specs/README.md)
- **Principles**: [`specs/constitution.md`](./specs/constitution.md)
- **Macro architecture**: [`specs/000-architecture/`](./specs/000-architecture/)
- **Chat bridge (core)**: [`specs/001-chat-bridge/`](./specs/001-chat-bridge/)
- **All modules**: 17 specs under `specs/`

## Quick facts (2026-04-10)

- **Stack**: Next.js 16 + React 19 + TypeScript 5 + NextAuth 4 (Google OAuth)
- **Role**: thin-client consumer of the `openarg_backend` FastAPI service
- **Chat protocol**: browser ↔ SSE ↔ `/api/chat` bridge ↔ WebSocket ↔ backend
- **Auth**: JWT sessions (24h TTL), middleware gate on `/chat` `/datasets` `/api/*`
- **Observability**: `@sentry/nextjs` configured + custom logger
- **Styling**: dark theme with Argentina flag palette (celeste #74ACDF, sol #F6B40E, bg #0A0E1A)

## Dev commands

```bash
npm run dev          # Dev server on :3000
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest
```

## Required env vars

See `specs/000-architecture/plan.md` section 7 for the complete list. Critical ones:

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://...
OPENARG_BACKEND_URL=http://backend:8081
OPENARG_BACKEND_API_KEY=...
```

---

**Note**: the previous version of this file described a self-contained
Gemini pipeline with `lib/agents/` and `lib/connectors/`. That architecture
no longer exists — the frontend migrated to a thin-client bridge and all
business logic lives in the backend. See `specs/000-architecture/spec.md`
for the current state.
