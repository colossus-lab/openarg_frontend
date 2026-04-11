# Plan: Reactbits (As-Built)

**Related spec**: [./spec.md](./spec.md)
**Last synced with code**: 2026-04-10

---

## 1. Layer Mapping

All components live in `src/components/reactbits/`:

```
src/components/reactbits/
├── BlurText.tsx
├── ClickSpark.tsx
├── CountUp.tsx
├── DecryptedText.tsx
├── FadeIn.tsx
├── GradientText.tsx
├── Magnet.tsx
├── Noise.tsx
├── RotatingText.tsx
├── ShinyText.tsx
├── SpotlightCard.tsx
└── StarBorder.tsx
```

## 2. Dependencies

```json
{
  "motion": "^12.35.0"  // successor of framer-motion
}
```

## 3. Usage Pattern

All are client components:

```typescript
'use client';
import { motion } from 'motion/react';

export function FadeIn({ children, delay = 0, ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
```

## 4. Where They're Used

Mainly in:
- `src/app/page.tsx` (landing page) — high use
- `src/app/login/page.tsx` (possibly)
- Maybe in other pages as eye candy

**TODO**: grep usage to confirm what is used and what is dead.

## 5. Source Files

- `src/components/reactbits/*.tsx` (12-13 files)

## 6. Deviations from Constitution

- **Accessibility**: minor violation for not respecting `prefers-reduced-motion`. Debt accepted.
- **Bundle size**: motion lib only loads if these components are used — tree-shakeable.

---

**End of plan.md**
