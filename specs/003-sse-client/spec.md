# Spec: SSE Client (`useSSEStream` hook)

**Type**: Reverse-engineered
**Status**: Draft
**Last synced with code**: 2026-04-11
**Layer scope**: Application (hook) + Infrastructure (Fetch API streaming)
**Related plan**: [./plan.md](./plan.md)

---

## 1. Context & Purpose

`useSSEStream` is the **client-side hook** that consumes the `/api/chat` endpoint via SSE, parses each streaming event, applies a char-by-char **typewriter effect** on the LLM content, and handles abort/cancel. It is the "consumer" side of the bridge; its server-side counterpart is `001-chat-bridge`.

It is a complex hook (~300 lines) with a custom typewriter that uses `requestAnimationFrame` + pointer-based dequeue (optimized post-commit `bc9eeeb: "optimize SSE typewriter with pointer-based dequeue and O(1) message lookup"`).

## 2. Ubiquitous Language

| Term | Definition |
|---|---|
| **SSE reader** | `response.body.getReader()` with `TextDecoder` accumulating into a buffer. |
| **Event pump** | Loop that parses lines from the buffer, extracts JSON, and dispatches to the switch by `event.type`. |
| **Chunk queue** | Queue of strings (word-level pieces) pending reveal by the typewriter. |
| **Head pointer** | Index of the first non-revealed item in the queue; incremented instead of using `.shift()` (O(1) vs. O(n)). |
| **Typewriter reveal** | Animation frame loop that dequeues up to N chars per frame and updates the streaming message. |
| **Abort controller** | `AbortController` to cancel the in-flight fetch + typewriter. |

## 3. User Stories

### US-001 (P1) — Consumer side of the chat streaming
**As a** chat page, **I want** a simple hook that gives me `sendMessage(body, onEvent)` and returns the accumulated data at the end.

### US-002 (P1) — Visible char-by-char typewriter
**As a** user, **I want** to see the LLM response appear gradually (not all at once), **for** a conversational feel.

### US-003 (P1) — Abort of an in-flight stream
**As a** user, **I want** to cancel my query at any moment during the stream.

### US-004 (P2) — Parse error tolerance
**As a** system, **I want** to tolerate some parse errors without breaking the stream (the backend may occasionally send a corrupt line).

### US-005 (P2) — Cleanup on unmount
**As a** system, **when** the user navigates away from `/chat` during streaming, **I want** to cancel cleanly without animation frame leaks.

## 4. Functional Requirements

- **FR-001**: MUST export a hook `useSSEStream(setStreamingMessage, endpoint='/api/chat')`.
- **FR-002**: MUST return: `{sendMessage, abort, resetTypewriter, isStreaming, setIsStreaming}`.
- **FR-003**: `sendMessage(body, onEvent)` MUST:
  - reset the typewriter state before starting
  - abort any previous in-flight request
  - create a new `AbortController`
  - `fetch(endpoint, {method: 'POST', body, signal})`
  - read `response.body.getReader()` with `TextDecoder`
  - parse SSE lines (`data: ${json}\n\n`)
  - dispatch per event type
  - accumulate content, charts, sources, documents, savedConvId, savedAssistantMsgId
  - return `SSEStreamOutput` at the end
- **FR-004**: MUST handle these event types:
  - `content` → `splitIntoWordChunks(chunk)` → push to queue → `startReveal()`
  - `chart` → push to `charts[]`
  - `map` → set `mapData`
  - `sources` → set `sources[]`
  - `documents` → set `documents[]`
  - `clarification` → forward to the `onEvent` callback (handled by page)
  - `error` → append to `assistantContent` with error format
  - `conversation_saved` → set `savedConvId`
  - `assistant_message_saved` → set `savedAssistantMsgId`
- **FR-005**: MUST always invoke `onEvent(event)` for each parsed event (forwarding to the caller).
- **FR-006**: Typewriter (`startReveal`):
  - uses `requestAnimationFrame`
  - dequeues up to `CHARS_PER_FRAME=28` chars per frame
  - if an item is smaller than the budget, consumes it entirely and advances head
  - if it is larger, partial slice and keep pointer
  - updates `revealedRef.current` + `setStreamingMessage` with the accumulated content
  - when the queue drains, reset head=0 and items=[]
