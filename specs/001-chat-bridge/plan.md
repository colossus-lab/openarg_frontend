# Plan: Chat Bridge (As-Built)

**Related spec**: [./spec.md](./spec.md)
**Type**: Reverse-engineered
**Last synced with code**: 2026-04-10

---

## 1. Layer Mapping

| Layer | Component | File |
|---|---|---|
| Application (Route Handler) | `POST /api/chat` handler | `src/app/api/chat/route.ts` |
| Infrastructure (WS client) | `ws` package import + `streamViaWebSocket` | inline in route.ts:129-293 |
| Infrastructure (HTTP client) | `fetch` + `fetchSynchronous` | inline in route.ts:297-354 |
| Domain (types) | `SmartResult`, `MappedEvent` interfaces | inline in route.ts:23-66 |
| Infrastructure (helpers) | `backendHeaders`, `requireSession` | `src/lib/auth.ts` |
| Infrastructure (rate limit) | `checkRateLimit`, `rateLimitResponse` | `src/lib/rateLimit.ts` |

## 2. Configuration (env vars)

```bash
OPENARG_BACKEND_URL=http://localhost:8081       # or ws://... (converted automatically)
OPENARG_BACKEND_API_KEY=...                     # appended as ?api_key=... in WS URL
RATE_LIMIT_CHAT=10                              # per user per minute
MAX_MESSAGE_LENGTH=5000
MAX_HISTORY_CONTENT=2000
MAX_HISTORY_LENGTH=20
```

## 3. Main Flow

```
POST /api/chat {message, sessionId, policyMode, conversationId, history}
    │
    ▼
1. requireSession() → userEmail
    ▼
2. checkRateLimit(userEmail, 'chat', 10) → 429 if exceeded
    ▼
3. Sanitize body:
   - validate message is string, not empty, length < 5000
   - filter history: only user/assistant roles
   - cap each entry content to 2000 chars
   - cap history to last 20 entries
    ▼
4. Return new Response(new ReadableStream({
     async start(controller) {
       ▼
5. Create conversation if missing:
   - POST /api/v1/conversations/ (backend)
   - emit 'conversation_saved' {id, title}
    ▼
6. Save user message to backend:
   - POST /api/v1/conversations/{id}/messages {role: 'user', content: message}
   - (non-critical if fails)
    ▼
7. Emit 'phase_change: planning' + 'thinking: Clasificando consulta...'
    ▼
8. Try streamViaWebSocket(message, convId, policyMode, send):
   - buildWsUrl() → 'ws://backend/api/v1/query/ws/smart?api_key=...'
   - new WebSocket(wsUrl)
   - setTimeout(8000) → safeResolve(null) if not connected
   - on 'open':
     - clearConnectTimeout
     - resetActivityTimeout (120s)
     - ws.send(JSON.stringify({question, conversation_id, policy_mode}))
   - on 'message':
     - resetActivityTimeout
     - parse JSON
     - switch event.type:
       - 'status' → mapStatusStep(step) → send {phase_change, thinking}
       - 'chunk' → accumulatedContent += content → send {content}
       - 'complete' → build SmartResult → emitResultData → safeResolve
       - 'clarification' → send {clarification} → safeResolve with _wsError flag
       - 'error' → send {error} → safeResolve with _wsError flag
   - on 'close' | 'error':
     - safeResolve(accumulatedContent ? partial : null)
    ▼
9. If WS result is null → fallback to fetchSynchronous:
   - emit 'thinking: Conectando vía alternativa...'
   - POST /api/v1/query/smart with {question, user_email, conversation_id, policy_mode, history}
   - parse SmartResult
   - emitSyncResult: simulate phases (planning → data_collection → analysis → synthesis)
   - throw user-friendly error on 429/5xx
    ▼
10. If result._wsError → skip save (already handled) → return
    ▼
11. Save assistant message to backend:
    - POST /api/v1/conversations/{id}/messages {role: 'assistant', content, sources, chart_data, map_data, documents}
    - emit 'assistant_message_saved' {id}
    ▼
12. Emit 'done' {null}
    ▼
13. finally: controller.close()
}
```

