# Plan: WS Bridge (As-Built)

**Related spec**: [./spec.md](./spec.md)
**Parent plan**: [../plan.md](../plan.md)
**Type**: Reverse-engineered
**Last synced with code**: 2026-04-11

---

## 1. Layer Mapping

| Layer | Component | File |
|---|---|---|
| Application (WS client) | `streamViaWebSocket` | `src/lib/chat/wsBridge.ts` (extracted from `route.ts` 2026-04-11 as part of DEBT-005 fix) |
| Application (helper) | `buildWsUrl` | `src/lib/chat/wsBridge.ts` |
| Infrastructure | `ws` package (npm) | Node.js WebSocket client (browser native is not available in SSR API routes) |

## 2. Configuration (env vars)

```bash
OPENARG_BACKEND_URL=http://localhost:8081       # or ws://... (converted automatically)
OPENARG_BACKEND_API_KEY=...                     # appended as ?api_key=... in WS URL
```

## 3. Behavior — `streamViaWebSocket(message, convId, policyMode, send)`

```
buildWsUrl() → 'ws://backend/api/v1/query/ws/smart?api_key=...'
new WebSocket(wsUrl)
setTimeout(8000) → safeResolve(null) if not connected
on 'open':
  - clearConnectTimeout
  - resetActivityTimeout (120s)
  - ws.send(JSON.stringify({question, conversation_id, policy_mode}))
on 'message':
  - resetActivityTimeout
  - parse JSON (tolerate up to 5 consecutive parse errors)
  - switch event.type:
    - 'status'        → mapStatusStep(step) → send {phase_change, thinking}   (see 001c)
    - 'chunk'         → accumulatedContent += content → send {content}
    - 'complete'      → build SmartResult → emitResultData → safeResolve
    - 'clarification' → send {clarification} → safeResolve with _wsError flag
    - 'error'         → send {error} → safeResolve with _wsError flag
on 'close' | 'error':
  - safeResolve(accumulatedContent ? partial : null)
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

## 5. Timeouts & Limits

| Constant | Default | Configurable via | Purpose |
|---|---|---|---|
| WS connect timeout | 8000 ms | — | Trigger fallback to HTTP sync |
| WS activity timeout | 120000 ms | — | Detect zombie connection |
| Parse error tolerance | 5 | — | Abort after 5 consecutive parse errors |

## 6. External Dependencies

| Dep | Purpose |
|---|---|
| `ws` package (npm) | Node.js WebSocket client (browser native is not available in SSR API routes) |
| Backend `ws://.../api/v1/query/ws/smart` | Primary pipeline |

## 7. Deviations from Constitution

- **Principle I (Thin client)**: WS client lives in the route handler rather than in a domain layer. Accepted — it is protocol translation, not business logic.
- **Principle IX (Observability)**: does not emit WS-specific metrics (connection latency, parse error counts). See [DEBT-008].

---

**End of 001a-ws-bridge/plan.md**
