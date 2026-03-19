import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const allowedEmails = (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

const isOpenBeta = process.env.OPEN_BETA === 'true';

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
    callbacks: {
        async signIn({ user }) {
            const email = user.email?.toLowerCase() || '';
            const masked = email.replace(/(.{2}).*(@.*)/, '$1***$2');

            if (isOpenBeta) {
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
