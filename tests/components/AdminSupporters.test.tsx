import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminSupporters from '@/components/admin/AdminSupporters';

const listado = {
    fundadores: [
        {
            email: 'agus@example.com',
            desde: '2026-09-30T00:00:00+00:00',
            hasta: '2027-03-31T23:59:59+00:00',
            activo: true,
            origen: 'cortesía',
            nota: null,
            creado_por: 'dante@example.com',
            creditos: { preguntas: 0, datos: 0 },
        },
        {
            email: 'viejo@example.com',
            desde: '2026-01-01T00:00:00+00:00',
            hasta: '2026-06-30T23:59:59+00:00',
            activo: false,
            origen: 'Mercado Pago',
            nota: null,
            creado_por: null,
            creditos: { preguntas: 3, datos: 10 },
        },
    ],
    creditos: [{ email: 'viejo@example.com', preguntas: 3, datos: 10, actualizado: '2026-09-30T00:00:00+00:00' }],
};

describe('AdminSupporters', () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
            if (!init || !init.method || init.method === 'GET') return new Response(JSON.stringify(listado), { status: 200 });
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
        });
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
        fetchMock.mockReset();
    });

    it('lista Fundadores, marca los vencidos y muestra los créditos', async () => {
        render(<AdminSupporters />);
        expect(await screen.findByText('agus@example.com')).toBeInTheDocument();
        expect(screen.getByText('vencido')).toBeInTheDocument();
        expect(screen.getByText('Con créditos')).toBeInTheDocument();
    });

    it('marcar Fundador manda mail, fecha y origen', async () => {
        render(<AdminSupporters />);
        await screen.findByText('agus@example.com');
        const form = screen.getByRole('form', { name: 'Marcar Fundador' });
        const [email, hasta, origen] = Array.from(form.querySelectorAll('input'));
        fireEvent.change(email, { target: { value: 'rodrigo@example.com' } });
        fireEvent.change(hasta, { target: { value: '2027-03-31' } });
        fireEvent.change(origen, { target: { value: 'cortesía' } });
        fireEvent.submit(form);
        await waitFor(() => expect(fetchMock.mock.calls.some(([, i]) => (i as RequestInit | undefined)?.method === 'POST')).toBe(true));
        const [, init] = fetchMock.mock.calls.find(([, i]) => (i as RequestInit | undefined)?.method === 'POST')!;
        expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({
            email: 'rodrigo@example.com',
            hasta: '2027-03-31',
            origen: 'cortesía',
        });
        expect(await screen.findByRole('status')).toHaveTextContent('rodrigo@example.com es Fundador');
    });

    it('muestra el error del backend al cargar créditos', async () => {
        fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
            if (!init || !init.method || init.method === 'GET') return new Response(JSON.stringify(listado), { status: 200 });
            return new Response(JSON.stringify({ error: 'Esa referencia ya se acreditó antes.' }), { status: 409 });
        });
        render(<AdminSupporters />);
        await screen.findByText('agus@example.com');
        const form = screen.getByRole('form', { name: 'Cargar créditos' });
        const email = form.querySelector('input[type="email"]')!;
        fireEvent.change(email, { target: { value: 'a@b.com' } });
        fireEvent.submit(form);
        expect(await screen.findByRole('alert')).toHaveTextContent('Esa referencia ya se acreditó antes.');
    });
});
