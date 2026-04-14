/**
 * In-memory per-user rate limiter with sliding window.
 *
 * Usage:
 *   import { checkRateLimit } from '@/lib/rateLimit';
 *   if (checkRateLimit(email, 'chat', 10)) return Response 429;
 */

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);

interface Entry {
    count: number;
    resetAt: number;
}

// Map<`${endpoint}:${identifier}`, Entry>
const store = new Map<string, Entry>();

function buildKey(identifier: string, endpoint: string): string {
    return `${endpoint}:${identifier}`;
}

/**
 * Returns `true` if the user exceeded the rate limit.
 * @param identifier  User email or IP
 * @param endpoint    Endpoint name (e.g. 'chat', 'sync')
 * @param maxRequests Max requests per minute
 */
export function checkRateLimit(
    identifier: string,
    endpoint: string,
    maxRequests: number,
): boolean {
    const key = buildKey(identifier, endpoint);
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now >= entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + WINDOW_MS });
        return false;
    }

    entry.count++;
    return entry.count > maxRequests;
}

export function getRetryAfterSeconds(identifier: string, endpoint: string): number {
    const entry = store.get(buildKey(identifier, endpoint));
    if (!entry) return Math.ceil(WINDOW_MS / 1000);
    return Math.max(1, Math.ceil((entry.resetAt - Date.now()) / 1000));
}

/** 429 Response helper */
export function rateLimitResponse(retryAfterSeconds = Math.ceil(WINDOW_MS / 1000)) {
    return new Response(
        JSON.stringify({ error: 'Demasiadas consultas. Esperá un minuto antes de intentar de nuevo.' }),
        {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(retryAfterSeconds),
            },
        },
    );
}

// Cleanup stale entries every 5 minutes
const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (now >= entry.resetAt) store.delete(key);
    }
}, 5 * 60_000);
cleanupInterval.unref?.();
