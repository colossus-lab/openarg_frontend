import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('checkRateLimit', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('allows requests under the limit', async () => {
        const { checkRateLimit } = await import('@/lib/rateLimit');
        expect(checkRateLimit('user@test.com', 'chat', 10)).toBe(false);
        expect(checkRateLimit('user@test.com', 'chat', 10)).toBe(false);
    });

    it('blocks requests over the limit', async () => {
        const { checkRateLimit } = await import('@/lib/rateLimit');
        for (let i = 0; i < 10; i++) {
            checkRateLimit('user@test.com', 'chat', 10);
        }
        expect(checkRateLimit('user@test.com', 'chat', 10)).toBe(true);
    });

    it('resets after window expires', async () => {
        const { checkRateLimit } = await import('@/lib/rateLimit');
        for (let i = 0; i < 10; i++) {
            checkRateLimit('user@test.com', 'chat', 10);
        }
        expect(checkRateLimit('user@test.com', 'chat', 10)).toBe(true);

        // Advance past the window (60s)
        vi.advanceTimersByTime(61_000);
        expect(checkRateLimit('user@test.com', 'chat', 10)).toBe(false);
    });

    it('tracks different users independently', async () => {
        const { checkRateLimit } = await import('@/lib/rateLimit');
        for (let i = 0; i < 10; i++) {
            checkRateLimit('user1@test.com', 'chat', 10);
        }
        expect(checkRateLimit('user1@test.com', 'chat', 10)).toBe(true);
        expect(checkRateLimit('user2@test.com', 'chat', 10)).toBe(false);
    });

    it('tracks different endpoints independently', async () => {
        const { checkRateLimit } = await import('@/lib/rateLimit');
        for (let i = 0; i < 10; i++) {
            checkRateLimit('user@test.com', 'chat', 10);
        }
        expect(checkRateLimit('user@test.com', 'chat', 10)).toBe(true);
        expect(checkRateLimit('user@test.com', 'datasets', 30)).toBe(false);
    });
});
