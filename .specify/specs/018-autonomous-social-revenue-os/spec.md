# Feature Specification: Autonomous Social Revenue OS & Studio Design System (Spec 018)

**Feature Branch**: `018-autonomous-social-revenue-os`
**Created**: 2026-10-22
**Status**: Approved & In Implementation
**Design Reference**: `/DESIGN.md` & `/docs/design-system.md`

---

## 1. Executive Summary & Vision

Transform **inFlow** from a rule-based comment/DM configuration panel into an **Autonomous Social Revenue Operating System** with an ultra-simple, zero-flowchart **inFlow Studio** interface.

The architecture solves four strategic product requirements simultaneously:
1. **Simplicity First (Zero-Config Playbooks & Slide-Over Context Drawer)**: Replace multi-step technical configuration forms with 1-click goal-driven Playbooks inside a fast Slide-Over Drawer (`PostPlaybookDrawer`), while keeping full granular controls inside a collapsible Advanced mode.
2. **Supplemental Knowledge Beyond Captions (`Cheat Sheet / تقلب‌نامه`)**: Provide a conversational Cheat Sheet per post (`posts.cheat_sheet`, `posts.target_url`, `posts.smart_moderation`) and per account (`accounts.brand_cheat_sheet`, `accounts.website_url`) so prices, stock, sizes, download links, and sponsor codes not present in captions are seamlessly injected into both Comment AI and DM AI prompts (including cross-channel Comment-to-DM conversation memory).
3. **Dual-Persona Native Experience (`business` vs. `creator`)**: Support both **E-Commerce / Business Pages** and **Influencers / Content Creators** via an adaptive persona switcher (`accounts.account_persona`) that tailors playbooks, cheat-sheet chips, KPI funnels, and AI system prompts.
4. **Live Statistics, Active 24h Stories & Attribution**: Integrate SocialAPI.ai zero-credit analytics endpoints (`/v1/platforms/instagram/accounts/{id}/summary`, `/v1/posts/{id}/metrics`, `/v1/platforms/instagram/accounts/{id}/stories`) and webhook read receipts (`dm.status.read`) to power a live ROI Funnel Strip (`Views -> Skip Rate -> Comments -> DMs -> Follows/Clicks`), an Active 24h Stories bar, and automatic UTM/user attribution on outbound DM links.

---

## 2. Database Schema Evolution (`src/lib/db.ts`)

All schema migrations execute automatically and idempotently in `migrateSchema(db)`:

### 2.1. `accounts` Table Additions
- `account_persona` (`TEXT NOT NULL DEFAULT 'business'`) — `"business"` | `"creator"`
- `brand_cheat_sheet` (`TEXT NOT NULL DEFAULT ''`) — Account-wide supplemental facts (shipping rules, return policy, creator collab rates, FAQ)
- `website_url` (`TEXT NOT NULL DEFAULT ''`) — Store URL or creator bio/landing URL
- `insights_json` (`TEXT DEFAULT NULL`) — Cached JSON from SocialAPI account summary & active stories

### 2.2. `posts` Table Additions
- `playbook_id` (`TEXT NOT NULL DEFAULT 'custom'`) — `"custom"` | `"auto_seller"` | `"viral_gate"` | `"lead_closer"` | `"creator_magnet"` | `"creator_twin"` | `"sponsor_campaign"`
- `cheat_sheet` (`TEXT NOT NULL DEFAULT ''`) — Post-specific supplemental context not in the caption (price, stock, sizes, download link, sponsor discount code)
- `target_url` (`TEXT NOT NULL DEFAULT ''`) — Direct product URL, file download URL, or sponsor landing URL for this post
- `smart_moderation` (`INTEGER NOT NULL DEFAULT 0`) — `0` or `1`; when enabled, AI detects spam/competitor poaching comments and hides them via SocialAPI (`0` credit cost)
- `metrics_json` (`TEXT DEFAULT NULL`) — Cached JSON from `/v1/posts/{id}/metrics` (`views`, `reach`, `likes`, `comments`, `shares`, `saves`, `follows`, `skip_rate`, `avg_watch_time_ms`)

### 2.3. `dm_logs` Table Additions
- `read_at` (`TEXT DEFAULT NULL`) — Populated when `dm.status.read` webhook fires

---

## 3. Functional Requirements

### FR-001: Studio Light Design System & Tokens
- `src/app/globals.css` implements the documented **inFlow Studio** token palette (`#F8FAFC` canvas, `#FFFFFF` elevated cards, `#0F172A` primary ink, `#4F46E5` business indigo accent, `#E11D48` creator rose accent, `#059669` autopilot emerald, `#D97706` viral amber).

### FR-002: Adaptive Persona Switcher & Account Brain
- Operators can switch an account between **🛍️ فروشگاه و بیزینس (`business`)** and **🎥 کریتور و بلاگر (`creator`)** with 1 click and save global supplemental context (`brand_cheat_sheet` and `website_url`) via `PATCH /api/accounts/[username]`.

### FR-003: 1-Click Playbooks & Supplemental Cheat Sheet
- Clicking any post card opens `PostPlaybookDrawer` (or `PostDetailView`) featuring:
  1. Post ROI Mini-Funnel (`Views`, `Skip Rate`, `Comments`, `DMs Sent`, `Follows Gained`).
  2. 3 Persona-Tailored 1-Click Playbooks + Custom Mode.
  3. **📝 تقلب‌نامه این پست (`cheat_sheet`)** + **🔗 لینک مقصد (`target_url`)** + **🛡️ سپر ضد-اسپم و رقبا (`smart_moderation`)**.
  4. Collapsible Advanced Rule Settings preserving 100% of manual trigger/action controls.

### FR-004: Cross-Channel AI Context Bridge (Caption + Cheat Sheet + Comment-to-DM Memory)
- `automation-engine.ts` and `ai-client.ts` inject `post.cheat_sheet`, `post.target_url`, `account.brand_cheat_sheet`, and `account.account_persona` into every AI evaluation and generation call.
- When a user sends a DM, `processIncomingDm` automatically looks up their latest comment in `comment_logs` and includes the origin post's `caption`, `cheat_sheet`, and `target_url` plus a summary of active posts' cheat sheets so the DM assistant never loses context between comment and DM.
- Outbound links in DMs automatically append attribution parameters (`utm_source=inflow&ig_user=...`) for website footprint stitching.

### FR-005: Live Insights, Active 24h Stories & Read Receipts
- `GET /api/accounts/[username]/insights` fetches and caches SocialAPI account summary metrics, active 24-hour stories, and per-post deep metrics (`views`, `reach`, `saves`, `shares`, `follows`, `skip_rate`).
- Webhook route `/api/webhooks/social-api` handles `dm.status.read` to record when a user reads a DM.
