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
                'data: {"type":"content","data":"Hola"}\n\n',
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
});
