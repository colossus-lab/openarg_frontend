import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('authOptions', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.unstubAllEnvs();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('blocks login when ALLOWED_EMAILS is empty and OPEN_BETA is off', async () => {
        vi.stubEnv('ALLOWED_EMAILS', '');
        vi.stubEnv('OPEN_BETA', '');
        vi.stubEnv('GOOGLE_CLIENT_ID', 'test-id');
        vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-secret');

        const { authOptions } = await import('@/lib/authOptions');
        const signIn = authOptions.callbacks!.signIn!;
        const result = await (signIn as (...args: unknown[]) => unknown)({
            user: { email: 'anyone@test.com' },
            account: null,
        });
        expect(result).toBe(false);
    });

    it('allows whitelisted email', async () => {
        vi.stubEnv('ALLOWED_EMAILS', 'allowed@test.com,other@test.com');
        vi.stubEnv('OPEN_BETA', '');
        vi.stubEnv('GOOGLE_CLIENT_ID', 'test-id');
        vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-secret');

        const { authOptions } = await import('@/lib/authOptions');
        const signIn = authOptions.callbacks!.signIn!;
        const result = await (signIn as (...args: unknown[]) => unknown)({
            user: { email: 'allowed@test.com' },
            account: null,
        });
        expect(result).toBe(true);
    });

    it('blocks non-whitelisted email', async () => {
        vi.stubEnv('ALLOWED_EMAILS', 'allowed@test.com');
        vi.stubEnv('OPEN_BETA', '');
        vi.stubEnv('GOOGLE_CLIENT_ID', 'test-id');
        vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-secret');

        const { authOptions } = await import('@/lib/authOptions');
        const signIn = authOptions.callbacks!.signIn!;
        const result = await (signIn as (...args: unknown[]) => unknown)({
            user: { email: 'hacker@evil.com' },
            account: null,
        });
        expect(result).toBe(false);
    });

    it('allows any email when OPEN_BETA is true', async () => {
        vi.stubEnv('ALLOWED_EMAILS', '');
        vi.stubEnv('OPEN_BETA', 'true');
        vi.stubEnv('OPEN_BETA_DOMAINS', '');
        vi.stubEnv('GOOGLE_CLIENT_ID', 'test-id');
        vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-secret');

        const { authOptions } = await import('@/lib/authOptions');
        const signIn = authOptions.callbacks!.signIn!;
        const result = await (signIn as (...args: unknown[]) => unknown)({
            user: { email: 'anyone@random.com' },
            account: null,
        });
        expect(result).toBe(true);
    });

    it('restricts OPEN_BETA to specific domains', async () => {
        vi.stubEnv('ALLOWED_EMAILS', '');
        vi.stubEnv('OPEN_BETA', 'true');
        vi.stubEnv('OPEN_BETA_DOMAINS', 'colossuslab.org,gmail.com');
        vi.stubEnv('GOOGLE_CLIENT_ID', 'test-id');
        vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-secret');

        const { authOptions } = await import('@/lib/authOptions');
        const signIn = authOptions.callbacks!.signIn!;

        const allowed = await (signIn as (...args: unknown[]) => unknown)({
            user: { email: 'user@gmail.com' },
            account: null,
        });
        expect(allowed).toBe(true);

        // Need fresh import for different domain check
        vi.resetModules();
        vi.stubEnv('ALLOWED_EMAILS', '');
        vi.stubEnv('OPEN_BETA', 'true');
        vi.stubEnv('OPEN_BETA_DOMAINS', 'colossuslab.org,gmail.com');
        vi.stubEnv('GOOGLE_CLIENT_ID', 'test-id');
        vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-secret');

        const { authOptions: opts2 } = await import('@/lib/authOptions');
        const signIn2 = opts2.callbacks!.signIn!;
        const blocked = await (signIn2 as (...args: unknown[]) => unknown)({
            user: { email: 'user@evil.com' },
            account: null,
        });
        expect(blocked).toBe(false);
    });

    it('sets session maxAge to 24 hours', async () => {
        vi.stubEnv('GOOGLE_CLIENT_ID', 'test-id');
        vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-secret');

        const { authOptions } = await import('@/lib/authOptions');
        expect(authOptions.session?.maxAge).toBe(86400);
    });
});
