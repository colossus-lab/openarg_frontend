# Plan: i18n (As-Built)

**Related spec**: [./spec.md](./spec.md)
**Last synced with code**: 2026-04-10

---

## 1. Layer Mapping

| Layer | Component | File |
|---|---|---|
| Config | `getRequestConfig` | `src/i18n/request.ts` |
| Messages | Translations JSON | `messages/es.json` (~14.5 KB) |
| Integration | Next.js plugin wrapper | `next.config.ts` (via `createNextIntlPlugin`) |
| Hook usage | `useTranslations('namespace')` | across all components |
| Root layout | `<html lang="es-AR">` + `NextIntlClientProvider` | `src/app/layout.tsx` |

## 2. Configuration

```typescript
// src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  const locale = 'es';  // hardcoded
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

```typescript
// next.config.ts (simplified, ignoring Sentry)
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig = {
  // ...
};

export default withNextIntl(nextConfig);
```

```typescript
// src/app/layout.tsx (extract)
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  return (
    <html lang="es-AR">
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

## 3. Usage Pattern

```typescript
'use client';
import { useTranslations } from 'next-intl';

function MyComponent() {
  const t = useTranslations('chat');

  return (
    <>
      <button>{t('sendButton')}</button>
      <p>{t('placeholder')}</p>
    </>
  );
}
```

## 4. Messages Structure (inferred)

```json
{
  "landing": {
    "badge": "Datos Abiertos en Tiempo Real",
    "title": "...",
    "subtitle": "..."
  },
  "chat": {
    "placeholder": "¿Qué querés saber sobre Argentina?",
    "sendButton": "Enviar",
    "cancelButton": "Cancelar",
    "suggestions": {
      "suggestion1": "...",
      "suggestion2": "..."
    }
  },
  "chatMessage": {
    "feedbackHelpful": "Útil",
    "feedbackNotHelpful": "No útil"
  },
  "login": {
    "googleButton": "Ingresar con Google",
    "title": "Bienvenido a OpenArg"
  },
  "agents": {
    "strategist": "Estratega",
    "researcher": "Investigador",
    "analyst": "Analista",
    "writer": "Redactor"
  }
}
```

## 5. Multi-language Refactor Plan (future)

If English support is decided on:

1. Create `messages/en.json` with the same keys but translated.
2. Refactor `src/i18n/request.ts`:
   ```typescript
   export default getRequestConfig(async ({ requestLocale }) => {
     const locale = await detectLocale(requestLocale);
     return {
       locale,
       messages: (await import(`../../messages/${locale}.json`)).default,
     };
   });
   ```
3. Add locale detection middleware (cookie, `Accept-Language` header, or URL segment).
4. Update `<html lang={locale}>` in the layout.
5. Add UI for changing language (toggle in UserMenu).
6. Testing with both locales.

## 6. Source Files

- `src/i18n/request.ts`
- `messages/es.json`
- `src/app/layout.tsx` (integration)
- `next.config.ts` (plugin wrapper)

## 7. Deviations from Constitution

- **Principle XI (i18n)**: Spanish hardcoded, multi-language not implemented. [DEBT-001] from the spec. Accepted until there is real demand.

---

**End of plan.md**
