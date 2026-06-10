import { NextRequest, NextResponse } from 'next/server';
import { requireSession, backendHeaders } from '@/lib/auth';

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';

/**
 * GET /api/users/me/data — Export all user data (ARCO: Acceso).
 * Proxies to backend GET /api/v1/users/me/data.
 */
export async function GET(request: NextRequest) {
    const { idToken, error } = await requireSession(request);
    if (error) return error;

    try {
        const backendResponse = await fetch(`${BACKEND_URL}/api/v1/users/me/data`, {
            method: 'GET',
            headers: backendHeaders(idToken),
        });

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
            { error: err instanceof Error ? err.message : 'Error al exportar datos' },
            { status: 500 }
        );
    }
}
