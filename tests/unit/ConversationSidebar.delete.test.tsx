import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ConversationSidebar from '@/components/ConversationSidebar';

const CONVERSACIONES = [
    { id: 'c1', title: 'Presupuesto 2024', created_at: '2026-07-30T10:00:00Z', updated_at: '2026-07-30T10:00:00Z' },
    { id: 'c2', title: 'Delitos en CABA', created_at: '2026-07-30T11:00:00Z', updated_at: '2026-07-30T11:00:00Z' },
];

function renderSidebar() {
    return render(
        <ConversationSidebar
            isOpen
            isCollapsed={false}
            onClose={() => {}}
            onToggleCollapse={() => {}}
            onSelectConversation={() => {}}
            onNewConversation={() => {}}
            userId="dante@example.com"
        />,
    );
}

/** La lista siempre responde igual; el DELETE lo decide cada test. */
function mockFetch(deleteResponse: Response | (() => never)) {
    return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === 'DELETE') {
            if (typeof deleteResponse === 'function') deleteResponse();
            return deleteResponse as Response;
        }
        if (String(input).startsWith('/api/conversations?')) {
            return new Response(JSON.stringify(CONVERSACIONES), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        return new Response('{}', { status: 200 });
    });
}

async function confirmarBorrado() {
    await screen.findByText('Presupuesto 2024');
    fireEvent.click(screen.getAllByLabelText('Eliminar conversacion')[0]);
    fireEvent.click(await screen.findByLabelText('Confirmar eliminacion'));
}

describe('ConversationSidebar — borrado', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        // `vitest.config.ts` no activa `globals`, así que testing-library no
        // registra su cleanup automático y los renders se acumulan entre tests
        // del archivo: el segundo `findByText` encontraba dos sidebars.
        cleanup();
        vi.unstubAllGlobals();
    });

    it('saca la conversación de la lista cuando el borrado sale bien', async () => {
        vi.stubGlobal('fetch', mockFetch(new Response(null, { status: 204 })));

        renderSidebar();
        await confirmarBorrado();

        await waitFor(() => {
            expect(screen.queryByText('Presupuesto 2024')).not.toBeInTheDocument();
        });
        expect(screen.getByText('Delitos en CABA')).toBeInTheDocument();
    });

    it('muestra el motivo y conserva la conversación cuando el límite la rechaza', async () => {
        // El bug: no había rama para el fallo, así que un 429 no hacía NADA
        // visible — la conversación seguía ahí, el diálogo abierto y ningún
        // mensaje. Borrar varias seguidas se leía como que la app se colgaba.
        vi.stubGlobal(
            'fetch',
            mockFetch(
                new Response(JSON.stringify({ error: 'Demasiadas consultas.' }), {
                    status: 429,
                    headers: { 'Content-Type': 'application/json', 'Retry-After': '42' },
                }),
            ),
        );

        renderSidebar();
        await confirmarBorrado();

        expect(await screen.findByText(/Probá de nuevo en 42 segundos/)).toBeInTheDocument();
        // Control: la conversación NO se fue. Sin esta aserción el test pasaría
        // aunque el mensaje apareciera y la fila desapareciera igual.
        expect(screen.getByText('Presupuesto 2024')).toBeInTheDocument();
    });

    it('usa el texto del backend cuando el fallo no es por límite', async () => {
        vi.stubGlobal(
            'fetch',
            mockFetch(
                new Response(JSON.stringify({ error: 'Backend caído' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                }),
            ),
        );

        renderSidebar();
        await confirmarBorrado();

        expect(await screen.findByText('Backend caído')).toBeInTheDocument();
        expect(screen.getByText('Presupuesto 2024')).toBeInTheDocument();
    });

    it('avisa cuando falla la red, que es lo único que el catch cubría antes', async () => {
        vi.stubGlobal(
            'fetch',
            mockFetch(() => {
                throw new TypeError('Failed to fetch');
            }),
        );

        renderSidebar();
        await confirmarBorrado();

        expect(await screen.findByText(/No se pudo conectar/)).toBeInTheDocument();
    });
});
