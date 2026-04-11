import { NextRequest, NextResponse } from 'next/server';
import { requireSession, backendHeaders } from '@/lib/auth';

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';

/**
 * GET /api/developers/keys — List user's API keys.
 */
export async function GET() {
    const { session, error } = await requireSession();
    if (error) return error;

    const email = session!.user?.email || '';

    try {
        const res = await fetch(`${BACKEND_URL}/api/v1/developers/keys`, {
            headers: backendHeaders(email, session!.idToken),
        });
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json([], { status: 500 });
    }
}

/**
 * POST /api/developers/keys — Create a new API key.
 */
export async function POST(request: NextRequest) {
    const { session, error } = await requireSession();
    if (error) return error;

    const email = session!.user?.email || '';
    const body = await request.json();

    try {
        const res = await fetch(`${BACKEND_URL}/api/v1/developers/keys`, {
            method: 'POST',
            headers: {
                ...backendHeaders(email, session!.idToken),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json({ detail: 'Failed to create API key' }, { status: 500 });
    }
}
