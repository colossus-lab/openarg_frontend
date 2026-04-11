# Plan: Observability (As-Built)

**Related spec**: [./spec.md](./spec.md)
**Last synced with code**: 2026-04-10

---

## 1. Layer Mapping

| Layer | Component | File |
|---|---|---|
| Dependency | `@sentry/nextjs` | `package.json` |
| Config (next) | `withSentryConfig()` wrapping | `next.config.ts` |
| Config (client) | Sentry client init | `sentry.client.config.ts` (root, TBD verify) |
| Config (server) | Sentry server init | `sentry.server.config.ts` (root, TBD verify) |
| Lib | `logger` | `src/lib/logger.ts` |
| Error boundary | `global-error.tsx` | `src/app/global-error.tsx` |

## 2. Logger Implementation

```typescript
// src/lib/logger.ts
const isProd = process.env.NODE_ENV === 'production';

export const logger = {
  debug(...args: unknown[]) {
    if (!isProd) console.debug(...args);
  },
  info(...args: unknown[]) {
    if (!isProd) console.log(...args);
  },
  warn(...args: unknown[]) {
    console.warn(...args);
  },
  error(...args: unknown[]) {
    console.error(...args);
  },
};
```

Minimalist — 4 methods, no structured format, no context stacks.

## 3. Sentry Setup (inferred)

```typescript
// next.config.ts
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  // ... config
};

export default withSentryConfig(nextConfig, {
  org: 'openarg',          // or similar
  project: 'openarg-frontend',
  silent: !process.env.CI,
  authToken: process.env.SENTRY_AUTH_TOKEN,
}, {
  widenClientFileUpload: true,
  hideSourceMaps: true,
});
```

```typescript
// sentry.client.config.ts (probable)
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
  tracesSampleRate: 0.1,
  // ... other options
});
```

```typescript
// sentry.server.config.ts (probable)
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.ENVIRONMENT || 'development',
  tracesSampleRate: 0.1,
});
```

**Note**: I couldn't confirm the exact contents of these files — they are referenced in `package.json` (the dep) and in `next.config.ts` (the wrapping) but I didn't see them directly in the Glob of `src/`. They probably live at the repo root.

## 4. Error Boundary

```typescript
// src/app/global-error.tsx
'use client';
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <h1>Algo salió mal</h1>
        <p>Estamos trabajando para solucionarlo. Por favor, intentá de nuevo en unos minutos.</p>
        <button onClick={() => window.location.reload()}>Reintentar</button>
      </body>
    </html>
  );
}
```

## 5. Usage Patterns

```typescript
// In a route handler
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    logger.info('Processing request', { path: request.url });
    // ... work
  } catch (err) {
    logger.error('Request failed', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

```typescript
// In a component
import { logger } from '@/lib/logger';

function MyComponent() {
  useEffect(() => {
    logger.debug('Component mounted');
    // ...
  }, []);
}
```

## 6. Environment Variables

```bash
SENTRY_DSN=https://...         # Server-side DSN
NEXT_PUBLIC_SENTRY_DSN=https://...  # Client-side DSN (exposed to browser)
NEXT_PUBLIC_ENVIRONMENT=staging|production
SENTRY_AUTH_TOKEN=...          # For source map uploads in CI
```

## 7. Source Files

| File | Role |
|---|---|
| `src/lib/logger.ts` | Custom 4-level logger |
| `src/app/global-error.tsx` | Global error boundary |
| `next.config.ts` | Sentry wrapping |
| `sentry.client.config.ts` | Sentry client init (repo root) |
| `sentry.server.config.ts` | Sentry server init (repo root) |
| `package.json` | `@sentry/nextjs` dep |

## 8. Deviations from Constitution

- **Principle IX (Observability)**: Sentry infra present, but missing confirmation of the real DSN in prod.
- **[DEBT-002]**: Sentry config files not visible in `src/` — verify location.

---

**End of plan.md**
