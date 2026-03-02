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
        const { message, sessionId = 'default', policyMode = false, conversationId = null, history = [] } = body as {
            message: string;
            sessionId?: string;
            policyMode?: boolean;
            conversationId?: string | null;
            history?: { role: string; content: string }[];
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
                let closed = false;
                const send = (event: { type: string; data: unknown }) => {
                    if (closed) return;
                    try {
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
                        );
                    } catch {
                        closed = true;
                    }
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

                    // Build question with conversation context as instruction
                    let questionWithContext = message;
                    if (history.length > 0) {
                        const recentHistory = history.slice(-6);
                        const contextBlock = recentHistory
                            .map(m => `- ${m.role === 'user' ? 'Pregunta' : 'Respuesta'}: ${m.content.slice(0, 300)}`)
                            .join('\n');
                        questionWithContext = `INSTRUCCION: El usuario está continuando una conversación. A continuación el resumen de lo ya hablado (NO repitas ni respondas estas preguntas anteriores, solo usalas como contexto):\n${contextBlock}\n\nNUEVA PREGUNTA DEL USUARIO (responde SOLO esta):\n${message}`;
                    }

                    // Call the Python backend smart query endpoint
                    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/query/smart`, {
                        method: 'POST',
                        headers: backendHeaders(session!.user?.email || undefined),
                        body: JSON.stringify({
                            question: questionWithContext,
                            user_email: session!.user?.email || sessionId,
                            conversation_id: conversationId || sessionId,
                            policy_mode: policyMode,
                            history: history.length > 0 ? history.slice(-10) : undefined,
                        }),
                    });

                    // Backend responded — cancel remaining progress timers
                    timers.forEach(clearTimeout);

                    if (!backendResponse.ok) {
                        const status = backendResponse.status;
                        let detail = '';
                        try {
                            const raw = await backendResponse.text();
                            // If the response is HTML (e.g. nginx error page), don't include it
                            if (!raw.includes('<!DOCTYPE') && !raw.includes('<html')) {
                                // Try to extract JSON error detail
                                try {
                                    const parsed = JSON.parse(raw);
                                    detail = parsed.detail || parsed.message || '';
                                } catch {
                                    detail = raw.slice(0, 200);
                                }
                            }
                        } catch { /* ignore read errors */ }

                        if (status === 502 || status === 503 || status === 504) {
                            throw new Error('El sistema de análisis no está disponible en este momento. Intentá de nuevo en unos minutos.');
                        } else if (status === 429) {
                            throw new Error('Demasiadas consultas. Esperá un momento antes de intentar de nuevo.');
                        } else if (status >= 500) {
                            throw new Error('Error interno del servidor. Intentá de nuevo en unos minutos.');
                        } else {
                            throw new Error(detail || `Error del servidor (${status}). Intentá de nuevo.`);
                        }
                    }

                    let result: SmartResult;
                    try {
                        result = await backendResponse.json();
                    } catch {
                        throw new Error('El servidor respondió con un formato inesperado. Intentá de nuevo.');
                    }

                    // Casual/cached responses — quick path
                    if (result.casual || result.cached) {
                        if (result.cached) {
                            send({ type: 'thinking', data: 'Respuesta encontrada en caché' });
                        }
                        send({ type: 'content', data: result.answer });

                        // Send sources, charts, documents even for cached responses
                        if (result.sources && result.sources.length > 0) {
                            const formattedSources = result.sources.map((s) => ({
                                name: s.name,
                                url: s.url || 'https://datos.gob.ar',
                                portal: s.portal,
                                accessedAt: s.accessed_at || new Date().toISOString(),
                            }));
                            send({ type: 'sources', data: formattedSources });
                        }
                        if (result.chart_data && result.chart_data.length > 0) {
                            for (const chart of result.chart_data) {
                                send({ type: 'chart', data: chart });
                            }
                        }
                        if (result.documents && result.documents.length > 0) {
                            send({ type: 'documents', data: result.documents });
                        }

                        send({ type: 'phase_change', data: 'synthesis' });

                        // Save conversation for casual/cached too
                        try {
                            const userEmail = session!.user?.email || '';
                            const title = message.length > 80 ? message.slice(0, 80) + '...' : message;
                            let convId = conversationId;

                            if (!convId) {
                                const convRes = await fetch(`${BACKEND_URL}/api/v1/conversations/`, {
                                    method: 'POST',
                                    headers: backendHeaders(userEmail),
                                    body: JSON.stringify({ user_email: userEmail, title }),
                                });
                                if (convRes.ok) {
                                    const conv = await convRes.json();
                                    convId = conv.id;
                                }
                            }

                            // Notify frontend of the conversation ID immediately so
                            // subsequent messages reuse the same conversation
                            if (convId) {
                                send({ type: 'conversation_saved', data: { id: convId, title } });
                            }

                            // Save messages (best-effort, don't block the response)
                            if (convId) {
                                try {
                                    await fetch(`${BACKEND_URL}/api/v1/conversations/${convId}/messages`, {
                                        method: 'POST',
                                        headers: backendHeaders(userEmail),
                                        body: JSON.stringify({ role: 'user', content: message }),
                                    });
                                    const assistantMsgRes = await fetch(`${BACKEND_URL}/api/v1/conversations/${convId}/messages`, {
                                        method: 'POST',
                                        headers: backendHeaders(userEmail),
                                        body: JSON.stringify({ role: 'assistant', content: result.answer }),
                                    });
                                    if (assistantMsgRes.ok) {
                                        const savedMsg = await assistantMsgRes.json();
                                        send({ type: 'assistant_message_saved', data: { assistantMessageId: savedMsg.id } });
                                    }
                                } catch { /* message saving is non-critical */ }
                            }
                        } catch { /* non-critical */ }

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

                    // ── Save conversation ──
                    try {
                        const userEmail = session!.user?.email || '';
                        const title = message.length > 80 ? message.slice(0, 80) + '...' : message;

                        let convId = conversationId;

                        // Create new conversation only if we don't have one
                        if (!convId) {
                            const convRes = await fetch(`${BACKEND_URL}/api/v1/conversations/`, {
                                method: 'POST',
                                headers: backendHeaders(userEmail),
                                body: JSON.stringify({ user_email: userEmail, title }),
                            });
                            if (convRes.ok) {
                                const conv = await convRes.json();
                                convId = conv.id;
                            }
                        }

                        // Notify frontend of the conversation ID immediately so
                        // subsequent messages reuse the same conversation
                        if (convId) {
                            send({ type: 'conversation_saved', data: { id: convId, title } });
                        }

                        // Save messages (best-effort, don't block the response)
                        if (convId) {
                            try {
                                // Save user message
                                await fetch(`${BACKEND_URL}/api/v1/conversations/${convId}/messages`, {
                                    method: 'POST',
                                    headers: backendHeaders(userEmail),
                                    body: JSON.stringify({ role: 'user', content: message }),
                                });

                                // Save assistant message with sources
                                const formattedSources = (result.sources || []).map((s) => ({
                                    name: s.name,
                                    url: s.url || '',
                                    portal: s.portal,
                                }));
                                const assistantMsgRes = await fetch(`${BACKEND_URL}/api/v1/conversations/${convId}/messages`, {
                                    method: 'POST',
                                    headers: backendHeaders(userEmail),
                                    body: JSON.stringify({
                                        role: 'assistant',
                                        content: result.answer,
                                        sources: formattedSources.length > 0 ? formattedSources : null,
                                    }),
                                });

                                if (assistantMsgRes.ok) {
                                    const savedMsg = await assistantMsgRes.json();
                                    send({ type: 'assistant_message_saved', data: { assistantMessageId: savedMsg.id } });
                                }
                            } catch { /* message saving is non-critical */ }
                        }
                    } catch {
                        // Non-critical — don't fail the response if saving fails
                    }

                    send({ type: 'done', data: null });
                } catch (err) {
                    let userMessage = 'Ocurrió un error inesperado. Intentá de nuevo.';
                    if (err instanceof Error) {
                        // Network errors (backend unreachable)
                        if (err.cause && typeof err.cause === 'object' && 'code' in err.cause) {
                            const code = (err.cause as { code?: string }).code;
                            if (code === 'ECONNREFUSED' || code === 'ECONNRESET' || code === 'ENOTFOUND') {
                                userMessage = 'No se pudo conectar con el servidor. El sistema puede estar en mantenimiento.';
                            }
                        } else if (err.message.includes('fetch failed') || err.message.includes('ECONNREFUSED')) {
                            userMessage = 'No se pudo conectar con el servidor. El sistema puede estar en mantenimiento.';
                        } else {
                            // Our own clean error messages from above
                            userMessage = err.message;
                        }
                    }
                    send({ type: 'error', data: userMessage });
                } finally {
                    if (!closed) {
                        try { controller.close(); } catch { /* already closed */ }
                        closed = true;
                    }
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