## 4. WebSocket Event Shapes

### Backend → Bridge (WS)
```typescript
// status update
{ type: 'status', step: 'classifying' | 'planning' | 'searching' | ..., detail?: string, steps_count?: number }

// chunk
{ type: 'chunk', content: string }

// complete
{
  type: 'complete',
  answer: string,
  sources?: Array<{name, url, portal, accessed_at}>,
  chart_data?: Array<object>,
  map_data?: object,
  documents?: Array<object>,
  confidence?: number,
  citations?: Array<object>,
  casual?: boolean,
  cached?: boolean,
}

// clarification
{ type: 'clarification', question: string, options: Array<{label, value}> }

// error
{ type: 'error', message: string }
```

### Bridge → Browser (SSE)
```typescript
// phase transition
{ type: 'phase_change', data: 'planning' | 'data_collection' | 'analysis' | 'synthesis' }

// spanish thinking message
{ type: 'thinking', data: string }

// llm content chunk
{ type: 'content', data: string }

// structured data
{ type: 'chart', data: ChartObject }
{ type: 'sources', data: Array<Source> }
{ type: 'documents', data: Array<Document> }
{ type: 'map', data: GeoJSONObject }

// clarification
{ type: 'clarification', data: { question, options } }

// conversation tracking
{ type: 'conversation_saved', data: { id, title } }
{ type: 'assistant_message_saved', data: { assistantMessageId } }

// errors + end
{ type: 'error', data: string }
{ type: 'done', data: null }
```

## 5. Timeouts & Limits

| Constant | Default | Configurable via | Purpose |
|---|---|---|---|
| WS connect timeout | 8000 ms | — | Trigger fallback to HTTP sync |
| WS activity timeout | 120000 ms | — | Detect zombie connection |
| `minDisplayMs` | 2000 ms | — | Artificial UX delay for fast responses |
| Parse error tolerance | 5 | — | Abort after 5 consecutive parse errors |
| `MAX_MESSAGE_LENGTH` | 5000 | env | Message length cap |
| `MAX_HISTORY_LENGTH` | 20 | env | History entries cap |
| `MAX_HISTORY_CONTENT` | 2000 | env | Content cap per entry |
| `RATE_LIMIT_CHAT` | 10 | env | Rate limit per user per min |

## 6. External Dependencies

| Dep | Purpose |
|---|---|
| `ws` package (npm) | Node.js WebSocket client (browser native is not available in SSR API routes) |
| Backend `POST /api/v1/conversations/` | Create conversation |
| Backend `POST /api/v1/conversations/{id}/messages` | Save user + assistant messages |
| Backend `ws://.../api/v1/query/ws/smart` | Primary pipeline |
| Backend `POST /api/v1/query/smart` | Sync fallback pipeline |
| `@/lib/auth` (`requireSession`, `backendHeaders`) | Auth + header helper |
| `@/lib/rateLimit` (`checkRateLimit`, `rateLimitResponse`) | Rate limit |

## 7. Source Files

| File | Lines | Role |
|---|---|---|
| `src/app/api/chat/route.ts` | ~620 | Main handler, bridge logic, WS client, HTTP fallback, event mapper |

**External imports**:
- `next/server` (NextRequest)
- `@/lib/auth` (requireSession, backendHeaders)
- `@/lib/rateLimit` (checkRateLimit, rateLimitResponse)
- `ws` (WebSocket from npm package)

## 8. Deviations from Constitution

- **Principle I (Thin client)**: the bridge has complex orchestration, but it is protocol translation + conversation lifecycle, not business logic. Accepted.
- **Principle II (Single Responsibility)**: the 620-line file violates SRP — see [DEBT-005] in the spec. Candidate for a split.
- **Principle VI (Auth)**: respects `requireSession` + `backendHeaders`.
- **Principle VII (Security)**: respects input caps + sanitization + rate limit.
- **Principle IX (Observability)**: does not emit bridge-specific metrics (how many times the fallback was used, WS latency, etc.). See [DEBT-008].

---

**End of plan.md**
