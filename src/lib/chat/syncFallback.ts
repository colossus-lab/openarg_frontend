// ============================================================
// HTTP synchronous fallback — 001b-http-fallback
//
// Owns the POST to /api/v1/query/smart that we fall back to when the
// WebSocket primary path fails, the mapping from raw HTTP status codes
// to user-friendly Spanish error strings, and the synthesized phase
// progression (planning → data_collection → analysis → synthesis)
// that keeps the UX consistent when there is no real streaming.
//
// Extracted from src/app/api/chat/route.ts on 2026-04-11 as part of
// the DEBT-005 code split. See
// specs/001-chat-bridge/001b-http-fallback/spec.md.
// ============================================================

import { backendHeaders } from '@/lib/auth';

import { recordBridgeMetric } from './bridgeMetrics';
import { emitResultData } from './eventMapper';
import type { SendFn, SmartResult } from './types';

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';

/** POST the question to the sync endpoint. Maps raw HTTP failures to
 *  user-friendly Spanish error messages — the only error text that
 *  reaches the browser for these paths should already be translated
 *  here, never the raw backend response body. */
export async function fetchSynchronous(
    questionWithContext: string,
    conversationId: string,
    sessionId: string,
    policyMode: boolean,
    userEmail: string,
    history: { role: string; content: string }[],
    send: SendFn,
    idToken: string,
): Promise<SmartResult> {
    console.info('[chat-bridge] http_fallback_start', {
        conversationId,
        policyMode,
        historyLength: history.length,
    });
    recordBridgeMetric('http_fallback_start', {
        conversationId,
        policyMode,
        historyLength: history.length,
    });
    send({ type: 'thinking', data: 'Conectando con el servidor...' });

    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/query/smart`, {
        method: 'POST',
        headers: backendHeaders(idToken),
        body: JSON.stringify({
            question: questionWithContext,
            user_email: userEmail || sessionId,
            conversation_id: conversationId || sessionId,
            policy_mode: policyMode,
            history: history.length > 0 ? history : undefined,
        }),
    });

    if (!backendResponse.ok) {
        recordBridgeMetric('http_fallback_error', {
            conversationId,
            policyMode,
            status: backendResponse.status,
        });
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
        } catch {
            /* ignore read errors */
        }

        if (status === 502 || status === 503 || status === 504) {
            throw new Error(
                'El sistema de an\u00e1lisis no est\u00e1 disponible en este momento. Intent\u00e1 de nuevo en unos minutos.',
            );
        } else if (status === 429) {
            throw new Error(
                'Demasiadas consultas. Esper\u00e1 un momento antes de intentar de nuevo.',
            );
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

    console.info('[chat-bridge] http_fallback_success', {
        conversationId,
        cached: Boolean(result.cached),
        casual: Boolean(result.casual),
        sources: result.sources?.length || 0,
    });
    recordBridgeMetric('http_fallback_success', {
        conversationId,
        policyMode,
        cached: Boolean(result.cached),
        casual: Boolean(result.casual),
        sources: result.sources?.length || 0,
    });

    return result;
}

/** Emit the synthesized phase progression from a SmartResult obtained
 *  via the HTTP sync fallback. Mirrors the `complete` event flow of
 *  the WS path so the browser sees the same sequence of SSE events
 *  regardless of which path produced the answer. */
export function emitSyncResult(result: SmartResult, send: SendFn): void {
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
    const portalNames = [
        ...new Set((result.sources || []).map((s) => s.portal).filter(Boolean)),
    ];

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
