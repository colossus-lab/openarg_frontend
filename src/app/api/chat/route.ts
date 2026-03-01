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
    documents?: Record<string, unknown>[] | null;
    tokens_used?: number;
    casual?: boolean;
    cached?: boolean;
    confidence?: number;
    citations?: Record<string, unknown>[];
    intent?: string;
}

// Progress steps that fire while waiting for the backend response.
// Each step has a delay (ms), optional phase change, and a thinking message.
const PROGRESS_STEPS = [
    { delay: 800,  think: 'Entendiendo tu pregunta...' },
    { delay: 2200, think: 'Preparando estrategia de búsqueda...' },
    { delay: 3800, phase: 'data_collection' as const, think: 'Buscando en fuentes de datos abiertos...' },
    { delay: 5500, think: 'Consultando portales gubernamentales...' },
    { delay: 7500, think: 'Recopilando datasets relevantes...' },
    { delay: 9500, phase: 'analysis' as const, think: 'Procesando información encontrada...' },
    { delay: 12000, think: 'Generando análisis con IA...' },
    { delay: 15000, think: 'Consolidando resultados...' },
];

export async function POST(request: NextRequest) {
    const { session, error } = await requireSession();
    if (error) return error;

    try {
        const body = await request.json();
        const { message, sessionId = 'default', policyMode = false } = body as {
            message: string;
            sessionId?: string;
            policyMode?: boolean;
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
                    // Start the pipeline — show planning phase
                    send({ type: 'phase_change', data: 'planning' });
                    send({ type: 'thinking', data: 'Clasificando consulta...' });

                    // Fire progress messages while waiting for backend
                    const timers = PROGRESS_STEPS.map(step =>
                        setTimeout(() => {
                            if (step.phase) {
                                send({ type: 'phase_change', data: step.phase });
                            }
                            send({ type: 'thinking', data: step.think });
                        }, step.delay)
                    );

                    // Call the Python backend smart query endpoint
                    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/query/smart`, {
                        method: 'POST',
                        headers: backendHeaders(session!.user?.email || undefined),
                        body: JSON.stringify({
                            question: message,
                            user_email: session!.user?.email || sessionId,
                            conversation_id: sessionId,
                            policy_mode: policyMode,
                        }),
                    });

                    // Backend responded — cancel remaining progress timers
                    timers.forEach(clearTimeout);

                    if (!backendResponse.ok) {
                        const errorText = await backendResponse.text();
                        throw new Error(`Backend error: ${backendResponse.status} - ${errorText}`);
                    }

                    const result: SmartResult = await backendResponse.json();

                    // Casual/cached responses — quick path
                    if (result.casual || result.cached) {
                        if (result.cached) {
                            send({ type: 'thinking', data: 'Respuesta encontrada en caché' });
                        }
                        send({ type: 'content', data: result.answer });
                        send({ type: 'phase_change', data: 'synthesis' });
                        send({ type: 'done', data: null });
                        return;
                    }

                    // ── Data collection phase (show what we found) ──
                    send({ type: 'phase_change', data: 'data_collection' });

                    const sourceCount = result.sources?.length || 0;
                    const portalNames = [...new Set(
                        (result.sources || []).map(s => s.portal).filter(Boolean)
                    )];

                    if (sourceCount > 0 && portalNames.length > 0) {
                        send({
                            type: 'thinking',
                            data: `${sourceCount} fuente${sourceCount > 1 ? 's' : ''} encontrada${sourceCount > 1 ? 's' : ''} en ${portalNames.join(', ')}`,
                        });
                    } else if (sourceCount > 0) {
                        send({
                            type: 'thinking',
                            data: `${sourceCount} fuente${sourceCount > 1 ? 's' : ''} de datos encontrada${sourceCount > 1 ? 's' : ''}`,
                        });
                    } else {
                        send({ type: 'thinking', data: 'Procesando respuesta...' });
                    }

                    // ── Analysis phase ──
                    send({ type: 'phase_change', data: 'analysis' });

                    const hasCharts = result.chart_data && result.chart_data.length > 0;
                    if (hasCharts) {
                        send({ type: 'thinking', data: 'Preparando análisis y visualizaciones...' });
                    } else {
                        send({ type: 'thinking', data: 'Preparando análisis...' });
                    }

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
                    if (hasCharts) {
                        for (const chart of result.chart_data!) {
                            send({ type: 'chart', data: chart });
                        }
                    }

                    // Send DDJJ documents
                    if (result.documents && result.documents.length > 0) {
                        send({ type: 'documents', data: result.documents });
                    }

                    // ── Synthesis phase ──
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
