// ============================================================
// WebSocket primary path — 001a-ws-bridge
//
// Owns the WebSocket connection to the backend's /api/v1/query/ws/smart
// endpoint, the 8s connect timeout and 120s activity timeout, the
// parse-error budget (5 errors before bailing out with whatever we
// have), and the minDisplayMs delay for fast cache hits.
//
// Extracted from src/app/api/chat/route.ts on 2026-04-11 as part of
// the DEBT-005 code split. See
// specs/001-chat-bridge/001a-ws-bridge/spec.md.
// ============================================================

import WebSocket from 'ws';

import { recordBridgeMetric } from './bridgeMetrics';
import { emitResultData, mapStatusStep, MIN_DISPLAY_MS } from './eventMapper';
import type { SendFn, SmartResult } from './types';

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';
const BACKEND_API_KEY = process.env.OPENARG_BACKEND_API_KEY || '';

/** Build the WebSocket URL from the HTTP backend URL. */
export function buildWsUrl(): string {
    const base = BACKEND_URL.replace(/^http/, 'ws');
    const url = new URL('/api/v1/query/ws/smart', base);
    if (BACKEND_API_KEY) {
        url.searchParams.set('api_key', BACKEND_API_KEY);
    }
    return url.toString();
}

/** Open a WebSocket to the backend, stream status + chunk + complete
 *  events to the browser via `send`, and return the final SmartResult
 *  on completion — or `null` if the WS failed and the caller should
 *  fall back to the HTTP sync path.
 *
 *  The only case where we return a non-null result with no real data
 *  is when the backend emits an explicit `error` or `clarification`
 *  event: in both cases `_wsError = true` is set, telling the caller
 *  "the error message was already sent to the browser, do NOT fall
 *  back — just save what we have and close the stream". */
