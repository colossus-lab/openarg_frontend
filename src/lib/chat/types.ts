// ============================================================
// Shared types for the chat bridge sub-modules.
//
// Lives outside the four concrete modules (wsBridge, syncFallback,
// eventMapper, conversationService) so there is no cyclic import.
// See specs/001-chat-bridge/plan.md §5 for the top-level layer mapping.
// ============================================================

/** Shape of the backend response from `/api/v1/query/smart` (HTTP) or the
 *  final `complete` event payload from the WS path. The WS path may set
 *  `_wsError = true` to signal "an error was already sent to the browser,
 *  don't run the HTTP fallback". */
export interface SmartResult {
    answer: string;
    sources?: { name: string; url: string; portal: string; accessed_at?: string }[];
    chart_data?: Record<string, unknown>[] | null;
    map_data?: Record<string, unknown> | null;
    documents?: Record<string, unknown>[] | null;
    uiTrace?: Record<string, unknown> | null;
    tokens_used?: number;
    casual?: boolean;
    cached?: boolean;
    confidence?: number;
    citations?: Record<string, unknown>[];
    intent?: string;
    /** Set to true when the WS received an explicit error event from the backend. */
    _wsError?: boolean;
}

/** Return shape of `mapStatusStep`: the subset of an SSE event that the
 *  browser is willing to render. Both fields are optional — many backend
 *  status steps only update the thinking text without changing the phase. */
export interface MappedEvent {
    phase?: string;
    thinking?: string;
}

/** Narrowed signature of the `send()` closure that each sub-module
 *  receives from the route handler. Centralised here so the WS bridge,
 *  HTTP fallback and event mapper all share the same contract. */
export type SendFn = (event: { type: string; data: unknown }) => void;
