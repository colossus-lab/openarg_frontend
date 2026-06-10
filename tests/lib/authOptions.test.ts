import { describe, it, expect } from 'vitest';
import { authOptions } from '@/lib/authOptions';

describe('authOptions', () => {
    it('uses jwt strategy', () => {
        expect(authOptions.session?.strategy).toBe('jwt');
    });

    it('session maxAge is 24 hours', () => {
        expect(authOptions.session?.maxAge).toBe(86400);
    });

    it('cookie is httpOnly with correct secure setting', () => {
        const cookie = authOptions.cookies?.sessionToken;
        expect(cookie?.options?.httpOnly).toBe(true);
        expect(cookie?.options?.sameSite).toBe('lax');
        // secure is true only when NEXTAUTH_URL starts with https://
        const isProduction = process.env.NEXTAUTH_URL?.startsWith('https://') ?? false;
        expect(cookie?.options?.secure).toBe(isProduction);
    });

    it('has Google provider configured', () => {
        expect(authOptions.providers).toHaveLength(1);
    });

    it('login page is /login', () => {
        expect(authOptions.pages?.signIn).toBe('/login');
    });

    // C1 fix (round v46): the Google id_token must NOT be mirrored onto
    // the Session object. Any same-origin script can call
    // /api/auth/session and read a property that lives there, which
    // would defeat the httpOnly cookie protection on the JWT itself.
    it('session callback does NOT expose idToken on the Session', async () => {
        const cb = authOptions.callbacks?.session;
        expect(cb).toBeDefined();

        const fakeSession: Record<string, unknown> = {
            user: { email: 'test@example.com', name: 'Test', image: '' },
            expires: '2099-01-01T00:00:00Z',
        };
        const fakeToken = {
            idToken: 'super-secret-google-jwt',
            error: undefined,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const out = await (cb as any)({
            session: fakeSession,
            token: fakeToken,
            user: { id: 'u1' },
            newSession: {},
            trigger: 'update',
        });

        expect(out.idToken).toBeUndefined();
        // Sanity: the lightweight error flag is still forwarded —
        // it's a string, not a credential.
        expect('error' in out).toBe(true);
    });
});
