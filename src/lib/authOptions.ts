import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const allowedEmails = (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
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
    callbacks: {
        async signIn({ user }) {
            if (allowedEmails.length === 0) {
                console.warn('[AUTH] No ALLOWED_EMAILS configured — blocking all logins');
                return false;
            }
            const email = user.email?.toLowerCase() || '';
            if (!allowedEmails.includes(email)) {
                console.warn(`[AUTH] Login blocked for unauthorized email: ${email}`);
                return false;
            }
            const masked = email.replace(/(.{2}).*(@.*)/, '$1***$2');
            console.log(`[AUTH] Login allowed for: ${masked}`);
            return true;
        },
        async session({ session }) {
            return session;
        },
    },
};
