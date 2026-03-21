import { NextResponse } from 'next/server';
import { requireSession, backendHeaders } from '@/lib/auth';

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';

/**
 * GET /api/users/me — Get current user profile (including privacy_accepted_at).
 */
export async function GET() {
    const { session, error } = await requireSession();
    if (error) return error;

    const email = session!.user?.email || '';

    try {
        const backendResponse = await fetch(
            `${BACKEND_URL}/api/v1/users/me`,
            { headers: backendHeaders(email) },
        );

        if (!backendResponse.ok) {
            return NextResponse.json({ privacy_accepted_at: null });
        }

        const data = await backendResponse.json();
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ privacy_accepted_at: null });
    }
}

/**
 * DELETE /api/users/me — Delete account and all associated data.
 * Proxies to backend DELETE /api/v1/users/me.
 */
export async function DELETE() {
    const { session, error } = await requireSession();
    if (error) return error;

    const email = session!.user?.email || '';

    try {
        const backendResponse = await fetch(`${BACKEND_URL}/api/v1/users/me`, {
            method: 'DELETE',
            headers: backendHeaders(email),
        });

        if (!backendResponse.ok) {
            const errorText = await backendResponse.text();
            return NextResponse.json(
                { error: `Backend error: ${backendResponse.status} - ${errorText}` },
                { status: backendResponse.status }
            );
        }

        return NextResponse.json({ deleted: true });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Error al borrar la cuenta' },
            { status: 500 }
        );
    }
}
