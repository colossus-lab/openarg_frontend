# Plan: Developers Portal (As-Built)

**Related spec**: [./spec.md](./spec.md)
**Last synced with code**: 2026-04-10

---

## 1. Layer Mapping

| Layer | Component | File |
|---|---|---|
| API proxy (list/create) | `GET/POST /api/developers/keys` | `src/app/api/developers/keys/route.ts` |
| API proxy (revoke) | `DELETE /api/developers/keys/[keyId]` | `src/app/api/developers/keys/[keyId]/route.ts` |
| API proxy (usage) | `GET /api/developers/usage` | `src/app/api/developers/usage/route.ts` |
| Component (dialog) | `ApiKeyDialog` | `src/components/ApiKeyDialog.tsx` |
| Entry point | `UserMenu → "Developers"` button | `src/components/UserMenu.tsx` |

## 2. API Routes

### `GET /api/developers/keys`
Proxy to `GET /api/v1/developers/keys` with `X-User-Email`. Returns a list of masked keys (prefix only + metadata).

### `POST /api/developers/keys`
Proxy to `POST /api/v1/developers/keys`. Returns `{raw_key: "oarg_sk_...", key_prefix, id, plan, created_at}`. **The `raw_key` is returned only once.**

### `DELETE /api/developers/keys/[keyId]`
Proxy to `DELETE /api/v1/developers/keys/{keyId}`. Soft-delete (sets `is_active=false` in the backend).

### `GET /api/developers/usage`
Proxy to `GET /api/v1/developers/usage`. Returns `{total_requests, total_tokens, last_request_at, requests_by_day, ...}`.

## 3. ApiKeyDialog Component Flow

```
State: 'list' | 'creating' | 'showing_new' | 'confirming_revoke'

1. User opens dialog (from UserMenu)
2. State = 'list' → fetch('/api/developers/keys') → render list
3. User clicks "Create new key"
   → if a previous key exists → state = 'confirming_replace' → warning "this revokes your current key"
   → else → state = 'creating' → POST /api/developers/keys
4. Response arrives with raw_key
   → state = 'showing_new' → render plaintext in <code> + "Copy" button
   → warning "This is the only time you will see the full key"
5. User copies + closes
   → plaintext is lost from state
   → re-fetch list → shows masked key
6. User clicks "Revoke" on a key
   → state = 'confirming_revoke' → ConfirmDialog
   → confirm → DELETE /api/developers/keys/{id} → re-fetch list
```

## 4. Source Files

- `src/app/api/developers/keys/route.ts`
- `src/app/api/developers/keys/[keyId]/route.ts`
- `src/app/api/developers/usage/route.ts`
- `src/components/ApiKeyDialog.tsx`
- `src/components/UserMenu.tsx` (entry point)

## 5. Backend Contract

See `../../openarg_backend/specs/008-developers-keys/` for the detailed backend contract.

## 6. Deviations from Constitution

- Principle I (thin client): proxies + UI.
- Principle VII (Security): plaintext is shown only once, does not persist in state.

---

**End of plan.md**
