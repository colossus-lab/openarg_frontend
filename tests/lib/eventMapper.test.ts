import { describe, expect, it } from 'vitest';

import { mapStatusStep } from '@/lib/chat/eventMapper';

describe('mapStatusStep', () => {
    it('muestra los pasos del agente tal como los manda el backend', () => {
        // Secuencia real de staging (02-oct), pregunta de Pinamar.
        const events: Array<[string, string]> = [
            ['classifying', 'Analizando consulta...'],
            ['cache_check', 'Buscando en caché...'],
            ['coordination', 'Pensando…'],
            ['searching', 'Buscando «personas con discapacidad» en el catálogo'],
            ['searching', 'Encontró 8 datasets y 5 tablas curadas'],
            ['generating', 'Escribiendo la respuesta…'],
        ];
        const visibles = events
            .map(([step, detail]) => mapStatusStep(step, { detail }).thinking)
            .filter(Boolean);
        expect(visibles).toEqual([
            'Entendiendo tu pregunta...',
            'Pensando…',
            'Buscando «personas con discapacidad» en el catálogo',
            'Encontró 8 datasets y 5 tablas curadas',
            'Escribiendo la respuesta…',
        ]);
    });

    it('sin detalle, generating conserva el texto de siempre', () => {
        expect(mapStatusStep('generating').thinking).toBe('Analizando lo que encontramos...');
    });
});
