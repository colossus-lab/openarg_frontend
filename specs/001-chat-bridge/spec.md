# Spec: Chat Bridge (`/api/chat`)

**Type**: Reverse-engineered
**Status**: Draft
**Last synced with code**: 2026-04-10
**Layer scope**: Application (route handler)
**Related plan**: [./plan.md](./plan.md)

---

## 1. Context & Purpose

`/api/chat/route.ts` is **the central piece of the frontend**: a Next.js route handler that acts as a **bidirectional bridge** between the browser (which speaks SSE) and the backend (which speaks primary WebSocket + HTTP sync as fallback). It translates protocols, maps events, manages the conversation lifecycle, enforces auth + rate limiting + input sanitization, and provides graceful degradation when the backend WS fails.

It is the only file in the frontend with complex orchestration (~600 lines). Everything else is UI or trivial proxy.

## 2. Ubiquitous Language

| Term | Definition |
|---|---|
| **Bridge** | This route handler — translates SSE (browser) ↔ WebSocket (backend) ↔ HTTP (backend fallback). |
| **Status step** | Backend event during the pipeline: `classifying`, `cache_check`, `planning`, `searching`, `generating`, etc. |
| **Phase** | User-visible phase: `planning`, `data_collection`, `analysis`, `synthesis`. |
| **Thinking** | Friendly Spanish string that accompanies each phase ("Recorriendo los portales de datos..."). |
| **WS primary** | WebSocket connection to the backend `/api/v1/query/ws/smart` with an 8s connect timeout + 120s activity timeout. |
| **HTTP fallback** | Sync POST to `/api/v1/query/smart` when WS fails; phases simulated by the frontend. |
| **SmartResult** | Shape of the final backend result: `{answer, sources, chart_data, map_data, documents, confidence, citations}`. |

## 3. User Stories

### US-001 (P1) — Frontend UI consumes a single chat endpoint
**As a** frontend UI (`chat/page.tsx`), **I want** a single POST endpoint that streams SSE, **so that** I don't have to open WebSockets from the browser (more complex, worse compatibility with proxies).

### US-002 (P1) — User sees real-time progress
**As a** user, **when** I submit a query, **I want** to see phases and progress messages appear immediately, **so that** I know the system is working.

- Happy path: WS connects in <1s → phases appear live → LLM chunks are streamed → complete with sources/charts
- Edge case: WS hangs for 8s → transparent HTTP fallback, user sees simulated phases

### US-003 (P1) — Graceful degradation when the backend WS fails
**As a** user, **when** the backend WebSocket is down, **I want** the chat to keep working (with worse UX but without crashing).

- Trigger: WS does not connect in 8s OR WS closes abruptly OR WS activity timeout 120s
- Happy path: fallback to `fetchSynchronous` → POST HTTP `/api/v1/query/smart` → full response → emission of synthetic phases to the browser

### US-004 (P1) — Per-user rate limiting applied
**As an** operator, **I want** no user to be able to send more than 10 queries/min, **so that** I prevent abuse.

### US-005 (P1) — Managed conversation lifecycle
**As a** system, **I want** the conversation to be created in the backend BEFORE invoking the pipeline, **so that** the user's message is persisted even if the pipeline fails afterwards.

### US-006 (P2) — Mandatory input sanitization
**As an** operator, **I want** strict caps on message length and history, **so that** I prevent abusive payloads and context injection attacks.

### US-007 (P2) — Supported policy mode
**As an** advanced user, **I want** to be able to enable `policy_mode: true` in the body, **so that** the backend runs additional public policy analysis.

### US-008 (P2) — Clarification events passed to the browser
**As a** user, **when** my query is ambiguous, **I want** to see clickable options (chips) to refine it, without interrupting the flow.

## 4. Functional Requirements

### Auth & Rate Limit
- **FR-001**: The handler MUST call `requireSession()` before processing any request.
- **FR-002**: MUST apply `checkRateLimit(email, 'chat', RATE_LIMIT_CHAT)` (default 10/min).
- **FR-003**: MUST extract `userEmail` from the JWT (not from the body).

