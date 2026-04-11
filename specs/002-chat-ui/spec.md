# Spec: Chat UI (`/chat` page)

**Type**: Reverse-engineered
**Status**: Draft
**Last synced with code**: 2026-04-10
**Layer scope**: Presentation (page + components)
**Related plan**: [./plan.md](./plan.md)

---

## 1. Context & Purpose

`/chat` is **the main page of the product**. It integrates the input textarea, the conversations sidebar, the message stream with typewriter effect, the visual phases (Estratega/Investigador/Analista/Redactor), and the rendering components: markdown, charts, maps, structured documents, and the source panel. It consumes the `/api/chat` bridge through the `useSSEStream` hook and manages state with `useConversationState`.

It is the largest file in the frontend (~775 lines) — it combines layout, event handling, lifecycle management, abort control, and component composition.

## 2. Ubiquitous Language

| Term | Definition |
|---|---|
| **Chat message** | Entry in the conversation — `{id, role, content, timestamp, sources?, chart_data?, map_data?, documents?}`. |
| **Streaming message** | Assistant message currently being revealed by the typewriter in real time. |
| **Phase bar** | Visual component that shows the 4 phases (Estratega/Investigador/Analista/Redactor) with the active one highlighted. |
| **Source panel** | Collapsible accordion with the cited sources. |
| **Feedback buttons** | Thumbs up/down on each assistant message to send feedback to the backend. |

## 3. User Stories

### US-001 (P1) — Send a message and see streaming
**As an** authenticated user, **I want** to type a question in the textarea and see the response appear progressively with typewriter effect + visual phases, **so that** I have a smooth conversational experience.

### US-002 (P1) — See the current conversation history
**As a** user, **I want** to see my previous messages in the current conversation above the textarea, in chronological order.

### US-003 (P1) — Cancel an in-flight stream
**As a** user, **when** I change my mind about a query or it is taking too long, **I want** to be able to cancel it with a button, **so that** I can start over.

### US-004 (P1) — See rendered charts and maps
**As a** user, **when** the backend returns chart_data or map_data, **I want** to see the visualizations inline in the message.

### US-005 (P1) — See collapsible cited sources
**As a** critical user, **I want** to expand the sources panel to verify where each piece of data comes from.

### US-006 (P2) — Give feedback (thumbs up/down)
**As a** user, **I want** to mark responses as useful or not, **to** help improve the system.

### US-007 (P2) — Switch between conversations
**As a** user, **I want** to select previous conversations from the sidebar and see them load, **so that** I can resume contexts.

### US-008 (P2) — New conversation
**As a** user, **I want** to be able to start a clean conversation from a "Nueva conversación" button.

### US-009 (P2) — Clarification chips
**As a** user, **when** the backend asks me to clarify, **I want** to see clickable chips with the options, **so that** I don't have to type.

### US-010 (P2) — Textarea auto-resize
**As a** user, **I want** the textarea to grow vertically as I type (up to a maximum), **so that** I can see everything I have written.

### US-011 (P3) — Initial suggestions
**As a** new user, **I want** to see example question suggestions when opening the chat with no history, **so that** I know what I can ask.

### US-012 (P3) — Document cards (DDJJ)
**As a** user querying about DDJJ, **I want** to see the records as structured cards instead of plain text.

## 4. Functional Requirements

- **FR-001**: MUST use the `'use client'` directive (full interactivity).
- **FR-002**: MUST call NextAuth's `useSession()` to get the user.
- **FR-003**: MUST redirect to `/login?callbackUrl=/chat` if there is no session (but the middleware already does this, it is double protection).
- **FR-004**: MUST render `ConversationSidebar` with collapse/expand toggle.
- **FR-005**: MUST use `useConversationState` to manage messages + loaded conversation.
- **FR-006**: MUST use `useSSEStream` for the chat stream.
- **FR-007**: MUST use `useAutoResize` for the textarea.
- **FR-008**: When sending a message it MUST:
  - add the user message to `messages` optimistically
  - invoke `sendMessage(body, onEvent)` from the SSE hook
  - update phases and streaming message in the callback
  - on completion, add the final assistant message to `messages`
- **FR-009**: Must handle event callbacks from the stream:
  - `phase_change` → update `currentPhase`
  - `thinking` → update `currentThinking`
  - `conversation_saved` → update the loaded conversation ID
  - `error` → show error in the message
  - `done` → cleanup
