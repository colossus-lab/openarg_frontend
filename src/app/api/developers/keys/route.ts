import { NextRequest, NextResponse } from 'next/server';
import { requireSession, backendHeaders } from '@/lib/auth';

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';

/**
 * GET /api/developers/keys — List user's API keys.
 */
export async function GET(request: NextRequest) {
    const { idToken, error } = await requireSession(request);
    if (error) return error;

    try {
        const res = await fetch(`${BACKEND_URL}/api/v1/developers/keys`, {
            headers: backendHeaders(idToken),
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
    const { idToken, error } = await requireSession(request);
    if (error) return error;

    const body = await request.json();

    try {
        const res = await fetch(`${BACKEND_URL}/api/v1/developers/keys`, {
            method: 'POST',
            headers: {
                ...backendHeaders(idToken),
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
