# Spec: Event Mapping (`mapStatusStep` + SSE whitelist)

**Type**: Reverse-engineered
**Status**: Draft
**Last synced with code**: 2026-04-10
**Layer scope**: Application (route handler — protocol translation)
**Parent**: [../spec.md](../spec.md)
**Related plan**: [./plan.md](./plan.md)

---

## 1. Context & Purpose

This sub-module owns the **protocol translation layer** between backend events (whether from WS [001a](../001a-ws-bridge/spec.md) or HTTP [001b](../001b-http-fallback/spec.md)) and the SSE events the browser actually receives. It is the canonical translation table from backend `status.step` values to user-visible `{phase, thinking}` pairs, plus the whitelist of event types that are allowed to leave the bridge toward the browser, plus the `minDisplayMs=2000` artificial delay that prevents fast cache hits from feeling jarring.

Inlined in `src/app/api/chat/route.ts` as `mapStatusStep` and the dispatch loop inside `streamViaWebSocket` / `emitSyncResult`.

## 2. Ubiquitous Language

| Term | Definition |
|---|---|
| **Status step** | Backend event during the pipeline: `classifying`, `cache_check`, `planning`, `searching`, `generating`, etc. |
| **Phase** | User-visible phase: `planning`, `data_collection`, `analysis`, `synthesis`. |
| **Thinking** | Friendly Spanish string that accompanies each phase ("Recorriendo los portales de datos..."). |
| **minDisplayMs** | 2000 ms artificial delay applied when the complete response arrives too quickly, so the UX doesn't feel abrupt. |

## 3. User Stories

### US-002 (P1) — User sees real-time progress
**As a** user, **when** I submit a query, **I want** to see phases and progress messages appear immediately, **so that** I know the system is working.

*(Concretely served here: every backend `status` event is translated to a Spanish `thinking` string the UI can render, and a `phase_change` when applicable.)*

### US-008 (P2) — Clarification events passed to the browser
**As a** user, **when** my query is ambiguous, **I want** to see clickable options (chips) to refine it, without interrupting the flow.

*(The `clarification` event is in the whitelist — this sub-module owns the allow-list.)*

## 4. Functional Requirements

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

## 5. Success Criteria

- **SC-008**: `minDisplayMs=2000` prevents cache hits from feeling abrupt to the user.

## 6. Assumptions & Out of Scope

### Assumptions
- The backend status steps are stable — if the backend changes its steps, the `mapStatusStep` fallback shows "Procesando: {step}..." as graceful degradation.

### Out of scope
- **WS connection lifecycle** — see [001a](../001a-ws-bridge/spec.md).
- **HTTP fallback synthetic phases** — the backend-step mapping table is owned here, but the fallback's hardcoded phase sequence is owned by [001b](../001b-http-fallback/spec.md).
- **Conversation persistence events** — `conversation_saved` and `assistant_message_saved` are in this whitelist but their emission logic belongs to [001d](../001d-conversation-lifecycle/spec.md).
- **i18n** — all strings are hardcoded Spanish.

## 7. Open Questions

*(None specific to this sub-module — see parent.)*

## 8. Tech Debt Discovered

- **[DEBT-004]** — **Phase mapping hardcoded in a switch**. When the backend adds new status steps, they show up as "Procesando: {step}..." with no friendly translation. It should be an extensible dictionary or loaded from `messages/es.json`.
- **[DEBT-006]** — **`minDisplayMs=2000` hardcoded** — if it triggers for cache hits or fast_reply, it adds artificial latency. Should be a config or feature flag.

---

**End of 001c-event-mapping/spec.md**
