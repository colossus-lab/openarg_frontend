/*
 * Llamadas del servidor Next a los endpoints de admin del backend
 * (/api/v1/admin/*). Llevan `X-Admin-Key` (OPENARG_ADMIN_API_KEY, que vive
 * sólo en el servidor) y, en las escrituras, `X-Admin-Actor`: el mail de la
 * sesión admin, que el backend guarda como autor del cambio.
 */

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function adminBackendFetch(
    path: string,
    init: { method?: string; body?: unknown; actor?: string } = {},
): Promise<Response> {
    const adminKey = process.env.OPENARG_ADMIN_API_KEY || '';
    if (!adminKey) {
        return Response.json({ error: 'Falta configurar OPENARG_ADMIN_API_KEY en el servidor' }, { status: 503 });
    }
    const headers: Record<string, string> = { 'X-Admin-Key': adminKey };
    if (init.actor) headers['X-Admin-Actor'] = init.actor;
    if (init.body !== undefined) headers['Content-Type'] = 'application/json';
    try {
        const res = await fetch(`${BACKEND_URL}/api/v1/admin${path}`, {
            method: init.method ?? 'GET',
            headers,
            body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
            cache: 'no-store',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            // Los 4xx del backend traen un `detail` pensado para mostrar (mail sin
            // cuenta, referencia repetida). Los 5xx no se filtran.
            const detail = res.status < 500 && typeof data?.detail === 'string' ? data.detail : null;
            return Response.json(
                { error: detail ?? `El backend respondió ${res.status}` },
                { status: res.status < 500 ? res.status : 502 },
            );
        }
        return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
        return Response.json({ error: 'No se pudo conectar con el backend' }, { status: 502 });
    }
}
