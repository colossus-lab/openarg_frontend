# Plan: Rate Limit (As-Built)

**Related spec**: [./spec.md](./spec.md)
**Last synced with code**: 2026-04-10

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
  windowStart: number;
}

const store = new Map<string, Entry>();

// Cleanup every 5 minutes
setInterval(() => {
  const now = Date.now();
  const CLEANUP_AGE = 5 * 60 * 1000;
  for (const [key, entry] of store) {
    if (now - entry.windowStart > CLEANUP_AGE) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function checkRateLimit(
  userEmail: string,
  endpoint: string,
  maxRequests: number,
  windowMs: number = 60 * 1000,
): boolean {
  const key = `${userEmail}:${endpoint}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return false; // not exceeded
  }

  if (entry.count >= maxRequests) {
    return true; // exceeded
  }

  entry.count++;
  return false;
}

export function rateLimitResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Demasiadas consultas. Esperá un momento antes de intentar de nuevo.' },
    {
      status: 429,
      headers: {
        'Retry-After': '60',
        'Content-Type': 'application/json',
      },
    },
  );
}
```

## 3. Usage in API Routes

Canonical pattern:

```typescript
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { requireSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const userEmail = session!.user!.email!;
  const limit = parseInt(process.env.RATE_LIMIT_CHAT || '10', 10);
  if (checkRateLimit(userEmail, 'chat', limit)) {
    return rateLimitResponse();
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
