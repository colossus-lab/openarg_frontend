# Spec: Users/Me (ARCO + Privacy Gate)

**Type**: Reverse-engineered
**Status**: Draft
**Last synced with code**: 2026-04-11
**Layer scope**: Presentation + Application (proxies)
**Related plan**: [./plan.md](./plan.md)

---

## 1. Context & Purpose

A set of **proxy routes + providers** that expose the user's **ARCO** rights (Access, Rectification, Cancellation, Opposition): view profile, export data, change settings, delete account. It also includes the **privacy gate** (`/privacy` page + `UserSyncProvider` logic) that forces explicit acceptance of the privacy notice before using the chat.

## 2. User Stories

### US-001 (P1) — View my profile
**As an** authenticated user, **I want** to see my name, email, avatar, and privacy status.

### US-002 (P1) — Accept the privacy policy
**As a** new user, **I must** explicitly accept the privacy notice before using the chat. Without acceptance → redirect to `/privacy`.

### US-003 (P1) — Export my data (ARCO access + portability)
**As a** user, **I want** to download a JSON containing all my conversations, queries, and personal metadata.

### US-004 (P1) — Delete my account (ARCO erasure)
**As a** user, **I want** to delete my account with confirmation, and for all my conversations, messages, queries, and API keys in the backend to be cascade-deleted.

### US-005 (P2) — Toggle save_history
**As a** user, **I want** a toggle in settings to disable history saving; when disabled, existing conversations are cascade-deleted.

## 3. Functional Requirements

- **FR-001**: `GET /api/users/me` MUST proxy `GET /api/v1/users/me`. Returns `{email, name, image, privacy_accepted_at, save_history}`.
- **FR-002**: `DELETE /api/users/me` MUST proxy `DELETE /api/v1/users/me`. Cascade delete in the backend. Afterwards it must invoke NextAuth's `signOut()` and redirect to `/`.
- **FR-003**: `GET /api/users/me/data` MUST proxy `GET /api/v1/users/me/data`. Returns a JSON with all the user's data.
- **FR-004**: `GET /api/users/me/settings` MUST proxy `GET /api/v1/users/me/settings`.
- **FR-005**: `PATCH /api/users/me/settings` MUST proxy `PATCH /api/v1/users/me/settings`. Body: `{save_history?}`. If `save_history=false`, the backend cascade-deletes conversations.
- **FR-006**: `POST /api/users/sync` MUST force the JWT email (IDOR fix), already documented in `004-auth/spec.md`.
- **FR-007**: All routes require `requireSession()`.
- **FR-008**: `UserSyncProvider` MUST check `privacy_accepted_at` in the sync response and redirect to `/privacy` if it is null.
- **FR-009**: The `/privacy` page MUST have an "Accept" button that POSTs `{privacy_accepted_at: new Date().toISOString()}` to `/api/users/me/settings`.
- **FR-010**: After acceptance, it MUST redirect to the `callbackUrl` or `/chat`.

## 4. Success Criteria

- **SC-001**: Profile fetch in **<300ms**.
- **SC-002**: Export responds in **<2s** for typical users (a few dozen queries).
- **SC-003**: Delete account is **atomic** — the user cannot log back in if Google OAuth allows it but the backend no longer has their record.
- **SC-004**: Privacy gate 100% effective from the frontend (edge case: backend enforcement is tech debt).

## 5. Assumptions & Out of Scope

### Assumptions
- Cascade delete in the backend is reliable.
- JSON export is sufficient (no CSV, no PDF).

### Out of scope
- **Rectification** (edit profile fields) — Google OAuth provides the name/image; not editable from the frontend.
- **Audit log** of ARCO actions — the backend may have it but there is no UI.

## 6. Open Questions

- **[RESOLVED CL-001]** — **Backend enforces it.** `openarg_backend/src/app/application/common/privacy_gate.py::ensure_privacy_accepted` raises HTTP 403 with code `PRIVACY_NOT_ACCEPTED` when `user.privacy_accepted_at is None`. The smart query router invokes it before running the pipeline, so a JWT-bearing user who skipped `/privacy` is blocked at the API layer — no frontend bypass. `DEBT-001` in this same spec is therefore stale and should be closed. (resolved 2026-04-11 via code inspection)
- **[NEEDS CLARIFICATION CL-002]** — After `DELETE /api/users/me`, does Google OAuth still allow login? If so, the user will create a new record (with no history). If not, how is it blocked?
- **[NEEDS CLARIFICATION CL-003]** — Export data: does it include `api_usage` logs? What is the exact format?
- **[RESOLVED CL-004]** — **Immediate and synchronous.** The backend handler at `openarg_backend/src/app/presentation/http/controllers/users/users_router.py:134-138` does `if not body.save_history and user.save_history: await user_repo.delete_user_conversations(user.id)` *before* saving the new preference. The `await` ensures the delete completes before the endpoint returns, so the subsequent `GET /users/me` (triggered by the UI refresh) sees a clean state. No background task, no async queue. (resolved 2026-04-11 via code inspection)

## 7. Tech Debt Discovered

- **[DEBT-001]** — ~~**Privacy gate without backend enforcement**~~ **FIXED 2026-04-11**: the backend now enforces `privacy_accepted_at` before smart-query execution, so a JWT-bearing user cannot bypass the frontend gate by calling the APIs directly.
- **[DEBT-002]** — **No visible audit log** — the user's ARCO actions are not tracked from the frontend.
- **[DEBT-003]** — **Raw JSON export** — can be overwhelming for a non-technical user. There's no structured "here is your data" UI.

---

**End of spec.md**
