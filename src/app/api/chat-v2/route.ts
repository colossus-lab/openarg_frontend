// ============================================================
// OpenArg — LangGraph Pipeline Bridge (v2)
//
// Proxies to backend POST /api/v1/query/smart-v2 (LangGraph pipeline).
// Returns SSE events in the same format as /api/chat for compatibility.
// ============================================================

import { NextRequest } from 'next/server';
import { requireSession, backendHeaders } from '@/lib/auth';

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';

export async function POST(request: NextRequest) {
    const { session, error } = await requireSession();
    if (error) return error;

    try {
        const body = await request.json();
        const { message, sessionId = 'default', policyMode = false, conversationId = null } = body as {
            message: string;
            sessionId?: string;
            policyMode?: boolean;
            conversationId?: string | null;
        };

        if (!message || typeof message !== 'string') {
            return new Response(JSON.stringify({ error: 'El mensaje es obligatorio' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const userEmail = session!.user?.email || '';

        // Call the LangGraph backend endpoint (POST, not WS)
        const backendResponse = await fetch(`${BACKEND_URL}/api/v1/query/smart-v2`, {
            method: 'POST',
            headers: backendHeaders(userEmail || undefined),
            body: JSON.stringify({
                question: message,
                user_email: userEmail || sessionId,
                conversation_id: conversationId || '',
                policy_mode: policyMode,
            }),
        });

        if (!backendResponse.ok) {
            const status = backendResponse.status;
            return new Response(
                JSON.stringify({ error: `Backend error (${status})` }),
                { status, headers: { 'Content-Type': 'application/json' } },
            );
        }

        const result = await backendResponse.json();

        // Convert to SSE format for compatibility with useSSEStream
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            start(controller) {
                const send = (event: { type: string; data: unknown }) => {
                    try {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
                    } catch { /* closed */ }
                };

                // Simulate the phase progression
                send({ type: 'phase_change', data: 'planning' });
                send({ type: 'thinking', data: 'Pipeline LangGraph v2' });
                send({ type: 'phase_change', data: 'data_collection' });

                if (result.sources && result.sources.length > 0) {
                    send({
                        type: 'thinking',
                        data: `${result.sources.length} fuente${result.sources.length > 1 ? 's' : ''} encontrada${result.sources.length > 1 ? 's' : ''}`,
                    });
                }

                send({ type: 'phase_change', data: 'analysis' });
                send({ type: 'thinking', data: 'Analizando datos...' });

                // Content
                send({ type: 'content', data: result.answer || '' });

                // Sources
                if (result.sources && result.sources.length > 0) {
                    send({
                        type: 'sources',
                        data: result.sources.map((s: Record<string, string>) => ({
                            name: s.name,
                            url: s.url || 'https://datos.gob.ar',
                            portal: s.portal,
                            accessedAt: s.accessed_at || new Date().toISOString(),
                        })),
                    });
                }

                // Charts
                if (result.chart_data && result.chart_data.length > 0) {
                    for (const chart of result.chart_data) {
                        send({ type: 'chart', data: chart });
                    }
                }

                // Documents
                if (result.documents && result.documents.length > 0) {
                    send({ type: 'documents', data: result.documents });
                }

                send({ type: 'phase_change', data: 'synthesis' });
                send({ type: 'done', data: null });

                try { controller.close(); } catch { /* already closed */ }
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
            { status: 500, headers: { 'Content-Type': 'application/json' } },
        );
    }
}
