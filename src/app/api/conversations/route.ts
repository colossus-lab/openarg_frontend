import { NextRequest, NextResponse } from 'next/server';
import { requireSession, backendHeaders } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';
const RATE_LIMIT_READ = parseInt(process.env.RATE_LIMIT_READ || '30', 10);
const RATE_LIMIT_WRITE = parseInt(process.env.RATE_LIMIT_WRITE || '10', 10);

export async function GET(request: NextRequest) {
    const { session, error } = await requireSession();
    if (error) return error;

    const email = session!.user?.email || '';

    // SECURITY (M3): Rate limit
    if (checkRateLimit(email, 'conversations:get', RATE_LIMIT_READ)) return rateLimitResponse();

    try {
        const { searchParams } = new URL(request.url);
        const limit = searchParams.get('limit') || '20';
        const offset = searchParams.get('offset') || '0';

        const params = new URLSearchParams({ limit, offset });
        params.set('user_email', email);

        const backendResponse = await fetch(
            `${BACKEND_URL}/api/v1/conversations?${params.toString()}`,
            {
                method: 'GET',
                headers: backendHeaders(email, session!.idToken),
            }
        );

        if (!backendResponse.ok) {
            const errorText = await backendResponse.text();
            return NextResponse.json(
                { error: `Backend error: ${backendResponse.status} - ${errorText}` },
                { status: backendResponse.status }
            );
        }

        const data = await backendResponse.json();
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Error conectando con el backend' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const { session, error } = await requireSession();
    if (error) return error;

    const email = session!.user?.email || '';

    // SECURITY (M3): Rate limit
    if (checkRateLimit(email, 'conversations:post', RATE_LIMIT_WRITE)) return rateLimitResponse();

    try {
        const body = await request.json();

        const backendResponse = await fetch(
            `${BACKEND_URL}/api/v1/conversations/`,
            {
                method: 'POST',
                headers: backendHeaders(email, session!.idToken),
                body: JSON.stringify({
                    user_email: email,
                    title: body.title || '',
                }),
            }
        );

        if (!backendResponse.ok) {
            const errorText = await backendResponse.text();
            return NextResponse.json(
                { error: `Backend error: ${backendResponse.status} - ${errorText}` },
                { status: backendResponse.status }
            );
        }

        const data = await backendResponse.json();
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Error conectando con el backend' },
            { status: 500 }
        );
    }
}
