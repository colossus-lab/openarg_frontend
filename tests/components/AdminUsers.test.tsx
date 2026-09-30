import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import AdminUsers, { filtrarUsuarios, type UserRow } from '@/components/admin/AdminUsers';

function row(over: Partial<UserRow>): UserRow {
    return {
        email: 'x@example.com',
        nombre: null,
        key_prefix: 'oarg_sk_xxxx',
        activa: true,
        claves: 1,
        alta: '2026-05-01T00:00:00+00:00',
        ultimo_uso: null,
        datos_mes: 0,
        preguntas_mes: 0,
        pedidos_total: 0,
        rechazos_total: 0,
        fundador_hasta: null,
        fundador: false,
        creditos_preguntas: 0,
        creditos_datos: 0,
        ...over,
    };
}

const rows: UserRow[] = [
    row({
        email: 'agus@example.com',
        nombre: 'Agus',
        key_prefix: 'oarg_sk_3NDw',
        ultimo_uso: '2026-09-29T04:30:00+00:00',
        preguntas_mes: 30,
        pedidos_total: 184,
        fundador: true,
        fundador_hasta: '2027-03-31T23:59:59+00:00',
    }),
    row({ email: 'vieja@example.com', key_prefix: 'oarg_sk_22mo', ultimo_uso: '2026-04-15T20:13:00+00:00', pedidos_total: 1 }),
    row({ email: 'nunca@example.com', key_prefix: 'oarg_sk_abcd', activa: false, claves: 2 }),
];

describe('filtrarUsuarios', () => {
    it('sin filtro devuelve a todas, también a quien nunca usó la clave', () => {
        expect(filtrarUsuarios(rows, 'todas', '')).toHaveLength(3);
    });

    it('separa uso de este mes, nunca usadas y Fundadores', () => {
        expect(filtrarUsuarios(rows, 'este_mes', '').map((r) => r.email)).toEqual(['agus@example.com']);
        expect(filtrarUsuarios(rows, 'nunca', '').map((r) => r.email)).toEqual(['nunca@example.com']);
        expect(filtrarUsuarios(rows, 'fundadores', '').map((r) => r.email)).toEqual(['agus@example.com']);
    });

    it('busca por mail, nombre o prefijo de clave, sin distinguir mayúsculas', () => {
        expect(filtrarUsuarios(rows, 'todas', 'VIEJA')).toHaveLength(1);
        expect(filtrarUsuarios(rows, 'todas', 'agus')).toHaveLength(1);
        expect(filtrarUsuarios(rows, 'todas', 'sk_abcd')).toHaveLength(1);
    });
});

describe('AdminUsers', () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        fetchMock.mockResolvedValue(new Response(JSON.stringify(rows), { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('lista a todas las personas con clave y resume cuántas la usaron', async () => {
        render(<AdminUsers />);
        expect(await screen.findByText('nunca@example.com')).toBeTruthy();
        expect(fetchMock.mock.calls[0][0]).toContain('/api/admin/mcp/users');
        expect(screen.getByText(/3 personas · 2 con clave activa · 2 la usaron alguna/)).toBeTruthy();
        expect(screen.getByText('revocada')).toBeTruthy();
        expect(screen.getByText('2 claves en total')).toBeTruthy();
        expect(screen.getByText(/^hasta /)).toBeTruthy();
    });

    it('filtra con los botones y el buscador', async () => {
        render(<AdminUsers />);
        await screen.findByText('nunca@example.com');
        fireEvent.click(screen.getByRole('button', { name: 'Nunca la usaron' }));
        expect(screen.queryByText('agus@example.com')).toBeNull();
        expect(screen.getByText('nunca@example.com')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Todas' }));
        fireEvent.change(screen.getByLabelText('Buscar usuario'), { target: { value: 'vieja' } });
        expect(screen.getByText('vieja@example.com')).toBeTruthy();
        expect(screen.queryByText('nunca@example.com')).toBeNull();
    });

    it('muestra el error del backend', async () => {
        fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'El backend respondió 500' }), { status: 502 }));
        render(<AdminUsers />);
        expect((await screen.findByRole('alert')).textContent).toContain('500');
    });
});
