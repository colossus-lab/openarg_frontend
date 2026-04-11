# Plan: Users/Me (As-Built)

**Related spec**: [./spec.md](./spec.md)
**Last synced with code**: 2026-04-10

---

## 1. Layer Mapping

| Layer | Component | File |
|---|---|---|
| API proxy (profile) | `GET/DELETE /api/users/me` | `src/app/api/users/me/route.ts` |
| API proxy (data export) | `GET /api/users/me/data` | `src/app/api/users/me/data/route.ts` |
| API proxy (settings) | `GET/PATCH /api/users/me/settings` | `src/app/api/users/me/settings/route.ts` |
| API proxy (sync) | `POST /api/users/sync` | `src/app/api/users/sync/route.ts` (see `004-auth/`) |
| Component | `UserSyncProvider` | `src/components/UserSyncProvider.tsx` |
| Page | `/privacy` | `src/app/privacy/page.tsx` |
| Component | `UserMenu` (entry for delete/export) | `src/components/UserMenu.tsx` |

## 2. Route Details

### `GET /api/users/me`
Proxy to backend `GET /api/v1/users/me`. Returns the authenticated user's profile.

### `DELETE /api/users/me`
Proxy to backend `DELETE /api/v1/users/me`. The backend cascade-deletes across `conversations`, `messages`, `user_queries`, `api_keys`. Afterwards the frontend invokes `signOut()` and redirects to `/`.

### `GET /api/users/me/data`
Proxy to backend `GET /api/v1/users/me/data`. Returns a structured JSON with all the user's data. The frontend exposes it as a download (`Content-Disposition: attachment`).

### `GET/PATCH /api/users/me/settings`
Proxy to backend `.../me/settings`. GET returns current settings (includes `save_history`). PATCH accepts partial updates.

## 3. Privacy Gate Flow

```
1. User logs in → UserSyncProvider mounts
2. POST /api/users/sync (forcing the JWT email — see 004-auth)
3. Backend returns {privacy_accepted_at: null | ISO string}
4. UserSyncProvider:
   - if privacy_accepted_at → setPrivacyStatus('accepted') → continue
   - else → setPrivacyStatus('pending')
5. usePathname() effect:
   - if privacyStatus === 'pending' && pathname ∈ ['/chat', '/datasets']
   - → window.location.href = '/privacy'
6. User lands on /privacy page:
   - reads the notice
   - clicks "Accept"
   - PATCH /api/users/me/settings {privacy_accepted_at: now}
   - emits custom event 'privacy-accepted'
   - setPrivacyStatus('accepted')
   - redirect back to callbackUrl or /chat
```

## 4. Delete Account Flow

```
1. UserMenu → "Delete account"
2. ConfirmDialog with explicit warning: "This will delete all your conversations and cannot be reverted"
3. User confirms
4. DELETE /api/users/me
5. Backend cascade-deletes → returns 200
6. Frontend: signOut({callbackUrl: '/'}) from NextAuth
7. Browser redirects to landing
```

## 5. Export Data Flow

```
1. UserMenu → "Export my data"
2. GET /api/users/me/data
3. Frontend triggers download of the JSON:
   const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'})
   const url = URL.createObjectURL(blob)
   const a = document.createElement('a')
   a.href = url
   a.download = `openarg-export-${new Date().toISOString()}.json`
   a.click()
```

## 6. Source Files

| File | Role |
|---|---|
| `src/app/api/users/me/route.ts` | Profile + delete |
| `src/app/api/users/me/data/route.ts` | Export |
| `src/app/api/users/me/settings/route.ts` | Settings |
| `src/components/UserSyncProvider.tsx` | Sync + privacy gate |
| `src/app/privacy/page.tsx` | ARCO acceptance page |
| `src/components/UserMenu.tsx` | Entry for delete/export |

## 7. Deviations from Constitution

- Principle I (thin client): pure proxies.
- Principle VII (Security) — frontend-only privacy gate is [DEBT-001] in the spec.

---

**End of plan.md**