- **FR-010**: MUST show a phase bar with the 4 phases and highlight the active one.
- **FR-011**: MUST show the "thinking" text below the phase bar (changes per phase).
- **FR-012**: MUST render each message with the `ChatMessage` component.
- **FR-013**: MUST render the streaming message in a distinguishable place (with a blinking cursor or similar).
- **FR-014**: MUST render `SourcePanel` after the assistant message if there are sources.
- **FR-015**: MUST render `DataChart` or `ObservablePlotChart` for each chart in the message.
- **FR-016**: MUST render `MapView` if there is map_data.
- **FR-017**: MUST render `DocumentCards` if there are documents.
- **FR-018**: MUST support the "Cancelar" button during streaming that invokes `abort()`.
- **FR-019**: MUST send history (last 6 messages truncated to 500 chars) to `/api/chat` as a hint.
- **FR-020**: MUST render "Nueva conversación" and "Eliminar conversación" in the sidebar.
- **FR-021**: MUST handle clarification events by showing interactive chips.
- **FR-022**: MUST render initial suggestions when `messages.length === 0`.

## 5. Success Criteria

- **SC-001**: First interaction (first meaningful paint) **<2s** from navigation to `/chat`.
- **SC-002**: Smooth typewriter effect at **60fps** on modern hardware.
- **SC-003**: Conversation switching (click on sidebar) **<1s**.
- **SC-004**: Stream cancellation **instantaneous** (<100ms).
- **SC-005**: Zero unnecessary re-renders during streaming (state via refs where applicable).
- **SC-006**: Basic accessibility: `aria-label` on buttons, keyboard navigation in the textarea.
- **SC-007**: Responsive: usable on mobile (collapsible sidebar, adapted textarea).

## 6. Assumptions & Out of Scope

### Assumptions
- Modern browser with SSE support via Fetch API + ReadableStream.
- User authenticated before reaching `/chat` (enforced by middleware).
- The backend responds in the expected format (the bridge protects from shape changes).

### Out of scope
- **Multi-user / collaborative chat**.
- **Rich editor** — plain textarea only + markdown rendering in messages.
- **File uploads** — no files are uploaded.
- **Voice input/output**.
- **Conversation export** — there is an ARCO export but no direct chat download.

## 7. Open Questions

- **[RESOLVED CL-001]** — **`AgentActivityBar` IS a separate component** (not inline). Verified: `src/components/AgentActivityBar.tsx` (~57 lines) imported and used in `chat/page.tsx`. Renders 4 phase steps with progress track + state indicators + pulse animation for the active phase.
- **[NEEDS CLARIFICATION CL-002]** — History hint sent to the bridge: see `001-chat-bridge/DEBT-003` corrected — the reality is `slice(-10)` in the HTTP fallback, not 500 chars. If the backend loses Redis memory, the hint is insufficient (only 10 entries).
- **[RESOLVED CL-003]** — **Suggestions HARDCODED in `messages/es.json`**. Verified: namespace `chat.suggestion1-4`, 4 fixed suggestions loaded via `useTranslations('chat')` in `chat/page.tsx:108-113`. They do not come from the backend, they do not adapt to the user. Changing them requires editing `es.json` + deploy.
- **[RESOLVED CL-004]** — **Lazy loading CONFIRMED**. Verified: `DataChart` (line 15), `ObservablePlotChart` (line 19), `MapView` (line 23) use `dynamic()` with `ssr: false`. Charts only hydrate in the browser after the SSE response — reduces the initial `/chat` bundle.

## 8. Tech Debt Discovered

- **[DEBT-001]** — **Page file ~775 lines** — mix of layout, event handling, state orchestration, and composition. Candidate for decomposition into sub-components:
  - `ChatLayout` (sidebar + main)
  - `MessageList` (rendering of the array)
  - `StreamingMessage` (active message with typewriter)
  - `ChatInput` (textarea + send + cancel)
  - `PhaseBar` (if it is not a separate component already)
- **[DEBT-002]** — **Hardcoded suggestions** in `messages/es.json` — they do not come from the backend, they do not adapt to the user.
- **[DEBT-003]** — **No visible keyboard shortcuts** (e.g., `Ctrl+K` for new conversation).
- **[DEBT-004]** — **No error recovery** — if the stream breaks, the user must retype the question (no "retry").

---

**End of spec.md**
