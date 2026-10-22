<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# inFlow — AI Agent & Developer Architecture Guide

Welcome to **inFlow**, the Control Plane platform for Instagram comment auto-reply and DM automation.
This document outlines the architectural patterns, database schemas, API contracts, and operational guidelines for AI coding agents and human developers.

---

## 1. Architectural Philosophy: Unified SocialAPI.ai Integration & Managed OAuth

inFlow is designed as a **Self-Contained Next.js Control Plane** powered by the official **SocialAPI.ai** unified infrastructure:
* **Web Application (`inFlow` Next.js 16 + shadcn/ui):**
  * Manages state, accounts, posts/reels, automation configurations, and execution logs.
  * Provides a responsive, sleek web dashboard supporting multi-language (Persian, Arabic, English) with native RTL support.
  * Communicates directly with `https://api.social-api.ai/v1` via `src/lib/social-api.ts` for OAuth account connection, catalog syncing, comment reading/replying/moderation, DM conversations, and real-time signed webhooks (`X-SocialAPI-Signature`).
  * Manages SocialAPI Bearer keys (`sapi_key_...`), webhook secrets, and direct AI API keys (Google Gemini / OpenAI) strictly in Backoffice (`/backoffice`).
* **Strict SocialAPI.ai Protocol Standard:**
  * 100% of Instagram operations use the official SocialAPI.ai REST endpoints (`/v1/accounts`, `/v1/posts`, `/v1/inbox/comments`, `/v1/inbox/conversations`, `/v1/webhooks`).
  * **Managed OAuth Connection**: Account operators connect via `POST /v1/accounts/connect`. inFlow never collects, processes, or stores raw Instagram passwords, 2FA codes, or browser cookies.
  * **Zero Legacy Stack**: All legacy `instagrapi` packages, Python `engine/` daemons, MQTT listeners, cookie vaults, and browser bots are completely removed.

---

## 2. Tech Stack & Environment

| Layer | Technology | Notes |
| :--- | :--- | :--- |
| **Runtime** | Node.js (v20+ or v26+) | ESM native |
| **Package Manager** | `pnpm` (v11+) | Strict lockfile (`pnpm-lock.yaml`) |
| **Framework** | Next.js 16 (App Router) | Turbopack enabled |
| **Database** | SQLite via `better-sqlite3` | Stored in `data/inflow.db` (WAL mode enabled) |
| **Instagram Provider** | SocialAPI.ai (`src/lib/social-api.ts`) | `https://api.social-api.ai/v1` + Signed Webhooks |
| **Styling & UI** | Tailwind CSS v4 + `inFlow Studio` Design System (`DESIGN.md`) | Alabaster Light Theme (`#F8FAFC` canvas, `#FFFFFF` cards, `#E2E8F0` borders, Dual-Persona accents) |
| **Typography** | `Vazirmatn`, `Geist`, `Geist Mono` (`tabular-nums`) | RTL / LTR bidirectional support |

### Key Developer Commands
```bash
pnpm install          # Install dependencies using pnpm
pnpm dev              # Launch local Next.js dev server on :3000
pnpm build            # Compile production build
pnpm start            # Start production server
pnpm lint             # Run ESLint validation
pnpm test:i18n        # Verify 100% localization key parity (fa, en, ar)
```

---

## 3. Database Schema & Data Models

Database file is located at `data/inflow.db`. It is initialized and migrated automatically by `src/lib/db.ts`.

### Tables

