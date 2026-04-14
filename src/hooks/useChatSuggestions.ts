'use client';

import { useEffect, useState } from 'react';

export function useChatSuggestions(fallbackSuggestions: string[]) {
    const [suggestions, setSuggestions] = useState(fallbackSuggestions);

    useEffect(() => {
        let cancelled = false;

        async function loadSuggestions() {
            try {
                const response = await fetch('/api/chat/suggestions', { cache: 'no-store' });
                if (!response.ok) return;
                const payload = await response.json();
                if (!cancelled && Array.isArray(payload?.suggestions) && payload.suggestions.length > 0) {
                    const nextSuggestions = payload.suggestions.filter(
                        (item: unknown): item is string => typeof item === 'string' && item.trim().length > 0,
                    );
                    if (nextSuggestions.length > 0) {
                        setSuggestions(nextSuggestions);
                    }
                }
            } catch {
                // Ignore and keep the local fallback suggestions.
            }
        }

        void loadSuggestions();

        return () => {
            cancelled = true;
        };
    }, [fallbackSuggestions]);

    return suggestions;
}

