import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

// Emails autorizados (comma-separated en variable de entorno)
const allowedEmails = (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

const handler = NextAuth({
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
            // Si no hay allowlist configurada, bloquear todo por seguridad
            if (allowedEmails.length === 0) {
                console.warn('[AUTH] No ALLOWED_EMAILS configured — blocking all logins');
                return false;
            }
            const email = user.email?.toLowerCase() || '';
            if (!allowedEmails.includes(email)) {
                console.warn(`[AUTH] Login blocked for unauthorized email: ${email}`);
                return false;
            }
            console.log(`[AUTH] Login allowed for: ${email}`);
            return true;
        },
        async session({ session }) {
            return session;
        },
    },
});

export { handler as GET, handler as POST };
