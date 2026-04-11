# Plan: Visualization (As-Built)

**Related spec**: [./spec.md](./spec.md)
**Last synced with code**: 2026-04-10

---

## 1. Layer Mapping

| Component | File | Library |
|---|---|---|
| `DataChart` | `src/components/DataChart.tsx` | Recharts 3.7 |
| `ObservablePlotChart` | `src/components/ObservablePlotChart.tsx` | @observablehq/plot 0.6 |
| `MapView` | `src/components/MapView.tsx` | Leaflet 1.9 |
| `DocumentCards` | `src/components/DocumentCards.tsx` | — (pure React) |
| `ChartErrorBoundary` | `src/components/ChartErrorBoundary.tsx` | React Error Boundary |

## 2. Dependencies

```json
{
  "recharts": "^3.7.0",
  "@observablehq/plot": "^0.6.17",
  "leaflet": "^1.9.4",
  "@types/leaflet": "^1.9.21"
}
```

## 3. Expected Data Shapes

### ChartData (shared between Recharts + Observable Plot)
```typescript
interface ChartData {
  type: 'line_chart' | 'bar_chart' | 'pie_chart' | 'heatmap' | 'scatter';
  title: string;
  data: Array<Record<string, string | number>>;
  x_key: string;
  y_keys: string[];
  // Optional hints
  unit?: string;
  color_scheme?: string;
}
```

### MapData (GeoJSON)
```typescript
interface MapData {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: GeoJSONGeometry;
    properties: Record<string, unknown>;
  }>;
  metadata?: {
    center?: [number, number];
    zoom?: number;
  };
}
```

### DocumentRecord
```typescript
interface DocumentRecord {
  id?: string;
  title?: string;
  fields: Record<string, unknown>;  // structured key-value
  source?: string;
}
```

## 4. Lazy Loading Pattern

```typescript
// In chat/page.tsx or ChatMessage.tsx
import dynamic from 'next/dynamic';

const DataChart = dynamic(
  () => import('@/components/DataChart'),
  { ssr: false, loading: () => <div>Cargando chart...</div> }
);

const MapView = dynamic(
  () => import('@/components/MapView'),
  { ssr: false, loading: () => <div>Cargando mapa...</div> }
);
```

`ssr: false` because Recharts and Leaflet do not work server-side.

## 5. Theme Integration

DataChart must use CSS variables for colors:

```typescript
// src/components/DataChart.tsx (extract)
const COLORS = {
  primary: 'var(--color-celeste)',      // #74ACDF
  accent: 'var(--color-sol)',            // #F6B40E
  grid: 'var(--color-grid)',
  text: 'var(--color-text)',
  background: 'transparent',
};

// Recharts config
<CartesianGrid stroke={COLORS.grid} />
<Line stroke={COLORS.primary} />
```

## 6. ChartErrorBoundary

```typescript
'use client';
import { Component } from 'react';

export class ChartErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Report to Sentry
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return <div className="chart-error">No se pudo renderizar el gráfico.</div>;
    }
    return this.props.children;
  }
}
```

## 7. Source Files

- `src/components/DataChart.tsx`
- `src/components/ObservablePlotChart.tsx`
- `src/components/MapView.tsx`
- `src/components/DocumentCards.tsx`
- `src/components/ChartErrorBoundary.tsx`

## 8. Deviations from Constitution

- **Principle VIII (dark theme)**: charts comply. Maps [DEBT-003] do not have dark tiles.
- **Bundle size**: 2 chart libs + Leaflet → lazy loading mandatory.

---

**End of plan.md**
