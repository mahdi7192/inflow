<!--
Sync Impact Report:
- Version Change: 2.0.0 -> 3.0.0 (MAJOR: Complete Migration to SocialAPI.ai Official REST & Webhook Architecture and Total Decommissioning of Legacy `instagrapi` / Python Engine / Private Protocol)
- Modified Principles:
  - Principle II: Replaced "Native Instagram Engine (`instagrapi` + MQTT + Cookie Vault)" with "Unified SocialAPI.ai Integration & Managed OAuth Architecture".
  - Principle VII: Replaced "Strict Library-First Protocol Enforcement (`instagrapi` Exclusive)" with "Strict SocialAPI.ai Protocol Enforcement (`https://api.social-api.ai/v1`)".
  - Principle VIII: Replaced "Native Inter-Process Communication (FastAPI Bridge on Port 8765)" with "Direct Server-Side SocialAPI Client & Signed Webhook Pipeline".
  - Principle XI: Updated "Account Connection Lifecycle" to reflect OAuth connection states (`unauthenticated` | `active` | `reauth_required` | `paused` | `error`) without passwords, 2FA codes, or cookie vaults.
- Removed Sections: All references to `instagrapi`, `engine/` Python daemon, port 8765 bridge, MQTT listeners, raw Instagram password handshakes, and `account_sessions` encrypted cookie vaults.
- Deferred TODOs: None
-->

# inFlow Constitution — Spec-Driven Development (SDD)

## Core Principles

### I. Spec-Driven Development (NON-NEGOTIABLE)
All development on `inFlow` follows the GitHub Spec-Kit workflow:
1. **Specify (`/speckit-specify`)**: Define WHAT and WHY with clear user requirements, exhaustive UX journeys, and acceptance criteria before writing code.
2. **Plan (`/speckit-plan`)**: Establish architecture, database schema changes, and API contracts.
3. **Tasks (`/speckit-tasks`)**: Break down the plan into ordered, testable, atomic tasks.
4. **Implement (`/speckit-implement`)**: Execute tasks against the specification.
5. **Converge (`/speckit-converge`)**: Verify implementation completeness against the spec and resolve gaps.

No direct, unplanned code modifications are permitted for new features or structural changes.

### II. Unified SocialAPI.ai Architecture & Managed OAuth (NON-NEGOTIABLE)
* **Total Elimination of Legacy Bots & Private Scraping Libraries**: All legacy Hermes browser bots, VNC displays, and private-protocol libraries (`instagrapi`, custom MQTT push listeners, raw cookie vaults, and Python engine daemons) are permanently purged from the platform.
* **Unified SocialAPI.ai Execution**: All Instagram actions — connecting accounts via OAuth, listing accounts, syncing post catalogs, reading/replying/moderating comments, managing DM conversations, and receiving real-time events — are executed exclusively through the official SocialAPI.ai REST API (`https://api.social-api.ai/v1`) and signed webhooks.
* **Managed OAuth Connection & Zero Credential Collection**: Account operators connect their Instagram accounts via the official OAuth authorization link (`POST /v1/accounts/connect`). inFlow NEVER collects, processes, or stores Instagram passwords, 2FA codes, or browser `sessionid` cookies.
* **Centralized Direct AI Integration**: Semantic comment detection and DM reply generation are performed via direct HTTP API calls (Google Gemini / OpenAI) configured exclusively by superadmin in `/backoffice`.

### III. Absolute Idempotency & Safety
* Double-replying on Instagram leads to account restrictions and poor customer experience.
* Every Instagram comment action MUST be guarded by a unique `comment_id` in `comment_logs`, and every automated DM reply MUST be guarded by a unique `message_id` in `dm_logs`.
* If a `comment_id` or `message_id` has already been recorded or locked, the processor MUST immediately skip execution.

### IV. Package Management & Runtime Standards
* Strictly use `pnpm` (v11+). Never execute `npm install` or `yarn`.
* Keep `better-sqlite3` in `serverExternalPackages` within `next.config.ts`.
* SQLite database file resides at `data/inflow.db` with WAL mode enabled.

