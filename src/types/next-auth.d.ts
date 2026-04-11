import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
    interface Session {
        idToken?: string;
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
