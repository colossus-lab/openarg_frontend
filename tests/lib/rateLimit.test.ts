import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit } from '@/lib/rateLimit';

describe('checkRateLimit', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it('allows requests under the limit', () => {
        expect(checkRateLimit('user@test.com', 'chat', 10)).toBe(false);
        expect(checkRateLimit('user@test.com', 'chat', 10)).toBe(false);
    });

    it('blocks requests over the limit', () => {
        for (let i = 0; i < 10; i++) {
            checkRateLimit('user@test.com', 'over', 10);
        }
        expect(checkRateLimit('user@test.com', 'over', 10)).toBe(true);
    });

    it('tracks users independently', () => {
        for (let i = 0; i < 10; i++) {
            checkRateLimit('user-a@test.com', 'endpoint', 10);
        }
        expect(checkRateLimit('user-b@test.com', 'endpoint', 10)).toBe(false);
    });

    it('tracks endpoints independently', () => {
        for (let i = 0; i < 10; i++) {
            checkRateLimit('user@test.com', 'chat-ep', 10);
        }
        expect(checkRateLimit('user@test.com', 'datasets', 10)).toBe(false);
    });

    it('resets after window expires', () => {
        for (let i = 0; i < 10; i++) {
            checkRateLimit('user@test.com', 'reset', 10);
        }
        expect(checkRateLimit('user@test.com', 'reset', 10)).toBe(true);

        vi.advanceTimersByTime(61_000); // past 60s window
        expect(checkRateLimit('user@test.com', 'reset', 10)).toBe(false);
    });
});
