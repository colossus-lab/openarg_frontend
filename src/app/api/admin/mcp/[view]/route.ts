import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';

/*
 * Proxy del tablero de uso del MCP (/admin/mcp) hacia
 * /api/v1/admin/analytics/mcp/* del backend.
 *
 * Esos endpoints piden `X-Admin-Key` y Caddy los bloquea desde internet: se
 * alcanzan sólo por la red interna (OPENARG_BACKEND_URL). La clave de admin
 * vive únicamente en el servidor (OPENARG_ADMIN_API_KEY) y nunca llega al
 * navegador. Sólo pasan los mails de ADMIN_EMAILS.
 */

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';
const VIEWS = new Set(['overview', 'timeline', 'breakdown', 'keys', 'questions', 'users']);
const ALLOWED_DAYS = new Set([7, 30, 90]);

export async function GET(request: NextRequest, { params }: { params: Promise<{ view: string }> }) {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { view } = await params;
    if (!VIEWS.has(view)) {
        return Response.json({ error: 'Vista desconocida' }, { status: 404 });
    }
    const days = Number(request.nextUrl.searchParams.get('days') || '30');
    if (!ALLOWED_DAYS.has(days)) {
        return Response.json({ error: 'Período inválido' }, { status: 400 });
    }

    const adminKey = process.env.OPENARG_ADMIN_API_KEY || '';
    if (!adminKey) {
        return Response.json({ error: 'Falta configurar OPENARG_ADMIN_API_KEY en el servidor' }, { status: 503 });
    }

    try {
        const response = await fetch(`${BACKEND_URL}/api/v1/admin/analytics/mcp/${view}?days=${days}`, {
            headers: { 'X-Admin-Key': adminKey },
            cache: 'no-store',
        });
        if (!response.ok) {
            return Response.json({ error: `El backend respondió ${response.status}` }, { status: 502 });
        }
        return Response.json(await response.json(), { headers: { 'Cache-Control': 'no-store' } });
    } catch {
        return Response.json({ error: 'No se pudo conectar con el backend' }, { status: 502 });
    }
}
