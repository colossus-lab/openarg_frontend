// ============================================================
// Event mapping — 001c-event-mapping
//
// Owns the canonical translation from backend `status.step` values to
// user-visible {phase, thinking} pairs, the helper that formats source
// lists for the browser, and the minDisplayMs constant used by the WS
// bridge to avoid flashing a cache hit too fast.
//
// Extracted from src/app/api/chat/route.ts on 2026-04-11 as part of
// the DEBT-005 code split. See
// specs/001-chat-bridge/001c-event-mapping/spec.md.
// ============================================================

import type { MappedEvent, SmartResult, SendFn } from './types';

/** Minimum time an answer must be visible before the stream closes.
 *  Applied by wsBridge when a cache hit returns in <2s to avoid a
 *  jarring "flashed and gone" UX. See FR-028 in the sub-spec. */
export const MIN_DISPLAY_MS = 2000;

/** Canonical translation from backend status step → frontend phase/thinking.
 *  See the FR-025 table in the sub-module spec for the authoritative mapping. */
export function mapStatusStep(
    step: string,
    extra?: Record<string, unknown>,
): MappedEvent {
    switch (step) {
        case 'classifying':
            return { phase: 'planning', thinking: 'Entendiendo tu pregunta...' };
        case 'cache_check':
            return { thinking: 'Buscando en caché...' };
        case 'cache_hit':
            return { thinking: '\u00a1Ya tengo esa info lista!' };
        case 'loading_context':
            return { thinking: 'Cargando contexto de conversación...' };
        case 'coordination': {
            const coordDetail = extra?.detail as string | undefined;
            return { thinking: coordDetail || 'Evaluando resultados...' };
        }
        case 'replanning': {
            const replanDetail = extra?.detail as string | undefined;
            return {
                phase: 'planning',
                thinking: replanDetail || 'Replanificando búsqueda con nueva estrategia...',
            };
        }
        case 'skill': {
            const skillDetail = extra?.detail as string | undefined;
            return {
                phase: 'planning',
                thinking: skillDetail || 'Aplicando estrategia especializada...',
            };
        }
        case 'planning':
            return { phase: 'planning', thinking: 'Armando la estrategia con el equipo...' };
        case 'planned': {
            const count = extra?.steps_count ?? '?';
            return {
                thinking: `Listo, el equipo va a investigar en ${count} fuente${count !== 1 ? 's' : ''}`,
            };
        }
        case 'searching': {
            const detail = extra?.detail as string | undefined;
            return {
                phase: 'data_collection',
                thinking: detail || 'Recorriendo los portales de datos...',
            };
        }
        case 'generating':
            return { phase: 'analysis', thinking: 'Analizando lo que encontramos...' };
        case 'policy_analysis':
            return { thinking: 'Evaluando el impacto de la pol\u00edtica...' };
        default:
            return { thinking: `Procesando: ${step}...` };
    }
}

/** Format sources from the backend shape (`name`, `url`, `portal`,
 *  `accessed_at`) to the frontend shape (`name`, `url`, `portal`,
 *  `accessedAt`). Empty `url` values are replaced with the datos.gob.ar
 *  fallback so the UI always has something clickable. */
export function formatSources(
    sources: SmartResult['sources'],
): Record<string, unknown>[] {
    return (sources || []).map((s) => ({
        name: s.name,
        url: s.url || 'https://datos.gob.ar',
        portal: s.portal,
        accessedAt: s.accessed_at || new Date().toISOString(),
    }));
}

/** Emit sources, charts, documents and map_data from a SmartResult.
 *  Shared by both the WS happy path and the sync fallback path so they
 *  produce identical SSE output given the same result. */
export function emitResultData(result: SmartResult, send: SendFn): void {
    if (result.sources && result.sources.length > 0) {
        send({ type: 'sources', data: formatSources(result.sources) });
    }
    if (result.chart_data && result.chart_data.length > 0) {
        for (const chart of result.chart_data) {
            send({ type: 'chart', data: chart });
        }
    }
    if (result.map_data && typeof result.map_data === 'object') {
        send({ type: 'map', data: result.map_data });
    }
    if (result.documents && result.documents.length > 0) {
        send({ type: 'documents', data: result.documents });
    }
}
