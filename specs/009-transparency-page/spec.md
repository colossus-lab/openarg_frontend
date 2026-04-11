# Spec: Transparency Page

**Type**: Reverse-engineered
**Status**: Draft
**Last synced with code**: 2026-04-10
**Layer scope**: Presentation + Application (proxy)
**Related plan**: [./plan.md](./plan.md)

---

## 1. Context & Purpose

**Important correction (2026-04-10)**: this endpoint is NOT public. `/api/transparency` is **admin-gated** — it uses `requireAdmin()` in `src/app/api/transparency/route.ts:90` and only users whose email is in `ADMIN_EMAILS` (env var, 2 admins in staging) can access it. It is not dead code; it is the **only admin-gated endpoint active** in the frontend today.

Proxy to the backend's `GET /api/v1/transparency`. Returns aggregated system reports (usage, data quality, connector state). **There is no dedicated UI page** — the endpoint exists to be consumed programmatically by external admin tooling or curl, not by a frontend UI. It's a candidate for a future admin panel when one exists.

## 2. User Stories

### US-001 (P2) — Admin fetches transparency report
**As a** system admin, **I want** to be able to request an aggregated report via API, **so that** I can monitor usage and state without direct backend access.

- Trigger: admin runs `curl -H "X-User-Email: admin@..." https://.../api/transparency`
- Happy path: `requireAdmin()` validates → proxies to backend → JSON response
- Edge case: non-admin user → 403 Forbidden with message "admin access required"

### US-002 (P3) — Admin UI (future)
**As an** admin, **I want** eventually to have an `/admin/transparency` page that renders the report visually. **Infrastructure is ready**, UI is not built.

## 3. Functional Requirements

- **FR-001**: `GET /api/transparency` MUST invoke `requireAdmin()` before anything else.
- **FR-002**: MUST proxy `GET /api/v1/transparency` with `X-User-Email` from the JWT + `X-API-Key`.
- **FR-003**: MUST apply a 5-minute cache in HTTP headers.
- **FR-004**: MUST apply rate limit (`datasets` bucket, 30/min).
- **FR-005**: MUST return 403 if the user is not in `ADMIN_EMAILS`.
- **FR-006**: The 403 error message MUST be user-friendly: "admin access required".

## 4. Success Criteria

- **SC-001**: **Zero accesses** by non-admin users to the endpoint (100% 403 enforcement).
- **SC-002**: Admin receives the report in **<1 second** for typical sizes.

## 5. Tech Debt Discovered

- **[DEBT-001]** — **No UI to consume the endpoint** — depends on curl/external tooling. Poor admin UX.
- **[DEBT-002]** — **No audit log** — admin queries are not tracked anywhere visible from the frontend.
- **[DEBT-003]** — **Backend does not verify admin** — the frontend is the only gate. The trust model assumes the frontend is the only legitimate access to the backend.

---

**End of spec.md**
