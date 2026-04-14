'use client';

import { useEffect, useState } from 'react';

export function useIsDesktop() {
    const [isDesktop, setIsDesktop] = useState(() =>
        typeof window !== 'undefined' ? window.matchMedia('(min-width: 769px)').matches : true
    );

    useEffect(() => {
        const mq = window.matchMedia('(min-width: 769px)');
        const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    return isDesktop;
}

