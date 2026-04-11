# Spec: API Proxies (misc)

**Type**: Reverse-engineered
**Status**: Draft
**Last synced with code**: 2026-04-10
**Layer scope**: Application (route handlers)
**Related plan**: [./plan.md](./plan.md)

---

## 1. Context & Purpose

A collection of **simple proxy routes** that forward to specific backend endpoints with auth + rate limit but without extra logic. I group the ones that didn't fall into more specific modules:

- `/api/feedback` — message feedback
- `/api/taxonomy` — data taxonomy (also related to `008-datasets-page`)
- `/api/transparency` — reports (see `009-transparency-page`)

This module exists to capture them together under common rules. More specific routes (chat, conversations, users, developers) have their own modules.

## 2. User Stories

### US-001 (P1) — Send feedback on an assistant message
**As a** user, **I want** to mark a response as helpful/not helpful and optionally add a comment, **so that** I can help the team improve the system.

### US-002 (P2) — Consume taxonomy (from /datasets)
**As a** UI, **I want** to fetch the hierarchical data category structure.

## 3. Functional Requirements

### `/api/feedback` (PATCH)
- **FR-001**: MUST proxy `PATCH /api/v1/conversations/{conversationId}/messages/{messageId}/feedback`.
- **FR-002**: Body: `{feedback: 'positive' | 'negative', comment?: string}`.
- **FR-003**: Rate limit: `feedback` (10/min).
- **FR-004**: Requires `requireSession()`.

### `/api/taxonomy` (GET)
- **FR-005**: MUST proxy `GET /api/v1/taxonomy`.
- **FR-006**: 5-minute cache headers.
- **FR-007**: Rate limit: `datasets` (30/min).

## 4. Tech Debt Discovered

- **[DEBT-001]** — **Generic routes grouped in one spec** — OK for now, but if any grows significantly, it deserves its own module.
- **[DEBT-002]** — **No body validation** on feedback before the proxy — the backend validates but the frontend could fail fast.

---

**End of spec.md**