### V. RTL Typography, BiDi Architecture & Tone of Voice
* User-facing Persian and Arabic text must have explicit `dir="rtl"` and strictly use the `Vazirmatn` font. The font MUST be loaded globally across all HTML tags, inputs, and buttons without relying on uncompiled ad-hoc class utilities.
* English, code, numbers, and Instagram handles (`@username`) must preserve proper bidirectional spacing without layout distortion or trailing punctuation flips. Bidirectional isolation (`<bdi>` or unicode directional controls) MUST wrap technical tags, handles, and acronyms (`AI`, `DM`, `OAuth`, `API`).
* **Microcopy & Tone of Voice Standard**:
  - The voice of inFlow is professional, respectful, calm, and direct.
  - Second-person polite address (شما، خدمتتان) MUST be used consistently across all prompts, feedback, and error messages.
  - Zero-Bot terminology: The terms "ربات", "هرمس", "Bot", "VNC" are strictly prohibited in user-facing UI. Standard terms: "وضعیت اتصال اکانت", "اتوماسیون پاسخ کامنت", "دایرکت هوشمند", "پیشخوان", "پست‌ها و ریلزها".

### VI. Multi-Tenant User Authentication, Account Ownership & Minimalist Page Entity
* Users authenticate into `inFlow` via username/password credentials.
* The relationship between users and Instagram accounts is strictly 1-to-N: each user can manage one or more Instagram accounts, while each account is owned by at most one user.
* Tenant isolation is enforced: a user can only view, configure, or trigger automations for Instagram accounts explicitly assigned to their user profile.
* All dashboard routes and API endpoints MUST validate user session credentials and resource tenancy before returning or mutating data.
* **Minimalist Page Entity**: In the Control Plane, an Instagram page is defined by its unique `username` and mapped `social_account_id` (`acc_...`). Rich auxiliary metadata is synchronized via SocialAPI.ai.

### VII. Strict SocialAPI.ai Protocol Enforcement (`https://api.social-api.ai/v1`) (NON-NEGOTIABLE)
* **Single Protocol Standard**: 100% of Instagram interactions MUST be executed exclusively through the typed `SocialApiClient` (`src/lib/social-api.ts`) communicating with `https://api.social-api.ai/v1`.
* **Standardized Endpoints**:
  - Account Connection (OAuth): `POST /v1/accounts/connect` (`{"platform": "instagram"}`)
  - Connected Accounts List: `GET /v1/accounts`
  - Posts & Publishing: `GET /v1/posts`, `POST /v1/posts`, `POST /v1/posts/validate`
  - Comments Inbox & Replies: `GET /v1/inbox/comments`, `GET /v1/inbox/comments/{postId}`, `POST /v1/inbox/comments/{postId}`
  - Comment Moderation: `DELETE /v1/inbox/comments/{postId}/{commentId}`, `POST|DELETE /v1/inbox/comments/{postId}/{commentId}/hide`, `POST|DELETE /v1/inbox/comments/{postId}/{commentId}/like`
  - Direct Message Conversations: `GET /v1/inbox/conversations`, `POST /v1/inbox/conversations/{id}/messages`
  - Mentions: `GET /v1/accounts/{id}/mentions`
  - Webhooks: `POST /v1/webhooks`, `GET /v1/webhooks` (`comment.received`, `dm.received`, `mention.received`)

### VIII. Direct Server-Side Execution & Signed Webhook Pipeline
* **Zero External Daemon Dependency**: Next.js Server Routes communicate directly with SocialAPI.ai using `src/lib/social-api.ts`. No secondary Python process or local IPC port is required.
* **Webhook Signature Security**: All inbound webhook payloads at `/api/webhooks/social-api` MUST verify the `X-SocialAPI-Signature` header using HMAC-SHA256 against the configured webhook secret before processing.

### IX. Back-Office Exclusivity & Zero-Leakage Tenant Abstraction
* **Zero Technical Leakage**: Standard tenants/users MUST NEVER be exposed to `sapi_key_...` API tokens, webhook secrets, or AI provider keys.
* **Back-Office Exclusivity**: Superadmins exclusively operate `/backoffice` to:
  1. Create, edit, and suspend platform users.
  2. Provision Instagram pages, link/sync SocialAPI `account_id`s, and assign pages to users.
  3. Centrally manage SocialAPI.ai credentials (`social_api_key`, `social_webhook_secret`) and AI provider credentials (`ai_api_key`).

