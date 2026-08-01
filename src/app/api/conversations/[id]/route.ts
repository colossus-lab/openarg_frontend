// ============================================================
// OpenArg — Single Conversation API Route
// Proxies GET (detail) and DELETE requests to the Python backend
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireSession, backendHeaders } from '@/lib/auth';
import { checkRateLimit, getRetryAfterSeconds, rateLimitResponse } from '@/lib/rateLimit';

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';
const RATE_LIMIT_READ = parseInt(process.env.RATE_LIMIT_READ || '30', 10);
const RATE_LIMIT_WRITE = parseInt(process.env.RATE_LIMIT_WRITE || '10', 10);

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { session, idToken, error } = await requireSession(request);
    if (error) return error;

    const email = session!.user?.email || '';

    // SECURITY (M3): Rate limit
    if (checkRateLimit(email, 'conv-detail:get', RATE_LIMIT_READ)) {
        return rateLimitResponse(getRetryAfterSeconds(email, 'conv-detail:get'));
    }

    try {
        const { id } = await params;

        const backendResponse = await fetch(
            `${BACKEND_URL}/api/v1/conversations/${id}`,
            {
                method: 'GET',
                headers: backendHeaders(idToken),
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
    const { session, idToken, error } = await requireSession(request);
    if (error) return error;

    const email = session!.user?.email || '';

    // SECURITY (M3): Rate limit
    if (checkRateLimit(email, 'conv-detail:post', RATE_LIMIT_WRITE)) {
        return rateLimitResponse(getRetryAfterSeconds(email, 'conv-detail:post'));
    }

    try {
        const { id } = await params;
        const body = await request.json();

        const backendResponse = await fetch(
            `${BACKEND_URL}/api/v1/conversations/${id}/messages`,
            {
                method: 'POST',
                headers: backendHeaders(idToken),
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
    const { session, idToken, error } = await requireSession(request);
    if (error) return error;

    const email = session!.user?.email || '';

    // SECURITY (M3): Rate limit.
    // Borrar una conversación propia es una escritura, no una acción de
    // administración: el backend ya verifica la propiedad antes de tocar
    // nada. Estaba en el nivel ADMIN (5/min, el más estricto de los tres),
    // así que limpiar el historial se cortaba en la sexta — y la sidebar
    // ignoraba el 429 en silencio, con lo cual se leía como "dejó de andar".
    if (checkRateLimit(email, 'conv-detail:delete', RATE_LIMIT_WRITE)) {
        return rateLimitResponse(getRetryAfterSeconds(email, 'conv-detail:delete'));
    }

    try {
        const { id } = await params;

        const backendResponse = await fetch(
            `${BACKEND_URL}/api/v1/conversations/${id}`,
            {
                method: 'DELETE',
                headers: backendHeaders(idToken),
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
