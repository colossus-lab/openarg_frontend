# Debug pipeline: $ARGUMENTS

Diagnose the described problem in the 4-phase pipeline. Follow this checklist per phase:

## Phase 1: Planning (`src/lib/agents/planner.ts`)

- [ ] Verify `generatePlan()` receives the message and memory context correctly
- [ ] Check that the SYSTEM_PROMPT includes the relevant data source
- [ ] Verify output is a valid `ExecutionPlan` with steps
- [ ] Confirm action types in steps match the data agent's switch cases
- [ ] Check temperature (0.3) and that the model returns valid JSON
- [ ] If failing: add `console.log` of raw response before parsing

## Phase 2: Data Collection (`src/lib/agents/dataAgent.ts`)

- [ ] Verify each plan step has a corresponding `case` in `executeStep()`
- [ ] Check that step params map correctly to connector function params
- [ ] Verify timeouts (15s per connector) — is the external API responding?
- [ ] Check that connectors return valid `DataResult[]`
- [ ] Verify error handling: does the pipeline continue if a connector fails?
- [ ] Check limits: 500 rows, 2MB per CSV
- [ ] If a specific connector fails, go to `src/lib/connectors/` and debug there

Connectors and their files:
- `search_ckan` → `src/lib/connectors/ckan.ts`
- `query_series` → `src/lib/connectors/seriesTiempo.ts`
- `query_ddjj` → `src/lib/connectors/ddjj.ts`
- `query_argentina_datos` → `src/lib/connectors/argentinaDatos.ts`
- `query_georef` → `src/lib/connectors/georef.ts`
- `query_sesiones` → `src/lib/connectors/sesiones.ts`

## Phase 3: Analysis (`src/lib/agents/analysisAgent.ts`)

- [ ] Verify `CollectedData` arrives with real data (not empty)
- [ ] Review the SYSTEM_PROMPT — do instructions cover this query type?
- [ ] Check that chart data is generated correctly (deterministic first, LLM fallback)
- [ ] Check if the response exceeds max tokens (8192)
- [ ] If charts don't appear: verify deterministic generation logic in `analyzeData()`
- [ ] If markdown is malformed: check `<!--CHART:{}-->` comment parsing

## Phase 4: Memory (`src/lib/agents/memoryAgent.ts`)

- [ ] Verify `updateMemory()` receives the analysis result
- [ ] Check limits aren't exceeded (10 summaries, 20 findings)
- [ ] Verify memory context is passed to the planner on the next turn
- [ ] If context doesn't persist: check session store in `route.ts` (in-memory, 30 min TTL)

## SSE Streaming (`src/app/api/chat/route.ts`)

- [ ] Verify the stream doesn't cut off prematurely
- [ ] Check that each phase emits `phase_change` before executing
- [ ] Verify SSE format: `data: {"type":"...","data":"..."}\n\n`
- [ ] Check the consumer in `src/app/chat/page.tsx` — does it parse events correctly?
- [ ] If session issues: sessions are in-memory (max 100, TTL 30 min)

## Diagnostic steps

1. Read the relevant file for the failing phase
2. Add temporary logs to inspect input/output of each phase
3. Verify env vars: `GEMINI_API_KEY` is required for all phases
4. Test the connector in isolation if the issue is data-related
