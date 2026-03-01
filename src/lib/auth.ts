import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/authOptions';

const BACKEND_API_KEY = process.env.OPENARG_BACKEND_API_KEY || '';

export async function requireSession() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return { session: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
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
