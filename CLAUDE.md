# OpenArg Frontend

OpenArg is an AI-powered platform for analyzing Argentine government open data. Users ask natural-language questions and a multi-agent pipeline fetches, analyzes, and visualizes public datasets in real time.

## Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript 5
- **AI:** Google Generative AI SDK — Gemini 2.5 Flash (planning, analysis, memory) + gemini-embedding-001 (vector search)
- **Charts:** Recharts 3
- **Auth:** NextAuth 4 (Google OAuth)
- **Styling:** Custom CSS dark theme (Argentina flag palette: celeste #74ACDF, sol #F6B40E, bg #0A0E1A)
- **DB:** Firebase Admin / Firestore (vector search for sesiones)
- **Deploy:** Vercel

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts   # NextAuth Google OAuth
│   │   └── chat/route.ts                 # Main SSE orchestrator (POST)
│   ├── chat/page.tsx                     # Chat UI — SSE consumer
│   ├── login/page.tsx
│   └── layout.tsx
├── components/
│   ├── AgentActivityBar.tsx              # 4-phase pipeline visualization
│   ├── ChatMessage.tsx                   # Markdown + GFM message renderer
│   ├── DataChart.tsx                     # Recharts wrapper (line/bar/pie)
│   ├── SourcePanel.tsx                   # Collapsible data sources
│   ├── AuthProvider.tsx                  # NextAuth SessionProvider
│   └── UserMenu.tsx
├── lib/
│   ├── agents/
│   │   ├── types.ts                      # Pipeline type definitions
│   │   ├── gemini.ts                     # Gemini client config
│   │   ├── planner.ts                    # Phase 1: plan generation
│   │   ├── dataAgent.ts                  # Phase 2: data collection
│   │   ├── analysisAgent.ts              # Phase 3: analysis + insights
│   │   └── memoryAgent.ts               # Phase 4: context memory
│   ├── connectors/
│   │   ├── types.ts                      # DataResult interface
│   │   ├── ckan.ts                       # 10 CKAN portals search
│   │   ├── seriesTiempo.ts              # Economic time-series (16 indicators)
│   │   ├── ddjj.ts                       # Patrimonial declarations (195 records)
│   │   ├── argentinaDatos.ts            # Dolar blue, riesgo pais
│   │   ├── georef.ts                     # Geographic normalization
│   │   └── sesiones.ts                  # Congressional transcriptions (Firestore vector)
│   ├── firebase.ts
│   └── middleware.ts
└── data/                                 # Static data
```

### SSE Pipeline (`/api/chat`)

The orchestrator in `src/app/api/chat/route.ts` runs 4 phases sequentially, streaming events:

1. **Planning** — `planner.ts` decomposes the query into an `ExecutionPlan` (structured JSON)
2. **Data** — `dataAgent.ts` executes plan steps, dispatching to connectors in parallel/sequential order
3. **Analysis** — `analysisAgent.ts` analyzes collected data, generates markdown + chart data
4. **Memory** — `memoryAgent.ts` updates session context (last 10 summaries, 20 key findings)

SSE event types: `phase_change`, `thinking`, `content`, `chart`, `sources`, `error`, `done`.

### Connectors

Each connector in `src/lib/connectors/` normalizes output to `DataResult` (defined in `types.ts`). The data agent dispatches to connectors by action type: `search_ckan`, `query_series`, `query_ddjj`, `query_argentina_datos`, `query_georef`, `query_sesiones`.

## Conventions

- All interactive components use `'use client'` directive
- Dark theme: glassmorphism (backdrop-filter blur), celeste borders, sol accents
- Components are TypeScript with explicit prop interfaces
- Charts use deterministic data generation first, LLM-generated as fallback
- Spanish-language responses, English code/comments
- Sessions are in-memory (not persistent across cold starts)

## Git

- Do NOT add `Co-Authored-By` lines to commit messages.

## Dev Commands

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
npm run start        # Start production server
```

## Environment Variables

```
GEMINI_API_KEY                  # Google AI API key
GOOGLE_CLIENT_ID                # NextAuth Google OAuth
GOOGLE_CLIENT_SECRET
NEXTAUTH_SECRET                 # JWT signing
NEXTAUTH_URL                    # Callback URL
FIREBASE_SERVICE_ACCOUNT_KEY    # Firestore (sesiones vector search)
```
