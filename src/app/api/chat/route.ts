// ============================================================
// OpenArg — Backend API Bridge
// Thin Next.js POST handler that orchestrates the chat bridge
// sub-modules extracted on 2026-04-11 (DEBT-005 fix):
//
//   src/lib/chat/wsBridge.ts           — WebSocket primary path
//   src/lib/chat/syncFallback.ts       — HTTP fallback + synthesized phases
//   src/lib/chat/eventMapper.ts        — status step → phase/thinking translation
//   src/lib/chat/conversationService.ts — conversation persistence + retry
//
// This file now owns only:
//   - auth (requireSession)
//   - per-user rate limiting
//   - input sanitization (message length, history shape & cap)
//   - the ReadableStream shell that pipes SSE events to the browser
//   - orchestration: WS first → HTTP fallback on null → finally-block save
// ============================================================

import { NextRequest } from 'next/server';
import { requireSession } from '@/lib/auth';

import {
    createConversation,
    saveAssistantMessageWithRetry,
    saveUserMessage,
} from '@/lib/chat/conversationService';
import { emitSyncResult, fetchSynchronous } from '@/lib/chat/syncFallback';
import type { SmartResult } from '@/lib/chat/types';
import { streamViaWebSocket } from '@/lib/chat/wsBridge';
import { checkRateLimit, getRetryAfterSeconds, rateLimitResponse } from '@/lib/rateLimit';

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';
const RATE_LIMIT_CHAT = parseInt(process.env.RATE_LIMIT_CHAT || '10', 10);
const MAX_MESSAGE_LENGTH = parseInt(process.env.MAX_MESSAGE_LENGTH || '5000', 10);
const MAX_HISTORY_CONTENT = parseInt(process.env.MAX_HISTORY_CONTENT || '2000', 10);
const MAX_HISTORY_LENGTH = parseInt(process.env.MAX_HISTORY_LENGTH || '20', 10);

// ── Main POST handler ────────────────────────────────────────

