// ============================================================
// OpenArg — Conversations API Route
// Proxies conversation history requests to the Python backend
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const user_id = searchParams.get('user_id');
        const limit = searchParams.get('limit') || '20';
        const offset = searchParams.get('offset') || '0';

        const params = new URLSearchParams({ limit, offset });
        if (user_id) {
            params.set('user_id', user_id);
        }

        const backendResponse = await fetch(
            `${BACKEND_URL}/api/v1/conversations?${params.toString()}`,
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
