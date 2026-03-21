import { NextRequest, NextResponse } from 'next/server';
import { requireSession, backendHeaders } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';
const RATE_LIMIT_ADMIN = parseInt(process.env.RATE_LIMIT_ADMIN || '5', 10);

export async function POST(request: NextRequest) {
    const { session, error } = await requireSession();
    if (error) return error;

    const sessionEmail = session!.user?.email || '';

    // SECURITY (M3): Rate limit
    if (checkRateLimit(sessionEmail, 'sync', RATE_LIMIT_ADMIN)) return rateLimitResponse();

    try {
        const body = await request.json();

        // SECURITY: Force session identity — ignore client-supplied email/name/image
        const syncPayload = {
            email: sessionEmail,
            name: session!.user?.name || body.name || '',
            image: session!.user?.image || body.image || '',
        };

        const backendResponse = await fetch(`${BACKEND_URL}/api/v1/users/sync`, {
            method: 'POST',
            headers: backendHeaders(sessionEmail),
            body: JSON.stringify(syncPayload),
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
            { error: err instanceof Error ? err.message : 'Error syncing user' },
            { status: 500 }
        );
    }
}
