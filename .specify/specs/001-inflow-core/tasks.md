# Tasks: inFlow Control Plane Core

**Input**: Design documents from `.specify/specs/001-inflow-core/`
**Prerequisites**: plan.md (required), spec.md (required)

## Phase 1: Setup & Foundational Storage

- [x] T001 Initialize Next.js 16 with TypeScript, Tailwind v4, and pnpm package manager in `package.json`
- [x] T002 Implement SQLite database module with WAL mode, accounts, posts, and comment_logs schemas in `src/lib/db.ts`
- [x] T003 [P] Create initial multi-account and post seed data in `src/lib/seed-data.json`
- [x] T004 [P] Implement multilingual dictionary for Persian, English, and Arabic in `src/lib/i18n.ts`

---

## Phase 2: REST API Contracts & Idempotency Engine

- [x] T005 Implement accounts listing and registration API in `src/app/api/accounts/route.ts`
- [x] T006 Implement posts query and creation API in `src/app/api/posts/route.ts`
- [x] T007 Implement 1-to-1 post automation rule configuration API in `src/app/api/posts/[shortcode]/route.ts`
- [x] T008 Implement comment logs and idempotency locking endpoint in `src/app/api/posts/[shortcode]/logs/route.ts`
- [x] T009 Implement Hermes Agent 2-minute polling endpoint in `src/app/api/agent/poll/route.ts`
- [x] T010 Implement account catalog sync endpoint in `src/app/api/sync/route.ts`

---

## Phase 3: Dashboard UI & Post Automation

- [x] T011 Build Vercel-style typography and dark theme with Vazirmatn font in `src/app/layout.tsx` and `src/app/globals.css`
- [x] T012 Build reusable shadcn/ui primitives (Button, Badge, Switch) in `src/components/ui/primitives.tsx`
- [x] T013 Implement main dashboard with multi-account switcher and card/grid views in `src/components/inflow-dashboard.tsx`
- [x] T014 Implement detailed 1-to-1 post rule configuration screen in `src/components/post-detail-view.tsx`
- [x] T015 Implement activity logs modal and live comment simulator in `src/components/modals/logs-modal.tsx`
- [x] T016 Implement Hermes Agent API interactive drawer in `src/components/modals/agent-api-modal.tsx`
- [x] T017 Implement Add Account and Add Post modals in `src/components/modals/create-modals.tsx`

---

## Phase 4: Worker Agent Implementation & Verification

- [x] T018 Implement standalone Hermes Python worker agent in `scripts/hermes_worker.py`
- [x] T019 Verify idempotency locking by running repeat polling cycles with test comments
- [x] T020 Run production build with `pnpm run build` and verify sub-second compilation
