import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const allowedEmails = (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

const isProduction = process.env.NEXTAUTH_URL?.startsWith('https://') ?? false;
const isOpenBeta = process.env.OPEN_BETA === 'true';
const betaDomains = (process.env.OPEN_BETA_DOMAINS || '')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

type GoogleRefreshResponse = {
    id_token?: string;
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    error?: string;
    error_description?: string;
};

async function refreshGoogleIdToken(refreshToken: string): Promise<GoogleRefreshResponse> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID || '',
            client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }),
    });
    const data = (await response.json()) as GoogleRefreshResponse;
    if (!response.ok) {
        throw Object.assign(new Error('google_refresh_failed'), { detail: data });
    }
    return data;
}

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            // offline access + consent prompt so Google issues a refresh_token
            // we can use from the NextAuth JWT callback to keep the id_token
            // fresh across the 24h NextAuth session (id_tokens expire in ~1h).
            authorization: {
                params: {
                    access_type: 'offline',
                    prompt: 'consent',
                    scope: 'openid email profile',
                },
            },
        }),
    ],
    pages: {
        signIn: '/login',
        error: '/login',
    },
    // SECURITY (C1): Force HttpOnly on session cookie — blocks XSS token theft
    // __Secure- prefix + secure:true only works over HTTPS (production)
    cookies: {
        sessionToken: {
            name: isProduction ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: isProduction,
            },
        },
    },
    // SECURITY (C3) bajó esto de los 30 días por defecto a 1, y 1 resultó
    // demasiado corto en uso: obligaba a re-loguearse casi todos los días, y
    // como el proveedor pide `prompt: 'consent'`, cada re-login vuelve a
    // mostrar la pantalla de permisos de Google. 7 días conserva la mayor
    // parte de la reducción (7 contra los 30 originales) sin ese costo.
    // La cookie sigue siendo HttpOnly + `__Secure-` en producción, que es lo
    // que protege el token; el TTL sólo acota la ventana si igual se filtra.
    session: {
        strategy: 'jwt',
        maxAge: 7 * 24 * 60 * 60, // 7 días
    },
    callbacks: {
        async signIn({ user }) {
            const email = user.email?.toLowerCase() || '';
            const masked = email.replace(/(.{2}).*(@.*)/, '$1***$2');

            if (isOpenBeta) {
                // If OPEN_BETA_DOMAINS is set, only allow emails from those domains
                if (betaDomains.length > 0) {
                    const domain = email.split('@')[1] || '';
                    if (!betaDomains.includes(domain)) {
                        console.warn(`[AUTH] Open beta — domain not allowed: ${masked}`);
                        return false;
                    }
                }
                return true;
            }

            if (allowedEmails.length === 0) {
                console.warn('[AUTH] No ALLOWED_EMAILS configured — blocking all logins');
                return false;
            }
            if (!allowedEmails.includes(email)) {
                console.warn(`[AUTH] Login blocked for unauthorized email: ${masked}`);
                return false;
            }
            return true;
        },
        // FIX-005: persist the Google ID token in the NextAuth JWT so the
        // backend can validate it (JWKS) on every request. Refresh via
        // refresh_token when it expires.
        async jwt({ token, account }) {
            if (account) {
                return {
                    ...token,
                    idToken: account.id_token,
                    accessToken: account.access_token,
                    refreshToken: account.refresh_token,
                    expiresAt: account.expires_at,
                };
            }

            const expiresAt = typeof token.expiresAt === 'number' ? token.expiresAt : 0;
            if (expiresAt && Date.now() < (expiresAt - 60) * 1000) {
                return token;
            }

            if (!token.refreshToken) {
                return { ...token, error: 'RefreshAccessTokenError' };
            }

            try {
                const refreshed = await refreshGoogleIdToken(token.refreshToken);
                return {
                    ...token,
                    idToken: refreshed.id_token ?? token.idToken,
                    accessToken: refreshed.access_token ?? token.accessToken,
                    expiresAt: refreshed.expires_in
                        ? Math.floor(Date.now() / 1000) + refreshed.expires_in
                        : expiresAt,
                    refreshToken: refreshed.refresh_token ?? token.refreshToken,
                    error: undefined,
                };
            } catch (err) {
                console.error('[AUTH] Google token refresh failed', err);
                return { ...token, error: 'RefreshAccessTokenError' };
            }
        },
        async session({ session, token }) {
            // C1 fix (round v46): the Google `idToken` is NO LONGER mirrored
            // onto the Session object. It used to be exposed via
            // `/api/auth/session` to any same-origin script, defeating the
            // httpOnly cookie that hides the underlying JWT. Server-side
            // BFF handlers now read the bearer via `getToken({ req })` in
            // `requireSession(req)`. Only the lightweight `error` flag
            // remains on the session — it's a string, not a credential.
            session.error = token.error;
            return session;
        },
    },
};
