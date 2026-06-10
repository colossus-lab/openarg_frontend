// ============================================================
// OpenArg — Datasets API Route
// Proxies dataset listing and stats from the Python FastAPI backend
// ============================================================

import { NextRequest } from 'next/server';
import { requireSession, backendHeaders } from '@/lib/auth';
import { checkRateLimit, getRetryAfterSeconds, rateLimitResponse } from '@/lib/rateLimit';

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';
const RATE_LIMIT_READ = parseInt(process.env.RATE_LIMIT_READ || '30', 10);

/**
 * GET /api/datasets
 *
 * Query params:
 *   - action=stats  → proxies to GET /api/v1/datasets/stats
 *   - Otherwise     → proxies to GET /api/v1/datasets with portal, limit, offset
 */
export async function GET(request: NextRequest) {
    const { session, idToken, error } = await requireSession(request);
    if (error) return error;

    // SECURITY (M3): Rate limit
    const userEmail = session!.user?.email || 'anonymous';
    if (checkRateLimit(userEmail, 'datasets', RATE_LIMIT_READ)) {
        return rateLimitResponse(getRetryAfterSeconds(userEmail, 'datasets'));
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    try {
        if (action === 'stats') {
            const response = await fetch(`${BACKEND_URL}/api/v1/datasets/stats`, {
                headers: backendHeaders(idToken),
                next: { revalidate: 60 }, // Cache stats for 60s
            });

            if (!response.ok) {
                throw new Error(`Backend error: ${response.status}`);
            }

            const data = await response.json();
            return Response.json(data);
        }

        // Default: list datasets
        const portal = searchParams.get('portal') || '';
        const limit = searchParams.get('limit') || '50';
        const offset = searchParams.get('offset') || '0';

        const params = new URLSearchParams({ limit, offset });
        if (portal && portal !== 'all') {
            params.set('portal', portal);
        }

        const response = await fetch(
            `${BACKEND_URL}/api/v1/datasets?${params.toString()}`,
            {
                headers: backendHeaders(idToken),
            }
        );

        if (!response.ok) {
            throw new Error(`Backend error: ${response.status}`);
        }

        const data = await response.json();
        return Response.json(data);
    } catch (err) {
        return Response.json(
            {
                error: err instanceof Error ? err.message : 'Error conectando con el backend',
            },
            { status: 502 }
        );
    }
}
