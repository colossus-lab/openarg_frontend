# Create new React component: $ARGUMENTS

Create a new React component for the specified functionality. Follow these steps:

## 1. Create the component file

Create `src/components/$ARGUMENTS.tsx` following existing patterns.

References:
- Interactive component: `src/components/DataChart.tsx`
- Simple component: `src/components/SourcePanel.tsx`
- Auth-aware component: `src/components/UserMenu.tsx`

## 2. Base structure

```typescript
'use client';

import React from 'react';

interface ${ARGUMENTS}Props {
  // define props
}

export default function $ARGUMENTS({ ...props }: ${ARGUMENTS}Props) {
  return (
    <div>
      {/* content */}
    </div>
  );
}
```

## 3. Styling conventions

The project uses custom CSS with a dark theme (Argentina palette). Does NOT use Tailwind.

Available CSS variables (defined in `src/app/globals.css`):
- `var(--celeste)` (#74ACDF) — primary actions, borders
- `var(--sol)` (#F6B40E) — accents, highlights
- `var(--bg-primary)` (#0A0E1A) — dark background
- `var(--bg-card)` (#1A1F35) — card backgrounds
- `var(--text-primary)` (#F0F4FC) — light text

Style patterns:
- Glassmorphism: `backdrop-filter: blur(10px)`, semi-transparent borders
- Border radius: `12px` for cards, `8px` for inputs
- Transitions: `transition: all 0.2s ease`

## 4. Rules

- Always include `'use client'` if the component uses hooks, event handlers, or browser APIs
- Explicit props interface (not inline)
- Export as `export default function`
- No emojis unless part of the existing UI
- If it needs chat data, receive it via props (no internal fetching)

## 5. Integration

After creating the component, show where to import and use it (likely in `src/app/chat/page.tsx` or inside `ChatMessage.tsx`).

## Checklist
- [ ] `'use client'` if interactive
- [ ] Typed props interface
- [ ] Uses dark theme CSS variables
- [ ] Doesn't break existing layout
- [ ] Imported where needed
