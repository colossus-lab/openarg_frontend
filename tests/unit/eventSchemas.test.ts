/**
 * H11 (round v46) — runtime validation for SSE/WS event payloads.
 *
 * The pre-H11 useSSEStream cast every branch with `as`:
 *   case 'chart': charts.push(event.data as ChartData);
 *   case 'sources': sources = event.data as SourceAttribution[];
 * which made the consumer trust whatever bytes flowed through the
 * BFF stream. A malformed event (backend bug, MITM, drift between
 * versions) would either crash the renderer or silently corrupt the
 * conversation.
 *
 * The runtime validator narrows StreamEvent.data BEFORE the cast and
 * returns false on shape mismatches so the consumer can drop the
 * event and bump the fatal-parse-error budget.
 */

import { describe, expect, it } from 'vitest';

import {
    isAgentPhase,
    isChartData,
    isClarificationData,
    isDocumentList,
    isMapData,
    isResultMeta,
    isSourceList,
    validateEventData,
} from '@/lib/chat/eventSchemas';

describe('isAgentPhase', () => {
    it.each(['planning', 'data_collection', 'analysis', 'synthesis'])(
        'accepts %s',
        (phase) => {
            expect(isAgentPhase(phase)).toBe(true);
        },
    );

    it.each(['', 'unknown', 'Planning', null, 42, {}, ['planning']])(
        'rejects %s',
        (value) => {
            expect(isAgentPhase(value)).toBe(false);
        },
    );
});

describe('isChartData', () => {
    it('accepts a fully-populated chart', () => {
        expect(
            isChartData({
                type: 'bar_chart',
                title: 'PBI',
                data: [{ y: 1 }],
                xKey: 'year',
                yKeys: ['y'],
            }),
        ).toBe(true);
    });

    it('rejects when type is outside the union', () => {
        expect(
            isChartData({
                type: 'sankey',
                title: 'PBI',
                data: [],
                xKey: 'year',
                yKeys: ['y'],
            }),
        ).toBe(false);
    });

    it('rejects when yKeys is not a string[]', () => {
        expect(
            isChartData({
                type: 'bar_chart',
                title: 'PBI',
                data: [],
                xKey: 'year',
                yKeys: [1, 2, 3],
            }),
        ).toBe(false);
    });

    it('rejects on missing data array', () => {
        expect(
            isChartData({
                type: 'bar_chart',
                title: 'PBI',
                xKey: 'year',
                yKeys: ['y'],
            }),
        ).toBe(false);
    });
});

describe('isMapData', () => {
    it('accepts a FeatureCollection', () => {
        expect(isMapData({ type: 'FeatureCollection', features: [] })).toBe(true);
    });

    it('rejects other GeoJSON types', () => {
        expect(isMapData({ type: 'Feature', features: [] })).toBe(false);
        expect(isMapData({ type: 'FeatureCollection', features: 'bad' })).toBe(false);
    });
});

describe('isSourceList', () => {
    it('accepts a valid list', () => {
        expect(
            isSourceList([
                { name: 'A', url: 'https://a.test', portal: 'P' },
            ]),
        ).toBe(true);
    });

    it('rejects non-arrays', () => {
        expect(isSourceList({ name: 'A', url: 'https://a.test', portal: 'P' })).toBe(false);
    });

    it('rejects when any element is malformed', () => {
        expect(
            isSourceList([
                { name: 'A', url: 'https://a.test', portal: 'P' },
                { name: 'B', url: 42, portal: 'Q' },
            ]),
        ).toBe(false);
    });
});

describe('isDocumentList', () => {
    it('accepts records with doc_type', () => {
        expect(isDocumentList([{ doc_type: 'ddjj' }])).toBe(true);
    });

    it('rejects records missing the discriminator', () => {
        expect(isDocumentList([{ cuit: '123' }])).toBe(false);
    });
});

describe('isResultMeta', () => {
    it('accepts an empty object', () => {
        expect(isResultMeta({})).toBe(true);
    });

    it('accepts confidence as number', () => {
        expect(isResultMeta({ confidence: 0.82 })).toBe(true);
    });

    it('rejects confidence as string', () => {
        expect(isResultMeta({ confidence: '0.82' })).toBe(false);
    });
});

describe('isClarificationData', () => {
    it('accepts a question + options[]', () => {
        expect(
            isClarificationData({
                question: 'qué provincia te interesa?',
                options: ['Buenos Aires', 'CABA'],
            }),
        ).toBe(true);
    });

    it('rejects when options contains a non-string', () => {
        expect(
            isClarificationData({
                question: 'cuál?',
                options: ['A', 42],
            }),
        ).toBe(false);
    });
});

describe('validateEventData (drift surface)', () => {
    it('rejects content that is not a string — pre-H11 the SSE coerced an object to "[object Object]"', () => {
        expect(validateEventData('content', { unexpected: 'shape' })).toBe(false);
    });

    it('rejects sources that is not an array — pre-H11 led to .map() throwing', () => {
        expect(validateEventData('sources', { single: 'source' })).toBe(false);
    });

    it('accepts a fully-typed chart', () => {
        expect(
            validateEventData('chart', {
                type: 'line_chart',
                title: 'IPC',
                data: [],
                xKey: 'mes',
                yKeys: ['valor'],
            }),
        ).toBe(true);
    });

    it('returns true for unknown event types (forward compat)', () => {
        // We don't want to weaponize the gate against a future event the
        // backend introduces; only known types are tightly checked.
        expect(validateEventData('future_thing', { whatever: 1 })).toBe(true);
    });

    it('allows done with null payload', () => {
        expect(validateEventData('done', null)).toBe(true);
        expect(validateEventData('done', undefined)).toBe(true);
        expect(validateEventData('done', { stats: 'ok' })).toBe(true);
    });
});
