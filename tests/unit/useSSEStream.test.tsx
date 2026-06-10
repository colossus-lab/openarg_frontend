import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSSEStream } from '@/hooks/useSSEStream';

vi.mock('@/hooks/useReducedMotion', () => ({
    useReducedMotion: () => true,
}));

function makeStreamResponse(chunks: string[]) {
    const encoder = new TextEncoder();
    return new Response(
        new ReadableStream({
            start(controller) {
                for (const chunk of chunks) {
                    controller.enqueue(encoder.encode(chunk));
                }
                controller.close();
            },
        }),
        {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
        },
    );
}

describe('useSSEStream', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('resets isStreaming after a successful stream and parses a trailing buffered event', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            makeStreamResponse([
                'data: {"type":"phase_change","data":"planning"}\n\n',
                'data: {"type":"thinking","data":"Entendiendo tu pregunta..."}\n\n',
                'data: {"type":"content","data":"Hola"}\n\n',
                'data: {"type":"sources","data":[{"name":"Fuente A","url":"https://a.test","portal":"Portal A","accessedAt":"2026-04-12T00:00:00Z"}]}\n\n',
                'data: {"type":"result_meta","data":{"confidence":0.82}}\n\n',
                'data: {"type":"assistant_message_saved","data":{"assistantMessageId":"msg-1"}}',
            ]),
        );
        vi.stubGlobal('fetch', fetchMock);

        const setStreamingMessage = vi.fn();
        const onEvent = vi.fn();
        const { result } = renderHook(() => useSSEStream(setStreamingMessage));

        let output;
        await act(async () => {
            output = await result.current.sendMessage({ message: 'hola' }, onEvent);
        });

        expect(output).toMatchObject({
            assistantContent: 'Hola',
            confidence: 0.82,
            savedAssistantMsgId: 'msg-1',
            aborted: false,
            errored: false,
            uiTrace: {
                pipeline: {
                    phases: ['planning'],
                    thinking: [{ phase: 'planning', text: 'Entendiendo tu pregunta...' }],
                },
                quality: {
                    confidence: 0.82,
                    sourceCount: 1,
                    portalCount: 1,
                },
            },
        });
        expect(result.current.isStreaming).toBe(false);
    });

    it('marks the stream as errored and stops after repeated malformed events', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            makeStreamResponse([
                'data: nope\n\n',
                'data: nope\n\n',
                'data: nope\n\n',
                'data: nope\n\n',
            ]),
        );
        vi.stubGlobal('fetch', fetchMock);

        const setStreamingMessage = vi.fn();
        const onEvent = vi.fn();
        const { result } = renderHook(() => useSSEStream(setStreamingMessage));

        let output;
        await act(async () => {
            output = await result.current.sendMessage({ message: 'hola' }, onEvent);
        });

        expect(output).toMatchObject({
            errored: true,
            aborted: false,
        });
        expect(onEvent).toHaveBeenCalledWith({
            type: 'error',
            data: 'Se detectaron multiples errores de comunicacion. La respuesta puede estar incompleta.',
        });
        expect(result.current.isStreaming).toBe(false);
    });

    // CONTRACT-05 (round v46): the analyst can emit a clear_answer signal
    // mid-stream when it retries. The SSE consumer must reset its
    // accumulator so the retry's output replaces the failed attempt's
    // chunks instead of being concatenated to them.
    it('resets accumulator on clear_answer event', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            makeStreamResponse([
                // First attempt — these chunks are about to be discarded.
                'data: {"type":"content","data":"primera parte mal "}\n\n',
                'data: {"type":"content","data":"esto se va a borrar"}\n\n',
                // Analyst retries → emits clear_answer.
                'data: {"type":"clear_answer","data":null}\n\n',
                // Retry attempt — the only content that survives.
                'data: {"type":"content","data":"respuesta nueva limpia"}\n\n',
            ]),
        );
        vi.stubGlobal('fetch', fetchMock);

        const setStreamingMessage = vi.fn();
        const onEvent = vi.fn();
        const { result } = renderHook(() => useSSEStream(setStreamingMessage));

        let output;
        await act(async () => {
            output = await result.current.sendMessage({ message: 'q' }, onEvent);
        });

        expect(output!.assistantContent).toBe('respuesta nueva limpia');
        expect(output!.assistantContent).not.toContain('primera parte mal');
        expect(output!.assistantContent).not.toContain('esto se va a borrar');
    });

    // H11 (round v46): malformed event payload is dropped without
    // corrupting assistantContent, and after 4 such drops the consumer
    // emits the fatal-parse-error signal. Pre-H11 the bridge cast the
    // payload with `as` and let `assistantContent += event.data` coerce
    // an object to '[object Object]', persisting that as the answer.
    it('drops events whose payload shape does not match the type', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            makeStreamResponse([
                // Valid content chunk → must land in assistantContent.
                'data: {"type":"content","data":"Hola "}\n\n',
                // Invalid content: object instead of string → drop.
                'data: {"type":"content","data":{"unexpected":"shape"}}\n\n',
                'data: {"type":"content","data":{"unexpected":"shape2"}}\n\n',
                'data: {"type":"content","data":{"unexpected":"shape3"}}\n\n',
                // Fourth invalid event trips the fatal-parse budget.
                'data: {"type":"content","data":{"unexpected":"shape4"}}\n\n',
                // Valid sources still get through if the budget hasn't tripped.
                'data: {"type":"sources","data":[]}\n\n',
            ]),
        );
        vi.stubGlobal('fetch', fetchMock);

        const setStreamingMessage = vi.fn();
        const onEvent = vi.fn();
        const { result } = renderHook(() => useSSEStream(setStreamingMessage));

        let output;
        await act(async () => {
            output = await result.current.sendMessage({ message: 'hola' }, onEvent);
        });

        // The valid 'Hola ' chunk landed; the four malformed objects did NOT
        // get coerced into '[object Object]'.
        expect(output).toMatchObject({
            assistantContent: 'Hola ',
            errored: true,
        });
        expect(output!.assistantContent).not.toContain('[object Object]');

        // The fatal-parse error event was emitted to the caller.
        expect(onEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'error',
                data: expect.stringContaining('multiples errores de comunicacion'),
            }),
        );
    });

    // H10 fix: the aborted previous send's finally must NOT stamp
    // isStreaming=false on top of the new send's isStreaming=true.
    it('keeps isStreaming=true while a second send is in-flight after aborting the first', async () => {
        const encoder = new TextEncoder();
        const controllers: ReadableStreamDefaultController<Uint8Array>[] = [];

        // Each fetch call wires the AbortSignal to controller.error so the
        // stream actually rejects when sendMessage aborts the previous one
        // (otherwise reader.read() never resolves and the test deadlocks).
        const fetchMock = vi.fn().mockImplementation((_url, init: RequestInit) => {
            const signal = init.signal as AbortSignal;
            const stream = new ReadableStream<Uint8Array>({
                start(c) {
                    controllers.push(c);
                    signal.addEventListener('abort', () => {
                        try {
                            c.error(new DOMException('Aborted', 'AbortError'));
                        } catch {
                            // already closed/errored
                        }
                    });
                },
            });
            return Promise.resolve(
                new Response(stream, {
                    status: 200,
                    headers: { 'Content-Type': 'text/event-stream' },
                }),
            );
        });
        vi.stubGlobal('fetch', fetchMock);

        const setStreamingMessage = vi.fn();
        const onEvent = vi.fn();
        const { result } = renderHook(() => useSSEStream(setStreamingMessage));

        // First send — don't await; the reader.read() will pend.
        let firstPromise: Promise<unknown>;
        await act(async () => {
            firstPromise = result.current.sendMessage({ message: 'q1' }, onEvent);
            // Yield twice so fetch resolves and the reader loop starts.
            await Promise.resolve();
            await Promise.resolve();
        });
        expect(result.current.isStreaming).toBe(true);

        // Second send — aborts the first, re-arms isStreaming.
        let secondPromise: Promise<unknown>;
        await act(async () => {
            secondPromise = result.current.sendMessage({ message: 'q2' }, onEvent);
            await Promise.resolve();
            await Promise.resolve();
            // First's finally runs here; pre-fix it stamped false.
            await firstPromise;
        });

        // PRE-FIX BUG: this expectation flipped to `false` because the
        // aborted first's finally ran `setIsStreaming(false)` unguarded.
        expect(result.current.isStreaming).toBe(true);

        // Close the second stream cleanly.
        await act(async () => {
            controllers[1].enqueue(
                encoder.encode('data: {"type":"content","data":"ok"}\n\n'),
            );
            controllers[1].close();
            await secondPromise;
        });
        expect(result.current.isStreaming).toBe(false);
    });
});
