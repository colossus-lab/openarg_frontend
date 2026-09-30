import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { adminBackendFetch, EMAIL_RE } from '@/lib/adminBackend';
import { checkRateLimit, getRetryAfterSeconds, rateLimitResponse } from '@/lib/rateLimit';

/*
 * Carga de créditos desde /admin/mcp. El backend suma al saldo y deja un
 * movimiento por tipo con el mail de quien cargó; con `referencia` (p. ej. el
 * id del pago de Mercado Pago) no se puede acreditar dos veces lo mismo.
 */

const MOTIVOS = new Set(['admin', 'donacion', 'ajuste']);

function wholeNumber(value: unknown, max: number): number | null {
    const n = Number(value ?? 0);
    return Number.isInteger(n) && n >= 0 && n <= max ? n : null;
}

export async function POST(request: NextRequest) {
    const { session, error } = await requireAdmin(request);
    if (error) return error;
    const actor = session!.user?.email || '';
    if (checkRateLimit(actor, 'admin:credits', 20)) {
        return rateLimitResponse(getRetryAfterSeconds(actor, 'admin:credits'));
    }
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const preguntas = wholeNumber(body?.preguntas, 100_000);
    const datos = wholeNumber(body?.datos, 1_000_000);
    const motivo = typeof body?.motivo === 'string' ? body.motivo : 'admin';
    const referencia = typeof body?.referencia === 'string' && body.referencia.trim() ? body.referencia.trim().slice(0, 255) : null;

    if (!EMAIL_RE.test(email)) return Response.json({ error: 'Mail inválido' }, { status: 400 });
    if (preguntas === null || datos === null) {
        return Response.json({ error: 'Las cantidades tienen que ser enteros positivos' }, { status: 400 });
    }
    if (preguntas === 0 && datos === 0) {
        return Response.json({ error: 'Cargá al menos una pregunta o una consulta de datos' }, { status: 400 });
    }
    if (!MOTIVOS.has(motivo)) return Response.json({ error: 'Motivo inválido' }, { status: 400 });

    return adminBackendFetch('/credits', {
        method: 'POST',
        actor,
        body: { email, preguntas, datos, motivo, referencia },
    });
}
