# Plan: Chat Bridge — Index (As-Built)

**Related spec**: [./spec.md](./spec.md)
**Type**: Reverse-engineered (index)
**Last synced with code**: 2026-04-10

---

## 1. Sub-plans

| Sub-module | Scope | Plan |
|---|---|---|
| **001a-ws-bridge** | WS client, connect + activity timeouts, event parsing | [./001a-ws-bridge/plan.md](./001a-ws-bridge/plan.md) |
| **001b-http-fallback** | HTTP sync POST, synthetic phases, error mapping | [./001b-http-fallback/plan.md](./001b-http-fallback/plan.md) |
| **001c-event-mapping** | `mapStatusStep`, SSE whitelist, `minDisplayMs` | [./001c-event-mapping/plan.md](./001c-event-mapping/plan.md) |
| **001d-conversation-lifecycle** | Create conversation, save user/assistant messages, retry helper | [./001d-conversation-lifecycle/plan.md](./001d-conversation-lifecycle/plan.md) |

## 2. Source Files

| File | Lines | Role |
|---|---|---|
| `src/app/api/chat/route.ts` | ~620 | Main handler, bridge logic, WS client, HTTP fallback, event mapper — **all four sub-modules are still co-located in this single file** (see parent [DEBT-005]). |

**External imports**:
- `next/server` (NextRequest)
- `@/lib/auth` (requireSession, backendHeaders)
- `@/lib/rateLimit` (checkRateLimit, rateLimitResponse)
- `ws` (WebSocket from npm package)

## 3. Top-level Configuration (env vars)

```bash
OPENARG_BACKEND_URL=http://localhost:8081       # or ws://... (converted automatically)
OPENARG_BACKEND_API_KEY=...                     # appended as ?api_key=... in WS URL
RATE_LIMIT_CHAT=10                              # per user per minute
MAX_MESSAGE_LENGTH=5000
MAX_HISTORY_CONTENT=2000
MAX_HISTORY_LENGTH=20
```

## 4. High-level Flow

```
POST /api/chat {message, sessionId, policyMode, conversationId, history}
    │
    ▼
1. requireSession() → userEmail                                              [cross-cutting]
2. checkRateLimit(userEmail, 'chat', 10) → 429 if exceeded                   [cross-cutting]
3. Sanitize body (message + history caps)                                    [cross-cutting]
4. Return new Response(new ReadableStream({ async start(controller) { ...
5. Create conversation if missing + emit 'conversation_saved'                [→ 001d]
6. Save user message (non-critical)                                          [→ 001d]
7. Emit 'phase_change: planning' + initial 'thinking'                        [→ 001c]
8. Try streamViaWebSocket(...)                                               [→ 001a]
9. If WS returned null → fetchSynchronous(...) + emitSyncResult(...)         [→ 001b]
10. If result._wsError → skip assistant save                                 [→ 001a ⇄ 001d]
11. Save assistant message (via saveAssistantMessageWithRetry)               [→ 001d]
12. Emit 'phase_change: synthesis' (respecting minDisplayMs) + 'done'        [→ 001c]
13. finally: saveAssistantMessageWithRetry(partial, errored:true) if needed  [→ 001d]
    + controller.close()
```

## 5. Layer Mapping (cross-cutting only)

| Layer | Component | File |
|---|---|---|
| Application (Route Handler) | `POST /api/chat` handler (auth, rate limit, sanitization, stream shell) | `src/app/api/chat/route.ts` |
| Domain (types) | `SmartResult`, `MappedEvent` interfaces | inline in `src/app/api/chat/route.ts:23-66` |
| Infrastructure (helpers) | `backendHeaders`, `requireSession` | `src/lib/auth.ts` |
| Infrastructure (rate limit) | `checkRateLimit`, `rateLimitResponse` | `src/lib/rateLimit.ts` |

*(WS client, HTTP client, event mapper, conversation service — see respective sub-plans.)*

## 6. Top-level Timeouts & Limits (cross-cutting)

| Constant | Default | Configurable via | Purpose |
|---|---|---|---|
| `MAX_MESSAGE_LENGTH` | 5000 | env | Message length cap |
| `MAX_HISTORY_LENGTH` | 20 | env | History entries cap |
| `MAX_HISTORY_CONTENT` | 2000 | env | Content cap per entry |
| `RATE_LIMIT_CHAT` | 10 | env | Rate limit per user per min |

*(Sub-module-specific timeouts — WS 8s/120s, `minDisplayMs` 2000 ms, parse-error tolerance 5 — live in the respective sub-plans.)*

## 7. Deviations from Constitution

- **Principle I (Thin client)**: the bridge has complex orchestration, but it is protocol translation + conversation lifecycle, not business logic. Accepted.
- **Principle II (Single Responsibility)**: the 620-line file violates SRP — see [DEBT-005] in the index spec. Split done at the spec level 2026-04-10; code-level split still pending.
- **Principle VI (Auth)**: respects `requireSession` + `backendHeaders`.
- **Principle VII (Security)**: respects input caps + sanitization + rate limit.
- **Principle IX (Observability)**: does not emit bridge-specific metrics (how many times the fallback was used, WS latency, etc.). See DEBT-008 in 001a.

---

**End of index plan.md**
