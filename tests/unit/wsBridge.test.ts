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

        const pending = streamViaWebSocket('hola', 'conv-1', send);
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

        const pending = streamViaWebSocket('hola', 'conv-1', send);
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

        const pending = streamViaWebSocket('hola', 'conv-1', send);
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

        const pending = streamViaWebSocket('hola', 'conv-1', send);
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
    const QUOTA = {
        usadas: 30,
        limite: 30,
        restantes: 0,
        creditos: 0,
        renueva: '2026-11-01T00:00:00+00:00',
        fundador: null,
    };

    it('shows a quota rejection as a notice, not as an error', async () => {
        vi.stubEnv('OPENARG_BACKEND_URL', 'http://backend.test');
        const { streamViaWebSocket } = await import('@/lib/chat/wsBridge');
        const send = vi.fn();

        const pending = streamViaWebSocket('hola', 'conv-1', send);
        const ws = FakeWebSocket.instances[0];
        const message = 'Usaste tus 30 preguntas de este mes. Se renuevan el 1 de noviembre.';

        ws.emit('open');
        ws.emit(
            'message',
            JSON.stringify({ type: 'error', code: 'QUOTA_EXHAUSTED', message, quota: QUOTA }),
        );
        ws.emit('close');

        const result = await pending;

        expect(result).toMatchObject({ answer: message, _notice: true });
        expect(result?._wsError).toBeUndefined();
        expect(send).toHaveBeenCalledWith({
            type: 'quota_exhausted',
            data: { code: 'QUOTA_EXHAUSTED', message, quota: QUOTA },
        });
        expect(send).toHaveBeenCalledWith({ type: 'content', data: message });
        expect(send).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });

    it('forwards the quota that comes with the complete event', async () => {
        vi.stubEnv('OPENARG_BACKEND_URL', 'http://backend.test');
        const { streamViaWebSocket } = await import('@/lib/chat/wsBridge');
        const send = vi.fn();

        const pending = streamViaWebSocket('hola', 'conv-1', send);
        const ws = FakeWebSocket.instances[0];
        const quota = { ...QUOTA, usadas: 3, restantes: 27 };

        ws.emit('open');
        ws.emit(
            'message',
            JSON.stringify({ type: 'complete', answer: 'Listo', sources: [], quota }),
        );
        await vi.runAllTimersAsync();
        await pending;

        expect(send).toHaveBeenCalledWith({ type: 'quota', data: quota });
    });

    it('keeps a clarification as an answer with its options, not as an error', async () => {
        vi.stubEnv('OPENARG_BACKEND_URL', 'http://backend.test');
        const { streamViaWebSocket } = await import('@/lib/chat/wsBridge');
        const send = vi.fn();

        const pending = streamViaWebSocket('hola', 'conv-1', send);
        const ws = FakeWebSocket.instances[0];

        ws.emit('open');
        ws.emit(
            'message',
            JSON.stringify({
                type: 'clarification',
                question: '¿De qué provincia?',
                options: ['Buenos Aires', 'Córdoba'],
            }),
        );

        const result = await pending;

        expect(result).toMatchObject({
            answer: '**¿De qué provincia?**\n\n- Buenos Aires\n- Córdoba',
            _notice: true,
        });
        expect(result?._wsError).toBeUndefined();
    });
});
