import { NextResponse } from 'next/server';
import { requireSession, backendHeaders } from '@/lib/auth';

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';

/**
 * GET /api/users/me/data — Export all user data (ARCO: Acceso).
 * Proxies to backend GET /api/v1/users/me/data.
 */
export async function GET() {
    const { session, error } = await requireSession();
    if (error) return error;

    const email = session!.user?.email || '';

    try {
        const backendResponse = await fetch(`${BACKEND_URL}/api/v1/users/me/data`, {
            method: 'GET',
            headers: backendHeaders(email),
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
