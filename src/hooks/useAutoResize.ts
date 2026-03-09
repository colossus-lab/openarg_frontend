'use client';

import { useRef, useCallback } from 'react';

const MAX_LINES = 7;

/**
 * Manages auto-resize of a textarea element up to a maximum number of lines.
 */
export function useAutoResize() {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 22;
        const maxH = lineHeight * MAX_LINES;
        ta.style.height = `${Math.min(ta.scrollHeight, maxH)}px`;
    }, []);

    const resetHeight = useCallback(() => {
        const ta = textareaRef.current;
        if (ta) ta.style.height = 'auto';
    }, []);

    return { textareaRef, adjustHeight, resetHeight };
}