### Input Sanitization
- **FR-004**: MUST validate that `message` exists and is a string. Reject with 400 if missing.
- **FR-005**: MUST reject with 400 if `message.length > MAX_MESSAGE_LENGTH` (5000).
- **FR-006**: MUST sanitize `history`: only accept entries with `role ∈ {user, assistant}` and string `content`.
- **FR-007**: MUST cap each history entry to `MAX_HISTORY_CONTENT` (2000) chars.
- **FR-008**: MUST cap the history to the last `MAX_HISTORY_LENGTH` (20) entries.

### Conversation Lifecycle
- **FR-009**: MUST create the conversation in the backend (`POST /api/v1/conversations/`) BEFORE invoking the pipeline, if the body does not include `conversationId`.
- **FR-010**: MUST emit the `conversation_saved` event to the browser immediately after creating the conversation (so the UI can track the ID).
- **FR-011**: MUST save the user message (`POST /api/v1/conversations/{id}/messages`) BEFORE the pipeline.
- **FR-012**: MUST save the assistant message AFTER the stream completes successfully.
- **FR-013**: MUST emit `assistant_message_saved` with the assistant message ID when saving it.

### WebSocket Primary Path
- **FR-014**: `buildWsUrl()` MUST build the WS URL by converting `http://` → `ws://` (or `https://` → `wss://`) and pointing to `/api/v1/query/ws/smart`.
- **FR-015**: MUST pass `BACKEND_API_KEY` (service-to-service token) as the `?api_key=...` query param in the URL. This is the standard workaround for auth in WebSocket handshakes from Node (the `ws` package does not easily support custom headers). The backend explicitly validates the query param in `smart_query_v2_router.py:234-244`.
- **FR-016**: MUST open the WebSocket with an **8-second** timeout for the initial connection.
- **FR-017**: MUST apply a **120-second** inactivity timeout (reset on each received message).
- **FR-018**: MUST send the initial payload to the backend on the `open` event: `{question, conversation_id, policy_mode}`.
- **FR-019**: MUST parse backend events: `status`, `chunk`, `complete`, `clarification`, `error`.
- **FR-020**: After more than **5 consecutive parse errors**, it MUST abort the stream and return what has been accumulated.

### HTTP Fallback Path
- **FR-021**: When WS returns `null` (failure), it MUST fall back to `fetchSynchronous`.
- **FR-022**: `fetchSynchronous` MUST POST to `${BACKEND_URL}/api/v1/query/smart` with `backendHeaders(email)`.
- **FR-023**: MUST handle HTTP errors with user-friendly Spanish messages:
  - 429 → "Demasiadas consultas. Esperá un momento antes de intentar de nuevo."
  - 502/503/504 → "El sistema de análisis no está disponible en este momento."
  - 5xx → "Error interno del servidor."
- **FR-024**: In the fallback, it MUST emit synthetic phases (`planning → data_collection → analysis → synthesis`) to maintain UX consistency.

### Event Mapping (Backend → Frontend)
- **FR-025**: `mapStatusStep(step, extra)` MUST translate each backend step to `{phase?, thinking?}` according to this table:

| Backend step | Frontend phase | Thinking |
|---|---|---|
| `classifying` | `planning` | "Entendiendo tu pregunta..." |
| `cache_check` | — | "Buscando en caché..." |
| `cache_hit` | — | "¡Ya tengo esa info lista!" |
| `loading_context` | — | "Cargando contexto de conversación..." |
| `coordination` | — | `extra.detail` or "Evaluando resultados..." |
| `replanning` | `planning` | `extra.detail` or "Replanificando búsqueda..." |
| `skill` | `planning` | `extra.detail` or "Aplicando estrategia especializada..." |
| `planning` | `planning` | "Armando la estrategia con el equipo..." |
| `planned` | — | "Listo, el equipo va a investigar en N fuente(s)" |
| `searching` | `data_collection` | `extra.detail` or "Recorriendo los portales de datos..." |
| `generating` | `analysis` | "Analizando lo que encontramos..." |
| `policy_analysis` | — | "Evaluando el impacto de la política..." |
| *(default)* | — | "Procesando: {step}..." |

