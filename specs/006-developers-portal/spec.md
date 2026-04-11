# Spec: Developers Portal (API Keys UI)

**Type**: Reverse-engineered
**Status**: Draft
**Last synced with code**: 2026-04-10
**Layer scope**: Presentation + Application (proxies)
**Related plan**: [./plan.md](./plan.md)

---

## 1. Context & Purpose

A portal UI for **authenticated users** to manage their **API keys** for programmatic access. Complements the backend `008-developers-keys`. It consists of: proxy routes (`/api/developers/keys`, `/api/developers/usage`) + a dialog component (`ApiKeyDialog`) with UX for creating, viewing plaintext once, copying, listing, and revoking keys.

## 2. User Stories

### US-001 (P1) — Create API key
**As a** developer, **I want** to create an API key from the user menu and see the plaintext token **only once** so I can copy it.

- Happy path: click "Generate key" → confirmation modal → POST to backend → receives `{raw_key, key_prefix}` → show with "Copy" button → message "this is the only time you will see the full key"

### US-002 (P1) — List my keys
**As a** developer, **I want** to see my keys masked (prefix only) with creation date + last_used.

### US-003 (P1) — Revoke key
**As a** developer, **I want** a "Revoke" button with confirmation to disable a compromised key.

### US-004 (P2) — View cumulative usage
**As a** developer, **I want** to see my stats: request count, tokens consumed, last 24h.

## 3. Functional Requirements

- **FR-001**: `GET /api/developers/keys` MUST proxy `GET /api/v1/developers/keys`.
- **FR-002**: `POST /api/developers/keys` MUST proxy `POST /api/v1/developers/keys` → return plaintext `oarg_sk_*` **only once**.
- **FR-003**: `DELETE /api/developers/keys/[keyId]` MUST proxy `DELETE /api/v1/developers/keys/{id}`.
- **FR-004**: `GET /api/developers/usage` MUST proxy `GET /api/v1/developers/usage`.
- **FR-005**: All routes require `requireSession()`.
- **FR-006**: `ApiKeyDialog` MUST have 3 views: list, creation (with "only once" warning), revoke confirmation.
- **FR-007**: When creating a key, it MUST show the plaintext in a `<code>` block with a "Copy" button that uses `navigator.clipboard.writeText`.
- **FR-008**: MUST explicitly show in the UI: "This is the only time you will see the full key. Store it in a safe place."
- **FR-009**: After closing the creation dialog, the plaintext key is lost; only the `key_prefix` remains visible.

## 4. Success Criteria

- **SC-001**: Create key responds in **<1s** including navigation to the modal.
- **SC-002**: Revoke is **atomic** from the user's perspective.
- **SC-003**: Zero plaintext exposure after the first display.

## 5. Open Questions

- **[NEEDS CLARIFICATION CL-001]** — Does the UI support multiple keys per user, or does it follow the backend restriction of 1 key per user (see backend `008-developers-keys/CL-002`)?
- **[NEEDS CLARIFICATION CL-002]** — Is there pagination on usage stats? If a user has made 10K requests, the view could be slow.
- **[NEEDS CLARIFICATION CL-003]** — Is `expires_at` shown in the UI even though the backend doesn't set it today (dead field)?

## 6. Tech Debt Discovered

- **[DEBT-001]** — **No filter/search** in the key list (OK for now, 1 key per user).
- **[DEBT-002]** — **`navigator.clipboard` fallback**: if the browser doesn't support it (HTTP dev without HTTPS), is there a fallback with `document.execCommand('copy')`?

---

**End of spec.md**
