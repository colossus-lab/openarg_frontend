// ============================================================
// OpenArg — Transparency API Route
// Proxies health scoring and transparency data from the backend
// ============================================================

import { NextRequest } from 'next/server';
import { requireSession, backendHeaders } from '@/lib/auth';

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';

/**
 * GET /api/transparency
 *
 * Query params:
 *   - action=health        → GET /api/v1/transparency/health (portal summaries)
 *   - action=ghost         → GET /api/v1/transparency/ghost-datasets
 *   - action=health-detail → GET /api/v1/transparency/health/{portal}
 *   - portal=...           → filter for health-detail and ghost
 */
export async function GET(request: NextRequest) {
    const { error } = await requireSession();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'health';

    try {
        let url: string;

        if (action === 'health') {
            url = `${BACKEND_URL}/api/v1/transparency/health`;
        } else if (action === 'ghost') {
            const portal = searchParams.get('portal');
            const params = new URLSearchParams();
            if (portal) params.set('portal', portal);
            params.set('limit', searchParams.get('limit') || '100');
            url = `${BACKEND_URL}/api/v1/transparency/ghost-datasets?${params.toString()}`;
        } else if (action === 'health-detail') {
            const portal = searchParams.get('portal') || 'datos_gob_ar';
            const params = new URLSearchParams();
            params.set('limit', searchParams.get('limit') || '50');
            params.set('offset', searchParams.get('offset') || '0');
            url = `${BACKEND_URL}/api/v1/transparency/health/${portal}?${params.toString()}`;
        } else if (action === 'sessions') {
            const params = new URLSearchParams();
            const periodo = searchParams.get('periodo');
            if (periodo) params.set('periodo', periodo);
            url = `${BACKEND_URL}/api/v1/transparency/sessions/topics?${params.toString()}`;
        } else {
            return Response.json({ error: 'Unknown action' }, { status: 400 });
        }

        const response = await fetch(url, {
            headers: backendHeaders(),
            next: { revalidate: 300 }, // Cache for 5 min
        });

        if (!response.ok) {
            throw new Error(`Backend error: ${response.status}`);
        }

        const data = await response.json();
        return Response.json(data);
    } catch (err) {
        return Response.json(
            { error: err instanceof Error ? err.message : 'Error conectando con el backend' },
            { status: 502 }
        );
    }
}

/**
 * POST /api/transparency
 *
 * Body (JSON):
 *   - action=detect-anomalies → POST /api/v1/transparency/detect-anomalies
 *   - action=rescore          → POST /api/v1/transparency/rescore
 *   - action=rescrape         → POST /api/v1/transparency/rescrape
 *   - action=snapshot-staff   → POST /api/v1/transparency/snapshot-staff
 *   - action=flush-cache      → POST /api/v1/transparency/flush-cache
 */
export async function POST(request: NextRequest) {
    const { error } = await requireSession();
    if (error) return error;

    try {
        const body = await request.json();
        const action = body?.action;

        const actionMap: Record<string, string> = {
            'detect-anomalies': '/api/v1/transparency/detect-anomalies',
            'rescore': '/api/v1/transparency/rescore',
            'rescrape': '/api/v1/transparency/rescrape',
            'snapshot-staff': '/api/v1/transparency/snapshot-staff',
            'flush-cache': '/api/v1/transparency/flush-cache',
        };

        const path = actionMap[action];
        if (!path) {
            return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }

        const url = `${BACKEND_URL}${path}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                ...backendHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body.params || {}),
        });

        if (!response.ok) {
            throw new Error(`Backend error: ${response.status}`);
        }

        const data = await response.json();
        return Response.json(data);
    } catch (err) {
        return Response.json(
            { error: err instanceof Error ? err.message : 'Error conectando con el backend' },
            { status: 502 }
        );
    }
}
