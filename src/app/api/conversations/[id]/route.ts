// ============================================================
// OpenArg — Single Conversation API Route
// Proxies GET (detail) and DELETE requests to the Python backend
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireSession, backendHeaders } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { session, error } = await requireSession();
    if (error) return error;

    const email = session!.user?.email || '';

    // SECURITY (M3): Rate limit
    if (checkRateLimit(email, 'conv-detail:get', 30)) return rateLimitResponse();

    try {
        const { id } = await params;

        const backendResponse = await fetch(
            `${BACKEND_URL}/api/v1/conversations/${id}`,
            {
                method: 'GET',
                headers: backendHeaders(email),
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

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { session, error } = await requireSession();
    if (error) return error;

    const email = session!.user?.email || '';

    // SECURITY (M3): Rate limit
    if (checkRateLimit(email, 'conv-detail:post', 10)) return rateLimitResponse();

    try {
        const { id } = await params;
        const body = await request.json();

        const backendResponse = await fetch(
            `${BACKEND_URL}/api/v1/conversations/${id}/messages`,
            {
                method: 'POST',
                headers: backendHeaders(email),
                body: JSON.stringify(body),
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

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { session, error } = await requireSession();
    if (error) return error;

    const email = session!.user?.email || '';

    // SECURITY (M3): Rate limit
    if (checkRateLimit(email, 'conv-detail:delete', 5)) return rateLimitResponse();

    try {
        const { id } = await params;

        const backendResponse = await fetch(
            `${BACKEND_URL}/api/v1/conversations/${id}`,
            {
                method: 'DELETE',
                headers: backendHeaders(email),
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
