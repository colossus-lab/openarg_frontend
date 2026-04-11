# Plan: HTTP Fallback (As-Built)

**Related spec**: [./spec.md](./spec.md)
**Parent plan**: [../plan.md](../plan.md)
**Type**: Reverse-engineered
**Last synced with code**: 2026-04-11

---

## 1. Layer Mapping

| Layer | Component | File |
|---|---|---|
| Application (HTTP client) | `fetchSynchronous` | `src/lib/chat/syncFallback.ts` (extracted from `route.ts` 2026-04-11 as part of DEBT-005 fix) |
| Application (phase synth) | `emitSyncResult` | `src/lib/chat/syncFallback.ts` |
| Infrastructure (helpers) | `backendHeaders` | `src/lib/auth.ts` |

## 2. Behavior

```
If WS result is null → fallback to fetchSynchronous:
  - emit 'thinking: Conectando vía alternativa...'
  - POST /api/v1/query/smart with {question, user_email, conversation_id, policy_mode, history}
  - parse SmartResult
  - emitSyncResult: simulate phases (planning → data_collection → analysis → synthesis)
  - throw user-friendly error on 429/5xx
```

### HTTP error mapping

| Status / error | Friendly message |
|---|---|
| 429 | "Demasiadas consultas. Esperá un momento antes de intentar de nuevo." |
| 502 / 503 / 504 | "El sistema de análisis no está disponible en este momento." |
| 5xx (other) | "Error interno del servidor." |
| `ECONNREFUSED` / `ECONNRESET` / `ENOTFOUND` | "No se pudo conectar con el servidor. El sistema puede estar en mantenimiento." |

### Synthetic phase emission

On successful sync response, `emitSyncResult` pushes the SSE events in this order:

1. `phase_change: 'planning'`
2. `phase_change: 'data_collection'`
3. `phase_change: 'analysis'`
4. Stream `content` chunks (synthetic split of `answer`)
5. `chart` / `sources` / `documents` / `map` if present
6. `phase_change: 'synthesis'`

## 3. History Capping (Known Inconsistency — DEBT-003)

- WS path sends **no history** (the backend loads memory from Redis by `conversation_id`).
- HTTP fallback sends `sanitizedHistory.slice(-10)` — only the last **10** entries, even though the initial sanitization caps to 20.
- Each entry is also capped at 2000 chars in initial sanitization.

## 4. External Dependencies

| Dep | Purpose |
|---|---|
| Backend `POST /api/v1/query/smart` | Sync fallback pipeline |
| `@/lib/auth` (`backendHeaders`) | Auth header helper |

## 5. Deviations from Constitution

- **Principle I (Thin client)**: synthetic phase emission is UX scaffolding, not business logic. Accepted.
- **Principle IX (Observability)**: does not record how many times the fallback was invoked. See [DEBT-008] in parent spec.

---

**End of 001b-http-fallback/plan.md**
