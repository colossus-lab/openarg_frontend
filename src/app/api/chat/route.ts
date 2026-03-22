// ============================================================
// OpenArg — Backend API Bridge
// Connects the Next.js frontend to the Python FastAPI backend
// Uses SSE format to maintain compatibility with existing chat UI
//
// PRIMARY: connects to backend WebSocket /api/v1/query/ws/smart
// which streams real progress events (status, chunk, complete).
// FALLBACK: if WS fails, falls back to synchronous POST /api/v1/query/smart
// with minimal simulated progress.
// ============================================================

import { NextRequest } from 'next/server';
import { requireSession, backendHeaders } from '@/lib/auth';
import WebSocket from 'ws';

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';
const BACKEND_API_KEY = process.env.OPENARG_BACKEND_API_KEY || '';
const RATE_LIMIT_CHAT = parseInt(process.env.RATE_LIMIT_CHAT || '10', 10);
const MAX_MESSAGE_LENGTH = parseInt(process.env.MAX_MESSAGE_LENGTH || '5000', 10);
const MAX_HISTORY_CONTENT = parseInt(process.env.MAX_HISTORY_CONTENT || '2000', 10);
const MAX_HISTORY_LENGTH = parseInt(process.env.MAX_HISTORY_LENGTH || '20', 10);

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
    /** Set to true when the WS received an explicit error event from the backend. */
    _wsError?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────

/** Build the WebSocket URL from the HTTP backend URL. */
function buildWsUrl(): string {
    const base = BACKEND_URL.replace(/^http/, 'ws');
    const url = new URL('/api/v1/query/ws/smart', base);
    if (BACKEND_API_KEY) {
        url.searchParams.set('api_key', BACKEND_API_KEY);
    }
    return url.toString();
}

/** Format sources from backend shape to frontend shape. */
function formatSources(sources: SmartResult['sources']): Record<string, unknown>[] {
    return (sources || []).map((s) => ({
        name: s.name,
        url: s.url || 'https://datos.gob.ar',
        portal: s.portal,
        accessedAt: s.accessed_at || new Date().toISOString(),
    }));
}

// ── Map backend status steps to frontend phases/thinking ─────

interface MappedEvent {
    phase?: string;
    thinking?: string;
}

function mapStatusStep(step: string, extra?: Record<string, unknown>): MappedEvent {
    switch (step) {
        case 'classifying':
            return { phase: 'planning', thinking: 'Entendiendo tu pregunta...' };
        case 'cache_check':
            return { thinking: 'Buscando en caché...' };
        case 'cache_hit':
            return { thinking: '\u00a1Ya tengo esa info lista!' };
        case 'loading_context':
            return { thinking: 'Cargando contexto de conversación...' };
        case 'replanning':
            return { phase: 'planning', thinking: 'Replanificando búsqueda con nueva estrategia...' };
        case 'planning':
            return { phase: 'planning', thinking: 'Armando la estrategia con el equipo...' };
        case 'planned': {
            const count = extra?.steps_count ?? '?';
            return { thinking: `Listo, el equipo va a investigar en ${count} fuente${count !== 1 ? 's' : ''}` };
        }
        case 'searching': {
            const detail = extra?.detail as string | undefined;
            return { phase: 'data_collection', thinking: detail || 'Recorriendo los portales de datos...' };
        }
        case 'generating':
            return { phase: 'analysis', thinking: 'Analizando lo que encontramos...' };
        case 'policy_analysis':
            return { thinking: 'Evaluando el impacto de la pol\u00edtica...' };
        default:
            return { thinking: `Procesando: ${step}...` };
    }
}

/** Emit sources, charts, documents from a SmartResult — shared by WS and sync paths. */
function emitResultData(result: SmartResult, send: (event: { type: string; data: unknown }) => void): void {
    if (result.sources && result.sources.length > 0) {
        send({ type: 'sources', data: formatSources(result.sources) });
    }
    if (result.chart_data && result.chart_data.length > 0) {
        for (const chart of result.chart_data) {
            send({ type: 'chart', data: chart });
        }
    }
    if (result.documents && result.documents.length > 0) {
        send({ type: 'documents', data: result.documents });
    }
}

// ── WebSocket streaming approach ─────────────────────────────