### Browser Event Whitelist
- **FR-026**: The only event types the bridge MUST emit to the browser are: `phase_change`, `thinking`, `content`, `chart`, `sources`, `documents`, `map`, `clarification`, `error`, `conversation_saved`, `assistant_message_saved`, `done`.
- **FR-027**: MUST emit `phase_change: 'synthesis'` at the end of the stream (before `done`).
- **FR-028**: MUST apply an artificial `minDisplayMs=2000` delay if the complete response arrives in less than 2 seconds, so that the UX does not feel abrupt.

### Stream Management
- **FR-029**: MUST use `ReadableStream` + `TextEncoder` + `controller.enqueue` with the format `data: ${JSON.stringify(event)}\n\n` (standard SSE).
- **FR-030**: MUST cleanly close the stream in the handler's `finally` (`controller.close()`).
- **FR-031**: MUST respond with headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.

### Error Handling
- **FR-032**: Backend errors (`ECONNREFUSED`, `ECONNRESET`, `ENOTFOUND`) MUST be mapped to: "No se pudo conectar con el servidor. El sistema puede estar en mantenimiento."
- **FR-033**: Any unexpected error MUST emit `{type: 'error', data: <friendly message>}` to the browser.
- **FR-034**: If the WS path emits an `error` event or `clarification` event, it MUST NOT fall back to HTTP (uses the `_wsError` flag).

## 5. Success Criteria

- **SC-001**: WS connects in **<1s** under normal conditions (p95 <2s).
- **SC-002**: Fallback to HTTP sync activates **exactly at 8s** when WS does not connect.
- **SC-003**: **Zero backend errors leak verbatim to the user** — all are mapped to friendly Spanish strings.
- **SC-004**: **Zero orphaned conversations**: the user message is always saved before invoking the pipeline.
- **SC-005**: Rate limits are enforced **100% of the time** under normal load.
- **SC-006**: Parse errors from the WS stream are tolerated up to 5; after that what has been accumulated is returned without breaking.
- **SC-007**: Activity timeout (120s) protects against zombie connections.
- **SC-008**: `minDisplayMs=2000` prevents cache hits from feeling abrupt to the user.

## 6. Assumptions & Out of Scope

### Assumptions
- The backend WebSocket is available most of the time.
- When WS fails, HTTP sync is available (same backend infrastructure).
- The backend status steps are stable — if the backend changes its steps, the `mapStatusStep` fallback shows "Procesando: {step}..." as graceful degradation.
- The request body comes from a trusted client (the frontend itself) — no signing or similar is verified.

### Out of scope
- **Server-Sent Events directly from the backend to the browser** (without the bridge) — would require the backend to support SSE, today it only supports WS.
- **Bidirectional streaming** — the bridge is unidirectional (server→client), the user cannot inject during the stream.
- **Multi-user chat** — each request is independent, there is no broadcast.
- **Automatic WS reconnection** — if the stream dies, the user must retry.
- **Bridge-side caching** — the semantic cache lives in the backend, not here.

## 7. Open Questions

- **[RESOLVED CL-001]** — **It is NOT a regression, it is intentional**. Verified against the backend code (2026-04-10):
  - `BACKEND_API_KEY` is a **service-to-service token** frontend↔backend (not a user key like `oarg_sk_*`).
  - The backend in `smart_query_v2_router.py:234-244` **explicitly validates** the `api_key` query param in the WebSocket handshake: *"Try query-param auth first (backward compat)"*.
  - The CHANGELOG entry `"Remove API key from WebSocket payload"` (commit `07fa8ea`) was about the **JSON body** that the frontend was sending AFTER the `open` — it was redundant because the handshake already validated it. The fix removed the redundancy from the body, keeping the URL query param.
  - **Node's `ws` package** does not easily support custom headers in the WS handshake, so a query param is the **standard workaround** for service auth in Node.
  - **Residual risk**: a URL with a secret may end up in proxy logs. Mitigation: it is an internal service key, rotatable via env var, not a user secret. Accepted risk for the current service-to-service architecture.
