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
});
