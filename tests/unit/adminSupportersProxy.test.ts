// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const requireAdmin = vi.fn();
vi.mock('@/lib/auth', () => ({ requireAdmin: (...args: unknown[]) => requireAdmin(...args) }));

import * as supporters from '@/app/api/admin/supporters/route';
import * as credits from '@/app/api/admin/credits/route';

let n = 0;
function req(url: string, method = 'GET', body?: unknown) {
    return new NextRequest(`http://localhost${url}`, {
        method,
        body: body ? JSON.stringify(body) : undefined,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
    });
}

describe('proxies de Fundadores y créditos', () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        // Un admin distinto por test: el rate limit en memoria no se arrastra.
        n += 1;
        requireAdmin.mockResolvedValue({ session: { user: { email: `admin${n}@b.c` } }, idToken: '', error: null });
        fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        process.env.OPENARG_ADMIN_API_KEY = 'clave-admin-de-prueba';
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        fetchMock.mockReset();
        delete process.env.OPENARG_ADMIN_API_KEY;
    });

    it('sin admin no llama al backend', async () => {
        requireAdmin.mockResolvedValue({
            session: null,
            idToken: '',
            error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
        });
        expect((await supporters.GET(req('/api/admin/supporters'))).status).toBe(403);
        expect((await credits.POST(req('/api/admin/credits', 'POST', { email: 'a@b.c', preguntas: 1 }))).status).toBe(403);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('marcar Fundador manda la clave y quién lo hizo', async () => {
        const res = await supporters.POST(
            req('/api/admin/supporters', 'POST', { email: 'agus@example.com', hasta: '2027-03-31', origen: 'cortesía' }),
        );
        expect(res.status).toBe(200);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toMatch(/\/api\/v1\/admin\/supporters$/);
        expect(init.method).toBe('POST');
        expect(init.headers['X-Admin-Key']).toBe('clave-admin-de-prueba');
        expect(init.headers['X-Admin-Actor']).toBe(`admin${n}@b.c`);
        expect(JSON.parse(init.body)).toMatchObject({ email: 'agus@example.com', hasta: '2027-03-31' });
    });

    it('rechaza mails y fechas inválidas sin llamar al backend', async () => {
        expect((await supporters.POST(req('/api/admin/supporters', 'POST', { email: 'no-es-mail' }))).status).toBe(400);
        expect(
            (await supporters.POST(req('/api/admin/supporters', 'POST', { email: 'a@b.com', hasta: '31/03/2027' }))).status,
        ).toBe(400);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('quitar Fundador va por DELETE con el mail codificado', async () => {
        await supporters.DELETE(req('/api/admin/supporters?email=a%2Bb%40c.com', 'DELETE'));
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toMatch(/\/supporters\/a%2Bb%40c\.com$/);
        expect(init.method).toBe('DELETE');
    });

    it('créditos: valida cantidades y motivo', async () => {
        const bad = [
            { email: 'a@b.com' },
            { email: 'a@b.com', preguntas: -1 },
            { email: 'a@b.com', preguntas: 1.5 },
            { email: 'a@b.com', preguntas: 1, motivo: 'consumo' },
        ];
        for (const body of bad) {
            expect((await credits.POST(req('/api/admin/credits', 'POST', body))).status).toBe(400);
        }
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('créditos: pasa el 409 de referencia repetida con su mensaje', async () => {
        fetchMock.mockResolvedValue(new Response(JSON.stringify({ detail: 'Esa referencia ya se acreditó antes.' }), { status: 409 }));
        const res = await credits.POST(
            req('/api/admin/credits', 'POST', { email: 'a@b.com', preguntas: 5, motivo: 'donacion', referencia: 'mp-1' }),
        );
        expect(res.status).toBe(409);
        expect((await res.json()).error).toBe('Esa referencia ya se acreditó antes.');
    });

    it('un 500 del backend no filtra detalles', async () => {
        fetchMock.mockResolvedValue(new Response(JSON.stringify({ detail: 'traceback secreto' }), { status: 500 }));
        const res = await supporters.GET(req('/api/admin/supporters'));
        expect(res.status).toBe(502);
        expect(JSON.stringify(await res.json())).not.toContain('traceback');
    });
});
