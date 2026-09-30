// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const requireAdmin = vi.fn();
vi.mock('@/lib/auth', () => ({ requireAdmin: (...args: unknown[]) => requireAdmin(...args) }));

import { GET } from '@/app/api/admin/mcp/[view]/route';

function call(view: string, query = '?days=30') {
    const req = new NextRequest(`http://localhost/api/admin/mcp/${view}${query}`);
    return GET(req, { params: Promise.resolve({ view }) });
}

describe('proxy del tablero de uso del MCP', () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        requireAdmin.mockResolvedValue({ session: { user: { email: 'a@b.c' } }, idToken: '', error: null });
        vi.stubGlobal('fetch', fetchMock);
        process.env.OPENARG_ADMIN_API_KEY = 'clave-admin-de-prueba';
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        fetchMock.mockReset();
        delete process.env.OPENARG_ADMIN_API_KEY;
    });

    it('sin admin devuelve el error de requireAdmin y no llama al backend', async () => {
        requireAdmin.mockResolvedValue({
            session: null,
            idToken: '',
            error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
        });
        const res = await call('overview');
        expect(res.status).toBe(403);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rechaza vistas que no existen', async () => {
        const res = await call('../tasks');
        expect(res.status).toBe(404);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rechaza períodos fuera de 7, 30 y 90', async () => {
        const res = await call('overview', '?days=3650');
        expect(res.status).toBe(400);
    });

    it('sin la clave de admin configurada no intenta llamar', async () => {
        delete process.env.OPENARG_ADMIN_API_KEY;
        const res = await call('overview');
        expect(res.status).toBe(503);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('reenvía con X-Admin-Key, sin cache, y devuelve el JSON del backend', async () => {
        fetchMock.mockResolvedValue(new Response(JSON.stringify({ days: 30 }), { status: 200 }));
        const res = await call('timeline', '?days=90');
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ days: 30 });
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toMatch(/\/api\/v1\/admin\/analytics\/mcp\/timeline\?days=90$/);
        expect(init.headers['X-Admin-Key']).toBe('clave-admin-de-prueba');
        expect(init.cache).toBe('no-store');
    });

    it('un error del backend es un 502 sin filtrar detalles', async () => {
        fetchMock.mockResolvedValue(new Response('boom', { status: 500 }));
        const res = await call('keys');
        expect(res.status).toBe(502);
    });
});
