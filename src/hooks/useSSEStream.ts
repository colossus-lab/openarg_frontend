'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { StreamEvent, ChatMessage as ChatMessageType, ChartData, MapData, SourceAttribution, DocumentRecord } from '@/lib/types';
import { useReducedMotion } from './useReducedMotion';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SSEStreamOutput {
    assistantContent: string;
    charts: ChartData[];
    mapData: MapData | null;
    sources: SourceAttribution[];
    documents: DocumentRecord[];
    savedConvId: string | null;
    savedAssistantMsgId: string | null;
    aborted: boolean;
    /** True when the stream emitted an `error` event OR threw a fetch
     *  error, regardless of whether some content was accumulated.
     *  The chat page maps this onto ChatMessage.errored so the UI
     *  renders a "Regenerar" affordance on the resulting bubble.
     *  Matches backend messages.errored persistence (Alembic 0029,
     *  2026-04-11) and FR-012a/b of 002-chat-ui. */
    errored: boolean;
}

export interface UseSSEStreamReturn {
    /**
     * Send a message to /api/chat and consume the SSE stream.
     * `onEvent` is called for every parsed event so the caller can handle
     * phase_change, thinking, conversation_saved, done, etc.
     * Returns accumulated output when the stream ends.
     */
    sendMessage: (body: object, onEvent: (event: StreamEvent) => void) => Promise<SSEStreamOutput>;
    /** Abort the current in-flight request and reset typewriter */
    abort: () => void;
    /** Reset typewriter state without aborting (e.g. when loading a conversation) */
    resetTypewriter: () => void;
    /** Whether a request is currently in progress */
    isStreaming: boolean;
    setIsStreaming: React.Dispatch<React.SetStateAction<boolean>>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const CHARS_PER_FRAME = 28;

/**
 * Encapsulates SSE fetch, stream reading, event parsing, chunk-queue
 * typewriter reveal, and abort/cancel functionality.
 */
export function useSSEStream(
    setStreamingMessage: React.Dispatch<React.SetStateAction<ChatMessageType | null>>,
    endpoint: string = '/api/chat',
): UseSSEStreamReturn {
    const [isStreaming, setIsStreaming] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const prefersReducedMotion = useReducedMotion();

    // Typewriter state — uses pointer-based dequeue to avoid O(n) shift()
    const chunkQueueRef = useRef<{ items: string[]; head: number }>({ items: [], head: 0 });
    const revealedRef = useRef('');
    const rafRef = useRef<number | null>(null);
    const streamingTimestampRef = useRef<string>('');

    // Clean up animation frame on unmount
    useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    const startReveal = useCallback(() => {
        if (rafRef.current !== null) return;
        const tick = () => {
            const q = chunkQueueRef.current;
            if (q.head >= q.items.length) {
                // Queue exhausted — reset for next batch
                q.items = [];
                q.head = 0;
                rafRef.current = null;
                return;
            }
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
            revealedRef.current += outParts.join('');
            const content = revealedRef.current;
            if (!streamingTimestampRef.current) {
                streamingTimestampRef.current = new Date().toISOString();
            }
            setStreamingMessage({
                id: 'streaming',
                role: 'assistant',
                content,
                timestamp: streamingTimestampRef.current,
            });
            rafRef.current = q.head < q.items.length ? requestAnimationFrame(tick) : null;
        };
        rafRef.current = requestAnimationFrame(tick);
    }, [setStreamingMessage]);

    const resetTypewriter = useCallback(() => {
        chunkQueueRef.current = { items: [], head: 0 };
        revealedRef.current = '';
        streamingTimestampRef.current = '';
        setStreamingMessage(null);
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    }, [setStreamingMessage]);

    const waitForReveal = useCallback((): Promise<void> => {
        return new Promise<void>(resolve => {
            const check = () => {
                const q = chunkQueueRef.current;
                if (q.head >= q.items.length) {
                    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
                    resolve();
                } else {
                    requestAnimationFrame(check);
                }
            };
            check();
        });
    }, []);

    const abort = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        resetTypewriter();
    }, [resetTypewriter]);

    const sendMessage = useCallback(async (
        body: object,
        onEvent: (event: StreamEvent) => void,
    ): Promise<SSEStreamOutput> => {
        // Reset typewriter for new message
        resetTypewriter();

        // Abort any previous in-flight request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        setIsStreaming(true);

        let assistantContent = '';
        const charts: ChartData[] = [];
        let mapData: MapData | null = null;
        let sources: SourceAttribution[] = [];
        let documents: DocumentRecord[] = [];
        let savedConvId: string | null = null;
        let savedAssistantMsgId: string | null = null;
        let aborted = false;
        let errored = false;
        let parseErrorCount = 0;

        try {
            let response: Response;
            try {
                response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                    signal: abortController.signal,
                });
            } catch (fetchErr) {
                if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') throw fetchErr;
                assistantContent = '**No se pudo conectar con el servidor.** El sistema puede estar temporalmente fuera de servicio. Intenta de nuevo en unos minutos.';
                errored = true;
                onEvent({ type: 'error', data: assistantContent } as StreamEvent);
                return { assistantContent, charts, mapData, sources, documents, savedConvId, savedAssistantMsgId, aborted, errored };
            }

            if (!response.ok) {
                assistantContent = '**Error en la respuesta del servidor.** Intenta de nuevo en unos minutos.';
                errored = true;
                onEvent({ type: 'error', data: assistantContent } as StreamEvent);
                return { assistantContent, charts, mapData, sources, documents, savedConvId, savedAssistantMsgId, aborted, errored };
            }
            if (!response.body) {
                assistantContent = '**Sin stream de respuesta.** Intenta de nuevo.';
                errored = true;
                onEvent({ type: 'error', data: assistantContent } as StreamEvent);
                return { assistantContent, charts, mapData, sources, documents, savedConvId, savedAssistantMsgId, aborted, errored };
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const event: StreamEvent = JSON.parse(line.slice(6));

                        // Accumulate stream data internally
                        switch (event.type) {
                            case 'content': {
                                const chunk = event.data as string;
                                assistantContent += chunk;
                                if (prefersReducedMotion) {
                                    // Reduced motion: update content immediately without typewriter
                                    revealedRef.current += chunk;
                                    if (!streamingTimestampRef.current) {
                                        streamingTimestampRef.current = new Date().toISOString();
                                    }
                                    setStreamingMessage({
                                        id: 'streaming',
                                        role: 'assistant',
                                        content: revealedRef.current,
                                        timestamp: streamingTimestampRef.current,
                                    });
                                } else {
                                    const pieces = splitIntoWordChunks(chunk);
                                    chunkQueueRef.current.items.push(...pieces);
                                    startReveal();
                                }
                                break;
                            }
                            case 'chart':
                                charts.push(event.data as ChartData);
                                break;
                            case 'map':
                                mapData = event.data as MapData;
                                break;
                            case 'sources':
                                sources = event.data as SourceAttribution[];
                                break;
                            case 'documents':
                                documents = event.data as DocumentRecord[];
                                break;
                            case 'clarification':
                                // Handled by page-level onEvent callback
                                break;
                            case 'error':
                                assistantContent += `\n\n**${event.data}**`;
                                errored = true;
                                break;
                            case 'conversation_saved': {
                                const saved = event.data as { id: string; title: string };
                                savedConvId = saved.id;
                                break;
                            }
                            case 'assistant_message_saved': {
                                const msgData = event.data as { assistantMessageId: string };
                                if (msgData.assistantMessageId) {
                                    savedAssistantMsgId = msgData.assistantMessageId;
                                }
                                break;
                            }
                        }

                        // Forward every event to the caller for page-level handling
                        onEvent(event);
                    } catch (parseErr) {
                        console.warn('[SSE] Malformed event skipped:', line, parseErr);
                        parseErrorCount++;
                        if (parseErrorCount > 3) {
                            onEvent({ type: 'error', data: 'Se detectaron multiples errores de comunicacion. La respuesta puede estar incompleta.' } as StreamEvent);
                        }
                    }
                }
            }
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                aborted = true;
                return { assistantContent, charts, mapData, sources, documents, savedConvId, savedAssistantMsgId, aborted, errored };
            }
            assistantContent = '**No se pudo conectar con el servidor.** El sistema puede estar temporalmente fuera de servicio. Intenta de nuevo en unos minutos.';
            errored = true;
        } finally {
            if (abortControllerRef.current === abortController) {
                abortControllerRef.current = null;
            }
        }

        // Wait for typewriter to finish
        await waitForReveal();

        return { assistantContent, charts, mapData, sources, documents, savedConvId, savedAssistantMsgId, aborted, errored };
    }, [endpoint, resetTypewriter, startReveal, waitForReveal, prefersReducedMotion, setStreamingMessage]);

    return { sendMessage, abort, resetTypewriter, isStreaming, setIsStreaming };
}
