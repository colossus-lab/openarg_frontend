# Plan: Datasets Page (As-Built)

**Related spec**: [./spec.md](./spec.md)
**Last synced with code**: 2026-04-10

---

## 1. Layer Mapping

| Layer | Component | File |
|---|---|---|
| Page | `/datasets` | `src/app/datasets/page.tsx` |
| API proxy | `/api/datasets` | `src/app/api/datasets/route.ts` |
| API proxy | `/api/taxonomy` | `src/app/api/taxonomy/route.ts` |
| Component | `TaxonomyExplorer` | `src/components/TaxonomyExplorer.tsx` |
| Component | `IntraRanking` | `src/components/IntraRanking.tsx` |
| Component | `DataQualitySection` | `src/components/DataQualitySection.tsx` |
| Component | `DigitalizationGuide` | `src/components/DigitalizationGuide.tsx` |

## 2. Routes

### `GET /api/datasets`
Proxy to backend `GET /api/v1/datasets` or `/api/v1/datasets/stats`. Cache headers: `Cache-Control: s-maxage=300, stale-while-revalidate=600` (5 min).

### `GET /api/taxonomy`
Proxy to backend `GET /api/v1/taxonomy`. Similar cache.

## 3. Source Files

- `src/app/datasets/page.tsx`
- `src/app/api/datasets/route.ts`
- `src/app/api/taxonomy/route.ts`
- `src/components/TaxonomyExplorer.tsx`
- `src/components/IntraRanking.tsx`
- `src/components/DataQualitySection.tsx`
- `src/components/DigitalizationGuide.tsx`

## 4. Backend Contract

See `../../openarg_backend/specs/006-datasets/` for the response shape.

## 5. Deviations from Constitution

- Principle I (thin client): proxies + render.
- Principle VII (caching): applied via HTTP cache headers, no library.

---

**End of plan.md**