1. **`accounts` (Multi-Account Support & Dual-Persona Studio)**:
   * `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
   * `username` (TEXT UNIQUE NOT NULL) — e.g. `r9spoort1`, `inflow.shop`
   * `social_account_id` (TEXT DEFAULT NULL) — Mapped SocialAPI.ai account ID (`acc_...`)
   * `display_name`, `avatar_url`, `bio`, `followers_text`, `posts_count`
   * `account_persona` (`'business'` | `'creator'`) — Adapts Studio Playbooks, vocabulary, and theme accents
   * `brand_cheat_sheet` (TEXT) — Account-wide persistent facts (shipping, return rules, bio context) injected into all AI prompts
   * `website_url` (TEXT), `insights_json` (TEXT) — Cached zero-credit SocialAPI account analytics & active 24h stories
   * `status` (`active` | `paused`)
   * `session_status` (`unauthenticated` | `active` | `reauth_required` | `paused` | `error`)
   * `last_sync_at`, `last_heartbeat_at`, `updated_at`, `created_at`
2. **`posts` (1-to-1 Post / Reel Mapping, Playbooks & Cheat Sheets)**:
   * `shortcode` (TEXT UNIQUE NOT NULL), `media_id` (Remote post ID), `account_username`, `post_type`, `thumbnail_url`, `caption`, `auto_reply`, `trigger_type`, `trigger_context`, `trigger_keywords`, `comment_action_type`, `comment_action_text`, `dm_action_type`, `dm_action_text`, `dm_require_follow`
   * `playbook_id` (`'custom'` | `'auto_seller'` | `'viral_gate'` | `'lead_closer'` | `'creator_magnet'` | `'creator_twin'` | `'sponsor_campaign'`)
   * `cheat_sheet` (TEXT) — Supplemental post facts not written in the Instagram caption (price, sizes, stock, promo codes, prompts) bridged across both comment replies and DM conversations
   * `target_url` (TEXT) — Post destination link automatically enriched with `?utm_source=instagram_inflow&utm_content={shortcode}&ig_user={username}`
   * `smart_moderation` (INTEGER) — Zero-credit competitor poaching & spam comment auto-hide (`0` | `1`)
   * `metrics_json` (TEXT) — Cached deep post metrics (`views`, `reach`, `saves`, `shares`, `follows`, `skip_rate`)
3. **`comment_logs` & `dm_logs` (Idempotency Locks & History)**:
   * `comment_logs.comment_id` (TEXT UNIQUE NOT NULL) — Guarantees no comment is ever replied to twice.
   * `dm_logs.message_id` (TEXT UNIQUE NOT NULL) — Guarantees no incoming DM is ever auto-replied to twice (`read_at` tracks `dm.status.read` webhook receipts).
4. **`app_settings` (Platform Credentials)**:
   * Stores `social_api_key`, `social_webhook_secret`, `social_webhook_id`, `ai_provider`, `ai_api_key`, and `ai_model`.
5. **`users`, `user_sessions`, `user_accounts` (Multi-Tenant RBAC)**:
   * Enforces 1-to-N account tenancy and role-based access (`superadmin` vs. `tenant`).

---

## 4. SocialAPI.ai & Internal REST Contracts

* **`POST /api/accounts/connect`**: Initiates OAuth connection (`POST /v1/accounts/connect`) and syncs connected accounts (`GET /v1/accounts`).
* **`POST /api/webhooks/social-api`**: Verifies `X-SocialAPI-Signature` and processes real-time `comment.received`, `dm.received`, and `mention.received` events via `src/lib/instagram-automation.ts`.
* **`GET / POST / DELETE /api/posts/[shortcode]/comments`**: Lists, replies to, hides, likes, or deletes comments via `/v1/inbox/comments/{postId}`.
* **`GET / POST /api/accounts/[username]/inbox`**: Lists DM conversations and sends messages via `/v1/inbox/conversations`.
* **`POST /api/sync`**: Synchronizes account profile, post catalog (`/v1/posts` & `/v1/inbox/comments`), and recent unprocessed comments on active posts.

---

## 5. Rules for Modifying Code in this Repo

1. **Always Use `pnpm`:** Never execute `npm install` or `yarn`.
2. **Preserve Next.js Server External Packages:** `better-sqlite3` must remain in `serverExternalPackages` within `next.config.ts`.
3. **Persian & RTL Standards:** All user-facing Persian text must support RTL and use the `Vazirmatn` font. Maintain 100% key parity across `src/locales/{fa,en,ar}.json`.
4. **Idempotency Over Everything:** Never bypass or remove `comment_id` or `message_id` unique constraints.
5. **Unified Studio v2 Design System (`DESIGN.md` & `docs/design-system.md`):**
   * Strictly follow `/DESIGN.md` and `/docs/design-system.md`.
   * Use **inFlow Studio Light Theme** (`#F8FAFC` Cool Alabaster canvas, `#FFFFFF` pure white surfaces, `#E2E8F0` hairline borders, `--persona-business: #4F46E5` for Business/Stores, `--persona-creator: #E11D48` for Creators/Influencers, `--status-active: #059669` for active Autopilot).
   * **Zero Box-in-Box Law**: Never nest bordered cards inside another bordered card; separate internal elements using `divide-y divide-slate-100` or `divide-x divide-x-reverse divide-slate-100`.
   * **Global Shell Padding**: `src/components/layout/workspace-shell.tsx` enforces global `<main>` padding (`p-5 sm:p-6 lg:p-8`) and `max-w-6xl mx-auto`.
   * **Split-Pane Messenger (`/dms`) & Visual Grid (`/comments`)**: Maintain the 3-tab Split Messenger Inbox (`src/components/dms/dm-automation-view.tsx`), the 3-column Instagram Visual Grid (`src/components/inflow-dashboard.tsx`), and the **Slide-Over Context Drawer (`PostPlaybookDrawer`)**. Never re-introduce deleted legacy form components (`PostDetailView`, `StickySaveBar`, `ActivationCard`, `DmLogsTable`, `DmLiveInboxModal`).
