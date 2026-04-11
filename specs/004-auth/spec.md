# Spec: Auth (NextAuth + Google OAuth + Allowlist)

**Type**: Reverse-engineered
**Status**: Draft
**Last synced with code**: 2026-04-11
**Layer scope**: Infrastructure + Middleware + Lib
**Related plan**: [./plan.md](./plan.md)

---

## 1. Context & Purpose

Module for the **frontend's full authentication**: NextAuth 4 with Google OAuth as the only provider, JWT sessions, auth gate middleware, `requireSession` / `backendHeaders` / `requireAdmin` helpers, email allowlist enforced in the `signIn` callback, and provisioning of the `X-User-Email` header to the backend.

It is the only mechanism that controls who can access the system. The backend blindly trusts the header the frontend sends (until `../../openarg_backend/specs/FIX_BACKLOG.md#fix-005` is implemented).

## 2. Ubiquitous Language

| Term | Definition |
|---|---|
| **Session** | NextAuth JWT with `user.email`, `user.name`, `user.image`, 24h TTL, stored in an HttpOnly cookie. |
| **Allowlist** | `ALLOWED_EMAILS` env var; list of allowed emails (private alpha). |
| **OPEN_BETA** | Env var flag that bypasses the allowlist. `true` in production, `false` in staging. |
| **OPEN_BETA_DOMAINS** | Optional whitelist of allowed email domains (e.g., "company.com,edu.ar"). |
| **Admin** | User whose email is in `ADMIN_EMAILS`. Infrastructure exists but no active admin endpoints yet. |
| **Privacy gate** | Redirect to `/privacy` if the user's `privacy_accepted_at` is not set. |
| **`DISABLE_AUTH`** | Flag ONLY for local dev that bypasses the middleware. |

## 3. User Stories

### US-001 (P1) — Login with Google OAuth
**As a** visitor, **I want** a "Ingresar con Google" button that initiates the OAuth flow and returns me to `/chat` authenticated.

### US-002 (P1) — Silent rejection of non-allowed emails (staging)
**As an** operator of the private alpha, **I want** only emails from the allowlist to be able to complete the OAuth flow, **so that** the system stays closed.

### US-003 (P1) — Production accessible to anyone
**As a** production operator, **I want** to be able to bypass the allowlist with `OPEN_BETA=true`, **so that** I have public access.

### US-004 (P1) — Session persists for 24h
**As a** user, **I want** not to have to log in again every time I open the chat.

### US-005 (P1) — Clean logout
**As a** user, **I want** to be able to sign out from the `UserMenu`, **so that** I leave the browser clean.

### US-006 (P1) — Middleware protects private routes
**As a** system, **I want** the middleware to block all access to `/chat`, `/datasets`, `/api/*` without a valid JWT.

### US-007 (P1) — Backend receives verified user identity
**As a** system, **I want** every request proxied to the backend to include the `X-User-Email` from the server-side JWT (not from the client body — IDOR prevention).

### US-008 (P2) — Forced privacy gate
**As** compliance, **I want** users who did not accept the privacy notice to be redirected to `/privacy` before using the chat.

### US-009 (P2) — DISABLE_AUTH for local dev
**As a** developer, **I want** to be able to bypass auth locally with `DISABLE_AUTH=true`, **so that** I can iterate without OAuth setup.

### US-010 (P3) — Admin endpoints (future)
**As an** admin, **I want** the `requireAdmin()` helper available to protect admin endpoints when they are added. *(Infrastructure exists, no endpoints using this today)*.

## 4. Functional Requirements

### NextAuth Setup
- **FR-001**: MUST use NextAuth 4.24+ with Google OAuth as the only provider.
- **FR-002**: MUST use JWT session strategy (no database).
- **FR-003**: Session TTL MUST be **24 hours** (explicitly reduced from the default 30 days).
- **FR-004**: MUST use HttpOnly cookies with:
  - Production: `__Secure-next-auth.session-token`, `sameSite=lax`, `secure=true`
  - Dev: `next-auth.session-token`, `sameSite=lax`, `secure=false`
- **FR-005**: MUST read `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` from env.

