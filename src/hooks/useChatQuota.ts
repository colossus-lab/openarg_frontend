'use client';

import { useEffect, useState } from 'react';

import { isWebQuota, type WebQuota } from '@/lib/chat/quota';

/**
 * El cupo web de la persona: se lee al abrir el chat (`/api/developers/usage`
 * → `web`) y después lo actualiza cada respuesta con el evento `quota`.
 * Si no se puede leer, queda en null y el chat funciona como siempre: el
 * que decide es el backend.
 */
export function useChatQuota(enabled: boolean) {
    const [quota, setQuota] = useState<WebQuota | null>(null);

    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;
        fetch('/api/developers/usage')
            .then((res) => (res.ok ? res.json() : null))
            .then((data: { web?: unknown } | null) => {
                if (!cancelled && data && isWebQuota(data.web)) {
                    setQuota(data.web);
                }
            })
            .catch(() => {
                /* sin indicador: el backend igual aplica el cupo */
            });
        return () => {
            cancelled = true;
        };
    }, [enabled]);

    return { quota, setQuota };
}
