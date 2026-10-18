<!--
Sync Impact Report:
- Version Change: 1.0.0 -> 1.1.0 (MINOR: Added multi-tenancy, bot profile binding, scoped API token validation, webhook dispatching, and back-office governance)
- Modified Principles:
  - II. Control Plane vs. Execution Plane Isolation (Expanded with Hermes profile isolation and webhook dispatch mechanisms)
- Added Principles / Sections:
  - VI. Multi-Tenant User Authentication & Account Ownership (1-to-N user-to-page access control)
  - VII. Strict 1-to-1 Page-to-Bot Binding & Profile Isolation (Hermes profile mapping)
  - VIII. Scoped Inter-Plane API Tokens & Event Webhooks (Mutual verification between Control Plane & Execution Plane)
  - IX. Back-Office Administration & Separation of Concerns (Separation of operational admin plane from tenant dashboard)
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
* `inFlow` is strictly the **Control Plane**: state management, UI dashboard, CRUD, idempotency locking, event dispatching, and REST APIs.
* Worker agents (`Hermes Agent`, Python workers) run in the **Execution Plane** on the Linux server and interact only via authenticated REST endpoints and signed webhooks.
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

### VI. Multi-Tenant User Authentication & Account Ownership
* Users authenticate into `inFlow` via username/password credentials.
* The relationship between users and Instagram accounts is strictly 1-to-N: each user can manage one or more Instagram accounts.
* Tenant isolation is enforced: a user can only view, configure, or trigger automations for Instagram accounts explicitly assigned to their user profile.
* All dashboard routes and API endpoints MUST validate user session credentials and resource tenancy before returning or mutating data.

### VII. Strict 1-to-1 Page-to-Bot Binding & Profile Isolation
* Each connected Instagram account MUST be bound to exactly one dedicated Hermes bot profile (or worker instance).
* Each Hermes bot profile MUST handle exactly one Instagram account.
* Bot credentials, browser cookies, local sessions, and scraper states must remain isolated per profile on the server.
* The mapping between `account_username` and `bot_profile_id` is an immutable, system-level association maintained in the Control Plane database.

### VIII. Scoped Inter-Plane API Tokens & Event Webhooks
* **Inbound (Worker -> Control Plane)**: Every API request from a worker agent (`/api/agent/poll`, log submissions) MUST include a scoped API Bearer token. inFlow MUST validate that this token belongs to the specific `account_username` being polled or updated. Unauthorized cross-account access MUST be rejected with HTTP 401/403.
* **Outbound (Control Plane -> Worker Webhooks)**: When user interactions or automated triggers in `inFlow` dispatch events to a Hermes bot, the Control Plane resolves the target bot's endpoint via the 1-to-1 binding table and dispatches an authenticated webhook payload (signed with a shared secret). The worker validates the signature and targeted Instagram page before executing actions.

### IX. Back-Office Administration & Separation of Concerns
* Administrative operations (creating users, assigning Instagram pages to users, provisioning Hermes bot profile associations, generating/revoking inter-plane API tokens, configuring webhook endpoints) MUST be isolated within a dedicated Back-Office management plane.
* Role-based access control (RBAC) separates Superadmins (who manage users, bot bindings, and platform tokens) from Standard Tenants (who manage their assigned Instagram posts, rules, and comment logs).

## Governance

This Constitution supersedes all ad-hoc coding practices in the repository. AI agents (Hermes, Claude, Cursor, Copilot) must verify compliance with this Constitution before proposing or merging code changes.

Amendments to this Constitution require:
1. Formal proposition via `/speckit-constitution`.
2. Clear justification and impact analysis recorded in the Sync Impact Report.
3. Semantic version increment:
   - **MAJOR**: Breaking changes or removal of core architectural constraints.
   - **MINOR**: Addition of new principles or material expansions of existing guidance.
   - **PATCH**: Textual clarifications, wording improvements, and typo corrections.

**Version**: 1.1.0 | **Ratified**: 2026-10-18 | **Last Amended**: 2026-10-18
