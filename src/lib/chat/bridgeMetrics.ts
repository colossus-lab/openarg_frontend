import { logger } from '@/lib/logger';

export type BridgeMetricName =
    | 'ws_open'
    | 'ws_complete'
    | 'ws_connect_timeout'
    | 'ws_activity_timeout_partial'
    | 'ws_activity_timeout_empty'
    | 'ws_backend_error_event'
    | 'ws_parse_error_budget_exceeded'
    | 'ws_error'
    | 'ws_close_without_complete'
    | 'http_fallback_start'
    | 'http_fallback_success'
    | 'http_fallback_error';

type BridgeMetricsState = {
    counters: Record<BridgeMetricName, number>;
    lastEventAt: string | null;
    lastEventName: BridgeMetricName | null;
    connectLatencyCount: number;
    connectLatencyMaxMs: number;
    connectLatencyTotalMs: number;
};

const METRIC_NAMES: BridgeMetricName[] = [
    'ws_open',
    'ws_complete',
    'ws_connect_timeout',
    'ws_activity_timeout_partial',
    'ws_activity_timeout_empty',
    'ws_backend_error_event',
    'ws_parse_error_budget_exceeded',
    'ws_error',
    'ws_close_without_complete',
    'http_fallback_start',
    'http_fallback_success',
    'http_fallback_error',
];

function buildInitialState(): BridgeMetricsState {
    return {
        counters: Object.fromEntries(METRIC_NAMES.map((name) => [name, 0])) as Record<BridgeMetricName, number>,
        lastEventAt: null,
        lastEventName: null,
        connectLatencyCount: 0,
        connectLatencyMaxMs: 0,
        connectLatencyTotalMs: 0,
    };
}

const state = buildInitialState();

export function recordBridgeMetric(
    name: BridgeMetricName,
    details: Record<string, unknown> = {},
): void {
    state.counters[name] += 1;
    state.lastEventAt = new Date().toISOString();
    state.lastEventName = name;

    const connectMs = typeof details.connectMs === 'number' ? details.connectMs : null;
    if (connectMs !== null && Number.isFinite(connectMs)) {
        state.connectLatencyCount += 1;
        state.connectLatencyTotalMs += connectMs;
        state.connectLatencyMaxMs = Math.max(state.connectLatencyMaxMs, connectMs);
    }

    logger.info('[chat-bridge-metric]', {
        metric: name,
        count: state.counters[name],
        ...details,
    });
}

export function getBridgeMetricsSnapshot() {
    const counters = { ...state.counters };
    const avgConnectMs =
        state.connectLatencyCount > 0
            ? Math.round(state.connectLatencyTotalMs / state.connectLatencyCount)
            : null;

    return {
        counters,
        lastEventAt: state.lastEventAt,
        lastEventName: state.lastEventName,
        connectLatency: {
            count: state.connectLatencyCount,
            avgMs: avgConnectMs,
            maxMs: state.connectLatencyMaxMs || null,
        },
    };
}

export function resetBridgeMetricsForTests(): void {
    const initial = buildInitialState();
    for (const metric of METRIC_NAMES) {
        state.counters[metric] = initial.counters[metric];
    }
    state.lastEventAt = null;
    state.lastEventName = null;
    state.connectLatencyCount = 0;
    state.connectLatencyMaxMs = 0;
    state.connectLatencyTotalMs = 0;
}

