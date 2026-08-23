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
import { CHAT_MIN_DISPLAY_MS } from './config';

/** Minimum time an answer must be visible before the stream closes.
 *  Applied by wsBridge when a cache hit returns in <2s to avoid a
 *  jarring "flashed and gone" UX. See FR-028 in the sub-spec. */
export const MIN_DISPLAY_MS = CHAT_MIN_DISPLAY_MS;

type StatusMapper = (
    extra?: Record<string, unknown>,
) => MappedEvent;

const STATUS_STEP_MAPPERS: Record<string, StatusMapper> = {
    classifying: () => ({ phase: 'planning', thinking: 'Entendiendo tu pregunta...' }),
    cache_check: () => ({ thinking: 'Buscando en caché...' }),
    cache_hit: () => ({ thinking: '¡Ya tengo esa info lista!' }),
    loading_context: () => ({ thinking: 'Cargando contexto de conversación...' }),
    coordination: (extra) => ({
        thinking: (extra?.detail as string | undefined) || 'Evaluando resultados...',
    }),
    replanning: (extra) => ({
        phase: 'planning',
        thinking:
            (extra?.detail as string | undefined) ||
            'Replanificando búsqueda con nueva estrategia...',
    }),
    skill: (extra) => ({
        phase: 'planning',
        thinking:
            (extra?.detail as string | undefined) ||
            'Aplicando estrategia especializada...',
    }),
    planning: () => ({
        phase: 'planning',
        thinking: 'Armando la estrategia con el equipo...',
    }),
    planned: (extra) => {
        const count = extra?.steps_count ?? '?';
        return {
            thinking: `Listo, el equipo va a investigar en ${count} fuente${count !== 1 ? 's' : ''}`,
        };
    },
    searching: (extra) => ({
        phase: 'data_collection',
        thinking:
            (extra?.detail as string | undefined) ||
            'Recorriendo los portales de datos...',
    }),
    generating: () => ({
        phase: 'analysis',
        thinking: 'Analizando lo que encontramos...',
    }),
    policy_analysis: () => ({
        thinking: 'Evaluando el impacto de la política...',
    }),
};

const STATUS_STEP_PREFIX_MAPPERS: Array<[prefix: string, mapper: StatusMapper]> = [
    [
        'search_',
        (extra) => ({
            phase: 'data_collection',
            thinking:
                (extra?.detail as string | undefined) ||
                'Recorriendo los portales de datos...',
        }),
    ],
    [
        'analysis_',
        (extra) => ({
            phase: 'analysis',
            thinking:
                (extra?.detail as string | undefined) ||
                'Analizando los resultados encontrados...',
        }),
    ],
];

/** Canonical translation from backend status step → frontend phase/thinking.
 *  See the FR-025 table in the sub-module spec for the authoritative mapping. */
export function mapStatusStep(
    step: string,
    extra?: Record<string, unknown>,
): MappedEvent {
    const exactMapper = STATUS_STEP_MAPPERS[step];
    if (exactMapper) {
        return exactMapper(extra);
    }

    for (const [prefix, mapper] of STATUS_STEP_PREFIX_MAPPERS) {
        if (step.startsWith(prefix)) {
            return mapper(extra);
        }
    }

    return { thinking: `Procesando: ${step}...` };
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
    send({
        type: 'result_meta',
        data: {
            confidence: result.confidence,
            warnings: result.warnings ?? [],
        },
    });
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
