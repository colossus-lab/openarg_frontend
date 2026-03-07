import { NextRequest } from 'next/server';
import { requireSession, backendHeaders } from '@/lib/auth';

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';

export async function GET(request: NextRequest) {
    const { error } = await requireSession();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    try {
        if (q) {
            const res = await fetch(
                `${BACKEND_URL}/api/v1/taxonomy/hints?q=${encodeURIComponent(q)}`,
                { headers: backendHeaders() }
            );
            if (!res.ok) throw new Error(`Backend error: ${res.status}`);
            return Response.json(await res.json());
        }

        const res = await fetch(`${BACKEND_URL}/api/v1/taxonomy`, {
            headers: backendHeaders(),
            next: { revalidate: 300 },
        });
        if (!res.ok) throw new Error(`Backend error: ${res.status}`);
        return Response.json(await res.json());
    } catch (err) {
        return Response.json(
            { error: err instanceof Error ? err.message : 'Error conectando con el backend' },
            { status: 502 }
        );
    }
}
