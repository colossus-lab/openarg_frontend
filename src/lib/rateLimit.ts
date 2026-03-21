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
    const key = `${endpoint}:${identifier}`;
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now >= entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + WINDOW_MS });
        return false;
    }

    entry.count++;
    return entry.count > maxRequests;
}

/** 429 Response helper */
export function rateLimitResponse() {
    return new Response(
        JSON.stringify({ error: 'Demasiadas consultas. Esperá un minuto antes de intentar de nuevo.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } },
    );
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (now >= entry.resetAt) store.delete(key);
    }
}, 5 * 60_000);
