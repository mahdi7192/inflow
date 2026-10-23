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
6. **Chronological Post & Comment Ordering**: Posts and comments must always be queried and displayed newest-to-oldest (`ORDER BY COALESCE(p.posted_at, p.synced_at) DESC, p.id DESC`). Post publication timestamps (`posted_at`) are automatically extracted from Instagram shortcodes (64-bit snowflake ID decoding: `(id >> 23) + 1314220021000 ms`) and backfilled upon sync and db init.

## Key Files & Canonical Design System
* `DESIGN.md`: Canonical Design System Token Specification (`inFlow Studio` — Alabaster Light Theme, Dual-Persona Accents, Typography & Component Laws).
* `docs/design-system.md`: Bilingual (Persian/English) Component Architecture & UX Pattern Guide (Slide-Over Context Drawers, 1-Click Playbooks, Supplemental Cheat Sheet).
* `src/lib/db.ts`: SQLite database schema, initialization, and connection pooling.
* `src/lib/playbooks.ts`: Dual-Persona (`business` & `creator`) 1-Click Playbook presets, Supplemental Cheat Sheet (`cheat_sheet`) & attributed URL builders.
* `src/lib/social-api.ts`: Official SocialAPI.ai client (including zero-credit account summary, deep post metrics, active 24h stories, and comment moderation).
* `src/lib/instagram/automation-engine.ts`: Autonomous comment & DM automation engine with Cross-Channel Comment-to-DM Context Bridge.
* `src/components/layout/workspace-shell.tsx`: Persistent Workspace Shell enforcing global `p-5 sm:p-6 lg:p-8` padding and `max-w-6xl mx-auto` alignment across all `/@[account]/*` routes.
* `src/components/inflow-dashboard.tsx`: Main Studio workspace, Adaptive Persona Switcher, flat borderless 4-Stage ROI Funnel Ribbon, and 3-column Instagram Visual Grid Catalog.
* `src/components/post-playbook-drawer.tsx`: 1-Click Slide-Over Playbook & Cheat Sheet Drawer.
* `src/components/dms/dm-automation-view.tsx`: Unified 3-Tab DM & Story Studio (`💬 گفتگوهای دایرکت` 2-Column Split Messenger with 1-click per-user bot pause, `🔥 شماره‌های شکارشده` Leads CRM, and `⚙️ تنظیمات استوری و دایرکت`).

## Story vs DM Separation Rule (Spec 021)
- Story replies (`event.isStoryReply`) NEVER use generic DM rules (`dm_automations` trigger/reply/keywords). They use ONLY: the story's own row in `stories` (auto_reply, keywords, cheat_sheet, target_url, require_follow, emoji_reaction_action) or the account default `dm_automations.story_handling_mode` = `auto` | `configured_only` | `ignore`.
- Comment-continuation DMs use post config; plain DMs use `dm_automations` ("تنظیمات دایرکت مستقیم").
- Pure-emoji/reaction story replies never reach the LLM. Story/post cheat sheet has priority over brand cheat sheet; brand sheet is injected everywhere.
- `stories` rows are kept after expiry; synced from `SocialApiClient.listActiveInstagramStories` (0 credits) via `src/lib/stories.ts`. API: `GET /api/accounts/[username]/stories`, `PATCH .../stories/[id]`.
