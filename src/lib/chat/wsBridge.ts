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
    policyMode: boolean,
    send: SendFn,
): Promise<SmartResult | null> {
    const wsUrl = buildWsUrl();

    return new Promise<SmartResult | null>((resolve) => {
        let resolved = false;
        let completeResult: SmartResult | null = null;
        let accumulatedContent = '';
        let parseErrorCount = 0;
        const wsStartTime = Date.now();

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
        const connectTimeout = setTimeout(() => safeResolve(null), 8000);

        // Activity timeout: if no message for 120s after connection, consider dead.
        let activityTimeout: ReturnType<typeof setTimeout>;
        const resetActivityTimeout = () => {
            clearTimeout(activityTimeout);
            activityTimeout = setTimeout(() => {
                if (accumulatedContent) {
                    safeResolve({
                        answer: accumulatedContent,
                        sources: [],
                        chart_data: null,
                        map_data: null,
                    });
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
            ws.send(
                JSON.stringify({
                    question: questionWithContext,
                    conversation_id: conversationId || '',
                    policy_mode: policyMode,
                }),
            );
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
                        const answer = event.answer || accumulatedContent;
                        completeResult = {
                            answer,
                            sources: event.sources || [],
                            chart_data: event.chart_data || null,
                            map_data: event.map_data || null,
                            documents: event.documents || null,
                            confidence: event.confidence,
                            citations: event.citations || [],
                            casual: event.casual || false,
                            cached: event.cached || false,
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
                        send({ type: 'error', data: msg });
                        // Resolve with explicit flag so the caller knows NOT to fall back.
                        safeResolve({ answer: '', sources: [], _wsError: true } as SmartResult);
                        break;
                    }
                }
            } catch {
                parseErrorCount++;
                if (parseErrorCount > 5) {
                    send({
                        type: 'error',
                        data: 'Demasiados errores de comunicación. La respuesta puede estar incompleta.',
                    });
                    safeResolve(
                        accumulatedContent
                            ? {
                                  answer: accumulatedContent,
                                  sources: [],
                                  chart_data: null,
                                  map_data: null,
                              }
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
                // If we accumulated content but never got "complete", build a partial result.
                safeResolve(
                    accumulatedContent
                        ? {
                              answer: accumulatedContent,
                              sources: [],
                              chart_data: null,
                              map_data: null,
                          }
                        : null,
                );
            }
        });
    });
}
