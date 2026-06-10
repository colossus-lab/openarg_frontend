import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
    interface Session {
        // C1 fix (round v46): `idToken` is intentionally NOT exposed on the
        // client-facing Session. BFF handlers read it server-side via
        // `getToken({ req })` (see `requireSession(req)`). If you find
        // yourself wanting to add it back here to "make a client component
        // call the backend directly" — don't. Route the call through a
        // BFF handler instead.
        error?: 'RefreshAccessTokenError' | undefined;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        idToken?: string;
        refreshToken?: string;
        accessToken?: string;
        expiresAt?: number;
        error?: 'RefreshAccessTokenError' | undefined;
    }
}
