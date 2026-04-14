# Spec: HTTP Fallback (`fetchSynchronous`)

**Type**: Reverse-engineered
**Status**: Draft
**Last synced with code**: 2026-04-12
**Layer scope**: Application (route handler — HTTP fallback path)
**Parent**: [../spec.md](../spec.md)
**Related plan**: [./plan.md](./plan.md)

---

## 1. Context & Purpose

This sub-module owns the **HTTP synchronous fallback path** of the chat bridge. When the WebSocket primary path ([001a](../001a-ws-bridge/spec.md)) fails (connect timeout, abrupt close, activity timeout), the bridge falls back to a plain POST to `/api/v1/query/smart` and then synthesizes the phase progression client-side so the user still sees a progress-like UX.

Lives in `src/lib/chat/syncFallback.ts` as `fetchSynchronous` + `emitSyncResult` (extracted from `route.ts` on 2026-04-11 as part of the DEBT-005 code split). It also owns the mapping from raw HTTP errors to user-friendly Spanish strings.

## 2. Ubiquitous Language

| Term | Definition |
|---|---|
| **HTTP fallback** | Sync POST to `/api/v1/query/smart` when WS fails; phases are simulated by the frontend bridge, not emitted by the backend. |
| **Synthetic phases** | The `planning → data_collection → analysis → synthesis` sequence the fallback emits artificially, so the UX matches the WS happy path. |
| **Friendly error string** | Spanish-language mapping of raw HTTP status codes / transport errors, so users never see a stack trace or English error. |

## 3. User Stories

### US-003 (P1) — Graceful degradation when the backend WS fails
**As a** user, **when** the backend WebSocket is down, **I want** the chat to keep working (with worse UX but without crashing).

- Trigger: WS does not connect in 8s OR WS closes abruptly OR WS activity timeout 120s (see [001a](../001a-ws-bridge/spec.md))
- Happy path: fallback to `fetchSynchronous` → POST HTTP `/api/v1/query/smart` → full response → emission of synthetic phases to the browser

## 4. Functional Requirements

### HTTP Fallback Path
- **FR-021**: When WS returns `null` (failure), it MUST fall back to `fetchSynchronous`.
- **FR-022**: `fetchSynchronous` MUST POST to `${BACKEND_URL}/api/v1/query/smart` with `backendHeaders(email)`.
- **FR-023**: MUST handle HTTP errors with user-friendly Spanish messages:
  - 429 → "Demasiadas consultas. Esperá un momento antes de intentar de nuevo."
  - 502/503/504 → "El sistema de análisis no está disponible en este momento."
  - 5xx → "Error interno del servidor."
- **FR-024**: In the fallback, it MUST emit synthetic phases (`planning → data_collection → analysis → synthesis`) to maintain UX consistency.
- **FR-024a**: The fallback MUST forward the already-sanitized, already-capped history unchanged. It MUST NOT apply a second, smaller history cap than the route handler.
- **FR-024b**: The fallback MUST emit structured start/success logs including conversation id, policy mode, and effective history length so fallback usage is observable without reading raw request bodies.

### Error Handling
- **FR-032**: Backend errors (`ECONNREFUSED`, `ECONNRESET`, `ENOTFOUND`) MUST be mapped to: "No se pudo conectar con el servidor. El sistema puede estar en mantenimiento."

## 5. Success Criteria

- **SC-003**: **Zero backend errors leak verbatim to the user** — all are mapped to friendly Spanish strings.

## 6. Assumptions & Out of Scope

### Assumptions
- When WS fails, HTTP sync is available (same backend infrastructure).

### Out of scope
- **WS primary path** — see [001a](../001a-ws-bridge/spec.md).
- **Event mapping table** — synthetic phases are hardcoded here but the `mapStatusStep` translation table lives in [001c](../001c-event-mapping/spec.md).
- **Conversation persistence** — see [001d](../001d-conversation-lifecycle/spec.md).

## 7. Open Questions

- **[NEEDS CLARIFICATION CL-005]** — The sanitized history is sent to the backend only in the HTTP fallback, not in the WS path. Why? In WS the backend loads memory from Redis by `conversation_id` — OK, consistent. But if WS fails, the fallback uses the frontend history as a hint — there may be drift if the backend memory has more context than the sent history.

## 8. Tech Debt Discovered

- **[DEBT-003]** — ~~**Inconsistent history capping between paths**~~ **FIXED 2026-04-12**: the route handler remains the single owner of history sanitization + capping, and the HTTP fallback now forwards the already-capped history unchanged instead of applying a second `.slice(-10)`.

---

**End of 001b-http-fallback/spec.md**
