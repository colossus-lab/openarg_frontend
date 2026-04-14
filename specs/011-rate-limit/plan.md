# Plan: Rate Limit (As-Built)

**Related spec**: [./spec.md](./spec.md)
**Last synced with code**: 2026-04-13

---

## 1. Layer Mapping

| Layer | Component | File |
|---|---|---|
| Infrastructure (lib) | `checkRateLimit`, `rateLimitResponse` | `src/lib/rateLimit.ts` |
| Callers | All authenticated API routes | `src/app/api/**/route.ts` |

## 2. Implementation (simplified)

```typescript
// src/lib/rateLimit.ts
interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

// Cleanup every 5 minutes
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);
cleanupInterval.unref?.();

export function checkRateLimit(
  userEmail: string,
  endpoint: string,
  maxRequests: number,
): boolean {
  const key = `${endpoint}:${userEmail}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false; // not exceeded
  }

  entry.count++;
  return entry.count > maxRequests;
}

export function getRetryAfterSeconds(userEmail: string, endpoint: string): number {
  const entry = store.get(`${endpoint}:${userEmail}`);
  if (!entry) return Math.ceil(WINDOW_MS / 1000);
  return Math.max(1, Math.ceil((entry.resetAt - Date.now()) / 1000));
}

export function rateLimitResponse(retryAfterSeconds = Math.ceil(WINDOW_MS / 1000)): Response {
  return new Response(JSON.stringify({ error: 'Demasiadas consultas. Esperá un minuto antes de intentar de nuevo.' }), {
    status: 429,
    headers: {
      'Retry-After': String(retryAfterSeconds),
      'Content-Type': 'application/json',
    },
  });
}
```

## 3. Usage in API Routes

Canonical pattern:

```typescript
import { checkRateLimit, getRetryAfterSeconds, rateLimitResponse } from '@/lib/rateLimit';
import { requireSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const userEmail = session!.user!.email!;
  const limit = parseInt(process.env.RATE_LIMIT_CHAT || '10', 10);
  if (checkRateLimit(userEmail, 'chat', limit)) {
    return rateLimitResponse(getRetryAfterSeconds(userEmail, 'chat'));
  }

  // ... proceed with request
}
```

## 4. Bucket Table

| Bucket name | Default limit | Env var | Usage |
|---|---|---|---|
| `chat` | 10/min | `RATE_LIMIT_CHAT` | `/api/chat` |
| `conversations:get` | 30/min | `RATE_LIMIT_READ` | GET `/api/conversations*`, GET `/api/users/*` |
| `conversations:post` | 10/min | `RATE_LIMIT_WRITE` | POST/DELETE `/api/conversations*`, DELETE `/api/users/me`, POST `/api/users/me/settings` |
| `sync` | 15/min | `RATE_LIMIT_SYNC` | POST `/api/users/sync` |
| `feedback` | 10/min | `RATE_LIMIT_WRITE` | PATCH `/api/feedback` |
| `datasets` | 30/min | `RATE_LIMIT_READ` | GET `/api/datasets`, `/api/taxonomy`, `/api/transparency` |

## 5. Environment Variables

```bash
RATE_LIMIT_CHAT=10           # chat bucket
RATE_LIMIT_READ=30           # conversations:get + datasets
RATE_LIMIT_WRITE=10          # conversations:post + feedback + user writes
RATE_LIMIT_SYNC=15           # sync
```

## 6. Source Files

- `src/lib/rateLimit.ts` (~100 lines)
- All `src/app/api/**/route.ts` files that import `checkRateLimit`

## 7. Deviations from Constitution

- **Principle VII (Security)**: rate limiting applied consistently.
- **Principle IX (Observability)**: no metrics or stats exposure → [DEBT-005].
- **Principle XII (Deployment)**: in-memory, not cluster-safe → [DEBT-001].

---

**End of plan.md**