async function streamViaWebSocket(
    questionWithContext: string,
    conversationId: string,
    policyMode: boolean,
    send: (event: { type: string; data: unknown }) => void,
): Promise<SmartResult | null> {
    const wsUrl = buildWsUrl();

    return new Promise<SmartResult | null>((resolve) => {
        let resolved = false;
        let completeResult: SmartResult | null = null;
        let accumulatedContent = '';
        let parseErrorCount = 0;

        const safeResolve = (value: SmartResult | null) => {
            if (resolved) return;
            resolved = true;
            clearTimeout(connectTimeout);
            clearTimeout(activityTimeout);
            try { ws.close(); } catch { /* ignore */ }
            resolve(value);
        };

        // Timeout: if the WS doesn't connect in 8 seconds, fall back
        const connectTimeout = setTimeout(() => safeResolve(null), 8000);

        // Activity timeout: if no message for 120s after connection, consider dead
        let activityTimeout: ReturnType<typeof setTimeout>;
        const resetActivityTimeout = () => {
            clearTimeout(activityTimeout);
            activityTimeout = setTimeout(() => {
                if (accumulatedContent) {
                    safeResolve({ answer: accumulatedContent, sources: [], chart_data: null });
                } else {
                    safeResolve(null);
                }
            }, 120_000);
        };

        let ws: WebSocket;
        try {
            ws = new WebSocket(wsUrl);
        } catch {
            clearTimeout(connectTimeout);
            resolve(null);
            return;
        }

        ws.on('open', () => {
            clearTimeout(connectTimeout);
            resetActivityTimeout();
            // Send the query payload
            ws.send(JSON.stringify({
                question: questionWithContext,
                conversation_id: conversationId || '',
                policy_mode: policyMode,
            }));
        });

        ws.on('message', (raw: WebSocket.Data) => {
            if (resolved) return;
            resetActivityTimeout();
            try {
                const event = JSON.parse(raw.toString());
                const eventType: string = event.type;

                switch (eventType) {
                    case 'status': {
                        const mapped = mapStatusStep(event.step, event);
                        if (mapped.phase) {
                            send({ type: 'phase_change', data: mapped.phase });
                        }
                        if (mapped.thinking) {
                            send({ type: 'thinking', data: mapped.thinking });
                        }
                        break;
                    }
                    case 'chunk': {
                        accumulatedContent += event.content || '';
                        send({ type: 'content', data: event.content || '' });
                        break;
                    }
                    case 'complete': {
                        completeResult = {
                            answer: event.answer || accumulatedContent,
                            sources: event.sources || [],
                            chart_data: event.chart_data || null,
                            documents: event.documents || null,
                            confidence: event.confidence,
                            citations: event.citations || [],
                            casual: event.casual || false,
                            cached: event.cached || false,
                        };
                        emitResultData(completeResult, send);
                        // Synthesis phase
                        send({ type: 'phase_change', data: 'synthesis' });
                        safeResolve(completeResult);
                        break;
                    }
                    case 'clarification': {
                        // Backend needs clarification — forward to frontend
                        send({
                            type: 'clarification',
                            data: {
                                question: event.question || '',
                                options: event.options || [],
                            },
                        });
                        safeResolve({ answer: '', sources: [], _wsError: true } as SmartResult);
                        break;
                    }
                    case 'error': {
                        // Backend sent an error event — propagate it
                        const msg = event.message || 'Error del servidor.';
                        send({ type: 'error', data: msg });
                        // Resolve with explicit flag so the caller knows NOT to fall back
                        safeResolve({ answer: '', sources: [], _wsError: true } as SmartResult);
                        break;
                    }
                }
            } catch {
                parseErrorCount++;
                if (parseErrorCount > 5) {
                    send({ type: 'error', data: 'Demasiados errores de comunicación. La respuesta puede estar incompleta.' });
                    safeResolve(accumulatedContent
                        ? { answer: accumulatedContent, sources: [], chart_data: null }
                        : null,
                    );
                }
            }
        });

        ws.on('error', () => {
            safeResolve(null);
        });

        ws.on('close', () => {
            if (!resolved) {
                // If we accumulated content but never got "complete", build a partial result
                safeResolve(accumulatedContent
                    ? { answer: accumulatedContent, sources: [], chart_data: null }
                    : null,
                );
            }
        });
    });
}

// ── Synchronous fallback approach ────────────────────────────

