# Plan: Event Mapping (As-Built)

**Related spec**: [./spec.md](./spec.md)
**Parent plan**: [../plan.md](../plan.md)
**Type**: Reverse-engineered
**Last synced with code**: 2026-04-11

---

## 1. Layer Mapping

| Layer | Component | File |
|---|---|---|
| Application (translator) | `mapStatusStep(step, extra)` | `src/lib/chat/eventMapper.ts` (extracted from `route.ts` 2026-04-11 as part of DEBT-005 fix) |
| Application (source formatter) | `formatSources` | `src/lib/chat/eventMapper.ts` |
| Application (dispatcher) | `send()` closure + event-type switch | inside `streamViaWebSocket` (`src/lib/chat/wsBridge.ts`) and `emitSyncResult` (`src/lib/chat/syncFallback.ts`) — both import the mapper |
| Application (delay) | `MIN_DISPLAY_MS = 2000` constant + `await` before `done` | `src/lib/chat/eventMapper.ts` |

## 2. Behavior

### `mapStatusStep(step, extra)`

Pure function. Given a backend `step` string and an optional `extra` object (e.g. `{detail: "..."}`), returns `{phase?, thinking?}` — `phase` is set only when the step triggers a user-visible phase transition, `thinking` is always set.

Implemented as a switch with the 13 cases from the table in the spec (`classifying`, `cache_check`, `cache_hit`, `loading_context`, `coordination`, `replanning`, `skill`, `planning`, `planned`, `searching`, `generating`, `policy_analysis`, default). Cases that accept `extra.detail` use it when present and fall back to a static Spanish string otherwise.

### Dispatcher — whitelist enforcement

The bridge's `send(type, data)` closure encodes `data: ${JSON.stringify({type, data})}\n\n` and calls `controller.enqueue(...)`. The only `type` values ever passed in are:

```
phase_change, thinking, content, chart, sources, documents, map,
clarification, error, conversation_saved, assistant_message_saved, done
```

Any other backend event type is silently dropped — there is no passthrough.

### `minDisplayMs` delay

```
const startTime = Date.now()
// ... stream runs ...
const elapsed = Date.now() - startTime
if (elapsed < minDisplayMs) {
  await new Promise(r => setTimeout(r, minDisplayMs - elapsed))
}
send('phase_change', 'synthesis')
send('done', null)
```

## 3. Bridge → Browser (SSE) Event Shapes

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

// errors + end
{ type: 'error', data: string }
{ type: 'done', data: null }
```

*(The two conversation events — `conversation_saved`, `assistant_message_saved` — are in the whitelist but their emission is owned by [001d](../001d-conversation-lifecycle/plan.md).)*

## 4. Timeouts & Limits

| Constant | Default | Configurable via | Purpose |
|---|---|---|---|
| `minDisplayMs` | 2000 ms | — | Artificial UX delay for fast responses |

## 5. Deviations from Constitution

- **Principle II (Single Responsibility)**: the translation table is hardcoded in a switch statement rather than being a data-driven dictionary. See [DEBT-004].

---

**End of 001c-event-mapping/plan.md**
