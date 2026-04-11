# Plan: Auth (As-Built)

**Related spec**: [./spec.md](./spec.md)
**Last synced with code**: 2026-04-10

---

## 1. Layer Mapping

| Layer | Component | File |
|---|---|---|
| NextAuth config | `authOptions` | `src/lib/authOptions.ts` |
| NextAuth handler | `{GET, POST}` | `src/app/api/auth/[...nextauth]/route.ts` |
| Middleware | global auth gate | `src/middleware.ts` |
| Helpers | `requireSession`, `backendHeaders`, `requireAdmin` | `src/lib/auth.ts` |
| User sync route | `POST /api/users/sync` | `src/app/api/users/sync/route.ts` |
| Sync provider | `UserSyncProvider` component | `src/components/UserSyncProvider.tsx` |
| Session provider | `AuthProvider` component | `src/components/AuthProvider.tsx` |
| Login page | Google OAuth button | `src/app/login/page.tsx` |
| Privacy page | ARCO acceptance | `src/app/privacy/page.tsx` |

## 2. NextAuth Configuration

```typescript
// src/lib/authOptions.ts (simplified)
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,  // 24 hours (reducido del default 30d)
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;

      const openBeta = process.env.OPEN_BETA === 'true';
      if (openBeta) {
        const domains = (process.env.OPEN_BETA_DOMAINS || '')
          .split(',').map(d => d.trim()).filter(Boolean);
        if (domains.length === 0) return true;
        const userDomain = email.split('@')[1];
        return domains.includes(userDomain);
      }

      const allowed = (process.env.ALLOWED_EMAILS || '')
        .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
      return allowed.includes(email);
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
};
```

## 3. Middleware

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PROTECTED_PATHS = ['/chat', '/datasets'];
const API_PROTECTED_PREFIX = '/api/';
const API_EXCEPT = '/api/auth/';

export async function middleware(request: NextRequest) {
  if (process.env.DISABLE_AUTH === 'true') return NextResponse.next();

  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith(API_PROTECTED_PREFIX) && !pathname.startsWith(API_EXCEPT);
  const isPage = PROTECTED_PATHS.some(p => pathname.startsWith(p));

  if (!isApi && !isPage) return NextResponse.next();

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    if (isApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/chat/:path*', '/datasets/:path*', '/api/:path*'],
};
```

## 4. Helpers (`src/lib/auth.ts`)

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from './authOptions';
import { NextResponse } from 'next/server';

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return { session: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { session, error: null };
}

export async function requireAdmin() {
  const { session, error } = await requireSession();
  if (error) return { session: null, error };
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
  if (!adminEmails.includes(session.user.email!.toLowerCase())) {
    return { session: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { session, error: null };
}

export function backendHeaders(userEmail?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (process.env.OPENARG_BACKEND_API_KEY) {
    headers['X-API-Key'] = process.env.OPENARG_BACKEND_API_KEY;
  }
  if (userEmail) {
    headers['X-User-Email'] = userEmail;
  }
  return headers;
}
```

## 5. User Sync Route (IDOR-safe)

```typescript
// src/app/api/users/sync/route.ts
export async function POST(request: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await request.json();
  // IDOR FIX: ignore client-supplied email, use JWT
  const email = session!.user!.email!;

  const backendResponse = await fetch(`${BACKEND_URL}/api/v1/users/sync`, {
    method: 'POST',
    headers: backendHeaders(email),
    body: JSON.stringify({
      email,
      name: body.name || session!.user!.name,
      image: body.image || session!.user!.image,
      privacy_accepted_at: body.privacy_accepted_at,
    }),
  });

  if (!backendResponse.ok) {
    return NextResponse.json({ error: 'Sync failed' }, { status: backendResponse.status });
  }

  return NextResponse.json(await backendResponse.json());
}
```

## 6. UserSyncProvider (client component)

```typescript
'use client';
// src/components/UserSyncProvider.tsx
export function UserSyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [privacyStatus, setPrivacyStatus] = useState<'unknown' | 'accepted' | 'pending'>('unknown');

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.email) return;

    fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: session.user.name,
        image: session.user.image,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.privacy_accepted_at) setPrivacyStatus('accepted');
        else setPrivacyStatus('pending');
      })
      .catch(() => { /* silent */ });
  }, [session, status]);

  // Redirect to /privacy if pending
  const pathname = usePathname();
  useEffect(() => {
    const protectedPaths = ['/chat', '/datasets'];
    if (privacyStatus === 'pending' && protectedPaths.some(p => pathname.startsWith(p))) {
      window.location.href = '/privacy';
    }
  }, [privacyStatus, pathname]);

  return <>{children}</>;
}
```

## 7. Environment Variables (required)

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=...              # JWT signing secret (rotate carefully)
NEXTAUTH_URL=https://...         # e.g. https://your-staging-host or https://your-prod-host

# Access control (environment-specific)
# Staging (private alpha):
ALLOWED_EMAILS=email1@x.com,email2@y.com,...
OPEN_BETA=false

# Production (public):
OPEN_BETA=true
OPEN_BETA_DOMAINS=              # optional whitelist by domain

# Admin (latent, no active endpoints yet):
ADMIN_EMAILS=admin1@x.com,admin2@y.com

# Backend integration:
OPENARG_BACKEND_URL=http://backend:8081
OPENARG_BACKEND_API_KEY=...

# Dev only:
DISABLE_AUTH=true               # NEVER in production
```

## 8. Source Files

| File | Role |
|---|---|
| `src/lib/authOptions.ts` | NextAuth config + signIn callback |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth route handler |
| `src/middleware.ts` | Global auth gate |
| `src/lib/auth.ts` | Helpers (`requireSession`, `backendHeaders`, `requireAdmin`) |
| `src/app/api/users/sync/route.ts` | User sync endpoint (IDOR-safe) |
| `src/components/UserSyncProvider.tsx` | Sync on mount + privacy gate |
| `src/components/AuthProvider.tsx` | Wrapper around NextAuth's `<SessionProvider>` |
| `src/app/login/page.tsx` | Google OAuth button |
| `src/app/privacy/page.tsx` | ARCO acceptance page |

## 9. Deviations from Constitution

- **Principle VI (Auth)**: mostly complies. The structural debt is the `X-User-Email` trust model (see `[DEBT-001]`), planned to be resolved in the backend with server-side JWT validation.
- **Principle VII (Security)**: `DISABLE_AUTH=true` is an accepted backdoor for local dev, but should have a `NODE_ENV !== 'production'` assertion.

---

**End of plan.md**
