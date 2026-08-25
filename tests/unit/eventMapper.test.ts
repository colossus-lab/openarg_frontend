import { describe, expect, it, vi } from 'vitest';

import { emitResultData, mapStatusStep } from '@/lib/chat/eventMapper';

describe('mapStatusStep', () => {
    it('maps known search-prefixed steps to the data collection phase', () => {
        expect(mapStatusStep('search_ckan', {})).toEqual({
            phase: 'data_collection',
            thinking: 'Recorriendo los portales de datos...',
        });
    });

    it('maps known analysis-prefixed steps to the analysis phase', () => {
        expect(mapStatusStep('analysis_summary', {})).toEqual({
            phase: 'analysis',
            thinking: 'Analizando los resultados encontrados...',
        });
    });

    it('falls back to the generic processing label for unknown steps', () => {
        expect(mapStatusStep('totally_unknown_step', {})).toEqual({
            thinking: 'Procesando: totally_unknown_step...',
        });
    });
});

describe('emitResultData', () => {
    it('emits result metadata before rich result payloads', () => {
        const send = vi.fn();

        emitResultData(
            {
                answer: 'ok',
                confidence: 0.78,
                sources: [
                    {
                        name: 'Fuente',
                        url: 'https://datos.gob.ar',
                        portal: 'datos.gob.ar',
                        accessed_at: '2026-04-12T00:00:00Z',
                    },
                ],
            },
            send,
        );

        expect(send).toHaveBeenNthCalledWith(1, {
            type: 'result_meta',
            data: { confidence: 0.78, warnings: [] },
        });
        expect(send).toHaveBeenNthCalledWith(2, {
            type: 'sources',
            data: [
                {
                    name: 'Fuente',
                    url: 'https://datos.gob.ar',
                    portal: 'datos.gob.ar',
                    accessedAt: '2026-04-12T00:00:00Z',
                },
            ],
        });
    });
});

describe('data-age notices', () => {
    it('forwards the backend warnings so the reader can see how old the data is', () => {
        // The backend has emitted `warnings` on the complete event all along and
        // nothing read them, so an answer resting on data last collected in May
        // looked exactly like one collected this morning.
        const send = vi.fn();
        emitResultData(
            {
                answer: 'La pobreza fue del 38 %.',
                warnings: ['Los datos de esta respuesta se leyeron por última vez en mayo de 2026.'],
            } as never,
            send,
        );
        expect(send).toHaveBeenNthCalledWith(1, {
            type: 'result_meta',
            data: {
                confidence: undefined,
                warnings: ['Los datos de esta respuesta se leyeron por última vez en mayo de 2026.'],
            },
        });
    });

    it('sends an empty list when the data is current, so the UI shows nothing', () => {
        // Only stale data earns a line. A notice on every answer becomes
        // furniture the reader stops seeing, and then it is not there on the
        // day it matters.
        const send = vi.fn();
        emitResultData({ answer: 'ok' } as never, send);
        expect(send).toHaveBeenNthCalledWith(1, {
            type: 'result_meta',
            data: { confidence: undefined, warnings: [] },
        });
    });
});