export async function streamViaWebSocket(
    questionWithContext: string,
    conversationId: string,
    deepMode: boolean,
    send: SendFn,
    userEmail: string = '',
    idToken: string = '',
): Promise<SmartResult | null> {
    const wsUrl = buildWsUrl();
    const bridgeLog = (
        event: string,
        details: Record<string, unknown> = {},
    ) => {
        console.info('[chat-bridge] ws', {
            event,
            conversationId,
            deepMode,
            ...details,
        });
    };

    return new Promise<SmartResult | null>((resolve) => {
        let resolved = false;
        let completeResult: SmartResult | null = null;
        let terminalCompleteReceived = false;
        let accumulatedContent = '';
        let parseErrorCount = 0;
        const wsStartTime = Date.now();
        const partialResult = (): SmartResult => ({
            answer: accumulatedContent,
            sources: [],
            chart_data: null,
            map_data: null,
            _wsError: true,
        });

        const safeResolve = (value: SmartResult | null) => {
            if (resolved) return;
            resolved = true;
            clearTimeout(connectTimeout);
            clearTimeout(activityTimeout);
            try {
                ws.close();
            } catch {
                /* ignore */
            }
            resolve(value);
        };

        // Timeout: if the WS doesn't connect in 8 seconds, fall back.
        const connectTimeout = setTimeout(() => {
            bridgeLog('connect_timeout');
            recordBridgeMetric('ws_connect_timeout', { conversationId, deepMode });
            safeResolve(null);
        }, 8000);

        // Activity timeout: if no message for 120s after connection, consider dead.
        let activityTimeout: ReturnType<typeof setTimeout>;
        const resetActivityTimeout = () => {
            clearTimeout(activityTimeout);
            activityTimeout = setTimeout(() => {
                if (accumulatedContent) {
                    bridgeLog('activity_timeout_partial', {
                        contentLength: accumulatedContent.length,
                    });
                    recordBridgeMetric('ws_activity_timeout_partial', {
                        conversationId,
                        deepMode,
                        contentLength: accumulatedContent.length,
                    });
                    send({
                        type: 'error',
                        data: 'La conexión se interrumpió antes de completar la respuesta. Se muestra el contenido parcial disponible.',
                    });
                    safeResolve(partialResult());
                } else {
                    bridgeLog('activity_timeout_empty');
                    recordBridgeMetric('ws_activity_timeout_empty', { conversationId, deepMode });
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
            const connectMs = Date.now() - wsStartTime;
            bridgeLog('open', { connectMs });
            recordBridgeMetric('ws_open', { conversationId, deepMode, connectMs });
            ws.send(
                JSON.stringify({
                    question: questionWithContext,
                    conversation_id: conversationId || '',
                    mode: deepMode ? 'deep' : 'normal',
                    // Round v46 WS JWT-in-handshake: the backend validates
                    // this Google ID token server-side and treats the
                    // verified `email` claim as the source of truth for
                    // ownership + telemetry. The body's user_email is a
                    // belt for the JWT's suspenders — both fields can
                    // disagree only if the caller is spoofing, in which
                    // case the backend closes 4403.
                    user_email: userEmail,
                    id_token: idToken,
                }),
            );
        });

        ws.on('message', (raw: WebSocket.Data) => {
            if (resolved) return;
            resetActivityTimeout();
            try {
                const event = JSON.parse(raw.toString());
                const eventType: string = event.type;
                parseErrorCount = 0;

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
                    case 'clear_answer': {
                        // CONTRACT-05 (round v46): the backend emits this
                        // when the analyst retries mid-stream (see
                        // analyst.py:522). Without resetting our local
                        // accumulator the bridge concatenated the failed
                        // attempt's chunks onto the retry's chunks and
                        // shipped both as the answer — the user saw
                        // duplicated paragraphs. We also forward an
                        // empty-content marker so the SSE consumer can
                        // clear its own typewriter buffer.
                        accumulatedContent = '';
                        send({ type: 'clear_answer', data: null });
                        break;
                    }
                    case 'complete': {
                        terminalCompleteReceived = true;
                        const answer = event.answer || accumulatedContent;
                        completeResult = {
                            answer,
                            sources: event.sources || [],
                            chart_data: event.chart_data || null,
                            map_data: event.map_data || null,
                            documents: event.documents || null,
                            confidence: event.confidence,
                            citations: event.citations || [],
                            warnings: event.warnings || [],
                            casual: event.casual || false,
                            cached: event.cached || false,
                            // CONTRACT-03 (round v46): tokens_used now flows
                            // through the WS complete event for parity with
                            // the HTTP response — SPA telemetry no longer
                            // sees a flat 0 on the streaming path.
                            tokens_used: typeof event.tokens_used === 'number'
                                ? event.tokens_used
                                : 0,
                        };
                        // If no chunks were streamed (e.g. cache hit), emit the
                        // full answer as content so the frontend has text to show.
                        if (!accumulatedContent && answer) {
                            send({ type: 'content', data: answer });
                        }
                        // If the response came too fast (<MIN_DISPLAY_MS), add
                        // a brief delay so the UI transition doesn't feel abrupt.
                        const elapsed = Date.now() - wsStartTime;
                        const finalize = () => {
                            emitResultData(completeResult!, send);
                            send({ type: 'phase_change', data: 'synthesis' });
                            safeResolve(completeResult);
                        };
                        if (elapsed < MIN_DISPLAY_MS) {
                            setTimeout(finalize, MIN_DISPLAY_MS - elapsed);
                        } else {
                            finalize();
                        }
                        bridgeLog('complete', {
                            cached: Boolean(completeResult.cached),
                            casual: Boolean(completeResult.casual),
                            sources: completeResult.sources?.length || 0,
                        });
                        recordBridgeMetric('ws_complete', {
                            conversationId,
                            deepMode,
                            cached: Boolean(completeResult.cached),
                            casual: Boolean(completeResult.casual),
                            sources: completeResult.sources?.length || 0,
                        });
                        break;
                    }
                    case 'clarification': {
                        // Backend needs clarification — forward to the frontend.
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
                        // Backend sent an error event — propagate it.
                        const msg = event.message || 'Error del servidor.';
                        bridgeLog('backend_error_event', {
                            degraded: Boolean(accumulatedContent),
                            contentLength: accumulatedContent.length,
                        });
                        recordBridgeMetric('ws_backend_error_event', {
                            conversationId,
                            deepMode,
                            degraded: Boolean(accumulatedContent),
                            contentLength: accumulatedContent.length,
                        });
                        send({ type: 'error', data: msg });
                        // Resolve with explicit flag so the caller knows NOT to fall back.
                        safeResolve({
                            answer: accumulatedContent,
                            sources: [],
                            chart_data: null,
                            map_data: null,
                            _wsError: true,
                        } as SmartResult);
                        break;
                    }
                }
            } catch {
                parseErrorCount++;
                if (parseErrorCount > 5) {
                    bridgeLog('parse_error_budget_exceeded', { parseErrorCount });
                    recordBridgeMetric('ws_parse_error_budget_exceeded', {
                        conversationId,
                        deepMode,
                        parseErrorCount,
                    });
                    send({
                        type: 'error',
                        data: 'Demasiados errores de comunicación. La respuesta puede estar incompleta.',
                    });
                    safeResolve(
                        accumulatedContent
                            ? partialResult()
                            : null,
                    );
                }
            }
        });

        ws.on('error', () => {
            if (terminalCompleteReceived) {
                return;
            }
            bridgeLog('error', {
                degraded: Boolean(accumulatedContent),
                contentLength: accumulatedContent.length,
            });
            recordBridgeMetric('ws_error', {
                conversationId,
                deepMode,
                degraded: Boolean(accumulatedContent),
                contentLength: accumulatedContent.length,
            });
            safeResolve(accumulatedContent ? partialResult() : null);
        });

        ws.on('close', () => {
            if (!resolved && !terminalCompleteReceived) {
                bridgeLog('close_without_complete', {
                    degraded: Boolean(accumulatedContent),
                    contentLength: accumulatedContent.length,
                });
                recordBridgeMetric('ws_close_without_complete', {
                    conversationId,
                    deepMode,
                    degraded: Boolean(accumulatedContent),
                    contentLength: accumulatedContent.length,
                });
                // If we accumulated content but never got "complete", build a partial result.
                safeResolve(
                    accumulatedContent ? partialResult() : null,
                );
            }
        });
    });
}
