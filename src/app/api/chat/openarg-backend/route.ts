// ============================================================
// OpenArg — Backend API Bridge
// Connects the Next.js frontend to the Python FastAPI backend
// Uses SSE format to maintain compatibility with existing chat UI
// ============================================================

import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, sessionId = 'default' } = body as {
            message: string;
            sessionId?: string;
        };

        if (!message || typeof message !== 'string') {
            return new Response(JSON.stringify({ error: 'El mensaje es obligatorio' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const send = (event: { type: string; data: unknown }) => {
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
                    );
                };

                try {
                    // Phase 1: Planning
                    send({ type: 'phase_change', data: 'planning' });
                    send({ type: 'thinking', data: 'Buscando datasets relevantes...' });

                    // Call the Python backend quick query endpoint
                    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/query/quick`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            question: message,
                            user_id: sessionId,
                        }),
                    });

                    if (!backendResponse.ok) {
                        const errorText = await backendResponse.text();
                        throw new Error(`Backend error: ${backendResponse.status} - ${errorText}`);
                    }

                    const result = await backendResponse.json();

                    // Phase 2: Data collection
                    send({ type: 'phase_change', data: 'data_collection' });
                    send({
                        type: 'thinking',
                        data: `Encontrados ${result.sources?.length || 0} datasets relevantes`,
                    });

                    // Phase 3: Analysis
                    send({ type: 'phase_change', data: 'analysis' });
                    send({ type: 'thinking', data: 'Analizando datos...' });

                    // Send content
                    send({ type: 'content', data: result.answer });

                    // Send sources in the format the frontend expects
                    if (result.sources && result.sources.length > 0) {
                        const formattedSources = result.sources.map((s: { title: string; portal: string; score: number }) => ({
                            name: s.title,
                            url: `https://datos.gob.ar`,
                            portal: s.portal,
                            accessedAt: new Date().toISOString(),
                        }));
                        send({ type: 'sources', data: formattedSources });
                    }

                    // Phase 4: Synthesis
                    send({ type: 'phase_change', data: 'synthesis' });
                    send({ type: 'done', data: null });
                } catch (err) {
                    send({
                        type: 'error',
                        data: err instanceof Error ? err.message : 'Error conectando con el backend',
                    });
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
            },
        });
    } catch (err) {
        return new Response(
            JSON.stringify({
                error: err instanceof Error ? err.message : 'Error interno del servidor',
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}
