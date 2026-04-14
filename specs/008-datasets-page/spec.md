# Spec: Datasets Page (`/datasets`)

**Type**: Reverse-engineered
**Status**: Draft
**Last synced with code**: 2026-04-12
**Layer scope**: Presentation (page + components)
**Related plan**: [./plan.md](./plan.md)

---

## 1. Context & Purpose

The `/datasets` page exposes the **catalog of datasets** indexed by the backend. It lets users navigate a taxonomy (a hierarchical classification of data types), see aggregated stats (rankings, quality by portal), and potentially search. It consumes proxies to the backend at `/api/v1/datasets` and `/api/v1/taxonomy`, with a 5-minute cache.

It is a **secondary** product feature — the core is the chat. But it adds context and transparency about what data is available.

## 2. User Stories

### US-001 (P1) — Navigate the dataset taxonomy
**As a** user, **I want** to see a hierarchical structure of data categories (e.g. Economy → Inflation → CPI) and expand them, **so that** I can understand what's available.

### US-002 (P2) — See ranking of portals by quality
**As an** analyst, **I want** to see which portals have the most datasets / best quality, **so that** I can understand system coverage.

### US-003 (P2) — See the data quality section
**As an** operator, **I want** to see a data quality summary (cached tables, datasets with embeddings, etc.).

### US-004 (P3) — Digitalization guide
**As an** educational visitor, **I want** to see an explanatory guide on the state of public data digitalization in Argentina.

### US-005 (P2) — Responsive local filtering
**As a** user browsing many loaded datasets, **I want** portal/format/search filtering to remain responsive while I type, **so that** the catalog does not feel sluggish.

## 3. Functional Requirements

- **FR-001**: `/datasets` MUST be protected by middleware (auth required).
- **FR-002**: MUST render `TaxonomyExplorer` with data from `GET /api/taxonomy`.
- **FR-003**: MUST render `IntraRanking` with data from `GET /api/datasets`.
- **FR-004**: MUST render `DataQualitySection` with aggregates.
- **FR-005**: MUST render `DigitalizationGuide` as an informational component.
- **FR-006**: `/api/taxonomy` and `/api/datasets` MUST use short-lived revalidation caching in the frontend proxy layer. As of the current code, `/api/datasets` revalidates every **60 seconds**.
- **FR-007**: Loading states and error boundaries consistent with the rest of the app.
- **FR-008**: Local filtering of already-loaded datasets MUST stay responsive under a growing in-memory list by avoiding unnecessary repeated full-list work where simple local indexes or deferred search can be used.

## 4. Success Criteria

- **SC-001**: First paint **<2s** including taxonomy fetch.
- **SC-002**: 60-second cache hits on the datasets proxy reduce backend load without leaving the catalog stale for too long.
- **SC-003**: Typing in the search/filter controls stays responsive even when hundreds or thousands of datasets are loaded client-side.

## 5. Open Questions

- **[NEEDS CLARIFICATION CL-001]** — Is `/datasets` a priority or secondary feature? Defines the level of investment in improvements.
- **[RESOLVED CL-002]** — **Premise is wrong — the actual cache is 60 seconds, not 5 minutes.** `src/app/api/datasets/route.ts:35` sets `next: { revalidate: 60 }, // Cache stats for 60s`. No other caching layer is applied to this route. Whether 60s or longer is the right value is a product/ops call, but the code-fact is 60s. SC-002 in this same spec ("5-minute cache hits reduce backend load") is therefore also stale. (resolved 2026-04-11 via code inspection)
- **[RESOLVED CL-003]** — **TaxonomyExplorer has NO search**. Verified directly: it's a read-only expand/collapse tree with 6 domains (economy, government, social, infrastructure, natural_resources, science). Interactions: expand categories and click on tags. No search input or filter.

## 6. Tech Debt Discovered

- **[DEBT-001]** — **No search** in TaxonomyExplorer — only manual navigation through the 6-domain tree.
- **[DEBT-002]** *(corrected 2026-04-10)* — **`DataQualitySection` and `DigitalizationGuide` are 100% HARDCODED**. Verified:
  - `DataQualitySection`: static educational content (7 quality dimensions + Quantity vs Quality comparison). Collapsible. Zero backend.
  - `DigitalizationGuide`: hardcoded framework of maturity levels (Electronic Administration → Proactive) + 4 strategic pillars. Zero backend.
  - **Impact**: if the stats/frameworks change in the future, it requires a code edit + deploy. Consider moving it to `messages/es.json` or to a backend endpoint.
- **[DEBT-003]** — **Inconsistent portal count**: the landing says "32 portals" (`page.tsx:90`), the chat subtitle says "30 portals" (`page.tsx:61` of chat). Hardcoded values misaligned between pages. It should come from a single source (API or shared constant).
- **[DEBT-004]** — ~~**Client-side filtering scaled linearly with the whole loaded dataset list on every keystroke**~~ **FIXED 2026-04-12**: the page now defers the search input with `useDeferredValue`, partitions loaded datasets by `formatLower`, and derives unique formats in the same indexing pass, reducing repeated full-list work on the hot path.

---

**End of spec.md**
