# inFlow — Claude Code & AI Instructions

## Project Overview
`inFlow` is the Control Plane for Instagram comment auto-response & direct message automation. It is a fullstack Next.js 16 (App Router) + SQLite (`better-sqlite3`) application that manages multi-account Instagram automation configs, locks, and logs for external worker agents (e.g. Hermes Agent).

## Package Manager
* ALWAYS use `pnpm` (`pnpm install`, `pnpm add`, `pnpm run build`, `pnpm dev`, `pnpm lint`).
* NEVER use `npm` or `yarn`.

## Architecture Rules
1. **Control Plane Isolation**: This repository does NOT run Instagram bots or browser sessions. It provides CRUD, UI, and REST APIs for external workers.
2. **Database**: Single local SQLite database at `data/inflow.db` using `better-sqlite3`. WAL mode enabled.
3. **Idempotency**: All comment executions must be locked by unique Instagram `comment_id` in `comment_logs` to avoid duplicate replies and account shadowbans.
4. **Spec-Driven Development (GitHub Spec-Kit)**: Development is spec-first. Use `.specify/` templates (`constitution.md`, `spec.md`, `plan.md`, `tasks.md`) and slash commands (`/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement`, `/speckit-converge`).
5. **BiDi / RTL**: The dashboard defaults to Persian (`dir="rtl"`) with Vazirmatn font. When editing UI or typography, maintain clean bidirectional layout support.

## Key Files
* `src/lib/db.ts`: SQLite database schema, initialization, and connection pooling.
* `src/lib/i18n.ts`: Multilingual translation dictionary (`fa`, `en`, `ar`).
* `src/app/api/agent/poll/route.ts`: Dedicated 2-minute polling endpoint for the Hermes Agent.
* `src/app/api/posts/[shortcode]/logs/route.ts`: Comment log and idempotency locking endpoint.
* `src/components/inflow-dashboard.tsx`: Main dashboard and multi-account platform switcher.
* `src/components/post-detail-view.tsx`: 1-to-1 post automation rule configuration.
* `scripts/hermes_worker.py`: Ready-to-run Python worker for the execution plane.
