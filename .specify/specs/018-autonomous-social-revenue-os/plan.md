# Implementation Plan: Spec 018 — Autonomous Social Revenue OS & Studio Design System

**Feature Branch**: `018-autonomous-social-revenue-os`
**Spec**: `.specify/specs/018-autonomous-social-revenue-os/spec.md`
**Design Docs**: `DESIGN.md`, `docs/design-system.md`

---

## 1. Architecture & Data Layer (`src/lib/db.ts`)
1. Add idempotent SQLite migrations in `migrateSchema(db)` for:
   - `accounts`: `account_persona` (`'business'` | `'creator'`), `brand_cheat_sheet`, `website_url`, `insights_json`.
   - `posts`: `playbook_id`, `cheat_sheet`, `target_url`, `smart_moderation`, `metrics_json`.
   - `dm_logs`: `read_at`.
2. Export TypeScript interfaces (`AccountRow`, `PostRow`, `DMLogRow`) with the new fields.

## 2. SocialAPI Insights & Stories Layer (`src/lib/social-api.ts` & API Routes)
1. Add zero-credit analytics & story methods to `src/lib/social-api.ts`:
   - `getInstagramAccountSummary(accountId)` -> `GET /v1/platforms/instagram/accounts/{id}/summary`
   - `getPostDeepMetrics(postId)` -> `GET /v1/posts/{id}/metrics`
   - `listActiveInstagramStories(accountId)` -> `GET /v1/platforms/instagram/accounts/{id}/stories`
2. Create `GET /api/accounts/[username]/insights` to fetch and cache live account summary, active 24h stories, and per-post deep metrics (`views`, `reach`, `saves`, `shares`, `follows`, `skip_rate`, `avg_watch_time_ms`).
3. Extend `PATCH /api/accounts/[username]` (`src/app/api/accounts/[username]/route.ts`) to update `account_persona`, `brand_cheat_sheet`, and `website_url`.
4. Extend `POST / PATCH /api/posts/[shortcode]` (`src/app/api/posts/[shortcode]/route.ts`) to persist `playbook_id`, `cheat_sheet`, `target_url`, and `smart_moderation`.
5. Extend `/api/webhooks/social-api` (`src/app/api/webhooks/social-api/route.ts`) to handle `dm.status.read` and update `dm_logs.read_at`.

## 3. Autonomous AI & Cross-Channel Context Engine (`src/lib/instagram/automation-engine.ts` & `src/lib/ai-client.ts`)
1. Define canonical Playbook definitions (`src/lib/playbooks.ts`) for both `business` (`auto_seller`, `viral_gate`, `lead_closer`) and `creator` (`creator_magnet`, `creator_twin`, `sponsor_campaign`) personas.
2. In `processIncomingComment`:
   - Combine `post.caption` + `post.cheat_sheet` + `post.target_url` + `account.brand_cheat_sheet` + Playbook persona instructions into AI evaluation and reply generation.
   - Automatically append attribution query params (`utm_source=inflow&ig_user=...&post=...`) to outbound `target_url` links in DMs.
3. In `processIncomingDm`:
   - Bridge Comment-to-DM memory: query the sender's latest `comment_logs` entry on the account and inject the origin post's caption, `cheat_sheet`, and `target_url` plus a catalog summary of active posts with cheat sheets into `generateContextualReplyWithAi`.

## 4. Studio Light Design System & Zero-Config UI (`src/app/globals.css`, `src/components/post-playbook-drawer.tsx`, `src/components/inflow-dashboard.tsx`, `src/components/post-detail-view.tsx`)
1. Update `src/app/globals.css` with **inFlow Studio** CSS variables (`#F8FAFC` canvas, `#FFFFFF` cards, `--persona-business: #4F46E5`, `--persona-creator: #E11D48`, `--status-active: #059669`, `--status-warning: #D97706`).
2. Build `src/components/post-playbook-drawer.tsx` (`PostPlaybookDrawer`):
   - Slide-over context drawer opening directly over the post catalog without losing scroll state.
   - Displays Post ROI Mini-Funnel (`Views`, `Skip Rate`, `Comments`, `DMs Sent`, `Follows`).
   - 3 Persona-aware 1-Click Playbook cards + Custom mode.
   - Unified **📝 تقلب‌نامه این پست (`cheat_sheet`)** with quick-insert prompt chips + **🔗 لینک مقصد (`target_url`)** + **🛡️ سپر ضد-اسپم (`smart_moderation`)**.
   - Collapsible Advanced settings preserving all granular controls.
3. Upgrade `src/components/inflow-dashboard.tsx` and `src/components/post-detail-view.tsx`:
   - Top Adaptive Persona Switcher (`🛍️ فروشگاه و بیزینس` | `🎥 کریتور و بلاگر`) + Quick Brand Cheat Sheet modal/drawer.
   - Live ROI Funnel Strip (`Views & Reach` -> `Comments` -> `DMs & Read` -> `Follows & Leads`).
   - Active 24h Stories Strip.
   - Post cards displaying Playbook badge, Cheat Sheet indicator, and live Views/Follows metrics.
