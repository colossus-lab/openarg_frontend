# Spec: WS Bridge (`streamViaWebSocket`)

**Type**: Reverse-engineered
**Status**: Draft
**Last synced with code**: 2026-04-12
**Layer scope**: Application (route handler — WebSocket primary path)
**Parent**: [../spec.md](../spec.md)
**Related plan**: [./plan.md](./plan.md)

---

## 1. Context & Purpose

This sub-module owns the **WebSocket primary path** of the chat bridge. It is responsible for opening a WS connection to the backend (`/api/v1/query/ws/smart`), enforcing the 8s connect timeout and 120s activity timeout, sending the initial question payload, parsing incoming WS events (`status` / `chunk` / `complete` / `clarification` / `error`), and tolerating parse errors up to a threshold before bailing out with whatever content it has accumulated so far.

It lives in `src/lib/chat/wsBridge.ts` as the `streamViaWebSocket` function plus its `buildWsUrl` helper (extracted from `route.ts` on 2026-04-11 as part of the DEBT-005 code split). It is the happy path of the bridge — when it works, the HTTP fallback ([001b](../001b-http-fallback/spec.md)) never runs.

## 2. Ubiquitous Language

| Term | Definition |
|---|---|
| **WS primary** | WebSocket connection to the backend `/api/v1/query/ws/smart` with an 8s connect timeout + 120s activity timeout. |
| **Connect timeout** | 8 seconds from `new WebSocket(...)` to the `open` event. If exceeded, `safeResolve(null)` triggers fallback. |
| **Activity timeout** | 120 seconds of silence on the WS — reset on every received message; if exceeded, the stream is considered dead. |
| **accumulatedContent** | Running string of all `chunk.content` bytes received so far — used as a partial fallback on abrupt close. |
| **Parse error tolerance** | Up to 5 consecutive JSON parse errors are tolerated before the bridge aborts and returns what it has. |
| **`_wsError` flag** | Sentinel on the resolved value that tells the outer handler the WS path already emitted an `error` or `clarification`, so the HTTP fallback must NOT run. |

## 3. User Stories

### US-001 (P1) — Frontend UI consumes a single chat endpoint
**As a** frontend UI (`chat/page.tsx`), **I want** a single POST endpoint that streams SSE, **so that** I don't have to open WebSockets from the browser (more complex, worse compatibility with proxies).

### US-002 (P1) — User sees real-time progress
**As a** user, **when** I submit a query, **I want** to see phases and progress messages appear immediately, **so that** I know the system is working.

- Happy path: WS connects in <1s → phases appear live → LLM chunks are streamed → complete with sources/charts
- Edge case: WS hangs for 8s → transparent HTTP fallback (see [001b](../001b-http-fallback/spec.md)), user sees simulated phases

## 4. Functional Requirements

### WebSocket Primary Path
- **FR-014**: `buildWsUrl()` MUST build the WS URL by converting `http://` → `ws://` (or `https://` → `wss://`) and pointing to `/api/v1/query/ws/smart`.
- **FR-015**: MUST pass `BACKEND_API_KEY` (service-to-service token) as the `?api_key=...` query param in the URL. This is the standard workaround for auth in WebSocket handshakes from Node (the `ws` package does not easily support custom headers). The backend explicitly validates the query param in `smart_query_v2_router.py:234-244`.
- **FR-016**: MUST open the WebSocket with an **8-second** timeout for the initial connection.
- **FR-017**: MUST apply a **120-second** inactivity timeout (reset on each received message).
- **FR-018**: MUST send the initial payload to the backend on the `open` event: `{question, conversation_id, policy_mode}`.
- **FR-019**: MUST parse backend events: `status`, `chunk`, `complete`, `clarification`, `error`.
- **FR-020**: After more than **5 consecutive parse errors**, it MUST abort the stream and return what has been accumulated.
- **FR-020a**: If the WS closes or errors after emitting partial content but before `complete`, it MUST preserve the accumulated content and mark the result with `_wsError=true`.
- **FR-020b**: If the backend emits an explicit `error` event after some chunks were already streamed, the bridge MUST preserve the accumulated content and still mark the result with `_wsError=true`.

