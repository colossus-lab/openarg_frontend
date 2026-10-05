import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

vi.mock('next-auth/react', () => ({
    useSession: () => ({ status: 'authenticated', data: { user: { email: 'ana@example.com' } } }),
}));
vi.mock('@/components/landing-ed/TopbarEditorial', () => ({ default: () => null }));
vi.mock('@/components/landing-ed/Colophon', () => ({ default: () => null }));

import DesarrolladoresPage from '@/app/desarrolladores/page';

/** Un backend en memoria: una clave activa por persona, como el real. */
function fakeBackend() {
    let seq = 0;
    let keys: { id: string; key_prefix: string; is_active: boolean; created_at: string; last_used_at: null }[] = [];
    const calls: string[] = [];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        const method = init?.method ?? 'GET';
        calls.push(`${method} ${url}`);
        if (url === '/api/developers/usage') {
            return new Response(JSON.stringify({ preguntas: { usadas: 0, limite: 10 } }), { status: 200 });
        }
        if (url === '/api/developers/keys' && method === 'GET') {
            return new Response(JSON.stringify(keys), { status: 200 });
        }
        if (url === '/api/developers/keys' && method === 'POST') {
            keys = keys.map((k) => ({ ...k, is_active: false }));
            seq += 1;
            keys.push({ id: `k${seq}`, key_prefix: `oarg_sk_${seq}`, is_active: true, created_at: '2026-10-04T00:00:00Z', last_used_at: null });
            return new Response(JSON.stringify({ key: `oarg_sk_${seq}_secreto` }), { status: 200 });
        }
        if (url.startsWith('/api/developers/keys/') && method === 'DELETE') {
            const id = url.split('/').pop();
            keys = keys.map((k) => (k.id === id ? { ...k, is_active: false } : k));
            return new Response(JSON.stringify({ revoked: true }), { status: 200 });
        }
        return new Response('{}', { status: 404 });
    });
    return { fetchMock, calls };
}

describe('/desarrolladores: crear, regenerar y revocar', () => {
    let backend: ReturnType<typeof fakeBackend>;

    beforeEach(() => {
        backend = fakeBackend();
        vi.stubGlobal('fetch', backend.fetchMock);
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('los botones siguen andando después del primer uso', async () => {
        render(<DesarrolladoresPage />);

        // Crear
        fireEvent.click(await screen.findByRole('button', { name: 'Crear clave' }));
        expect(await screen.findByText('oarg_sk_1_secreto')).toBeInTheDocument();

        // Regenerar (con confirmación)
        fireEvent.click(screen.getByRole('button', { name: 'Generar una nueva' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Generar nueva' }));
        expect(await screen.findByText('oarg_sk_2_secreto')).toBeInTheDocument();

        // Regenerar otra vez
        fireEvent.click(screen.getByRole('button', { name: 'Generar una nueva' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Generar nueva' }));
        expect(await screen.findByText('oarg_sk_3_secreto')).toBeInTheDocument();

        // Revocar
        fireEvent.click(screen.getByRole('button', { name: 'Revocar' }));
        const dialog = await screen.findByRole('alertdialog');
        fireEvent.click(within(dialog).getByRole('button', { name: 'Revocar' }));
        await waitFor(() => expect(backend.calls).toContain('DELETE /api/developers/keys/k3'));

        // Y crear de nuevo
        fireEvent.click(await screen.findByRole('button', { name: 'Crear clave' }));
        expect(await screen.findByText('oarg_sk_4_secreto')).toBeInTheDocument();

        expect(backend.calls.filter((c) => c.startsWith('POST'))).toHaveLength(4);
    });

    it('el diálogo de confirmación flota sobre la página, no dentro de ella', async () => {
        render(<DesarrolladoresPage />);
        fireEvent.click(await screen.findByRole('button', { name: 'Crear clave' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Generar una nueva' }));

        // Dentro de <main class="ed-page"> lo agarraba `.ed-page > *` y
        // quedaba al final de la página, fuera de la vista.
        const dialog = await screen.findByRole('alertdialog');
        expect(dialog.closest('main')).toBeNull();
        expect(dialog.parentElement?.parentElement).toBe(document.body);
    });
});