async function fetchSynchronous(
    questionWithContext: string,
    conversationId: string,
    sessionId: string,
    policyMode: boolean,
    userEmail: string,
    history: { role: string; content: string }[],
    send: (event: { type: string; data: unknown }) => void,
): Promise<SmartResult> {
    send({ type: 'thinking', data: 'Conectando con el servidor...' });

    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/query/smart`, {
        method: 'POST',
        headers: backendHeaders(userEmail || undefined),
        body: JSON.stringify({
            question: questionWithContext,
            user_email: userEmail || sessionId,
            conversation_id: conversationId || sessionId,
            policy_mode: policyMode,
            history: history.length > 0 ? history.slice(-10) : undefined,
        }),
    });

    if (!backendResponse.ok) {
        const status = backendResponse.status;
        let detail = '';
        try {
            const raw = await backendResponse.text();
            if (!raw.includes('<!DOCTYPE') && !raw.includes('<html')) {
                try {
                    const parsed = JSON.parse(raw);
                    detail = parsed.detail || parsed.message || '';
                } catch {
                    detail = raw.slice(0, 200);
                }
            }
        } catch { /* ignore read errors */ }

        if (status === 502 || status === 503 || status === 504) {
            throw new Error('El sistema de an\u00e1lisis no est\u00e1 disponible en este momento. Intent\u00e1 de nuevo en unos minutos.');
        } else if (status === 429) {
            throw new Error('Demasiadas consultas. Esper\u00e1 un momento antes de intentar de nuevo.');
        } else if (status >= 500) {
            throw new Error('Error interno del servidor. Intent\u00e1 de nuevo en unos minutos.');
        } else {
            throw new Error(detail || `Error del servidor (${status}). Intent\u00e1 de nuevo.`);
        }
    }

    let result: SmartResult;
    try {
        result = await backendResponse.json();
    } catch {
        throw new Error('El servidor respondi\u00f3 con un formato inesperado. Intent\u00e1 de nuevo.');
    }

    return result;
}

/** Emit final SSE events from a SmartResult obtained via the sync fallback. */
function emitSyncResult(result: SmartResult, send: (event: { type: string; data: unknown }) => void): void {
    if (result.casual || result.cached) {
        if (result.cached) {
            send({ type: 'thinking', data: 'Respuesta encontrada en cach\u00e9' });
        }
        send({ type: 'content', data: result.answer });
        emitResultData(result, send);
        send({ type: 'phase_change', data: 'synthesis' });
        return;
    }

    // Data collection phase
    send({ type: 'phase_change', data: 'data_collection' });
    const sourceCount = result.sources?.length || 0;
    const portalNames = [...new Set(
        (result.sources || []).map((s) => s.portal).filter(Boolean),
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

    // Analysis phase
    send({ type: 'phase_change', data: 'analysis' });
    const hasCharts = result.chart_data && result.chart_data.length > 0;
    if (hasCharts) {
        send({ type: 'thinking', data: 'Preparando an\u00e1lisis y visualizaciones...' });
    } else {
        send({ type: 'thinking', data: 'Preparando an\u00e1lisis...' });
    }

    send({ type: 'content', data: result.answer });
    emitResultData(result, send);
    send({ type: 'phase_change', data: 'synthesis' });
}

// ── Rate limiter ─────────────────────────────────────────────

import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';

// ── Main POST handler ────────────────────────────────────────

export async function POST(request: NextRequest) {
    const { session, error } = await requireSession();
    if (error) return error;

    // SECURITY: Rate limit per user
    const userEmail = session!.user?.email || 'anonymous';
    if (checkRateLimit(userEmail, 'chat', RATE_LIMIT_CHAT)) {
        return rateLimitResponse();
    }

    try {
        const body = await request.json();
        const { message, sessionId = 'default', policyMode = false, conversationId = null, history = [] } = body as {
            message: string;
            sessionId?: string;
            policyMode?: boolean;
            conversationId?: string | null;
            history?: { role: string; content: string }[];
        };

        // SECURITY: Sanitize history — only allow user/assistant roles, cap content length
        const sanitizedHistory = (Array.isArray(history) ? history : [])
            .filter((m): m is { role: string; content: string } =>
                m != null &&
                typeof m.role === 'string' &&
                typeof m.content === 'string' &&
                (m.role === 'user' || m.role === 'assistant')
            )
            .map(m => ({
                role: m.role,
                content: m.content.slice(0, MAX_HISTORY_CONTENT),
            }));

        if (!message || typeof message !== 'string') {
            return new Response(JSON.stringify({ error: 'El mensaje es obligatorio' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // SECURITY: Cap message size (5KB) and history length (20 entries)
        if (message.length > MAX_MESSAGE_LENGTH) {
            return new Response(
                JSON.stringify({ error: `El mensaje es demasiado largo (máximo ${MAX_MESSAGE_LENGTH} caracteres).` }),
                { status: 400, headers: { 'Content-Type': 'application/json' } },
            );
        }
        const cappedHistory = sanitizedHistory.slice(-MAX_HISTORY_LENGTH);

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                let closed = false;
                const send = (event: { type: string; data: unknown }) => {
                    if (closed) return;
                    try {
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
                        );
                    } catch {
                        closed = true;
                    }
                };

                try {
                    // ── Create/resolve conversation early ──
                    const title = message.length > 80 ? message.slice(0, 80) + '...' : message;
                    let convId = conversationId;

                    if (!convId) {
                        try {
                            const convRes = await fetch(`${BACKEND_URL}/api/v1/conversations/`, {
                                method: 'POST',
                                headers: backendHeaders(userEmail),
                                body: JSON.stringify({ user_email: userEmail, title }),
                            });
                            if (convRes.ok) {
                                const conv = await convRes.json();
                                convId = conv.id;
                            }
                        } catch { /* will retry after backend response */ }
                    }

                    // Notify frontend immediately so it can track the conversation
                    if (convId) {
                        send({ type: 'conversation_saved', data: { id: convId, title } });

                        // Save user message NOW so it's visible if the user navigates away and back
                        try {
                            await fetch(`${BACKEND_URL}/api/v1/conversations/${convId}/messages`, {
                                method: 'POST',
                                headers: backendHeaders(userEmail),
                                body: JSON.stringify({ role: 'user', content: message }),
                            });
                        } catch { /* non-critical */ }
                    }

                    // The backend handles conversation context via conversation_id
                    // (memory agent in Redis), so we send just the raw question.

                    // Start the pipeline — show planning phase
                    send({ type: 'phase_change', data: 'planning' });
                    send({ type: 'thinking', data: 'Clasificando consulta...' });

                    // ── Try WebSocket streaming (real progress) ──
                    let result: SmartResult | null = null;

                    try {
                        result = await streamViaWebSocket(
                            message,
                            convId || sessionId,
                            policyMode,
                            send,
                        );
                        if (result !== null) {
                        }
                    } catch {
                        // WebSocket failed entirely — will fall back below
                        result = null;
                    }

                    // ── Fallback: synchronous POST ──
                    if (result === null) {
                        send({ type: 'thinking', data: 'Conectando v\u00eda alternativa...' });
                        const syncResult = await fetchSynchronous(
                            message,
                            convId || '',
                            sessionId,
                            policyMode,
                            userEmail,
                            cappedHistory,
                            send,
                        );
                        emitSyncResult(syncResult, send);
                        result = syncResult;
                    }

                    // If the WS path already sent an error event, stop — don't save or emit more
                    if (result._wsError) {
                        // Error was already sent via the WS handler
                        return;
                    }

                    // ── Save assistant message to conversation ──
                    if (convId && result.answer) {
                        try {
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
                                    chart_data: result.chart_data || null,
                                    documents: result.documents || null,
                                }),
                            });

                            if (assistantMsgRes.ok) {
                                const savedMsg = await assistantMsgRes.json();
                                send({ type: 'assistant_message_saved', data: { assistantMessageId: savedMsg.id } });
                            }
                        } catch { /* message saving is non-critical */ }
                    }

                    send({ type: 'done', data: null });
                } catch (err) {
                    let userMessage = 'Ocurri\u00f3 un error inesperado. Intent\u00e1 de nuevo.';
                    if (err instanceof Error) {
                        if (err.cause && typeof err.cause === 'object' && 'code' in err.cause) {
                            const code = (err.cause as { code?: string }).code;
                            if (code === 'ECONNREFUSED' || code === 'ECONNRESET' || code === 'ENOTFOUND') {
                                userMessage = 'No se pudo conectar con el servidor. El sistema puede estar en mantenimiento.';
                            }
                        } else if (err.message.includes('fetch failed') || err.message.includes('ECONNREFUSED')) {
                            userMessage = 'No se pudo conectar con el servidor. El sistema puede estar en mantenimiento.';
                        } else {
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
            },
        );
    }
}