### Error Handling (shared with top-level)
- **FR-034**: If the WS path emits an `error` event or `clarification` event, it MUST NOT fall back to HTTP (uses the `_wsError` flag). *(Cross-ref: this requirement is enforced by this sub-module and consumed by [001b](../001b-http-fallback/spec.md).)*

## 5. Success Criteria

- **SC-001**: WS connects in **<1s** under normal conditions (p95 <2s).
- **SC-002**: Fallback to HTTP sync activates **exactly at 8s** when WS does not connect. *(Cross-ref: trigger lives here, fallback implementation lives in [001b](../001b-http-fallback/spec.md).)*
- **SC-006**: Parse errors from the WS stream are tolerated up to 5; after that what has been accumulated is returned without breaking.
- **SC-007**: Activity timeout (120s) protects against zombie connections.

## 6. Assumptions & Out of Scope

### Assumptions
- The backend WebSocket is available most of the time.
- Node's `ws` package cannot easily set custom headers on the WS handshake — query-param auth is the accepted workaround.

### Out of scope
- **HTTP fallback path** — see [001b](../001b-http-fallback/spec.md).
- **Event-to-SSE mapping table** — see [001c](../001c-event-mapping/spec.md).
- **Conversation persistence** — see [001d](../001d-conversation-lifecycle/spec.md).
- **Automatic WS reconnection** — if the stream dies, the user must retry.
- **Bidirectional streaming** — the bridge is unidirectional (server→client), the user cannot inject during the stream.

## 7. Open Questions

- **[RESOLVED CL-001]** — **It is NOT a regression, it is intentional**. Verified against the backend code (2026-04-10):
  - `BACKEND_API_KEY` is a **service-to-service token** frontend↔backend (not a user key like `oarg_sk_*`).
  - The backend in `smart_query_v2_router.py:234-244` **explicitly validates** the `api_key` query param in the WebSocket handshake: *"Try query-param auth first (backward compat)"*.
  - The CHANGELOG entry `"Remove API key from WebSocket payload"` (commit `07fa8ea`) was about the **JSON body** that the frontend was sending AFTER the `open` — it was redundant because the handshake already validated it. The fix removed the redundancy from the body, keeping the URL query param.
  - **Node's `ws` package** does not easily support custom headers in the WS handshake, so a query param is the **standard workaround** for service auth in Node.
  - **Residual risk**: a URL with a secret may end up in proxy logs. Mitigation: it is an internal service key, rotatable via env var, not a user secret. Accepted risk for the current service-to-service architecture.
- **[NEEDS CLARIFICATION CL-003]** — The 120s activity timeout is arbitrary. Is it based on p99 of a normal query? Is it enough for long `policy_mode` queries?

## 8. Tech Debt Discovered

- **[DEBT-001]** — ~~API key in WS URL query param~~ **FIXED 2026-04-10**: it is not a regression. It is the `BACKEND_API_KEY` service-to-service token passed via query param in the WebSocket handshake, which is the standard workaround in Node's `ws` package (it does not easily support custom headers in WS). The backend explicitly validates it. See resolved CL-001. **Possible future improvement** (low priority): migrate to handshake headers if a future version of Node/ws makes custom headers in WS connections easier.
- **[DEBT-007]** — ~~**`accumulatedContent` as fallback on close/error** — does not distinguish a successful partial response from a corrupted response. The user may receive half a response thinking it is complete.~~ **FIXED 2026-04-12**: degraded WS closes/errors that preserve partial content now also set `_wsError=true`, allowing the route and UI to persist/render them as partial or errored instead of silently treating them as successful completions.
- **[DEBT-008]** — **No metrics**: how many times WS vs. fallback was used, WS connection latency, parse errors — all invisible in observability.

---

**End of 001a-ws-bridge/spec.md**
