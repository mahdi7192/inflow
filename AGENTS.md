<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# inFlow — AI Agent & Developer Architecture Guide

Welcome to **inFlow**, the Control Plane platform for Instagram comment auto-reply and DM automation.
This document outlines the architectural patterns, database schemas, API contracts, and operational guidelines for AI coding agents and human developers.

---

## 1. Architectural Philosophy: Control Plane vs. Execution Plane

inFlow is strictly designed as a **Control Plane**:
* **Control Plane (`inFlow` - this repository):**
  * Manages state, accounts, posts/reels, automation configurations, and execution logs.
  * Provides a responsive, sleek web dashboard (Next.js 16 + shadcn/ui) supporting multi-language (Persian, Arabic, English) with native RTL support.
  * Exposes high-throughput, low-latency REST endpoints for worker agents.
  * **Does NOT** directly connect to Instagram APIs, proxies, or browser sessions.
* **Execution Plane (`Hermes Agent` / Python Workers / Cron Bots):**
  * Runs independently (e.g. on the same or dedicated Linux server).
  * Every ~2 minutes, queries `GET /api/agent/poll?account={username}`.
  * Scrapes/monitors Instagram comments, checks user following state, and dispatches replies and DMs.
  * Reports every interaction and lock back to `POST /api/posts/{shortcode}/logs`.

---

## 2. Tech Stack & Environment

| Layer | Technology | Notes |
| :--- | :--- | :--- |
| **Runtime** | Node.js (v20+ or v26+) | ESM native |
| **Package Manager** | `pnpm` (v11+) | Strict lockfile (`pnpm-lock.yaml`) |
| **Framework** | Next.js 16 (App Router) | Turbopack enabled |
| **Database** | SQLite via `better-sqlite3` | Stored in `data/inflow.db` (WAL mode enabled) |
| **Styling & UI** | Tailwind CSS v4 + shadcn/ui primitives | Dark mode default, Vazirmatn font for Persian/Arabic |
| **Typography** | `Vazirmatn`, `Geist`, `Geist Mono` | RTL / LTR bidirectional support |

### Key Developer Commands
```bash
pnpm install          # Install dependencies using pnpm
pnpm dev              # Launch local Next.js dev server on :3000
pnpm build            # Compile production build
pnpm start            # Start production server
pnpm lint             # Run ESLint validation
```

---

## 3. Database Schema & Data Models

Database file is located at `data/inflow.db`. It is initialized and seeded automatically by `src/lib/db.ts` upon first connection.

### Tables

#### 1. `accounts` (Multi-Account Support)
Stores Instagram pages connected to the platform.
* `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
* `username` (TEXT UNIQUE NOT NULL) — e.g. `r9spoort1`, `inflow.shop`
* `display_name` (TEXT)
* `avatar_url` (TEXT)
* `bio` (TEXT)
* `followers_text` (TEXT) — e.g. `42.8K`
* `posts_count` (INTEGER)
* `status` (TEXT) — `active` | `paused`
* `agent_interval_sec` (INTEGER) — default `120` (2 minutes)
* `last_heartbeat_at` (TEXT) — Timestamp of the last polling query by the agent
* `updated_at`, `created_at` (TEXT)

#### 2. `posts` (1-to-1 Post / Reel Mapping)
Stores posts and reels with their individual automation configurations.
* `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
* `account_username` (TEXT NOT NULL) — Foreign key relationship to `accounts.username`
* `shortcode` (TEXT UNIQUE NOT NULL) — Instagram shortcode (e.g. `DehQhnjoEcr`)
* `media_id` (TEXT)
* `url` (TEXT)
* `post_type` (TEXT) — `reel` | `post`
* `thumbnail_url` (TEXT)
* `caption` (TEXT) — Base context known by AI
* `auto_reply` (INTEGER) — `0` (OFF) or `1` (ON)
* `trigger_type` (TEXT) — `all` | `keywords` | `ai_context`
* `trigger_context` (TEXT) — Instructions for AI detection
* `trigger_keywords` (TEXT) — Comma-separated keyword list
* `comment_action_type` (TEXT) — `none` | `direct` | `ai`
* `comment_action_text` (TEXT) — Exact text or AI prompt instructions
* `dm_action_type` (TEXT) — `none` | `direct` | `ai`
* `dm_action_text` (TEXT) — Exact message or AI prompt instructions
* `dm_require_follow` (INTEGER) — `0` or `1`
* `synced_at`, `updated_at` (TEXT)
* `sort_index` (INTEGER)

#### 3. `comment_logs` (Idempotency Locks & History)
Stores every processed comment and acts as the concurrency lock.
* `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
* `comment_id` (TEXT UNIQUE NOT NULL) — **Idempotency Lock key**. Guarantees no comment is ever replied to twice.
* `account_username` (TEXT NOT NULL)
* `shortcode` (TEXT NOT NULL)
* `media_id`, `user_id` (TEXT)
* `username` (TEXT NOT NULL) — Instagram commenter handle
* `comment_text` (TEXT NOT NULL)
* `trigger_matched` (INTEGER) — `1` if matched trigger conditions, `0` if filtered
* `comment_reply_status` (TEXT) — `none` | `sent` | `failed` | `skipped` | `locked`
* `comment_reply_text` (TEXT)
* `dm_status` (TEXT) — `none` | `sent` | `pending_follow` | `failed` | `skipped`
* `dm_text` (TEXT)
* `created_at`, `processed_at` (TEXT)

#### 4. `users` (Multi-Tenant User Management & RBAC)
Stores platform operators, administrators, and tenant credentials.
* `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
* `username` (TEXT UNIQUE NOT NULL COLLATE NOCASE)
* `display_name` (TEXT NOT NULL)
* `password_hash` (TEXT NOT NULL) — Salted `scrypt` hash (`salt:derivedKeyHex`)
* `role` (TEXT NOT NULL) — `'superadmin'` | `'tenant'`
* `status` (TEXT NOT NULL) — `'active'` | `'suspended'`
* `last_login_at` (TEXT)
* `created_at`, `updated_at` (TEXT)

