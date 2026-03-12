'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { StreamEvent, ChatMessage as ChatMessageType, ChartData, SourceAttribution, DocumentRecord } from '@/lib/types';

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
    sources: SourceAttribution[];
    documents: DocumentRecord[];
    savedConvId: string | null;
    savedAssistantMsgId: string | null;
    aborted: boolean;
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
    setMessages: React.Dispatch<React.SetStateAction<ChatMessageType[]>>,
): UseSSEStreamReturn {
    const [isStreaming, setIsStreaming] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Typewriter state
    const chunkQueueRef = useRef<string[]>([]);
    const revealedRef = useRef('');
    const rafRef = useRef<number | null>(null);

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
            if (q.length === 0) { rafRef.current = null; return; }
            let out = '';
            let budget = CHARS_PER_FRAME;
            while (budget > 0 && q.length > 0) {
                if (q[0].length <= budget) {
                    budget -= q[0].length;
                    const chunk = q.shift();
                    if (chunk !== undefined) out += chunk;
                } else {
                    out += q[0].slice(0, budget);
                    q[0] = q[0].slice(budget);
                    budget = 0;
                }
            }
            revealedRef.current += out;
            const content = revealedRef.current;
            setMessages(prev => {
                const has = prev.find(m => m.id === 'streaming');
                if (has) return prev.map(m => m.id === 'streaming' ? { ...m, content } : m);
                return [...prev, { id: 'streaming', role: 'assistant' as const, content, timestamp: new Date().toISOString() }];
            });
            rafRef.current = q.length > 0 ? requestAnimationFrame(tick) : null;
        };
        rafRef.current = requestAnimationFrame(tick);
    }, [setMessages]);

    const resetTypewriter = useCallback(() => {
        chunkQueueRef.current = [];
        revealedRef.current = '';
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    }, []);

    const waitForReveal = useCallback((): Promise<void> => {
        return new Promise<void>(resolve => {
            const check = () => {
                if (chunkQueueRef.current.length === 0) {
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
        chunkQueueRef.current = [];
        revealedRef.current = '';
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
        let sources: SourceAttribution[] = [];
        let documents: DocumentRecord[] = [];
        let savedConvId: string | null = null;
        let savedAssistantMsgId: string | null = null;
        let aborted = false;
        let parseErrorCount = 0;

        try {
            let response: Response;
            try {
                response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                    signal: abortController.signal,
                });
            } catch (fetchErr) {
                if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') throw fetchErr;
                assistantContent = '**No se pudo conectar con el servidor.** El sistema puede estar temporalmente fuera de servicio. Intenta de nuevo en unos minutos.';
                onEvent({ type: 'error', data: assistantContent } as StreamEvent);
                return { assistantContent, charts, sources, documents, savedConvId, savedAssistantMsgId, aborted };
            }

            if (!response.ok) {
                assistantContent = '**Error en la respuesta del servidor.** Intenta de nuevo en unos minutos.';
                onEvent({ type: 'error', data: assistantContent } as StreamEvent);
                return { assistantContent, charts, sources, documents, savedConvId, savedAssistantMsgId, aborted };
            }
            if (!response.body) {
                assistantContent = '**Sin stream de respuesta.** Intenta de nuevo.';
                onEvent({ type: 'error', data: assistantContent } as StreamEvent);
                return { assistantContent, charts, sources, documents, savedConvId, savedAssistantMsgId, aborted };
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
                                const pieces = splitIntoWordChunks(chunk);
                                chunkQueueRef.current.push(...pieces);
                                startReveal();
                                break;
                            }
                            case 'chart':
                                charts.push(event.data as ChartData);
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
                return { assistantContent, charts, sources, documents, savedConvId, savedAssistantMsgId, aborted };
            }
            assistantContent = '**No se pudo conectar con el servidor.** El sistema puede estar temporalmente fuera de servicio. Intenta de nuevo en unos minutos.';
        } finally {
            if (abortControllerRef.current === abortController) {
                abortControllerRef.current = null;
            }
        }

        // Wait for typewriter to finish
        await waitForReveal();

        return { assistantContent, charts, sources, documents, savedConvId, savedAssistantMsgId, aborted };
    }, [resetTypewriter, startReveal, waitForReveal]);

    return { sendMessage, abort, resetTypewriter, isStreaming, setIsStreaming };
}
