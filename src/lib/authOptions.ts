import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const allowedEmails = (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

const isOpenBeta = process.env.OPEN_BETA === 'true';
const betaDomains = (process.env.OPEN_BETA_DOMAINS || '')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    pages: {
        signIn: '/login',
        error: '/login',
    },
    // SECURITY (C1): Force HttpOnly on session cookie — blocks XSS token theft
    cookies: {
        sessionToken: {
            name: '__Secure-next-auth.session-token',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: true,
            },
        },
    },
    // SECURITY (C3): Reduce session TTL from 30 days to 1 day
    session: {
        strategy: 'jwt',
        maxAge: 24 * 60 * 60, // 1 day
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
                console.log(`[AUTH] Open beta — login allowed for: ${masked}`);
                return true;
            }

            if (allowedEmails.length === 0) {
                console.warn('[AUTH] No ALLOWED_EMAILS configured — blocking all logins');
                return false;
            }
            if (!allowedEmails.includes(email)) {
                console.warn(`[AUTH] Login blocked for unauthorized email: ${email}`);
                return false;
            }
            console.log(`[AUTH] Login allowed for: ${masked}`);
            return true;
        },
        async session({ session }) {
            return session;
        },
    },
};
