# Plan: Conversation Lifecycle (As-Built)

**Related spec**: [./spec.md](./spec.md)
**Parent plan**: [../plan.md](../plan.md)
**Type**: Reverse-engineered
**Last synced with code**: 2026-04-10

---

## 1. Layer Mapping

| Layer | Component | File |
|---|---|---|
| Application (conversation create) | inline `fetch('/api/v1/conversations/')` block | `src/app/api/chat/route.ts` |
| Application (user message save) | inline `fetch('/api/v1/conversations/{id}/messages')` before pipeline | `src/app/api/chat/route.ts` |
| Application (assistant save w/ retry) | `saveAssistantMessageWithRetry()` helper | `src/app/api/chat/route.ts` (added 2026-04-10) |
| Application (finally-block save) | `finally { await saveAssistantMessageWithRetry(...) }` | `src/app/api/chat/route.ts` |
| Infrastructure (helpers) | `backendHeaders` | `src/lib/auth.ts` |

## 2. Behavior

```
5. Create conversation if missing:
   - POST /api/v1/conversations/ (backend)
   - emit 'conversation_saved' {id, title}
    ▼
6. Save user message to backend:
   - POST /api/v1/conversations/{id}/messages {role: 'user', content: message}
   - (non-critical if fails)
    ▼
[... pipeline runs: 001a WS or 001b fallback ...]
    ▼
11. Save assistant message to backend (via saveAssistantMessageWithRetry):
    - POST /api/v1/conversations/{id}/messages {
        role: 'assistant',
        content,
        sources, chart_data, map_data, documents,
        errored: <true if stream failed or WS emitted error>
      }
    - emit 'assistant_message_saved' {id}
    ▼
12. Emit 'done' {null}
    ▼
13. finally:
    - if assistant message not yet saved: saveAssistantMessageWithRetry(partial, errored: true)
    - controller.close()
```

## 3. `saveAssistantMessageWithRetry` — retry contract

Added as the fix for **DEBT-002** on 2026-04-10.

- **3 attempts** with exponential backoff: **300 ms, 600 ms, 1200 ms**.
- Invoked from the `finally` block of the stream handler — not just the happy path. This means partial content from a failed WS stream, an HTTP fallback error, or a caught exception is still persisted.
- Payload includes an `errored: boolean` flag. The backend `MessageCreate` schema accepts `errored` as a forward-compatible field even before a dedicated DB column exists.
- Emits `assistant_message_saved` SSE event on success (with the returned message ID).
- On final failure after 3 attempts, logs the error but does not throw — the `done` event still fires so the browser doesn't hang.

## 4. SSE Event Shapes (owned by this sub-module)

```typescript
{ type: 'conversation_saved', data: { id, title } }
{ type: 'assistant_message_saved', data: { assistantMessageId } }
```

## 5. External Dependencies

| Dep | Purpose |
|---|---|
| Backend `POST /api/v1/conversations/` | Create conversation |
| Backend `POST /api/v1/conversations/{id}/messages` | Save user + assistant messages (accepts `errored` field) |
| `@/lib/auth` (`backendHeaders`) | Auth header helper |

## 6. Deviations from Constitution

- **Principle II (Single Responsibility)**: conversation persistence is orchestrated inside the route handler rather than extracted into a `conversationService.ts`. See parent [DEBT-005].
- **Principle VII (Security)**: respects `backendHeaders` (user-scoped token).

---

**End of 001d-conversation-lifecycle/plan.md**
