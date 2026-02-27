// ============================================================
// OpenArg — Single Conversation API Route
// Proxies GET (detail) and DELETE requests to the Python backend
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const backendResponse = await fetch(
            `${BACKEND_URL}/api/v1/conversations/${id}`,
            {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
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
    try {
        const { id } = await params;

        const backendResponse = await fetch(
            `${BACKEND_URL}/api/v1/conversations/${id}`,
            {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
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
