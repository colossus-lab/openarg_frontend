// ============================================================
// OpenArg — Backend API Bridge
// Connects the Next.js frontend to the Python FastAPI backend
// Uses SSE format to maintain compatibility with existing chat UI
// Calls /query/smart which has casual detection, caching, and
// the full planner→connectors→analysis pipeline.
// ============================================================

import { NextRequest } from 'next/server';
import { requireSession, backendHeaders } from '@/lib/auth';

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';

interface SmartResult {
    answer: string;
    sources?: { name: string; url: string; portal: string; accessed_at?: string }[];
    chart_data?: Record<string, unknown>[] | null;
    tokens_used?: number;
    casual?: boolean;
    cached?: boolean;
}

export async function POST(request: NextRequest) {
    const { session, error } = await requireSession();
    if (error) return error;

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
                    // Phase 1: Planning (classifying)
                    send({ type: 'phase_change', data: 'planning' });
                    send({ type: 'thinking', data: 'Clasificando consulta...' });

                    // Call the Python backend smart query endpoint
                    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/query/smart`, {
                        method: 'POST',
                        headers: backendHeaders(session!.user?.email || undefined),
                        body: JSON.stringify({
                            question: message,
                            user_email: session!.user?.email || sessionId,
                            conversation_id: sessionId,
                        }),
                    });

                    if (!backendResponse.ok) {
                        const errorText = await backendResponse.text();
                        throw new Error(`Backend error: ${backendResponse.status} - ${errorText}`);
                    }

                    const result: SmartResult = await backendResponse.json();

                    // Casual/cached responses skip the full pipeline phases
                    if (result.casual || result.cached) {
                        if (result.cached) {
                            send({ type: 'thinking', data: 'Respuesta encontrada en caché' });
                        }
                        send({ type: 'content', data: result.answer });
                        send({ type: 'phase_change', data: 'synthesis' });
                        send({ type: 'done', data: null });
                        return;
                    }

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

                    // Send sources
                    if (result.sources && result.sources.length > 0) {
                        const formattedSources = result.sources.map((s) => ({
                            name: s.name,
                            url: s.url || 'https://datos.gob.ar',
                            portal: s.portal,
                            accessedAt: s.accessed_at || new Date().toISOString(),
                        }));
                        send({ type: 'sources', data: formattedSources });
                    }

                    // Send charts
                    if (result.chart_data && result.chart_data.length > 0) {
                        for (const chart of result.chart_data) {
                            send({ type: 'chart', data: chart });
                        }
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
