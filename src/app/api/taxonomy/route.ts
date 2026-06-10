import { NextRequest } from 'next/server';
import { requireSession, backendHeaders } from '@/lib/auth';
import { checkRateLimit, getRetryAfterSeconds, rateLimitResponse } from '@/lib/rateLimit';

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';
const RATE_LIMIT_READ = parseInt(process.env.RATE_LIMIT_READ || '30', 10);

export async function GET(request: NextRequest) {
    const { session, idToken, error } = await requireSession(request);
    if (error) return error;

    // SECURITY (M3): Rate limit
    const userEmail = session!.user?.email || 'anonymous';
    if (checkRateLimit(userEmail, 'taxonomy', RATE_LIMIT_READ)) {
        return rateLimitResponse(getRetryAfterSeconds(userEmail, 'taxonomy'));
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    try {
        if (q) {
            const res = await fetch(
                `${BACKEND_URL}/api/v1/taxonomy/hints?q=${encodeURIComponent(q)}`,
                { headers: backendHeaders(idToken) }
            );
            if (!res.ok) throw new Error(`Backend error: ${res.status}`);
            return Response.json(await res.json());
        }

        const res = await fetch(`${BACKEND_URL}/api/v1/taxonomy`, {
            headers: backendHeaders(idToken),
            next: { revalidate: 300 },
        });
        if (!res.ok) throw new Error(`Backend error: ${res.status}`);
        return Response.json(await res.json());
    } catch (err) {
        return Response.json(
            { error: err instanceof Error ? err.message : 'Error conectando con el backend' },
            { status: 502 }
        );
    }
}
