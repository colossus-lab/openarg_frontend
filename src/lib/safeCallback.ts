/**
 * Adónde volver después del login, reducido siempre a una ruta de este sitio.
 *
 * De una URL absoluta se toma sólo la ruta. Detrás de Caddy, el middleware ve
 * el host interno del contenedor (`https://<id>:3000/desarrolladores`), así
 * que comparar orígenes rechazaba todo y mandaba a /chat a la gente que venía
 * de mcp.openarg.org a buscar su clave. Como se devuelve una ruta relativa,
 * no hay redirección a otro sitio posible; `//host` y `/\host` se rechazan
 * porque el navegador los interpreta como otro dominio.
 */
const DEFAULT_CALLBACK = '/chat';

export function safeCallback(raw: string | null | undefined, base = 'https://openarg.org'): string {
    if (!raw) return DEFAULT_CALLBACK;
    let url: URL;
    try {
        url = new URL(raw, base);
    } catch {
        return DEFAULT_CALLBACK;
    }
    const path = url.pathname;
    if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) {
        return DEFAULT_CALLBACK;
    }
    if (path.startsWith('/login') || path.startsWith('/api/')) return DEFAULT_CALLBACK;
    return `${path}${url.search}`;
}
