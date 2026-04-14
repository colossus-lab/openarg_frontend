import { beforeEach, describe, expect, it } from 'vitest';

import {
    getBridgeMetricsSnapshot,
    recordBridgeMetric,
    resetBridgeMetricsForTests,
} from '@/lib/chat/bridgeMetrics';

describe('bridgeMetrics', () => {
    beforeEach(() => {
        resetBridgeMetricsForTests();
    });

    it('tracks counters and connect latency aggregates', () => {
        recordBridgeMetric('ws_open', { connectMs: 120 });
        recordBridgeMetric('ws_open', { connectMs: 80 });
        recordBridgeMetric('http_fallback_start');

        const snapshot = getBridgeMetricsSnapshot();

        expect(snapshot.counters.ws_open).toBe(2);
        expect(snapshot.counters.http_fallback_start).toBe(1);
        expect(snapshot.lastEventName).toBe('http_fallback_start');
        expect(snapshot.connectLatency).toEqual({
            count: 2,
            avgMs: 100,
            maxMs: 120,
        });
    });
});

