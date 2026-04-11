# Spec: Conversation Lifecycle (`saveAssistantMessageWithRetry` + `finally` save)

**Type**: Reverse-engineered
**Status**: Draft
**Last synced with code**: 2026-04-11
**Layer scope**: Application (route handler — persistence orchestration)
**Parent**: [../spec.md](../spec.md)
**Related plan**: [./plan.md](./plan.md)

---

## 1. Context & Purpose

This sub-module owns the **conversation persistence orchestration**: creating the conversation in the backend before the pipeline runs, saving the user message before invoking the pipeline (so the user's question is never lost), and saving the assistant message after the pipeline — with retry-and-backoff, and from the `finally` block so that even errored or partial responses get persisted with an `errored: true` flag.

Lives in `src/lib/chat/conversationService.ts` (extracted from `route.ts` on 2026-04-11 as part of the DEBT-005 code split). Key helper: `saveAssistantMessageWithRetry()`, added 2026-04-10 as the fix for DEBT-002 and moved to the new module in the 2026-04-11 split.

## 2. Ubiquitous Language

| Term | Definition |
|---|---|
| **Half-saved conversation** | Legacy bug: when the stream died after the user message was persisted but before the assistant message, the conversation ended up with a question and no answer. Fixed 2026-04-10 via `saveAssistantMessageWithRetry` + `finally`-block save. |
| **`errored: true` flag** | Field on the assistant `MessageCreate` payload signalling that the response was partial or wrapped an error. Backend accepts it as a forward-compatible contract (pending DB column). |
| **`saveAssistantMessageWithRetry`** | Helper added in the 2026-04-10 fix: 3 attempts with exponential backoff (300ms, 600ms, 1200ms), invoked from the `finally` block of the stream handler. |
| **`assistant_message_saved` event** | SSE event emitted after a successful assistant-message POST, carrying the new message ID. |

## 3. User Stories

### US-005 (P1) — Managed conversation lifecycle
**As a** system, **I want** the conversation to be created in the backend BEFORE invoking the pipeline, **so that** the user's message is persisted even if the pipeline fails afterwards.

## 4. Functional Requirements

### Conversation Lifecycle
- **FR-009**: MUST create the conversation in the backend (`POST /api/v1/conversations/`) BEFORE invoking the pipeline, if the body does not include `conversationId`.
- **FR-010**: MUST emit the `conversation_saved` event to the browser immediately after creating the conversation (so the UI can track the ID).
- **FR-011**: MUST save the user message (`POST /api/v1/conversations/{id}/messages`) BEFORE the pipeline.
- **FR-012**: MUST save the assistant message AFTER the stream completes successfully.
- **FR-013**: MUST emit `assistant_message_saved` with the assistant message ID when saving it.

### Errored-message persistence
- **FR-014**: The assistant `MessageCreate` payload MUST include a boolean `errored` field. `saveAssistantMessageWithRetry` sets it to `true` when the finally block is saving a partial or error-path response (stream broken, WS-emitted error, caught exception) and `false` on the happy path. This is the forward-compatible wire contract introduced by the DEBT-002 fix on 2026-04-10.
- **FR-015**: The backend MUST persist `errored` as a first-class column on the `messages` table (JSONB is overkill — a simple `boolean NOT NULL DEFAULT FALSE` is enough). The column MUST be returned on every `MessageResponse` so the frontend can render an error affordance when loading conversation history after a page refresh. This is the contract that was promised by FR-014 but not yet backed by DB state before 2026-04-11.
- **FR-016**: `errored` MUST be write-once from the route handler's perspective — no endpoint allows toggling `errored=false` on a message that was saved with `errored=true`. If the user regenerates, the old errored message is NOT mutated; a new message is appended. Rewriting history would violate conversation immutability.

## 5. Success Criteria

- **SC-004**: **Zero orphaned conversations**: the user message is always saved before invoking the pipeline.

## 6. Assumptions & Out of Scope

### Assumptions
- The backend `/conversations/` endpoints are available on the same base URL as the pipeline endpoints.
- The backend persists the `errored` field on the `messages` table via Alembic migration 0029 (2026-04-11) and returns it on every `MessageResponse` — see FR-015.

### Out of scope
- **WS/HTTP pipeline transport** — see [001a](../001a-ws-bridge/spec.md) and [001b](../001b-http-fallback/spec.md).
- **Conversation listing, renaming, deletion** — handled in other frontend modules.
- **Anonymous chat** — all persistence assumes an authenticated user and an owned conversation.

## 7. Open Questions

- **[RESOLVED CL-002]** — **Half-saved conversations**: if the stream broke after the user message was persisted but before the assistant message, the conversation ended up with a question and no response. **Resolved 2026-04-10** by DEBT-002 fix: `saveAssistantMessageWithRetry()` in the `finally` block now persists partial/errored responses with `errored: true`.
- **[RESOLVED CL-004]** — **It is a safety net for `createConversation` failures, not an anonymous-chat feature — and yes, it behaves exactly as the latent-bug description.** `src/lib/chat/conversationService.ts:41-58` has `createConversation` return `null` on any non-OK response or thrown error (the catch swallows the exception). `src/app/api/chat/route.ts:117-119` only reassigns `convId = await createConversation(...)` when `!convId`; if creation fails, `convId` stays `null`, and line 140 falls through to `convId || sessionId`, passing the client-provided raw `sessionId` to the backend as the conversation identifier. The backend pipeline then uses that arbitrary string as `conversation_id`, which collides with any other caller that sends the same `sessionId`. Not anonymous chat, not debug — just an ungracious fallback. (resolved 2026-04-11 via code inspection)

## 8. Tech Debt Discovered

- **[DEBT-002]** — ~~**Assistant message save without retry**~~ **FIXED 2026-04-10**: the chat route now exposes `saveAssistantMessageWithRetry()` with 3 attempts and exponential backoff (300ms, 600ms, 1200ms). Crucially, the helper is invoked from the `finally` block, not only on the happy path — on stream failure, WS-emitted errors, and caught exceptions the partial or errored response is still persisted with an `errored: true` flag on the payload. This closes the "orphaned user question" bug where a dead stream would leave the conversation with a question and no answer.
- **[DEBT-002-followup]** — ~~**`errored` field was a forward-compatible pass-through**~~ **FIXED 2026-04-11**: the backend now persists `errored` as a first-class `messages.errored boolean NOT NULL DEFAULT FALSE` column (Alembic migration 0029) and returns it on every `MessageResponse`. The frontend chat UI renders an error chip + "Regenerar" affordance when `message.errored === true` (see [`../../002-chat-ui/spec.md`](../../002-chat-ui/spec.md) FR-NEW). The loop started by the 2026-04-10 DEBT-002 fix is now closed cross-repo.

---

**End of 001d-conversation-lifecycle/spec.md**
