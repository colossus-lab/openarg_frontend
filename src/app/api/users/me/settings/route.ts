import { NextRequest, NextResponse } from 'next/server';
import { requireSession, backendHeaders } from '@/lib/auth';

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';

export async function PATCH(request: NextRequest) {
    const { session, error } = await requireSession();
    if (error) return error;

    const email = session!.user?.email || '';

    try {
        const body = await request.json();

        const backendResponse = await fetch(`${BACKEND_URL}/api/v1/users/me/settings`, {
            method: 'PATCH',
            headers: backendHeaders(email),
            body: JSON.stringify(body),
        });

        if (!backendResponse.ok) {
            const errorText = await backendResponse.text();
            return NextResponse.json(
                { error: `Backend error: ${backendResponse.status} - ${errorText}` },
                { status: backendResponse.status },
            );
        }

        const data = await backendResponse.json();
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Error updating settings' },
            { status: 500 },
        );
    }
}
