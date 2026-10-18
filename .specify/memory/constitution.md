<!--
Sync Impact Report:
- Version Change: 1.3.0 -> 1.4.0 (MINOR: Clarified per-page token binding, direct MCP-to-page architecture, minimalist page identity, and strict zero-leakage tenant abstraction)
- Modified Principles:
  - Principle VI: Multi-Tenant User Authentication, Account Ownership & Minimalist Page Entity (added minimalist page identity rule: page is fundamentally an ID; auxiliary data is lazily populated by agent)
  - Principle VII: Strict 1-to-1 Page-to-Bot Binding & Isolated Hermes Profiles (reaffirmed dedicated Hermes profile per page)
  - Principle VIII: Per-Page Scoped Tokens & Direct MCP Connection Architecture (tokens and MCP connections are strictly per-page, not per-user; Hermes profile MCP configured with page's unique key)
  - Principle IX: Back-Office Exclusivity & Zero-Leakage Tenant Abstraction (standard users never see tokens/MCP configs/APIs; Superadmin back-office handles user creation, page assignment, and token/MCP visibility)
- Added Principles / Sections: None
- Removed Sections: None
- Deferred TODOs: None
-->

# inFlow Constitution — Spec-Driven Development (SDD)

## Core Principles

### I. Spec-Driven Development (NON-NEGOTIABLE)
All development on `inFlow` follows the GitHub Spec-Kit workflow:
1. **Specify (`/speckit-specify`)**: Define WHAT and WHY with clear user requirements and acceptance criteria before writing code.
2. **Plan (`/speckit-plan`)**: Establish architecture, database schema changes, and API contracts.
3. **Tasks (`/speckit-tasks`)**: Break down the plan into ordered, testable, atomic tasks.
4. **Implement (`/speckit-implement`)**: Execute tasks against the specification.
5. **Converge (`/speckit-converge`)**: Verify implementation completeness against the spec and resolve gaps.

No direct, unplanned code modifications are permitted for new features or structural changes.

### II. Control Plane vs. Execution Plane Isolation
* `inFlow` is strictly the **Control Plane**: state management, UI dashboard, CRUD, idempotency locking, event dispatching, and REST/MCP APIs.
* Worker agents (`Hermes Agent`, Python workers) run in the **Execution Plane** on the Linux server and interact only via authenticated REST endpoints and signed webhooks/MCP tools.
* Never run Instagram browser bots, headless browsers, or session credentials directly inside `inFlow`.

### III. Absolute Idempotency & Safety
* Double-replying on Instagram leads to account restrictions and shadowbans.
* Every Instagram action MUST be guarded by a unique `comment_id` in `comment_logs`.
* If a `comment_id` has already been recorded or locked, workers MUST immediately skip processing.

### IV. Package Management & Runtime Standards
* Strictly use `pnpm` (v11+). Never execute `npm install` or `yarn`.
* Keep `better-sqlite3` in `serverExternalPackages` within `next.config.ts`.
* SQLite database file resides at `data/inflow.db` with WAL mode enabled.

### V. RTL Typography & BiDi Architecture
* User-facing Persian and Arabic text must have explicit `dir="rtl"` and use the `Vazirmatn` font.
* English and numbers must preserve proper bidirectional spacing without layout distortion.
* All internationalized strings must be registered in `src/lib/i18n.ts`.

### VI. Multi-Tenant User Authentication, Account Ownership & Minimalist Page Entity
* Users authenticate into `inFlow` via username/password credentials.
* The relationship between users and Instagram accounts is strictly 1-to-N: each user can manage one or more Instagram accounts, while each account is owned by at most one user.
* Tenant isolation is enforced: a user can only view, configure, or trigger automations for Instagram accounts explicitly assigned to their user profile.
* All dashboard routes and API endpoints MUST validate user session credentials and resource tenancy before returning or mutating data.
* **Minimalist Page Entity**: In the Control Plane, an Instagram page is fundamentally defined by its unique identifier (e.g. `username` / Instagram page ID). Rich auxiliary metadata (avatar URL, bio, follower count, media catalog) is non-blocking at creation time and is lazily synchronized and enriched by the execution agent during runtime polling.

### VII. Strict 1-to-1 Page-to-Bot Binding & Isolated Hermes Profiles
* Each connected Instagram account MUST be bound to exactly one dedicated Hermes bot profile (or worker instance).
* Each Hermes bot profile MUST handle exactly one Instagram account.
* Bot credentials, browser cookies, local sessions, and scraper states must remain isolated per profile on the server.
* The mapping between `account_username` and `bot_profile_id` is an immutable, system-level association maintained in the Control Plane database.

### VIII. Per-Page Scoped Tokens & Direct MCP Connection Architecture
* **Tokens are Per-Page, NOT Per-User**: Every inter-plane API token and Model Context Protocol (MCP) authentication key is cryptographically bound to a specific Instagram Page (`account_username`), never to a user account.
* **Direct Page-to-MCP Binding**: The MCP server connects directly and exclusively to the targeted Instagram page using that page's unique token. There is no concept of a user-level MCP connection.
* **Hermes Profile MCP Configuration**: When spinning up an isolated Hermes agent profile for a page, its MCP client configuration is injected with that specific page's dedicated key.
* **Inbound Validation**: Every API request or MCP tool call from a worker agent MUST present this page-scoped token. The Control Plane verifies that the token strictly matches the target `account_username`. Cross-page access or unauthorized operations are rejected with HTTP 401/403.
* **Outbound Webhooks**: Signed with the page-specific secret to dispatch notifications or trigger actions on the dedicated bot profile.

### IX. Back-Office Exclusivity & Zero-Leakage Tenant Abstraction
* **Zero Technical Leakage**: Standard tenants/users MUST NEVER be exposed to API tokens, secret keys, MCP configurations, worker endpoints, or infrastructure details. The tenant UI is purely high-level: managing post triggers, DM templates, and viewing comment logs.
* **Back-Office Exclusivity**: Superadmins exclusively operate the Back-Office management plane to:
  1. Create, edit, and suspend platform users.
  2. Provision Instagram pages (requiring only the page identifier/ID).
  3. Assign and reassign Instagram pages to specific users.
  4. View, generate, and revoke page-specific API tokens and inspect/copy Hermes MCP configuration snippets.
* Role-based access control (RBAC) strictly prevents standard tenants from accessing administrative routes or inspecting inter-plane credentials.

### X. Unified Design System & shadcn/ui Light Mode Architecture (NON-NEGOTIABLE)
* All UI components across inFlow (including buttons, inputs, forms, cards, dialogs/modals, switches, badges, and dropdowns) MUST strictly use or extend the standardized `shadcn/ui` primitives located in `src/components/ui/`.
* **Canonical Light Mode Standard**: inFlow strictly uses **shadcn/ui Light Mode** as its primary and canonical visual standard (clean white `#ffffff` surfaces, `#fafafa` canvas, subtle `#e4e4e7` zinc borders, solid `#18181b` primary elements, and muted pastel badges). Dark mode, glowing purple/neon gradients, and ambient blur blobs are strictly prohibited.
* Ad-hoc, hardcoded, or inline color styling and arbitrary background/border palettes across page routes are strictly prohibited.
* Brand styling and themes MUST be token-driven and managed centrally through CSS custom properties in `src/app/globals.css` (e.g. `--background`, `--foreground`, `--card`, `--primary`, `--border`, `--ring`).
* Visual identity and the inFlow official brand mark MUST remain consistent across all routes (Login, Dashboard, Back-Office) as a minimalist monochrome squircle with sleek typography. Rogue icons (such as Vercel triangle logos) or mismatched page headers MUST NOT be used.
* All components in `src/components/ui/` MUST natively adhere to Principle V (RTL typography, Vazirmatn font, and bidirectional spacing).

## Governance

This Constitution supersedes all ad-hoc coding practices in the repository. AI agents (Hermes, Claude, Cursor, Copilot) must verify compliance with this Constitution before proposing or merging code changes.

Amendments to this Constitution require:
1. Formal proposition via `/speckit-constitution`.
2. Clear justification and impact analysis recorded in the Sync Impact Report.
3. Semantic version increment:
   - **MAJOR**: Breaking changes or removal of core architectural constraints.
   - **MINOR**: Addition of new principles or material expansions of existing guidance.
   - **PATCH**: Textual clarifications, wording improvements, and typo corrections.

**Version**: 1.4.0 | **Ratified**: 2026-10-18 | **Last Amended**: 2026-10-18
