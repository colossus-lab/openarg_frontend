import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminMcpDashboard, { formatMs } from '@/components/admin/AdminMcpDashboard';

const overview = {
    days: 30,
    adopcion: { claves_total: 12, claves_nuevas: 5, activas_1d: 2, activas_7d: 4, activas_30d: 7, claves_recurrentes: 3 },
    uso: { pedidos_datos: 1234, preguntas: 40, preguntas_ok: 38, claves_activas: 7, tokens: 90000 },
    salud: { errores: 1, rechazos: 6, p50_datos_ms: 820, p95_datos_ms: 1900, p50_respuestas_ms: 15000, p95_respuestas_ms: null },
    cupo_global_hoy: { usado: 250, tope: 300 },
    costo: { estimado_usd: 1.29, usd_por_respuesta: 0.034, nota: 'Estimado.' },
};

const fixtures: Record<string, unknown> = {
    overview,
    timeline: [
        { dia: '2026-09-29', claves_nuevas: 1, claves_activas: 2, pedidos_datos: 30, preguntas: 3, rechazos: 0, errores: 0 },
    ],
    breakdown: {
        herramientas: [{ herramienta: 'buscar_datasets', modo: 'datos', pedidos: 900, errores: 0, rechazos: 2, p50_ms: 700, p95_ms: 1500 }],
        clientes: [{ cliente: 'claude-code', pedidos: 800, claves: 4 }],
        vias: [{ via: 'mcp', pedidos: 1000 }],
    },
    keys: [
        {
            email: 'alguien@example.com',
            key_prefix: 'oarg_sk_abcd',
            activa: false,
            alta: '2026-09-29T12:00:00+00:00',
            ultimo_uso: null,
            pedidos_datos: 400,
            preguntas: 10,
            rechazos: 1,
            dias_activos: 2,
        },
    ],
    questions: { top: [{ pregunta: 'tasa badlar', veces: 4, respondidas: 4, ultima: '2026-09-29T12:00:00+00:00' }], fallidas: [] },
};

describe('AdminMcpDashboard', () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        // recharts' ResponsiveContainer needs ResizeObserver, which jsdom lacks.
        vi.stubGlobal(
            'ResizeObserver',
            class {
                observe() {}
                unobserve() {}
                disconnect() {}
            },
        );
        fetchMock.mockImplementation(async (url: string) => {
            const view = url.split('/').pop()!.split('?')[0];
            return new Response(JSON.stringify(fixtures[view]), { status: 200 });
        });
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
        fetchMock.mockReset();
    });

    it('muestra adopción, uso, salud, claves y preguntas', async () => {
        render(<AdminMcpDashboard />);
        expect(await screen.findByText('1.234')).toBeInTheDocument();
        expect(screen.getByText('Claves nuevas')).toBeInTheDocument();
        expect(screen.getByText('alguien@example.com')).toBeInTheDocument();
        expect(screen.getByText('revocada')).toBeInTheDocument();
        expect(screen.getByText('tasa badlar')).toBeInTheDocument();
        expect(screen.getByText('claude-code')).toBeInTheDocument();
        expect(screen.getByText('MCP')).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledTimes(5);
        expect(fetchMock.mock.calls.every(([u]) => String(u).endsWith('?days=30'))).toBe(true);
    });

    it('al cambiar el período vuelve a pedir con esos días', async () => {
        render(<AdminMcpDashboard />);
        await screen.findByText('1.234');
        fetchMock.mockClear();
        fireEvent.click(screen.getByRole('button', { name: '7 días' }));
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
        expect(fetchMock.mock.calls.every(([u]) => String(u).endsWith('?days=7'))).toBe(true);
    });

    it('muestra el error del proxy', async () => {
        fetchMock.mockImplementation(async () => new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }));
        render(<AdminMcpDashboard />);
        expect(await screen.findByRole('alert')).toHaveTextContent('Forbidden');
    });

    it('formatea duraciones', () => {
        expect(formatMs(null)).toBe('—');
        expect(formatMs(820)).toBe('820 ms');
        expect(formatMs(15000)).toBe('15 s');
        expect(formatMs(1900)).toBe('1,9 s');
    });
});
