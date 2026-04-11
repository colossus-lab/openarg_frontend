# Plan: Transparency (As-Built)

**Related spec**: [./spec.md](./spec.md)
**Last synced with code**: 2026-04-10

---

## 1. Layer Mapping (updated 2026-04-10)

| Layer | Component | File |
|---|---|---|
| API proxy (admin-gated) | `/api/transparency` | `src/app/api/transparency/route.ts` (~100 lines) |
| Admin helper | `requireAdmin()` | `src/lib/auth.ts:20-35` |
| Env | `ADMIN_EMAILS` | server env, 2 admins in staging |
| Page UI | **Does not exist** — programmatic-only endpoint | — |

## 2. Auth Flow

```
Request with JWT cookie
    ↓
requireAdmin() in src/lib/auth.ts:
    1. requireSession() — if no session → 401
    2. Extracts email from JWT
    3. Compares email against ADMIN_EMAILS (comma-split, lowercase)
    4. If NOT present → 403 "admin access required"
    5. If present → continues
    ↓
checkRateLimit('datasets', 30/min)
    ↓
fetch(`${BACKEND_URL}/api/v1/transparency`, headers: backendHeaders(email))
    ↓
JSON response with cache headers (s-maxage=300)
```

## 3. Source Files

- `src/app/api/transparency/route.ts` — route handler (~100 lines)
- `src/lib/auth.ts:20-35` — `requireAdmin()` helper
- Server env: `ADMIN_EMAILS` (comma-separated, case-insensitive)

## 4. Backend Contract

`GET /api/v1/transparency` — returns aggregated system reports. See backend specs `000-architecture/` for the payload contract.

## 5. Deviations from Constitution

- **Principle VI (Auth)**: admin gate enforcement in the route handler.
- **Principle I (Thin client)**: proxy with auth enrichment.
- **UX gap**: no dedicated UI — product gap, not an architectural one.

---

**End of plan.md**
