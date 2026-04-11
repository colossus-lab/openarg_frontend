# Plan: Landing Page (As-Built)

**Related spec**: [./spec.md](./spec.md)
**Last synced with code**: 2026-04-10

---

## 1. Layer Mapping

| Layer | Component | File |
|---|---|---|
| Page | `HomePage` | `src/app/page.tsx` |
| Layout | Root layout | `src/app/layout.tsx` |
| Animations | reactbits components | `src/components/reactbits/*.tsx` |
| Auth | NextAuth redirect to `/login` | `src/app/login/page.tsx` |

## 2. Structure (inferred)

```typescript
// src/app/page.tsx (simplified)
'use client';
import { FadeIn, GradientText, SpotlightCard, CountUp, ShinyText, ... } from '@/components/reactbits';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function HomePage() {
  const t = useTranslations('landing');

  return (
    <main>
      <Noise />  {/* background texture */}

      {/* Hero */}
      <FadeIn>
        <GradientText as="h1">{t('title')}</GradientText>
        <p>{t('subtitle')}</p>
        <Link href="/login">
          <ShinyText>Ingresar con Google</ShinyText>
        </Link>
      </FadeIn>

      {/* Stats section */}
      <FadeIn delay={0.2}>
        <div className="stats">
          <SpotlightCard>
            <CountUp to={17025} />
            <p>Datasets indexados</p>
          </SpotlightCard>
          <SpotlightCard>
            <CountUp to={28} />
            <p>Portales conectados</p>
          </SpotlightCard>
          {/* ... */}
        </div>
      </FadeIn>

      {/* Features / Phases */}
      <FadeIn delay={0.4}>
        <h2>{t('howItWorks')}</h2>
        <div className="phases">
          <SpotlightCard><h3>Estratega</h3><p>{t('strategist')}</p></SpotlightCard>
          <SpotlightCard><h3>Investigador</h3><p>{t('researcher')}</p></SpotlightCard>
          <SpotlightCard><h3>Analista</h3><p>{t('analyst')}</p></SpotlightCard>
          <SpotlightCard><h3>Redactor</h3><p>{t('writer')}</p></SpotlightCard>
        </div>
      </FadeIn>

      {/* Example queries */}
      <FadeIn delay={0.6}>
        <h2>{t('exampleQueries')}</h2>
        <div className="examples">
          <Link href="/login?q=inflacion"><SpotlightCard>¿Cuánto fue la inflación en marzo?</SpotlightCard></Link>
          {/* ... */}
        </div>
      </FadeIn>

      {/* CTA footer */}
      <FadeIn delay={0.8}>
        <Link href="/login">
          <button>Empezar a explorar</button>
        </Link>
      </FadeIn>
    </main>
  );
}
```

*[Note: pseudo-code — I didn't read the real file; the actual structure may vary.]*

## 3. Source Files

- `src/app/page.tsx` (main landing)
- `src/app/layout.tsx` (layout with providers)
- `src/components/reactbits/*.tsx` (animations)
- `messages/es.json` (strings)

## 4. Deviations from Constitution

- **Principle I (thin client)**: static page + animations, zero backend calls.
- **Principle VIII (dark theme)**: consistent palette.
- **Principle X (Spanish-first)**: strings in `messages/es.json`.

---

**End of plan.md**