### Allowlist / Access Control
- **FR-006**: The `signIn` callback MUST verify:
  1. If `OPEN_BETA=true` → allow (with optional OPEN_BETA_DOMAINS domain filter)
  2. Otherwise → verify `user.email.toLowerCase()` ∈ `ALLOWED_EMAILS` (comma-separated, lowercased)
  3. If neither matches → reject with an `AccessDenied` error page
- **FR-007**: If `ALLOWED_EMAILS` is empty AND `OPEN_BETA=false`, **nobody** should be able to log in (fail-closed).
- **FR-008**: `OPEN_BETA_DOMAINS` if defined, MUST filter by the domain extracted from `email.split('@')[1]`.

### Middleware
- **FR-009**: `src/middleware.ts` MUST use NextAuth's `getToken()` to extract the JWT.
- **FR-010**: MUST protect routes matching `/chat`, `/datasets`, `/api/*` **except** `/api/auth/*`.
- **FR-011**: No valid JWT on a protected route → redirect to `/login?callbackUrl=<current>`.
- **FR-012**: If `DISABLE_AUTH=true`, MUST skip the check entirely (only allowed in dev).

### Helpers (`src/lib/auth.ts`)
- **FR-013**: `requireSession()` MUST return `{session, error}` where error is a 401 `NextResponse` if there is no session.
- **FR-014**: `backendHeaders(userEmail?)` MUST build `{Content-Type: 'application/json', X-API-Key: OPENARG_BACKEND_API_KEY, X-User-Email: userEmail}` (consistent headers for every backend request).
- **FR-015**: `requireAdmin()` MUST verify that `session.user.email` ∈ `ADMIN_EMAILS` and return 403 if not.

### User Sync
- **FR-016**: `/api/users/sync` MUST **ignore** the body's email and use the one from the server-side JWT (IDOR fix applied).
- **FR-017**: MUST forward to the backend `POST /api/v1/users/sync` with `{email: session.email, name, image, privacy_accepted_at}`.
- **FR-018**: The `UserSyncProvider` component MUST invoke `/api/users/sync` on mount or when the session changes.

### Privacy Gate
- **FR-019**: `UserSyncProvider` MUST check `privacy_accepted_at` in the sync response.
- **FR-020**: If not accepted AND the user is on a protected route → redirect to `/privacy`.
- **FR-021**: The `/privacy` page MUST have an "Aceptar" button that invokes `POST /api/users/me/settings` with `{privacy_accepted_at: now}`.
- **FR-022**: After accepting, `UserSyncProvider` MUST emit a custom event to update the status and redirect back.

## 5. Success Criteria

- **SC-001**: Full login flow (landing → login → Google → callback → /chat) in **<10 seconds** under normal conditions.
- **SC-002**: **Zero unauthenticated accesses** to protected routes.
- **SC-003**: **Zero emails outside the allowlist** can complete login in staging.
- **SC-004**: Session persists for exactly 24h (no more, no less).
- **SC-005**: `X-User-Email` header always present in proxy requests to the backend.
- **SC-006**: IDOR in `/api/users/sync` **blocked** — the JWT email always overrides the body's.
- **SC-007**: `DISABLE_AUTH=true` does NOT work in prod (security must fail closed).

## 6. Assumptions & Out of Scope

### Assumptions
- Google OAuth is available (there is no email/password fallback).
- `NEXTAUTH_SECRET` is rotated if compromised (manual process, not automatic).
- The proxy (Caddy) does not allow header spoofing from external clients.
- Users accept having a persistent 24h session.

### Out of scope
- **Email/password authentication** — OAuth only.
- **Other OAuth providers** (GitHub, Microsoft, Apple) — Google only.
- **2FA / MFA** — not implemented.
- **Global session revocation** (logout all devices) — not implemented; rotating `NEXTAUTH_SECRET` invalidates all of them.
- **Refresh tokens** — with JWT strategy + 24h TTL, the user must re-login after expiry.
- **Role management UI** — `ADMIN_EMAILS` is an env var, not a UI.
- **Social login for an existing account** — there are no prior accounts.

## 7. Open Questions

