# Plan: Conversations (As-Built)

**Related spec**: [./spec.md](./spec.md)
**Last synced with code**: 2026-04-10

---

## 1. Layer Mapping

| Layer | Component | File |
|---|---|---|
| API proxy (list/create) | `GET/POST /api/conversations` | `src/app/api/conversations/route.ts` |
| API proxy (detail/update/delete) | `GET/POST/DELETE /api/conversations/[id]` | `src/app/api/conversations/[id]/route.ts` |
| Component | `ConversationSidebar` | `src/components/ConversationSidebar.tsx` |
| Component (modal) | `ConfirmDialog` | `src/components/ConfirmDialog.tsx` |
| State hook | `useConversationState` | `src/hooks/useConversationState.ts` |

## 2. Route Details

### `GET /api/conversations`
Proxy to `GET /api/v1/conversations`. Returns a paginated list of the user's conversations (ordered by `updated_at DESC`). Rate limit: `conversations:get` (30/min).

### `POST /api/conversations`
Proxy to `POST /api/v1/conversations/`. Body: `{title}`. Returns `{id, title, created_at}`. Rate limit: `conversations:post` (10/min).

### `GET /api/conversations/[id]`
Proxy to `GET /api/v1/conversations/{id}`. Returns the conversation + messages inline. Rate limit: `conversations:get`.

### `POST /api/conversations/[id]`
Proxy to `POST /api/v1/conversations/{id}/messages`. Body: `{role, content, sources?, chart_data?, map_data?, documents?}`. Rate limit: `conversations:post`.

### `DELETE /api/conversations/[id]`
Proxy to `DELETE /api/v1/conversations/{id}`. Idempotent. Rate limit: `conversations:post`.

## 3. Component: ConversationSidebar

```typescript
// Props (inferred)
interface Props {
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewConversation: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}
```

### Behavior

1. On mount → `fetch('/api/conversations')` → `setList(data)`
2. Render list with active highlight
3. Click on item → `onSelect(id)` → parent invokes `loadConversation(id)` from hook
4. Click "Nueva" → `onNewConversation()` → parent calls `startNewConversation()`
5. Click delete icon → open `ConfirmDialog` → confirm → `DELETE /api/conversations/{id}` → remove from list
6. Re-fetch on `conversation_saved` event from the chat stream (prop or context)

## 4. Source Files

- `src/app/api/conversations/route.ts`
- `src/app/api/conversations/[id]/route.ts`
- `src/components/ConversationSidebar.tsx`
- `src/components/ConfirmDialog.tsx`
- `src/hooks/useConversationState.ts`

## 5. Deviations from Constitution

- Principle I (thin client): pure proxies.
- Principle VII (Security): rate limit + `requireSession` on all routes.

---

**End of plan.md**
