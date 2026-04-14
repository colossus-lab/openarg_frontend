import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (...args: unknown[]) => void;

class FakeWebSocket {
    static instances: FakeWebSocket[] = [];

    handlers = new Map<string, Handler[]>();
    sentPayloads: string[] = [];
    closed = false;

    constructor(public url: string) {
        FakeWebSocket.instances.push(this);
    }

    on(event: string, handler: Handler) {
        const current = this.handlers.get(event) || [];
        current.push(handler);
        this.handlers.set(event, current);
        return this;
    }

    send(payload: string) {
        this.sentPayloads.push(payload);
    }

    close() {
        this.closed = true;
    }

    emit(event: string, payload?: unknown) {
        for (const handler of this.handlers.get(event) || []) {
            handler(payload);
        }
    }
}

vi.mock('ws', () => ({
    default: FakeWebSocket,
}));

describe('streamViaWebSocket', () => {
    beforeEach(() => {
        FakeWebSocket.instances = [];
        vi.useFakeTimers();
        vi.resetModules();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllEnvs();
    });

    it('preserves partial content and marks it as degraded when the socket closes before complete', async () => {
        vi.stubEnv('OPENARG_BACKEND_URL', 'http://backend.test');
        const { streamViaWebSocket } = await import('@/lib/chat/wsBridge');
        const send = vi.fn();

        const pending = streamViaWebSocket('hola', 'conv-1', false, send);
        const ws = FakeWebSocket.instances[0];

        ws.emit('open');
        ws.emit('message', JSON.stringify({ type: 'chunk', content: 'Parcial' }));
        ws.emit('close');

        const result = await pending;

        expect(result).toMatchObject({
            answer: 'Parcial',
            _wsError: true,
        });
        expect(send).toHaveBeenCalledWith({ type: 'content', data: 'Parcial' });
    });

    it('keeps accumulated content when the backend emits an explicit error', async () => {
        vi.stubEnv('OPENARG_BACKEND_URL', 'http://backend.test');
        const { streamViaWebSocket } = await import('@/lib/chat/wsBridge');
        const send = vi.fn();

        const pending = streamViaWebSocket('hola', 'conv-1', false, send);
        const ws = FakeWebSocket.instances[0];

        ws.emit('open');
        ws.emit('message', JSON.stringify({ type: 'chunk', content: 'Mitad' }));
        ws.emit('message', JSON.stringify({ type: 'error', message: 'Backend roto' }));

        const result = await pending;

        expect(result).toMatchObject({
            answer: 'Mitad',
            _wsError: true,
        });
        expect(send).toHaveBeenCalledWith({ type: 'error', data: 'Backend roto' });
    });

    it('does not fall back on close after a complete event during the min display delay', async () => {
        vi.stubEnv('OPENARG_BACKEND_URL', 'http://backend.test');
        const { streamViaWebSocket } = await import('@/lib/chat/wsBridge');
        const send = vi.fn();

        const pending = streamViaWebSocket('hola', 'conv-1', false, send);
        const ws = FakeWebSocket.instances[0];

        ws.emit('open');
        ws.emit(
            'message',
            JSON.stringify({
                type: 'complete',
                answer: 'Respuesta final',
                sources: [],
            }),
        );
        ws.emit('close');

        await vi.runAllTimersAsync();
        const result = await pending;

        expect(result?.answer).toBe('Respuesta final');
        expect(result?._wsError).toBeUndefined();
        expect(send).toHaveBeenCalledWith({ type: 'content', data: 'Respuesta final' });
        expect(send).not.toHaveBeenCalledWith(
            expect.objectContaining({ type: 'error' }),
        );
    });

    it('resets the parse-error budget after a valid message', async () => {
        vi.stubEnv('OPENARG_BACKEND_URL', 'http://backend.test');
        const { streamViaWebSocket } = await import('@/lib/chat/wsBridge');
        const send = vi.fn();

        const pending = streamViaWebSocket('hola', 'conv-1', false, send);
        const ws = FakeWebSocket.instances[0];

        ws.emit('open');
        for (let i = 0; i < 5; i++) {
            ws.emit('message', 'not-json');
        }
        ws.emit('message', JSON.stringify({ type: 'chunk', content: 'ok' }));
        for (let i = 0; i < 5; i++) {
            ws.emit('message', 'still-not-json');
        }
        ws.emit('message', JSON.stringify({ type: 'complete', answer: 'final', sources: [] }));

        await vi.runAllTimersAsync();
        const result = await pending;

        expect(result?.answer).toBe('final');
        expect(send).not.toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'error',
                data: 'Demasiados errores de comunicación. La respuesta puede estar incompleta.',
            }),
        );
    });
});
