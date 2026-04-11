// ============================================================
// Conversation lifecycle — 001d-conversation-lifecycle
//
// Owns the three backend HTTP calls that make up the conversation
// persistence flow:
//
//   1. createConversation  — POST /api/v1/conversations/
//   2. saveUserMessage     — POST /api/v1/conversations/{id}/messages (role=user)
//   3. saveAssistantMessageWithRetry — POST /api/v1/conversations/{id}/messages
//                                     (role=assistant, with retry + errored flag)
//
// The `saveAssistantMessageWithRetry` helper is the fix for DEBT-002 /
// architecture DEBT-010 (half-saved conversations). It is invoked from
// the route handler's `finally` block regardless of outcome so that
// even errored or partial responses land in the backend with an
// `errored: true` marker instead of leaving an orphaned user question.
//
// Extracted from src/app/api/chat/route.ts on 2026-04-11 as part of
// the DEBT-005 code split. See
// specs/001-chat-bridge/001d-conversation-lifecycle/spec.md.
// ============================================================

import { backendHeaders } from '@/lib/auth';

export interface SaveAssistantArgs {
    backendUrl: string;
    convId: string;
    userEmail: string;
    content: string;
    sources: Record<string, unknown>[] | null;
    chartData: Record<string, unknown>[] | null;
    mapData: Record<string, unknown> | null;
    documents: Record<string, unknown>[] | null;
    errored: boolean;
}

/** Create a new conversation in the backend. Returns the conversation
 *  id on success, or null on any failure — the route handler treats
 *  the failure as non-critical and keeps going with `convId = null`.
 *  The user message is saved later only if we got a real id back. */
export async function createConversation(
    backendUrl: string,
    userEmail: string,
    title: string,
): Promise<string | null> {
    try {
        const res = await fetch(`${backendUrl}/api/v1/conversations/`, {
            method: 'POST',
            headers: backendHeaders(userEmail),
            body: JSON.stringify({ user_email: userEmail, title }),
        });
        if (!res.ok) return null;
        const conv = await res.json();
        return (conv?.id as string) || null;
    } catch {
        return null;
    }
}

/** Save the user message before the pipeline runs. Non-critical — a
 *  failure here does not abort the request; the user question is still
 *  shown in the UI via the optimistic update. */
export async function saveUserMessage(
    backendUrl: string,
    convId: string,
    userEmail: string,
    content: string,
): Promise<void> {
    try {
        await fetch(`${backendUrl}/api/v1/conversations/${convId}/messages`, {
            method: 'POST',
            headers: backendHeaders(userEmail),
            body: JSON.stringify({ role: 'user', content }),
        });
    } catch {
        /* non-critical — the user message is optimistically rendered
         * client-side and the backend restores the full history from
         * the conversation on next load */
    }
}

/** Save the assistant message with exponential-backoff retry.
 *
 *  Closes DEBT-002 / architecture DEBT-010: the assistant message used
 *  to be persisted only on the happy path and silently dropped on any
 *  failure. This helper retries transient failures (network errors, 5xx)
 *  and is invoked from the route handler's `finally` block so that even
 *  error paths save something, with `errored: true` so the UI can render
 *  a "regenerate" affordance.
 *
 *  4xx responses are permanent failures and are NOT retried — the
 *  payload is rejected by the backend's schema validation and retrying
 *  would just waste requests.
 */
export async function saveAssistantMessageWithRetry(
    args: SaveAssistantArgs,
): Promise<{ id: string } | null> {
    const payload = {
        role: 'assistant',
        content: args.content,
        sources: args.sources,
        chart_data: args.chartData,
        map_data: args.mapData,
        documents: args.documents,
        errored: args.errored,
    };
    const url = `${args.backendUrl}/api/v1/conversations/${args.convId}/messages`;
    const maxAttempts = 3;
    const baseDelayMs = 300;
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: backendHeaders(args.userEmail),
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                return (await res.json()) as { id: string };
            }
            // 4xx responses are not worth retrying (permanent).
            if (res.status >= 400 && res.status < 500) {
                console.error('[chat] saveAssistantMessage permanent failure', res.status);
                return null;
            }
            lastErr = new Error(`HTTP ${res.status}`);
        } catch (err) {
            lastErr = err;
        }
        if (attempt < maxAttempts - 1) {
            await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));
        }
    }
    console.error('[chat] saveAssistantMessage failed after retries', lastErr);
    return null;
}
