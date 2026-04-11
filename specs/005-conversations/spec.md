# Spec: Conversations (CRUD + Sidebar)

**Type**: Reverse-engineered
**Status**: Draft
**Last synced with code**: 2026-04-10
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

- **FR-001**: `GET /api/conversations` MUST proxy `GET /api/v1/conversations` with the `X-User-Email` header. Rate limit: `conversations:get` (30/min).
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

- **[NEEDS CLARIFICATION CL-001]** — Is there pagination in the conversation list? If a user has 500+, are they all loaded?
- **[NEEDS CLARIFICATION CL-002]** — Is there search/filtering in the sidebar? Not visible in the components.
- **[NEEDS CLARIFICATION CL-003]** — Are conversation titles auto-generated from the first message or editable?

## 6. Tech Debt Discovered

- **[DEBT-001]** — **No pagination** visible in the sidebar — if a user accumulates many conversations, the scroll grows without bound.
- **[DEBT-002]** — **No search** in the sidebar — hard to find an old conversation.
- **[DEBT-003]** — **No optimistic update** on delete — the sidebar shows a loading state while waiting for the backend.

---

**End of spec.md**