- **FR-007**: `splitIntoWordChunks(text, maxSize=50)` MUST split texts >100 chars into pieces by word boundary.
- **FR-008**: `abort()` MUST:
  - call `abortControllerRef.current.abort()`
  - `resetTypewriter()`
- **FR-009**: `resetTypewriter()` MUST:
  - clear `chunkQueueRef`
  - clear `revealedRef.current`
  - clear `streamingTimestampRef.current`
  - `setStreamingMessage(null)`
  - cancel `rafRef.current` if it exists
- **FR-010**: Cleanup on unmount: `useEffect(() => () => cancelAnimationFrame(rafRef.current))`.
- **FR-011**: `waitForReveal()` MUST wait until the queue is drained before resolving the `sendMessage` promise.
- **FR-012**: MUST tolerate up to **3 parse errors** before emitting an error to the caller (`parseErrorCount > 3`).
- **FR-013**: On `AbortError` (cancellation), MUST return `{aborted: true, ...}` without throwing.
- **FR-014**: On fetch error (network, 500s), MUST emit an `error` event to the caller with a friendly Spanish message.

## 5. Success Criteria

- **SC-001**: Typewriter runs at **60fps** with no frame drops on modern hardware (latest Chrome, Firefox, Safari).
- **SC-002**: `CHARS_PER_FRAME=28` visually = comfortable reading speed (~1700 chars/s).
- **SC-003**: Abort **<100ms** from the `abort()` call until the UI is stable.
- **SC-004**: Zero memory leaks: refs are cleaned on unmount + resetTypewriter.
- **SC-005**: A parse error in one line does not break the stream — accumulates up to 3 before emitting an error.
- **SC-006**: Pointer-based dequeue: **O(1)** per frame (no `.shift()` which would be O(n)).

## 6. Assumptions & Out of Scope

### Assumptions
- Browser supports Fetch API with ReadableStream (all modern ones).
- Browser supports `requestAnimationFrame`.
- The bridge emits well-formed SSE lines most of the time.

### Out of scope
- **Automatic reconnection** — if the stream dies, the caller decides whether to retry.
- **Speech synthesis / text-to-speech** of the revealed content.
- **Dynamic `CHARS_PER_FRAME` adjustment** (accelerating on long messages).

## 7. Open Questions

- **[NEEDS CLARIFICATION CL-001]** — `CHARS_PER_FRAME=28` — is it an empirical or arbitrary value? If the user complains about slowness, is it configurable?
- **[RESOLVED CL-002]** — **Yes — it respects `prefers-reduced-motion`.** `src/hooks/useSSEStream.ts:5,80` imports and calls `useReducedMotion()` from `src/hooks/useReducedMotion.ts` (which listens to `(prefers-reduced-motion: reduce)` via `matchMedia`). When the user has reduced motion enabled, the chunk-queue typewriter is bypassed and content is revealed immediately. `DEBT-001` in this same spec ("No respect for `prefers-reduced-motion`") is therefore stale and should be closed. (resolved 2026-04-11 via code inspection)
- **[RESOLVED CL-003]** — **Lost.** `src/hooks/useSSEStream.ts:159-165` — `abort()` calls `resetTypewriter()` which at lines 136-142 does `chunkQueueRef.current = { items: [], head: 0 }; revealedRef.current = ''; streamingTimestampRef.current = ''; setStreamingMessage(null)`. The partial content is discarded; the UI's streamingMessage goes back to null. Whether that behavior is desirable is a UX call, but the code state is unambiguous. (resolved 2026-04-11 via code inspection)

## 8. Tech Debt Discovered

- **[DEBT-001]** — **No respect for `prefers-reduced-motion`**: the typewriter always runs even if the user has accessibility settings enabled.
- **[DEBT-002]** — **`CHARS_PER_FRAME` hardcoded** — cannot be tuned without a code change.
- **[DEBT-003]** — **`parseErrorCount` cap of 3** hardcoded — inconsistent with the bridge, which uses 5.
- **[DEBT-004]** — **Abort resets everything**: if the user cancels, the partial content is lost. It could be desirable to preserve it with a flag.

---

**End of spec.md**
