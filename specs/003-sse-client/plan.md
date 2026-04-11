# Plan: SSE Client (As-Built)

**Related spec**: [./spec.md](./spec.md)
**Last synced with code**: 2026-04-10

---

## 1. Layer Mapping

| Layer | Component | File |
|---|---|---|
| Hook | `useSSEStream` | `src/hooks/useSSEStream.ts` (~300 lines) |
| Helper | `splitIntoWordChunks` | inline in the same file |
| Types | `StreamEvent`, `SSEStreamOutput`, `UseSSEStreamReturn`, `ChatMessage`, etc. | `src/lib/types.ts` + inline |

## 2. Hook Signature

```typescript
export function useSSEStream(
  setStreamingMessage: React.Dispatch<React.SetStateAction<ChatMessage | null>>,
  endpoint: string = '/api/chat',
): UseSSEStreamReturn;

interface UseSSEStreamReturn {
  sendMessage: (body: object, onEvent: (event: StreamEvent) => void) => Promise<SSEStreamOutput>;
  abort: () => void;
  resetTypewriter: () => void;
  isStreaming: boolean;
  setIsStreaming: React.Dispatch<React.SetStateAction<boolean>>;
}

interface SSEStreamOutput {
  assistantContent: string;
  charts: ChartData[];
  mapData: MapData | null;
  sources: SourceAttribution[];
  documents: DocumentRecord[];
  savedConvId: string | null;
  savedAssistantMsgId: string | null;
  aborted: boolean;
}
```

## 3. Internal State (refs)

```typescript
const abortControllerRef = useRef<AbortController | null>(null);

// Typewriter state — all in refs to avoid re-renders
const chunkQueueRef = useRef<{ items: string[]; head: number }>({ items: [], head: 0 });
const revealedRef = useRef('');
const rafRef = useRef<number | null>(null);
const streamingTimestampRef = useRef<string>('');

// React state (only for UI consumers)
const [isStreaming, setIsStreaming] = useState(false);
```

## 4. Main Flow — sendMessage

```
sendMessage(body, onEvent)
    │
    ▼
1. resetTypewriter()  // clear queue + refs
    ▼
2. abortControllerRef.current?.abort()  // cancel previous
3. new AbortController → set ref
    ▼
4. setIsStreaming(true)
    ▼
5. fetch(endpoint, {method: 'POST', body: JSON.stringify(body), signal: controller.signal})
    ├─ catch DOMException.AbortError → throw
    ├─ catch network error → emit 'error' event, return early
    ▼
6. if (!response.ok) → emit 'error', return
    ▼
7. const reader = response.body.getReader()
   const decoder = new TextDecoder()
   let buffer = ''
    ▼
8. while (true):
     const { done, value } = await reader.read()
     if (done) break
     buffer += decoder.decode(value, { stream: true })
     const lines = buffer.split('\n\n')
     buffer = lines.pop() || ''
     for (const line of lines):
       if (!line.startsWith('data: ')) continue
       try:
         const event = JSON.parse(line.slice(6))
         // Handle by type
         switch (event.type):
           case 'content': → enqueue + startReveal
           case 'chart': → charts.push(...)
           case 'map': → mapData = ...
           case 'sources': → sources = [...]
           case 'documents': → documents = [...]
           case 'error': → assistantContent += `\n\n**${event.data}**`
           case 'conversation_saved': → savedConvId = ...
           case 'assistant_message_saved': → savedAssistantMsgId = ...
         onEvent(event)  // forward to caller
       catch (parseErr):
         parseErrorCount++
         if (parseErrorCount > 3) → emit 'error' to caller
    ▼
9. await waitForReveal()  // wait for typewriter queue to drain
    ▼
10. finally: clear abortControllerRef if still current
    ▼
11. return { assistantContent, charts, mapData, sources, documents, savedConvId, savedAssistantMsgId, aborted }
```

## 5. Typewriter Implementation

```typescript
const CHARS_PER_FRAME = 28;

function startReveal() {
  if (rafRef.current !== null) return;  // already running

  const tick = () => {
    const q = chunkQueueRef.current;

    // Queue empty → stop
    if (q.head >= q.items.length) {
      q.items = [];
      q.head = 0;
      rafRef.current = null;
      return;
    }

    // Dequeue up to CHARS_PER_FRAME chars
    const outParts: string[] = [];
    let budget = CHARS_PER_FRAME;
    while (budget > 0 && q.head < q.items.length) {
      const item = q.items[q.head];
      if (item.length <= budget) {
        budget -= item.length;
        outParts.push(item);
        q.head++;
      } else {
        outParts.push(item.slice(0, budget));
        q.items[q.head] = item.slice(budget);
        budget = 0;
      }
    }

    // Update revealed
    revealedRef.current += outParts.join('');
    const content = revealedRef.current;

    // Set streaming message in state
    if (!streamingTimestampRef.current) {
      streamingTimestampRef.current = new Date().toISOString();
    }
    setStreamingMessage({
      id: 'streaming',
      role: 'assistant',
      content,
      timestamp: streamingTimestampRef.current,
    });

    // Continue if more work
    rafRef.current = q.head < q.items.length ? requestAnimationFrame(tick) : null;
  };

  rafRef.current = requestAnimationFrame(tick);
}

function splitIntoWordChunks(text: string, maxSize = 50): string[] {
  if (text.length <= 100) return [text];
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > 0) {
    if (rest.length <= maxSize) { chunks.push(rest); break; }
    let at = rest.lastIndexOf(' ', maxSize);
    if (at <= 0) at = maxSize;
    chunks.push(rest.slice(0, at + 1));
    rest = rest.slice(at + 1);
  }
  return chunks;
}
```

**Performance**: `head++` instead of `items.shift()` turns dequeue from O(n) into O(1). For responses of 1000+ chunks, the difference is measurable.

## 6. Cleanup on Unmount

```typescript
useEffect(() => {
  return () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };
}, []);
```

**Important**: it does not abort the fetch on unmount — only cancels the RAF. If the component unmounts mid-stream, the fetch keeps consuming data (the Next.js route handler terminates naturally). Acceptable because the chat page is unmounted and there are no more UI updates.

## 7. Abort Flow

```typescript
function abort() {
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
    abortControllerRef.current = null;
  }
  resetTypewriter();
}
```

On abort:
- The fetch breaks with `AbortError`
- The reader's while loop exits
- The catch detects `AbortError` and returns `{aborted: true, ...}`
- The typewriter resets (loses partial content)

## 8. Source Files

| File | Lines | Role |
|---|---|---|
| `src/hooks/useSSEStream.ts` | ~300 | Complete hook |
| `src/lib/types.ts` | — | Types `StreamEvent`, `ChatMessage`, `ChartData`, `MapData`, `SourceAttribution`, `DocumentRecord` |

## 9. Deviations from Constitution

- **Principle III (hooks-only)**: complies.
- **Performance**: the pointer-based optimization is explicitly mentioned in commit `bc9eeeb`. Fully instrumented.
- **Accessibility**: no respect for `prefers-reduced-motion` → [DEBT-001] in the spec.

---

**End of plan.md**
