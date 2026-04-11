import { NextRequest, NextResponse } from 'next/server';
import { requireSession, backendHeaders } from '@/lib/auth';

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';

/**
 * DELETE /api/developers/keys/:keyId — Revoke an API key.
 */
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ keyId: string }> },
) {
    const { session, error } = await requireSession();
    if (error) return error;

    const { keyId } = await params;

    try {
        const res = await fetch(`${BACKEND_URL}/api/v1/developers/keys/${keyId}`, {
            method: 'DELETE',
            headers: backendHeaders(session!.idToken),
        });
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json({ detail: 'Failed to revoke API key' }, { status: 500 });
    }
}