export async function POST(request: NextRequest) {
    const { session, idToken, error } = await requireSession(request);
    if (error) return error;

    const userEmail = session!.user?.email || 'anonymous';
    // FIX-005: no idToken means NextAuth could not supply a valid Google
    // OAuth ID token (refresh failed, stale cookie, etc). Force re-login.
    if (!idToken) {
        return new Response(
            JSON.stringify({ error: 'Session expired. Please sign in again.' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } },
        );
    }

    // SECURITY: Rate limit per user
    if (checkRateLimit(userEmail, 'chat', RATE_LIMIT_CHAT)) {
        return rateLimitResponse(getRetryAfterSeconds(userEmail, 'chat'));
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

        // SECURITY: Cap message size and history length
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

                // Hoisted so both the happy path and the finally block can
                // reach them. `result` holds whatever we managed to produce
                // (partial answer from the WS path, full answer from the
                // sync fallback, or null on total failure). `convId` is
                // hoisted so the finally block can still persist on failure.
                // `pipelineConvId` is the identifier we actually hand to the
                // backend pipeline — it is either a real conversation id
                // (on the happy path) or an ephemeral UUID (when
                // createConversation failed, per FR-017).
                let convId: string | null = conversationId;
                let pipelineConvId: string;
                let result: SmartResult | null = null;
                let errorUserMessage: string | null = null;

                try {
                    // ── Create/resolve conversation early ──
                    const title = message.length > 80 ? message.slice(0, 80) + '...' : message;

                    if (!convId) {
                        convId = await createConversation(BACKEND_URL, userEmail, title, idToken);
                    }

                    // FR-017: if conversation creation failed, use a fresh
                    // ephemeral UUID as the pipeline identifier instead of
                    // falling through to the client-supplied sessionId —
                    // the sessionId would collide on the backend memory
                    // store across tabs or repeated failed creates of the
                    // same user, mixing queries into a phantom conversation.
                    // FR-018: log the fallback loudly so operators see the
                    // backend outage in application logs.
                    if (convId) {
                        pipelineConvId = convId;
                        send({ type: 'conversation_saved', data: { id: convId, title } });

                        // Save user message NOW so it's visible if the user navigates away and back
                        await saveUserMessage(BACKEND_URL, convId, message, idToken);
                    } else {
                        pipelineConvId = crypto.randomUUID();
                        console.error(
                            '[chat] createConversation failed for user=%s — falling back to ephemeral id %s, no persistence',
                            userEmail,
                            pipelineConvId,
                        );
                    }

                    // The backend handles conversation context via conversation_id
                    // (memory agent in Redis), so we send just the raw question.

                    // Start the pipeline — show planning phase
                    send({ type: 'phase_change', data: 'planning' });
                    send({ type: 'thinking', data: 'Clasificando consulta...' });

                    // ── Try WebSocket streaming (real progress) ──
                    // pipelineConvId is either the real convId (happy path)
                    // or a per-request UUID when createConversation failed
                    // (FR-017). Never the sessionId — that would collide
                    // across tabs of the same user.
                    try {
                        result = await streamViaWebSocket(
                            message,
                            pipelineConvId,
                            policyMode,
                            send,
                            userEmail,
                            idToken,
                        );
                    } catch {
                        // WebSocket failed entirely — will fall back below
                        result = null;
                    }

                    // ── Fallback: synchronous POST ──
                    if (result === null) {
                        send({ type: 'thinking', data: 'Conectando v\u00eda alternativa...' });
                        const syncResult = await fetchSynchronous(
                            message,
                            pipelineConvId,
                            sessionId,
                            policyMode,
                            userEmail,
                            cappedHistory,
                            send,
                            idToken,
                        );
                        emitSyncResult(syncResult, send);
                        result = syncResult;
                    }

                    // On WS-emitted error events the error message was
                    // already sent to the browser; we fall through to
                    // finally so the half-saved conversation is closed
                    // with an errored assistant message instead of being
                    // left as an orphaned user question.
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
                    errorUserMessage = userMessage;
                    send({ type: 'error', data: userMessage });
                } finally {
                    // ── Persist the assistant message (success OR failure) ──
                    // This closes DEBT-002 and architecture/DEBT-010: before
                    // the 2026-04-10 fix the assistant message was only saved
                    // on the happy path, leaving orphaned user questions
                    // behind whenever the stream errored out. The helper
                    // lives in conversationService.ts after the 2026-04-11
                    // DEBT-005 split.
                    try {
                        const erroredByWs = Boolean(result?._wsError);
                        const hadError = Boolean(errorUserMessage) || erroredByWs;
                        const contentToSave =
                            (result?.answer && result.answer.length > 0 && result.answer) ||
                            errorUserMessage ||
                            (hadError ? '[error: respuesta no disponible]' : '');

                        if (convId && contentToSave) {
                            const formattedSources = (result?.sources || []).map((s) => ({
                                name: s.name,
                                url: s.url || '',
                                portal: s.portal,
                            }));
                            const saved = await saveAssistantMessageWithRetry({
                                backendUrl: BACKEND_URL,
                                convId,
                                idToken,
                                content: contentToSave,
                                sources: formattedSources.length > 0 ? formattedSources : null,
                                chartData: (result?.chart_data as Record<string, unknown>[] | null) || null,
                                mapData: (result?.map_data as Record<string, unknown> | null) || null,
                                documents: (result?.documents as Record<string, unknown>[] | null) || null,
                                confidence: typeof result?.confidence === 'number' ? result.confidence : null,
                                uiTrace: (result?.uiTrace as Record<string, unknown> | null) || null,
                                errored: hadError,
                            });
                            if (saved) {
                                send({
                                    type: 'assistant_message_saved',
                                    data: { assistantMessageId: saved.id },
                                });
                            }
                        }
                    } catch (persistErr) {
                        console.error('[chat] assistant persistence crashed', persistErr);
                    }

                    send({ type: 'done', data: null });

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
