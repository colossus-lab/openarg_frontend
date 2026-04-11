import type { Session } from 'next-auth';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/authOptions';

const BACKEND_API_KEY = process.env.OPENARG_BACKEND_API_KEY || '';

const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export async function requireSession() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return { session: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }
    return { session, error: null };
}

export async function requireAdmin() {
    const { session, error } = await requireSession();
    if (error) return { session: null, error };

    const email = session!.user?.email?.toLowerCase() || '';
    if (adminEmails.length === 0 || !adminEmails.includes(email)) {
        return {
            session: null,
            error: NextResponse.json(
                { error: 'Forbidden: admin access required' },
                { status: 403 },
            ),
        };
    }
    return { session, error: null };
}

/**
 * Build the headers for calls to the Python backend.
 *
 * FIX-005: when the caller passes an ``idToken`` (the Google OAuth ID token
 * stored in the NextAuth session), we attach it as ``Authorization: Bearer``
 * so the backend can validate it via JWKS. The legacy ``X-User-Email`` header
 * is still emitted when ``userEmail`` is provided — the backend runs in
 * ``dual`` mode during rollout and accepts either path.
 */
export function backendHeaders(
    userEmail?: string,
    idToken?: string,
): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (BACKEND_API_KEY) {
        headers['X-API-Key'] = BACKEND_API_KEY;
    }
    if (userEmail) {
        headers['X-User-Email'] = userEmail;
    }
    if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
    }
    return headers;
}

/**
 * Extract ``{email, idToken}`` from a NextAuth session. Returns empty strings
 * when the session is missing or the fields were never populated (e.g. an
 * old session that predates the FIX-005 rollout). Call sites pass the
 * result straight into ``backendHeaders``.
 */
export function sessionAuth(session: Session | null): {
    email: string;
    idToken: string | undefined;
} {
    return {
        email: session?.user?.email || '',
        idToken: session?.idToken,
    };
}
