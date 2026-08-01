import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/authOptions';

const BACKEND_API_KEY = process.env.OPENARG_BACKEND_API_KEY || '';

const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

/**
 * Resolve the caller's session and Google OAuth `idToken` server-side.
 *
 * C1 fix (round v46): the `idToken` is now read from the encrypted
 * NextAuth JWT cookie via `getToken({ req })` instead of being mirrored
 * onto the `Session` object returned by `/api/auth/session`. Without
 * this change any client-side script (or a future XSS) could
 * `fetch('/api/auth/session')` and read the bearer that the backend
 * accepts for impersonation — defeating the `httpOnly` cookie.
 *
 * Callers that need to forward the bearer to the backend MUST pass the
 * `req` (NextRequest) to this helper. Handlers that don't need the
 * bearer can call `requireSession()` with no argument; `idToken` will
 * be empty and `backendHeaders` will skip the `Authorization` header
 * (the backend will reject the request — by design, to surface a
 * forgotten `req` instead of letting it silently 401).
 */
export async function requireSession(req?: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return {
            session: null,
            idToken: '',
            error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        };
    }
    let idToken = '';
    if (req) {
        const token = (await getToken({
            req,
            secret: process.env.NEXTAUTH_SECRET,
        })) as { idToken?: string } | null;
        idToken = token?.idToken || '';
    }
    return { session, idToken, error: null };
}

export async function requireAdmin(req?: NextRequest) {
    const { session, idToken, error } = await requireSession(req);
    if (error) return { session: null, idToken: '', error };

    const email = session!.user?.email?.toLowerCase() || '';
    if (adminEmails.length === 0 || !adminEmails.includes(email)) {
        return {
            session: null,
            idToken: '',
            error: NextResponse.json(
                { error: 'Forbidden: admin access required' },
                { status: 403 },
            ),
        };
    }
    return { session, idToken, error: null };
}

/**
 * Build the headers for calls to the Python backend.
 *
 * FIX-005: the caller's identity is always carried in ``Authorization: Bearer``
 * (the Google OAuth ID token from the NextAuth session). The backend
 * validates this JWT via Google's JWKS on every request; callers that do
 * not pass an ``idToken`` get 401 at the backend.
 */
export function backendHeaders(idToken?: string): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (BACKEND_API_KEY) {
        headers['X-API-Key'] = BACKEND_API_KEY;
    }
    if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
    }
    return headers;
}
