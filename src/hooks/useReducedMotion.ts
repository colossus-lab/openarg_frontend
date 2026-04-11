'use client';

import { useSyncExternalStore } from 'react';

/**
 * Returns `true` if the user has requested reduced motion
 * via OS / browser `prefers-reduced-motion` setting.
 *
 * Components should disable or tone down animations when this
 * is true (typewriter effects, fade-ins, decorative motion).
 *
 * Uses `useSyncExternalStore` for SSR-safe subscription to the
 * `matchMedia` MediaQueryList. Returns `false` on the server.
 */
const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(callback: () => void): () => void {
    if (typeof window === 'undefined' || !window.matchMedia) {
        return () => { };
    }
    const mq = window.matchMedia(QUERY);
    mq.addEventListener('change', callback);
    return () => mq.removeEventListener('change', callback);
}

function getSnapshot(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
    return false;
}

export function useReducedMotion(): boolean {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
