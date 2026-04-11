# Plan: Chat UI (As-Built)

**Related spec**: [./spec.md](./spec.md)
**Last synced with code**: 2026-04-10

---

## 1. Layer Mapping

| Layer | Component | File |
|---|---|---|
| Page (Client Component) | `ChatPage` | `src/app/chat/page.tsx` (~775 lines) |
| Hook (state) | `useConversationState` | `src/hooks/useConversationState.ts` |
| Hook (SSE) | `useSSEStream` | `src/hooks/useSSEStream.ts` (see `003-sse-client/`) |
| Hook (UI) | `useAutoResize` | `src/hooks/useAutoResize.ts` |
| Components (chat) | `ChatMessage`, `SourcePanel`, `DataChart`, `MapView`, `DocumentCards`, `ObservablePlotChart`, `ConversationSidebar`, `ChartErrorBoundary` | `src/components/*.tsx` |

## 2. Component Composition

```
<ChatPage>  ('use client')
├── <AuthProvider />  (inherited from layout.tsx)
├── <UserSyncProvider />
│
├── <ConversationSidebar>
│   ├── <ConfirmDialog /> (for delete)
│   └── [list of conversations]
│
├── <main>
│   ├── <PhaseBar />  (probably inline, not separate component)
│   │   ├── Estratega
│   │   ├── Investigador
│   │   ├── Analista
│   │   └── Redactor
│   │
│   ├── <MessageList>
│   │   └── [messages.map(msg => <ChatMessage />)]
│   │       └── <ChatMessage>
│   │           ├── markdown rendered via react-markdown + remark-gfm + rehype-sanitize
│   │           ├── <SourcePanel sources={...} />
│   │           ├── <ChartErrorBoundary>
│   │           │   ├── <DataChart chart={...} />  (Recharts)
│   │           │   └── <ObservablePlotChart chart={...} />  (Observable Plot, for heatmap/scatter)
│   │           ├── <MapView mapData={...} />  (Leaflet, lazy-loaded)
│   │           ├── <DocumentCards documents={...} />
│   │           └── [feedback buttons thumbs up/down]
│   │
│   ├── <StreamingMessage />  (current streaming assistant message, shown during stream)
│   │
│   └── <ChatInput>
│       ├── <textarea>  (useAutoResize)
│       ├── <button>Enviar</button>
│       └── <button>Cancelar</button>  (visible during streaming)
```

## 3. State Shape

```typescript
// From useConversationState
interface ConversationStateReturn {
  messages: ChatMessage[];
  setMessages: React.Dispatch<...>;
  loadedConversation: { id: string; title: string } | null;
  setLoadedConversation: ...;
  activeConversationIdRef: React.MutableRefObject<string | null>;
  sessionIdRef: React.MutableRefObject<string>;
  loadConversation: (id: string) => Promise<void>;
  startNewConversation: () => void;
}

// From useSSEStream (see 003-sse-client/)
interface SSEReturn {
  sendMessage: (body, onEvent) => Promise<SSEStreamOutput>;
  abort: () => void;
  resetTypewriter: () => void;
  isStreaming: boolean;
  setIsStreaming: ...;
}

// Page-level state
const [currentPhase, setCurrentPhase] = useState<Phase>('planning');
const [currentThinking, setCurrentThinking] = useState<string>('');
const [streamingMessage, setStreamingMessage] = useState<ChatMessage | null>(null);
const [clarification, setClarification] = useState<ClarificationData | null>(null);
```

## 4. Main Flow — Send Message