#### 5. `user_sessions` (Database-Backed Sessions)
Manages authenticated web sessions with sub-millisecond lookup and instant revocation.
* `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
* `session_token` (TEXT UNIQUE NOT NULL) — 64 hex characters (32 crypto random bytes)
* `user_id` (INTEGER NOT NULL REFERENCES users(id))
* `expires_at`, `created_at` (TEXT)

#### 6. `user_accounts` (1-to-N Tenancy Ownership)
Enforces Constitution Principle VI: one Instagram account belongs to at most one user, while a user can manage multiple accounts.
* `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
* `user_id` (INTEGER NOT NULL REFERENCES users(id))
* `account_username` (TEXT UNIQUE NOT NULL REFERENCES accounts(username))
* `created_at` (TEXT)

---

## 4. REST API Contracts for Agents & UI

### `GET /api/agent/poll?account={username}`
**Invoked by:** Hermes Agent every 2 minutes.
* Automatically updates `last_heartbeat_at` for the specified account.
* Returns only active posts (`auto_reply = 1`) along with full trigger & action rules.
* Includes `processed_comment_ids: string[]` so the worker can skip already processed comments without extra round-trips.

```json
{
  "success": true,
  "polled_at": "2026-10-18 10:02:16",
  "active_count": 3,
  "active_posts": [
    {
      "account_username": "r9spoort1",
      "shortcode": "DehQhnjoEcr",
      "url": "https://www.instagram.com/r9spoort1/reel/DehQhnjoEcr/",
      "post_type": "reel",
      "caption": "بجامه وتر پروڤ من جوردن...",
      "rules": {
        "trigger_type": "ai_context",
        "trigger_context": "پرسش درباره قیمت یا سایزبندی",
        "trigger_keywords": [],
        "comment_action": {
          "type": "direct",
          "text": "پاسخ در دایرکت خدمتتان ارسال شد 📩"
        },
        "dm_action": {
          "type": "ai",
          "text": "قیمت ۳۰ هزار دینار، سایزهای M و L موجود است.",
          "require_follow": true
        }
      },
      "processed_comment_ids": ["18141068992562035", "18331872475263668"]
    }
  ]
}
```

### `POST /api/posts/{shortcode}/logs`
**Invoked by:** Worker agent after examining an incoming comment.
* **Idempotency Guarantee:** If `comment_id` already exists, it returns `{ success: true, already_processed: true }`.
* Body:
```json
{
  "comment_id": "18499001122334455",
  "username": "customer_username",
  "comment_text": "قیمت چنده؟",
  "trigger_matched": 1,
  "comment_reply_status": "sent",
  "comment_reply_text": "پاسخ در دایرکت خدمتتان ارسال شد 📩",
  "dm_status": "sent",
  "dm_text": "سلام! قیمت محصول ۳۰ هزار دینار است..."
}
```

### `POST /api/sync`
**Invoked by:** UI Sync button or Worker agent during account catalog scraping.
* Body allows bulk upserting scraped posts and refreshing metadata.

---

## 5. Rules for Modifying Code in this Repo

1. **Always Use `pnpm`:**
   * Never execute `npm install` or `yarn`. Use `pnpm install`, `pnpm add`, `pnpm run build`.
2. **Preserve Next.js Server External Packages:**
   * `better-sqlite3` must remain in `serverExternalPackages` within `next.config.ts`.
3. **Persian & RTL Standards:**
   * All user-facing Persian text must support RTL and use the `Vazirmatn` font.
   * Multi-language keys are maintained in `src/lib/i18n.ts`.
4. **Idempotency Over Everything:**
   * Never bypass or remove `comment_id` unique constraints. Double-replying on Instagram leads to shadowbanning.
5. **Unified Design System & shadcn/ui Standard:**
   * All UI components must strictly use or extend `src/components/ui/` primitives.
   * Ad-hoc inline color styling across routes is prohibited; brand theming is centrally driven by CSS variables in `globals.css`.
   * Official inFlow brand mark must remain consistent across all screens (no rogue Vercel triangle logos).

---

## 6. Spec-Driven Development (GitHub Spec-Kit)

This project strictly follows the **[GitHub Spec-Kit (SDD)](https://github.com/github/spec-kit)** methodology:
* **Constitution:** `.specify/memory/constitution.md` governs non-negotiable architectural constraints.
* **Feature Specs:** All features live in `.specify/specs/###-feature-name/` containing `spec.md`, `plan.md`, and `tasks.md`.
* **Agent Slash Commands:**
  - `/speckit-constitution`
  - `/speckit-specify`
  - `/speckit-plan`
  - `/speckit-tasks`
  - `/speckit-implement`
  - `/speckit-converge`
* **CLI:** `specify` is installed and ready to manage integrations (`hermes`, `cursor-agent`, `claude`).