- **[RESOLVED CL-001]** — **Confirmed fail-closed in code** (whether it is the *right* behavior is a product call, left open). `src/lib/authOptions.ts:62-65` explicitly: `if (allowedEmails.length === 0) { console.warn('[AUTH] No ALLOWED_EMAILS configured — blocking all logins'); return false; }` — any empty-allowlist + non-beta config returns `false` from the signIn callback. The log line makes the intent explicit. (resolved 2026-04-11 via code inspection)
- **[RESOLVED CL-002]** — **Correction: `requireAdmin()` IS actively used**. Verified: `src/app/api/transparency/route.ts:90` invokes `requireAdmin()` to gate access to the `/api/transparency` endpoint. Only emails in `ADMIN_EMAILS` (comma-separated, case-insensitive) can access it. The helper is not dead code — it is the only admin-gated endpoint today, but it is active. **Implication**: the `009-transparency-page` spec needs correction — it is not a public endpoint but admin-only.
- **[RESOLVED CL-003]** — **Backend DOES enforce it.** The backend has `app/application/common/privacy_gate.py::ensure_privacy_accepted(email, user_repo)` that raises `HTTPException(403, {"code": "PRIVACY_NOT_ACCEPTED", ...})` whenever `user.privacy_accepted_at is None`, and it is invoked from the smart query router. A JWT-bearing user that skipped `/privacy` on the web app gets rejected at the API layer — the gate is not frontend-only. See also frontend `000-architecture/CL-008` and backend `privacy_gate.py`. (resolved 2026-04-11 via code inspection)
- **[NEEDS CLARIFICATION CL-004]** — `NEXTAUTH_URL` points to `https://REDACTED_STAGING` — is the production URL `https://openarg.org`? Difference in deploy env.
- **[NEEDS CLARIFICATION CL-005]** — Are the 28 allowlist emails updated manually by editing the env + restart? Is there a documented process?
- **[NEEDS CLARIFICATION CL-006]** — 24h session TTL: does it bother users who use the chat frequently (having to re-login every day)? Metric not measured.

## 8. Tech Debt Discovered

- **[DEBT-001]** — **`X-User-Email` trust model**: the backend trusts the header without validation. Planned: validate the Google JWT server-side in the backend (`../../openarg_backend/specs/FIX_BACKLOG.md#fix-005`). In the meantime, protection depends on the non-spoofable proxy.
- **[DEBT-002]** — **`NEXTAUTH_SECRET` without automatic rotation** — rotating it manually invalidates all sessions, no documented process.
- **[DEBT-003]** — ~~Latent admin infrastructure~~ **FIXED 2026-04-10**: `requireAdmin()` IS active in `/api/transparency/route.ts:90`. It is no longer dead code. Reformulated debt: **1 single admin-gated endpoint** (transparency) — limited but functional scope.
- **[DEBT-004]** — **No global logout** — an admin cannot force the logout of a specific user without rotating the secret.
- **[DEBT-005]** — ~~**`DISABLE_AUTH=true`** backdoor without `NODE_ENV` guard~~ **FIXED 2026-04-10**: `middleware.ts:6-14` now only honors the bypass when `NODE_ENV !== 'production'`. If the flag appears in production, the middleware logs `console.error` and continues with the normal auth flow (no bypass). Defense-in-depth applied.
- **[DEBT-006]** — ~~**Privacy gate frontend-only**~~ **FIXED 2026-04-10**: backend now enforces the privacy gate server-side via `application/common/privacy_gate.py::ensure_privacy_accepted()`. The helper is called from `/api/v1/query/smart` (HTTP) and the `/api/v1/query/ws/smart` WebSocket handler, after rate limiting. Unknown users and anonymous identifiers are passed through (so `/users/sync` can still create the record); users that exist but have `privacy_accepted_at = None` get a 403 with `code: "PRIVACY_NOT_ACCEPTED"`. Defense in depth — the frontend still does the primary check.
- **[DEBT-007]** — **Allowlist environment-specific mismatch**: my initial staging/prod confusion suggests that the `/opt/docker/openarg/.env` naming convention is not clear. Document which server serves which deploy.

---

**End of spec.md**