### X. Unified Studio Design System (`DESIGN.md`), Dual-Persona Architecture & Persistent App Shell (NON-NEGOTIABLE)
* All UI components across inFlow MUST strictly follow `/DESIGN.md` and `/docs/design-system.md` and extend standardized `shadcn/ui` primitives located in `src/components/ui/`.
* **Canonical Studio Light Theme**: inFlow strictly uses the **inFlow Studio** light palette (`#F8FAFC` Alabaster canvas, `#FFFFFF` pure white surfaces, `#E2E8F0` hairline borders, `#09090B` primary ink, `--persona-business: #4F46E5` for Business/Stores, `--persona-creator: #E11D48` for Creators/Influencers, `--status-active: #059669` for live Autopilot).
* **Zero-Config Playbooks & Supplemental Cheat Sheet Law**: Post and DM automations MUST prioritize 1-Click Playbooks (`src/lib/playbooks.ts`), Slide-Over Context Drawers (`src/components/post-playbook-drawer.tsx`), and the Supplemental Cheat Sheet (`cheat_sheet` — اطلاعات مکمل خارج از کپشن) bridged across both public comments and DM conversations.
* **Persistent Workspace App Shell (`WorkspaceShell`)**: All account workspace routes (`/@[account]/*`) render within `src/app/[account]/layout.tsx` without remounting on sub-page navigation.

### XI. OAuth Account Connection Lifecycle (NON-NEGOTIABLE)
* Every connected account tracks its connection status through explicit states:
  - `unauthenticated`: The page is provisioned in inFlow, awaiting OAuth connection via SocialAPI.
  - `active`: Connected and synchronized with a valid SocialAPI `account_id` (`acc_...`).
  - `reauth_required`: OAuth token expired or revoked on Instagram (`token_expired`); user can reconnect with 1-click OAuth redirect.
  - `paused`: Automation temporarily paused by operator.
  - `error`: Configuration or API error requiring attention.

### XII. Canonical @username URL Scoping & Zero-Flash Account Selection (NON-NEGOTIABLE)
* Root route (`/`) serves as the Account Selector Hub.
* Individual workspaces are scoped under `/@{username}` (`/@[account]`).

### XIII. Studio v2 Anti-Clutter, Split-Inbox & Zero Box-in-Box Architecture (NON-NEGOTIABLE)
* **Global Shell Padding Law**: `src/components/layout/workspace-shell.tsx` enforces global `<main className="flex-1 overflow-y-auto min-w-0 bg-[#F8FAFC] p-5 sm:p-6 lg:p-8"><div className="w-full max-w-6xl mx-auto">{children}</div></main>`. No page may render flush (`0px` padding) against the sidebar or top header.
* **Zero Box-in-Box (No Nested Bordered Cards)**: Inside any primary white surface (`bg-white rounded-2xl border border-slate-200/80`), nested bordered cards are strictly prohibited. Use `divide-y divide-slate-100` or `divide-x divide-x-reverse divide-slate-100` for internal separation (e.g., the 4-stage funnel ribbon).
* **Split-Pane Messenger Inbox (`/dms`)**: The DM & Story workspace (`src/components/dms/dm-automation-view.tsx`) MUST remain a clean 3-tab interface (`💬 گفتگوهای دایرکت` 2-column live chat with 1-click per-user bot pause, `🔥 شماره‌های شکارشده` CRM table, and `⚙️ تنظیمات استوری و دایرکت`). Legacy stacked form cards (`ActivationCard`, `StickySaveBar`, `DmLogsTable`, `PostDetailView`) are permanently decommissioned and MUST NOT be recreated.
* **Visual Grid Catalog (`/comments`)**: The Posts & Reels workspace (`src/components/inflow-dashboard.tsx`) defaults to a 3-column visual media grid without raw technical shortcodes (`DVf8k2`) or duplicate header buttons, opening `PostPlaybookDrawer` in 1 click.
* **Multilingual JSON Store (`src/locales/{fa,en,ar}.json`)**: 100% key parity across `fa`, `en`, and `ar`, with Persian numerals (`toLocaleString("fa-IR")`) and `tabular-nums`.

## Governance

This Constitution supersedes all ad-hoc coding practices in the repository.
**Version**: 3.1.0 | **Ratified**: 2026-10-18 | **Last Amended**: 2026-10-22
