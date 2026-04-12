# Spec: Conversations (CRUD + Sidebar)

**Type**: Reverse-engineered
**Status**: Draft
**Last synced with code**: 2026-04-11
**Layer scope**: Presentation + Application (proxies)
**Related plan**: [./plan.md](./plan.md)

---

## 1. Context & Purpose

A set of **proxy routes + a sidebar component** for managing user conversations: list, create, fetch detail with messages, add a message, delete. Almost everything is a transparent proxy to the backend (`/api/v1/conversations/*`); the interesting logic lives in the `ConversationSidebar` component, which handles navigation between conversations, active highlight, and the delete UX with confirmation.

## 2. User Stories

### US-001 (P1) — List my conversations
**As a** user, **I want** to see my previous conversations in a sidebar, sorted by most recent activity.

### US-002 (P1) — Resume a conversation
**As a** user, **I want** to click on a conversation and have its messages load in the chat.

### US-003 (P1) — Create a new conversation
**As a** user, **I want** a "New conversation" button that clears the state and lets me start typing.

### US-004 (P1) — Delete a conversation
**As a** user, **I want** to delete a conversation via a confirmation modal.

### US-005 (P2) — Collapsible sidebar
**As a** user on mobile or a small screen, **I want** to be able to collapse the sidebar.

### US-006 (P2) — Active conversation highlight
**As a** user, **I want** to see which conversation I have open in the sidebar.

## 3. Functional Requirements

- **FR-001**: `GET /api/conversations` MUST proxy `GET /api/v1/conversations` via `backendHeaders(session.idToken)`, forwarding the Google OAuth ID token as `Authorization: Bearer` (the backend reads the user email from the verified JWT claim). Rate limit: `conversations:get` (30/min).
- **FR-002**: `POST /api/conversations` MUST proxy `POST /api/v1/conversations/` to create a new one. Rate limit: `conversations:post` (10/min).
- **FR-003**: `GET /api/conversations/[id]` MUST proxy `GET /api/v1/conversations/{id}` with messages.
- **FR-004**: `POST /api/conversations/[id]` MUST proxy `POST /api/v1/conversations/{id}/messages` to append a message.
- **FR-005**: `DELETE /api/conversations/[id]` MUST proxy `DELETE /api/v1/conversations/{id}`.
- **FR-006**: All routes MUST call `requireSession()` first.
- **FR-007**: `ConversationSidebar` MUST fetch the list on mount + refetch when a conversation is created/deleted.
- **FR-008**: MUST show the conversation title (truncated to ~40 chars) + relative timestamp.
- **FR-009**: MUST highlight the active conversation via `activeConversationIdRef`.
- **FR-010**: Delete MUST invoke `ConfirmDialog` with the message "¿Eliminar esta conversación?".
- **FR-011**: After delete, it MUST: (a) remove the item from the local list, (b) if it was the active one, invoke `startNewConversation()` from the hook.
- **FR-012**: MUST support loading states (skeleton or spinner) during fetches.

## 4. Success Criteria

- **SC-001**: The conversation list loads in **<500ms (p95)** with up to 100 conversations.
- **SC-002**: Clicking a conversation → messages load in **<1s**.
- **SC-003**: Delete is **idempotent** (safe to retry).
- **SC-004**: Zero stale state: the sidebar always reflects the backend truth after create/delete.

## 5. Open Questions

- **[RESOLVED CL-001]** — **Yes — there is load-more pagination.** `src/components/ConversationSidebar.tsx:59,74,92-95,109` uses `useState(offset, 0)`, fetches `limit=30, offset=0` on mount, tracks `hasMore`, and has a "load more" handler that increments offset by 30. So a user with 500+ conversations sees the first 30 and must click to load older ones — they are NOT all loaded at once. Note: `DEBT-001` in this spec claims "no pagination" and is therefore stale. (resolved 2026-04-11 via code inspection)
- **[RESOLVED CL-002]** — **No.** Grep of `src/components/ConversationSidebar.tsx` for `search`/`filter`/`input` returns only the `.filter((c) => c.id !== id)` used on optimistic delete and a `.filter(Boolean)` for className composition — no search input element, no textual filter, no backend query parameter. Tracked as `DEBT-002`. (resolved 2026-04-11 via code inspection)
- **[RESOLVED CL-003]** — **Auto-generated, not editable from the UI today.** `src/app/api/chat/route.ts:115` sets the title from the first user message truncated at 80 chars: `const title = message.length > 80 ? message.slice(0, 80) + '...' : message;` and passes it to `createConversation`. The backend DOES expose a `PATCH /api/v1/conversations/{id}` endpoint (`openarg_backend conversations_router.py:221-240`) but the frontend never calls it — grep for `rename` / `updateTitle` / `PATCH.*title` across `openarg_frontend/src` returns zero matches. (resolved 2026-04-11 via code inspection)

## 6. Tech Debt Discovered

- **[DEBT-001]** — **No pagination** visible in the sidebar — if a user accumulates many conversations, the scroll grows without bound.
- **[DEBT-002]** — **No search** in the sidebar — hard to find an old conversation.
- **[DEBT-003]** — **No optimistic update** on delete — the sidebar shows a loading state while waiting for the backend.

---

**End of spec.md**
