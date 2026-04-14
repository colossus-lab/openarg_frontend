import { describe, expect, it, vi } from 'vitest';

import { fetchSynchronous } from '@/lib/chat/syncFallback';

vi.mock('@/lib/auth', () => ({
    backendHeaders: () => ({
        'Content-Type': 'application/json',
    }),
}));

describe('fetchSynchronous', () => {
    it('forwards the already-capped history without truncating it again', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ answer: 'ok', sources: [] }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }),
        );
        vi.stubGlobal('fetch', fetchMock);

        const history = Array.from({ length: 12 }, (_, i) => ({
            role: i % 2 === 0 ? 'user' : 'assistant',
            content: `msg-${i}`,
        }));

        await fetchSynchronous(
            'hola',
            'conv-1',
            'session-1',
            false,
            'user@example.com',
            history,
            vi.fn(),
            'id-token',
        );

        const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        const parsed = JSON.parse(init.body as string);
        expect(parsed.history).toEqual(history);
    });
});
