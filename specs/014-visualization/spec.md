# Spec: Visualization Components (Charts, Maps, Documents)

**Type**: Reverse-engineered
**Status**: Draft
**Last synced with code**: 2026-04-10
**Layer scope**: Presentation (components)
**Related plan**: [./plan.md](./plan.md)

---

## 1. Context & Purpose

Visualization components that render **charts, geographic maps, and structured documents** as part of chat responses. When the backend returns `chart_data`, `map_data`, or `documents` in an assistant message, these components turn them into rich UI (not just text).

Includes:
- **DataChart** — Recharts 3 wrapper (line, bar, pie)
- **ObservablePlotChart** — Observable Plot wrapper (heatmap, scatter, advanced)
- **MapView** — Leaflet 1.9 wrapper for GeoJSON
- **DocumentCards** — structured cards for records (e.g., DDJJ)
- **ChartErrorBoundary** — fallback if a chart breaks

All are **isolated visual components**, without business logic. They consume data directly from props.

## 2. User Stories

### US-001 (P1) — See inline chart in assistant responses
**As** a user, **when** I ask for a time series or comparison, **I want** to see a chart in the response, not just a text table.

### US-002 (P1) — See geographic maps when applicable
**As** a user, **when** I ask about geographic data (municipalities, provinces, etc.), **I want** to see a map with markers/polygons.

### US-003 (P1) — See structured documents as cards
**As** a user, **when** I ask for a specific DDJJ, **I want** to see the details as a card with labeled fields, not plain text.

### US-004 (P1) — Graceful error if a chart breaks
**As** a user, **when** a chart has invalid data, **I want** to see an inline error message instead of a blank screen or crash.

### US-005 (P2) — Consistent dark theme
**As** a user, **I want** all charts/maps to have the dark theme of the rest of the app.

## 3. Functional Requirements

### DataChart (Recharts)
- **FR-001**: MUST accept a `chart: ChartData` prop with shape `{type, title, data, x_key, y_keys}`.
- **FR-002**: MUST support `type ∈ {'line_chart', 'bar_chart', 'pie_chart'}`.
- **FR-003**: MUST use Recharts components: `LineChart`, `BarChart`, `PieChart`, `ResponsiveContainer`.
- **FR-004**: MUST apply dark theme via CSS variables (celeste, sol, bg).
- **FR-005**: MUST be lazy-loaded (dynamic import) to avoid inflating the initial `/chat` bundle.

### ObservablePlotChart
- **FR-006**: MUST accept chart types that Recharts does not support: `heatmap`, `scatter`.
- **FR-007**: MUST use the `@observablehq/plot` API.
- **FR-008**: MUST be lazy-loaded (heavy library).

### MapView
- **FR-009**: MUST accept a `mapData: GeoJSONFeatureCollection` prop.
- **FR-010**: MUST render a map centered on Argentina by default.
- **FR-011**: MUST use OSM tiles or similar.
- **FR-012**: MUST render GeoJSON features with informative popups.
- **FR-013**: MUST be lazy-loaded (Leaflet is heavy).
- **FR-014**: MUST handle the dark theme case (dark tiles or fallback).

### DocumentCards
- **FR-015**: MUST accept a `documents: DocumentRecord[]` prop.
- **FR-016**: MUST render each record as a card with labeled fields.
- **FR-017**: Must have a specific design for DDJJ (patrimonioCierre, ingresos, bienes, etc.).

### ChartErrorBoundary
- **FR-018**: MUST wrap DataChart and ObservablePlotChart.
- **FR-019**: If a chart throws during render, it MUST show a friendly message in Spanish.
- **FR-020**: MUST report the error to Sentry if configured.

## 4. Success Criteria

- **SC-001**: Charts render in **<500ms** for typical data (<1000 points).
- **SC-002**: Lazy loading significantly reduces the initial bundle of `/chat`.
- **SC-003**: Zero chart crashes that take down the entire page — error boundary catches everything.
- **SC-004**: Responsive: charts and maps adapt to mobile.

## 5. Open Questions

- **[RESOLVED CL-001]** — **MapView uses Leaflet default (OpenStreetMap)**. Verified: the code imports Leaflet and uses the default tile layer (no custom provider). Leaflet.css via CDN. Supports GeoJSON (Point/Polygon/MultiPolygon) with a sophisticated HTML popup builder (truncation, "+N more fields" if >10 attrs).
- **[RESOLVED CL-002]** — **DocumentCards is DDJJ-specific with an extensible dispatcher**. Verified: the `switch` statement at `DocumentCards.tsx:145` only dispatches on `doc_type: 'ddjj'`; other types return `null`. The DDJJ render includes net worth, assets/liabilities breakdown, asset composition chips, expandable detail table. Ranking if ≥2 docs. Shows 3 + "load more" button. The design anticipates future polymorphism but only DDJJ is implemented.
- **[NEEDS CLARIFICATION CL-003]** — What is the data-point threshold at which a chart starts to degrade performance? (Unresolved due to lack of metrics.)

## 6. Tech Debt Discovered

- **[DEBT-001]** — **Two chart libraries** (Recharts + Observable Plot). Increases bundle size. Could they be unified into one?
- **[DEBT-002]** — **Leaflet ships with its own CSS** — it must be imported manually. If not done, maps look broken.
- **[DEBT-003]** — **Dark mode for maps** — OSM tiles are light, there is no dark toggle. It looks ugly in the app's dark theme.
- **[DEBT-004]** — **DocumentCards probably DDJJ-specific** — if other record types need cards, it would have to be parameterized.

---

**End of spec.md**
