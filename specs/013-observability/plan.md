# Plan: Observability (As-Built)

**Related spec**: [./spec.md](./spec.md)
**Last synced with code**: 2026-04-12

---

## 1. Layer Mapping

| Layer | Component | File |
|---|---|---|
| Dependency | `@sentry/nextjs` | `package.json` |
| Config (next) | `withSentryConfig()` wrapping | `next.config.ts` |
| Config (client) | Sentry client init | `sentry.client.config.ts` (repo root) |
| Config (server) | Sentry server init | `sentry.server.config.ts` (repo root) |
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

## 3. Sentry Setup (verified)

```typescript
// next.config.ts
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  // ... config
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: '',
  project: '',
});
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.1,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
```

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
```

**Current state**: the files do live at the repo root and are wired by `next.config.ts`. Both client and server configs currently key off `NEXT_PUBLIC_SENTRY_DSN`; there is no separate `SENTRY_DSN` in the tracked code.

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
NEXT_PUBLIC_SENTRY_DSN=https://...  # Shared DSN used by both client and server configs
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

- **Principle IX (Observability)**: Sentry infra is wired in code, but activation still depends entirely on runtime env (`NEXT_PUBLIC_SENTRY_DSN`).

---

**End of plan.md**
