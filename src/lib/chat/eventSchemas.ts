// ============================================================
// Runtime validation for SSE / WS event payloads — round v46 H11.
//
// `StreamEvent.data` is typed `unknown` precisely because the SSE
// channel terminates inside an unsanitized stream of JSON blobs:
// the browser does NOT get to assume that `event.type === 'chart'`
// implies `event.data` is a ChartData. The pre-H11 useSSEStream
// cast every branch with `as` (e.g. `event.data as ChartData`)
// which made the consumer trust whatever the backend (or a man-
// in-the-middle injecting frames into the BFF stream) sent.
//
// We do this with hand-written type guards instead of pulling in
// zod / valibot: the schema surface here is small (~7 shapes), the
// guards are exhaustive on the relevant discriminator, and a new
// dep on a runtime validator inflates the bundle for the
// already-thin BFF client. If the schema grows, the right move is
// adopt zod and migrate this file in one PR — the call sites in
// useSSEStream/wsBridge already centralize the validation behind
// `validateEventData(type, data)` so the swap is localized.
// ============================================================

import type {
    AgentPhase,
    ChartData,
    DocumentRecord,
    MapData,
    ResultMeta,
    SourceAttribution,
} from '@/lib/types';

const VALID_PHASES = new Set<AgentPhase>([
    'planning',
    'data_collection',
    'analysis',
    'synthesis',
]);

const VALID_CHART_TYPES = new Set([
    'line_chart',
    'bar_chart',
    'pie_chart',
    'heatmap',
    'scatter',
]);

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
    Array.isArray(value) && value.every((v) => typeof v === 'string');

export function isAgentPhase(value: unknown): value is AgentPhase {
    return typeof value === 'string' && VALID_PHASES.has(value as AgentPhase);
}

export function isChartData(value: unknown): value is ChartData {
    if (!isObject(value)) return false;
    if (typeof value.type !== 'string' || !VALID_CHART_TYPES.has(value.type)) {
        return false;
    }
    if (typeof value.title !== 'string') return false;
    if (!Array.isArray(value.data)) return false;
    if (typeof value.xKey !== 'string') return false;
    if (!isStringArray(value.yKeys)) return false;
    return true;
}

export function isMapData(value: unknown): value is MapData {
    if (!isObject(value)) return false;
    if (value.type !== 'FeatureCollection') return false;
    if (!Array.isArray(value.features)) return false;
    return true;
}

function isSourceAttribution(value: unknown): value is SourceAttribution {
    if (!isObject(value)) return false;
    return (
        typeof value.name === 'string' &&
        typeof value.url === 'string' &&
        typeof value.portal === 'string'
    );
}

export function isSourceList(value: unknown): value is SourceAttribution[] {
    return Array.isArray(value) && value.every(isSourceAttribution);
}

function isDocumentRecord(value: unknown): value is DocumentRecord {
    if (!isObject(value)) return false;
    return typeof value.doc_type === 'string';
}

export function isDocumentList(value: unknown): value is DocumentRecord[] {
    return Array.isArray(value) && value.every(isDocumentRecord);
}

export function isResultMeta(value: unknown): value is ResultMeta {
    if (!isObject(value)) return false;
    if ('confidence' in value && typeof value.confidence !== 'number') {
        return false;
    }
    return true;
}

export interface ClarificationData {
    question: string;
    options: string[];
}

export function isClarificationData(value: unknown): value is ClarificationData {
    if (!isObject(value)) return false;
    if (typeof value.question !== 'string') return false;
    if (!isStringArray(value.options)) return false;
    return true;
}

/** A `conversation_saved` event carries the new conversation id + title. */
export interface ConversationSavedData {
    id: string;
    title: string;
}

export function isConversationSavedData(
    value: unknown,
): value is ConversationSavedData {
    if (!isObject(value)) return false;
    return typeof value.id === 'string' && typeof value.title === 'string';
}

/** A `assistant_message_saved` event carries the persisted msg id. */
export interface AssistantMessageSavedData {
    assistantMessageId: string;
}

export function isAssistantMessageSavedData(
    value: unknown,
): value is AssistantMessageSavedData {
    if (!isObject(value)) return false;
    return typeof value.assistantMessageId === 'string';
}

/** True when `data` is a usable payload for the given event type.
 *
 * Returning false from this function is how the consumer detects a
 * malformed event — the WS bridge and useSSEStream then drop the event
 * and bump their fatal-parse-error budget. Logging the rejection at
 * the call site (with the event type) is what makes a future drift
 * visible in Sentry instead of silently corrupting the UI. */
export function validateEventData(type: string, data: unknown): boolean {
    switch (type) {
        case 'phase_change':
            return isAgentPhase(data);
        case 'thinking':
        case 'content':
            return typeof data === 'string';
        case 'chart':
            return isChartData(data);
        case 'map':
            return isMapData(data);
        case 'sources':
            return isSourceList(data);
        case 'documents':
            return isDocumentList(data);
        case 'result_meta':
            return isResultMeta(data);
        case 'clarification':
            return isClarificationData(data);
        case 'conversation_saved':
            return isConversationSavedData(data);
        case 'assistant_message_saved':
            return isAssistantMessageSavedData(data);
        case 'clear_answer':
            // CONTRACT-05: signal only — payload is null/undefined.
            return data === null || data === undefined || isObject(data);
        case 'error':
            return typeof data === 'string' || isObject(data);
        case 'done':
            // `done` may legitimately carry no payload — only a null/undefined
            // or an object summary should be considered valid here.
            return data === undefined || data === null || isObject(data);
        default:
            // Unknown event types are not invalid per se — the consumer can
            // still translate them, but we don't bless the payload shape.
            return true;
    }
}
