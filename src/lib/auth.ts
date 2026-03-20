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

export function backendHeaders(userEmail?: string): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (BACKEND_API_KEY) {
        headers['X-API-Key'] = BACKEND_API_KEY;
    }
    if (userEmail) {
        headers['X-User-Email'] = userEmail;
    }
    return headers;
}
