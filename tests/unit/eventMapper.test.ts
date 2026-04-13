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
            data: { confidence: 0.78 },
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
