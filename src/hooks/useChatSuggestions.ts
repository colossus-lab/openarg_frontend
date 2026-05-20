'use client';

import { useEffect, useState } from 'react';

const VISIBLE_COUNT = 4;

function shuffleAndPick(pool: string[], count: number): string[] {
    if (pool.length <= count) return pool.slice();
    const arr = pool.slice();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, count);
}

/**
 * Returns up to VISIBLE_COUNT suggestions to render in the chat hero.
 *
 * - `fallbackSuggestions` is treated as a candidate pool. If it has more than
 *   VISIBLE_COUNT items, the hook picks VISIBLE_COUNT at random — fresh on
 *   every mount (i.e. every new visit or page reload). The shuffle runs only
 *   on the client to avoid hydration mismatches.
 * - If the backend `/api/chat/suggestions` endpoint returns a list, it
 *   replaces the local pool. Lists > VISIBLE_COUNT get the same shuffle
 *   treatment; lists ≤ VISIBLE_COUNT are returned as-is.
 */
export function useChatSuggestions(fallbackSuggestions: string[]) {
    const initial = fallbackSuggestions.slice(0, VISIBLE_COUNT);
    const [suggestions, setSuggestions] = useState<string[]>(initial);

    useEffect(() => {
        let cancelled = false;

        if (fallbackSuggestions.length > VISIBLE_COUNT) {
            // Client-only shuffle: running this in useState initializer would
            // execute during SSR and cause a hydration mismatch.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSuggestions(shuffleAndPick(fallbackSuggestions, VISIBLE_COUNT));
        }

        async function loadSuggestions() {
            try {
                const response = await fetch('/api/chat/suggestions', { cache: 'no-store' });
                if (!response.ok) return;
                const payload = await response.json();
                if (cancelled) return;
                if (Array.isArray(payload?.suggestions) && payload.suggestions.length > 0) {
                    const cleaned = payload.suggestions.filter(
                        (item: unknown): item is string => typeof item === 'string' && item.trim().length > 0,
                    );
                    if (cleaned.length === 0) return;
                    setSuggestions(
                        cleaned.length > VISIBLE_COUNT ? shuffleAndPick(cleaned, VISIBLE_COUNT) : cleaned,
                    );
                }
            } catch {
                // Keep local fallback selection.
            }
        }

        void loadSuggestions();

        return () => {
            cancelled = true;
        };
    }, [fallbackSuggestions]);

    return suggestions;
}
