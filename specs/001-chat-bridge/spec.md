# Spec: Chat Bridge (`/api/chat`) — Index

**Type**: Reverse-engineered (index)
**Status**: Draft
**Last synced with code**: 2026-04-11
**Layer scope**: Application (route handler)
**Related plan**: [./plan.md](./plan.md)

---

## 1. Context

`/api/chat/route.ts` is **the central piece of the frontend**: a Next.js route handler that acts as a **bidirectional bridge** between the browser (which speaks SSE) and the backend (which speaks primary WebSocket + HTTP sync as fallback). It translates protocols, maps events, manages the conversation lifecycle, enforces auth + rate limiting + input sanitization, and provides graceful degradation when the backend WS fails.

Historically this was a single ~620-line file. As of 2026-04-10 the specification is split into four sub-modules (see below); the implementation file is still monolithic but the spec now tracks responsibilities as separate units of work.

## 2. Sub-modules

| Sub-module | Owns | Spec |
|---|---|---|
| **[001a-ws-bridge](./001a-ws-bridge/spec.md)** | `streamViaWebSocket`, `buildWsUrl`, 8s connect timeout, 120s activity timeout, parse-error tolerance, `accumulatedContent`, WS event parsing (`status`/`chunk`/`complete`/`clarification`/`error`). | FR-014..FR-020, FR-034 |
| **[001b-http-fallback](./001b-http-fallback/spec.md)** | `fetchSynchronous`, `emitSyncResult`, synthetic `planning→data_collection→analysis→synthesis` phases, HTTP-error-to-Spanish mapping, fallback trigger conditions. | FR-021..FR-024, FR-032 |
| **[001c-event-mapping](./001c-event-mapping/spec.md)** | `mapStatusStep` translation table, SSE event whitelist, `phase_change`/`thinking`/`done` emission rules, `minDisplayMs=2000` delay. | FR-025..FR-028 |
| **[001d-conversation-lifecycle](./001d-conversation-lifecycle/spec.md)** | Conversation creation, user-message save-before-pipeline, `saveAssistantMessageWithRetry` (DEBT-002 fix), `finally`-block save, `errored: true` contract, `assistant_message_saved` event. | FR-009..FR-013 |

## 3. Cross-cutting Functional Requirements

These FRs apply to the top-level handler regardless of path taken:

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

### Stream Management
- **FR-029**: MUST use `ReadableStream` + `TextEncoder` + `controller.enqueue` with the format `data: ${JSON.stringify(event)}\n\n` (standard SSE).
- **FR-030**: MUST cleanly close the stream in the handler's `finally` (`controller.close()`).
- **FR-031**: MUST respond with headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.

### Error Handling
- **FR-033**: Any unexpected error MUST emit `{type: 'error', data: <friendly message>}` to the browser.

## 4. Top-level Success Criteria

- **SC-005**: Rate limits are enforced **100% of the time** under normal load.

*(Sub-module-specific SCs — SC-001 through SC-004 and SC-006 through SC-008 — live in the respective sub-specs.)*

## 5. Top-level User Stories

- **US-004 (P1) — Per-user rate limiting applied** — operator-facing, cross-cutting.
- **US-006 (P2) — Mandatory input sanitization** — operator-facing, cross-cutting.
- **US-007 (P2) — Supported policy mode** — the `policy_mode: true` body flag is forwarded to the pipeline by both WS and HTTP paths.

*(US-001, US-002, US-003, US-005, US-008 are scoped to individual sub-modules — see links above.)*

## 6. Meta Tech Debt

- **[DEBT-005]** — ~~**Single file ~600 lines** mixing bridge logic + conversation management + WS client + HTTP client + error handling~~ **FIXED 2026-04-11**: the spec was split on 2026-04-10 into four sub-modules and the code was split the following day to match. `src/app/api/chat/route.ts` now contains only the Next.js `POST` handler + auth/rate-limit/input-sanitization shell + the `start(controller)` orchestration that wires the four libraries together. The domain-specific logic lives in:
  - `src/lib/chat/wsBridge.ts` — `streamViaWebSocket` + `buildWsUrl` (owned by [`001a-ws-bridge/`](./001a-ws-bridge/))
  - `src/lib/chat/syncFallback.ts` — `fetchSynchronous` + `emitSyncResult` + HTTP error mapping (owned by [`001b-http-fallback/`](./001b-http-fallback/))
  - `src/lib/chat/eventMapper.ts` — `mapStatusStep` + `formatSources` + the payload shaping for emitted events (owned by [`001c-event-mapping/`](./001c-event-mapping/))
  - `src/lib/chat/conversationService.ts` — conversation create, user-message save, `saveAssistantMessageWithRetry` (owned by [`001d-conversation-lifecycle/`](./001d-conversation-lifecycle/))

  No behavior change was intended — the refactor is purely mechanical and is verified by the full test suite passing unchanged before and after.

*(All other DEBT items — DEBT-001, DEBT-002 FIXED, DEBT-003, DEBT-004, DEBT-006, DEBT-007, DEBT-008 — now live in the sub-module specs.)*

---

**End of index spec.md**
