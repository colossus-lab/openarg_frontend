import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { adminBackendFetch, DATE_RE, EMAIL_RE } from '@/lib/adminBackend';
import { checkRateLimit, getRetryAfterSeconds, rateLimitResponse } from '@/lib/rateLimit';

/*
 * Fundadores de OpenArg (/admin/mcp): listar, marcar y quitar. Reemplaza el
 * script manual de Tomi; cada cambio queda con el mail de quien lo hizo.
 */

const WRITES_PER_MINUTE = 20;

export async function GET(request: NextRequest) {
    const { error } = await requireAdmin(request);
    if (error) return error;
    return adminBackendFetch('/supporters');
}

export async function POST(request: NextRequest) {
    const { session, error } = await requireAdmin(request);
    if (error) return error;
    const actor = session!.user?.email || '';
    if (checkRateLimit(actor, 'admin:supporters', WRITES_PER_MINUTE)) {
        return rateLimitResponse(getRetryAfterSeconds(actor, 'admin:supporters'));
    }
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const hasta = typeof body?.hasta === 'string' && body.hasta ? body.hasta : null;
    if (!EMAIL_RE.test(email)) return Response.json({ error: 'Mail inválido' }, { status: 400 });
    if (hasta !== null && !DATE_RE.test(hasta)) {
        return Response.json({ error: 'La fecha tiene que ser AAAA-MM-DD' }, { status: 400 });
    }
    return adminBackendFetch('/supporters', {
        method: 'POST',
        actor,
        body: {
            email,
            hasta,
            origen: String(body?.origen ?? '').slice(0, 200),
            nota: String(body?.nota ?? '').slice(0, 1000),
        },
    });
}

export async function DELETE(request: NextRequest) {
    const { session, error } = await requireAdmin(request);
    if (error) return error;
    const actor = session!.user?.email || '';
    if (checkRateLimit(actor, 'admin:supporters', WRITES_PER_MINUTE)) {
        return rateLimitResponse(getRetryAfterSeconds(actor, 'admin:supporters'));
    }
    const email = (request.nextUrl.searchParams.get('email') || '').trim();
    if (!EMAIL_RE.test(email)) return Response.json({ error: 'Mail inválido' }, { status: 400 });
    return adminBackendFetch(`/supporters/${encodeURIComponent(email)}`, { method: 'DELETE', actor });
}