- **[NEEDS CLARIFICATION CL-002]** — If the stream breaks with an error AFTER saving the user message but BEFORE saving the assistant message, the conversation ends up "half-saved": the user's question appears but no response. Acceptable UX or bug?
- **[NEEDS CLARIFICATION CL-003]** — The 120s activity timeout is arbitrary. Is it based on p99 of a normal query? Is it enough for long `policy_mode` queries?
- **[NEEDS CLARIFICATION CL-004]** — `convId || sessionId` fallback when there is no created conversation. Is it for anonymous chat or debug? If a client sends `conversationId=null` and the conversation creation in the backend fails, the pipeline is invoked with an arbitrary `sessionId` — likely a latent bug.
- **[NEEDS CLARIFICATION CL-005]** — The sanitized history is sent to the backend only in the HTTP fallback, not in the WS path. Why? In WS the backend loads memory from Redis by `conversation_id` — OK, consistent. But if WS fails, the fallback uses the frontend history as a hint — there may be drift if the backend memory has more context than the sent history.

## 8. Tech Debt Discovered

- **[DEBT-001]** — ~~API key in WS URL query param~~ **FIXED 2026-04-10**: it is not a regression. It is the `BACKEND_API_KEY` service-to-service token passed via query param in the WebSocket handshake, which is the standard workaround in Node's `ws` package (it does not easily support custom headers in WS). The backend explicitly validates it. See resolved CL-001. **Possible future improvement** (low priority): migrate to handshake headers if a future version of Node/ws makes custom headers in WS connections easier.
- **[DEBT-002]** — **Assistant message save without retry**. If `POST /api/v1/conversations/{id}/messages` fails at the end, it is silently lost (only logged). The assistant response stays in the browser's memory but is not persisted in the backend.
- **[DEBT-003]** — **Inconsistent history capping between paths** (fixed 2026-04-10): entries are truncated to 2000 chars in the initial sanitization (line 439), and then `.slice(-10)` reduces it to only **the last 10 entries** (not 500 chars as I described earlier) when sent to the backend in the HTTP sync fallback (line 316). **Real inconsistency**: the WS path uses the full `cappedHistory` (up to 20 entries), the HTTP fallback path uses only the last 10. Two different limits depending on the path, not documented anywhere.
- **[DEBT-004]** — **Phase mapping hardcoded in a switch**. When the backend adds new status steps, they show up as "Procesando: {step}..." with no friendly translation. It should be an extensible dictionary or loaded from `messages/es.json`.
- **[DEBT-005]** — **Single file ~600 lines** mixes bridge logic + conversation management + WS client + HTTP client + error handling. Candidate for a split:
  - `src/app/api/chat/route.ts` (only POST handler)
  - `src/lib/chat/wsBridge.ts` (streamViaWebSocket + buildWsUrl)
  - `src/lib/chat/syncFallback.ts` (fetchSynchronous + emitSyncResult)
  - `src/lib/chat/eventMapper.ts` (mapStatusStep + formatSources)
  - `src/lib/chat/conversationService.ts` (create + save message helpers)
- **[DEBT-006]** — **`minDisplayMs=2000` hardcoded** — if it triggers for cache hits or fast_reply, it adds artificial latency. Should be a config or feature flag.
- **[DEBT-007]** — **`accumulatedContent` as fallback on close/error** — does not distinguish a successful partial response from a corrupted response. The user may receive half a response thinking it is complete.
- **[DEBT-008]** — **No metrics**: how many times WS vs. fallback was used, WS connection latency, parse errors — all invisible in observability.

---

**End of spec.md**
