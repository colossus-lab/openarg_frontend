# Plan: Misc API Proxies (As-Built)

**Related spec**: [./spec.md](./spec.md)
**Last synced with code**: 2026-04-10

---

## 1. Layer Mapping

| Route | File | Method | Backend endpoint |
|---|---|---|---|
| `/api/feedback` | `src/app/api/feedback/route.ts` | PATCH | `PATCH /api/v1/conversations/{id}/messages/{msgId}/feedback` |
| `/api/taxonomy` | `src/app/api/taxonomy/route.ts` | GET | `GET /api/v1/taxonomy` |
| `/api/transparency` | `src/app/api/transparency/route.ts` | GET | `GET /api/v1/transparency` |

## 2. Canonical Pattern

All follow the pattern:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireSession, backendHeaders } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';

const BACKEND_URL = process.env.OPENARG_BACKEND_URL || 'http://localhost:8081';

export async function GET(request: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const userEmail = session!.user!.email!;
  if (checkRateLimit(userEmail, 'datasets', 30)) {
    return rateLimitResponse();
  }

  const backendRes = await fetch(`${BACKEND_URL}/api/v1/taxonomy`, {
    headers: backendHeaders(userEmail),
  });

  if (!backendRes.ok) {
    return NextResponse.json({ error: 'Backend error' }, { status: backendRes.status });
  }

  return NextResponse.json(await backendRes.json(), {
    headers: {
      'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
    },
  });
}
```

## 3. Source Files

- `src/app/api/feedback/route.ts`
- `src/app/api/taxonomy/route.ts`
- `src/app/api/transparency/route.ts`

## 4. Deviations from Constitution

- Principle I (thin client): pure proxies.
- Principle VII: rate limit + auth.

---

**End of plan.md**
