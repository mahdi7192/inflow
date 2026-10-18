# Implementation Plan: inFlow Control Plane Core

**Branch**: `001-inflow-core` | **Date**: 2026-10-18 | **Spec**: [spec.md](./spec.md)

## Summary
Build the Control Plane platform for Instagram automation:
1. Multi-account Instagram management with 1-to-1 post/reel mapping.
2. Fast local SQLite persistence with WAL mode and strict idempotency locks (`comment_id`).
3. Clean Next.js 16 (App Router) + shadcn/ui dashboard supporting RTL (Vazirmatn) and LTR.
4. Dedicated REST APIs for Hermes Agent polling, syncing, and logging.

## Technical Context
- **Language/Version**: TypeScript 5.9, Node.js v26+
- **Primary Dependencies**: Next.js 16.4.2, React 19, better-sqlite3, Tailwind CSS v4, Lucide icons
- **Package Manager**: pnpm 11+
- **Storage**: SQLite local database at `data/inflow.db` (WAL mode enabled)
- **Target Platform**: macOS / Linux Server (Ubuntu/Debian)
- **Performance Goals**: Sub-50ms API response time on local SQLite, zero race conditions on comment locks.
- **Constraints**: Control Plane only (no Instagram browser automation or private scraping inside this repo).

## Constitution Check
- [x] **Spec-Driven Development First**: Formal spec in `001-inflow-core`.
- [x] **Control Plane Isolation**: Clear separation from worker execution plane.
- [x] **Absolute Idempotency**: Unique constraint on `comment_logs.comment_id`.
- [x] **Package Manager**: Strictly `pnpm`.
- [x] **RTL & Typography**: Vazirmatn font with explicit `dir="rtl"`.

## Project Structure
```text
src/
├── app/
│   ├── api/
│   │   ├── accounts/route.ts
│   │   ├── agent/poll/route.ts
│   │   ├── posts/route.ts
│   │   ├── posts/[shortcode]/route.ts
│   │   ├── posts/[shortcode]/logs/route.ts
│   │   └── sync/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   │   ├── icons.tsx
│   │   └── primitives.tsx
│   ├── modals/
│   │   ├── agent-api-modal.tsx
│   │   ├── create-modals.tsx
│   │   └── logs-modal.tsx
│   ├── inflow-dashboard.tsx
│   └── post-detail-view.tsx
└── lib/
    ├── db.ts
    ├── i18n.ts
    ├── seed-data.json
    └── utils.ts
scripts/
└── hermes_worker.py
```