```
1. User types in textarea → useAutoResize grows
    ▼
2. User clicks "Enviar" or presses Enter
    ▼
3. handleSend():
   a. Build ChatMessage for user: {id: uuid, role: 'user', content, timestamp}
   b. setMessages(prev => [...prev, userMsg])  // optimistic
   c. Clear textarea
   d. Build body: {message, sessionId, policyMode, conversationId: activeConversationIdRef.current, history: messages.slice(-6).map(truncate500)}
   e. sendMessage(body, onEvent)  // from useSSEStream
    ▼
4. onEvent callback handles:
   - 'phase_change' → setCurrentPhase
   - 'thinking' → setCurrentThinking
   - 'conversation_saved' → activeConversationIdRef.current = id; refresh sidebar
   - 'chart' → accumulated internally by hook
   - 'sources' → same
   - 'clarification' → setClarification
   - 'error' → show error message
   - 'done' → cleanup
    ▼
5. When sendMessage promise resolves:
   - Build final assistant message from SSEStreamOutput
   - setMessages(prev => [...prev, assistantMsg])
   - setStreamingMessage(null)
   - setCurrentPhase('synthesis')
   - Reset phases
```

## 5. Key Behaviors

### Loading a conversation from sidebar
```typescript
async function handleLoadConversation(id: string) {
  await loadConversation(id);  // fetches GET /api/conversations/{id}
  // Hook updates messages + loadedConversation
  resetTypewriter();
  setCurrentPhase('planning');
}
```

### Starting a new conversation
```typescript
function handleNewConversation() {
  startNewConversation();  // clears messages, resets refs
  resetTypewriter();
  setClarification(null);
}
```

### Clarification flow
```typescript
// When clarification event arrives
setClarification({ question, options });

// User clicks an option
function handleClarificationChoice(option: string) {
  setClarification(null);
  // Re-send with the chosen option as the new message
  handleSend({ override: option });
}
```

### Abort stream
```typescript
function handleCancel() {
  abort();  // from hook
  setCurrentPhase('planning');
  setCurrentThinking('');
  setStreamingMessage(null);
}
```

## 6. Components Used

| Component | File | Purpose |
|---|---|---|
| `ChatMessage` | `src/components/ChatMessage.tsx` | Markdown rendering + feedback buttons |
| `SourcePanel` | `src/components/SourcePanel.tsx` | Collapsible sources list |
| `DataChart` | `src/components/DataChart.tsx` | Recharts wrapper (line/bar/pie) |
| `ObservablePlotChart` | `src/components/ObservablePlotChart.tsx` | Observable Plot wrapper (heatmap/scatter) |
| `MapView` | `src/components/MapView.tsx` | Leaflet map (lazy-loaded) |
| `DocumentCards` | `src/components/DocumentCards.tsx` | DDJJ / document cards |
| `ConversationSidebar` | `src/components/ConversationSidebar.tsx` | Conversation list + nav |
| `ChartErrorBoundary` | `src/components/ChartErrorBoundary.tsx` | Fallback if chart crashes |
| `ConfirmDialog` | `src/components/ConfirmDialog.tsx` | Delete confirmation modal |

## 7. i18n Strings Used

All user-facing strings loaded via `useTranslations('chat')` from `messages/es.json`:
- Phase labels: Estratega, Investigador, Analista, Redactor
- Placeholder: "¿Qué querés saber sobre Argentina?"
- Send button: "Enviar"
- Cancel button: "Cancelar"
- Initial suggestions (4-6 example queries)
- Error messages

## 8. Source Files

| File | Role |
|---|---|
| `src/app/chat/page.tsx` | Main page (~775 lines) |
| `src/hooks/useConversationState.ts` | State management |
| `src/hooks/useSSEStream.ts` | SSE consumer (see `003-sse-client/`) |
| `src/hooks/useAutoResize.ts` | Textarea auto-resize |
| `src/components/ChatMessage.tsx` + etc | Rendering components |
| `messages/es.json` | i18n strings |

## 9. Deviations from Constitution

- **Principle III (hooks-only state)**: complies — no Redux/Zustand.
- **Principle II (stack)**: React 19 + TypeScript + Next.js 16.
- **Principle VIII (dark theme)**: Argentine palette applied.
- **Principle X (Spanish-first)**: strings in `messages/es.json`.
- **[DEBT-001]** from the spec: the large single file moderately violates SRP, acceptable for now.

---

**End of plan.md**
