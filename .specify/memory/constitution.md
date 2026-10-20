<!--
Sync Impact Report:
- Version Change: 1.6.0 -> 1.7.0 (MINOR: Added Principle XIII for Global UX Laws, Form State Lifecycles, Feedback Hierarchy & Information Architecture; Expanded Principle V for Brand Identity & Microcopy Tone, and Principle X for Persistent Workspace App Shell Architecture)
- Modified Principles:
  - Principle V: Expanded to include Brand Identity, Tone of Voice, Terminology Dictionary, and strict Bidirectional text isolation rules (<bdi>).
  - Principle X: Expanded to mandate the Nested App Shell Architecture (WorkspaceShell) for all account-scoped routes, eliminating component remounting and layout shifts.
- Added Principles / Sections:
  - Principle XIII: Global UX Laws, Form State Lifecycles, Feedback Hierarchy & Information Architecture (NON-NEGOTIABLE) (codified universal form states, sticky save dock contract, progressive disclosure activation cards, unsaved changes guards, standardized confirmation dialogs, single scroll container law, and JSON localization store).
- Removed Sections: None
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

### V. RTL Typography, BiDi Architecture & Tone of Voice
* User-facing Persian and Arabic text must have explicit `dir="rtl"` and strictly use the `Vazirmatn` font. The font MUST be loaded globally across all HTML tags, inputs, and buttons without relying on uncompiled ad-hoc class utilities.
* English, code, numbers, and Instagram handles (`@username`) must preserve proper bidirectional spacing without layout distortion or trailing punctuation flips. Bidirectional isolation (`<bdi>` or unicode directional controls) MUST wrap technical tags, handles, and acronyms (`AI`, `DM`, `MCP`, `API`).
* **Microcopy & Tone of Voice Standard**:
  - The voice of inFlow is professional, respectful, calm, and direct.
  - Second-person polite address (شما، خدمتتان) MUST be used consistently across all prompts, feedback, and error messages.
  - Arbitrary mixing of English and Persian (e.g. "اکشن پاسخ به کامنت (Comment Reply)") is prohibited. Use clear Persian terms accompanied by clean, muted secondary badges or subtle sub-labels where necessary for developer/technical clarity.
  - Codified terminology dictionary (e.g., "اتوماسیون پاسخ کامنت", "دایرکت هوشمند", "پیشخوان", "اتصال ایجنت", "پست‌ها و ریلزها", "ذخیره تغییرات", "لغو تغییرات").

### VI. Multi-Tenant User Authentication, Account Ownership & Minimalist Page Entity
* Users authenticate into `inFlow` via username/password credentials.
* The relationship between users and Instagram accounts is strictly 1-to-N: each user can manage one or more Instagram accounts, while each account is owned by at most one user.
* Tenant isolation is enforced: a user can only view, configure, or trigger automations for Instagram accounts explicitly assigned to their user profile.
* All dashboard routes and API endpoints MUST validate user session credentials and resource tenancy before returning or mutating data.
* **Minimalist Page Entity**: In the Control Plane, an Instagram page is fundamentally defined by its unique identifier (e.g. `username` / Instagram page ID). Rich auxiliary metadata (avatar URL, bio, follower count, media catalog) is non-blocking at creation time and is lazily synchronized and enriched by the execution agent during runtime polling.

### VII. Strict 1-to-1 Page-to-Bot Binding & Isolated Hermes Profiles
* Each connected Instagram account MUST be bound to exactly one dedicated Hermes bot profile (or worker instance).
* Each Hermes bot profile MUST handle exactly one Instagram account.
* **Hermes Isolated Bot Architecture**:
  1. **Isolated Data Directory**: Each profile has its own filesystem boundary (`~/.hermes/profiles/<profile_name>/`), maintaining its own memory (`hermes.db`), system prompt (`SOUL.md`), and profile configuration (`config.yaml`).
  2. **Dedicated Virtual Display (Bot Screen)**: Each profile operates in a virtual desktop environment (e.g. TigerVNC/Xfce on dedicated display ports) running official Google Chrome with an isolated `--user-data-dir`. Headless browsers are strictly prohibited for Instagram sessions to prevent automated bot fingerprinting and premature session termination.
  3. **API-First Session Harvesting**: Dedicated Chrome instances are utilized exclusively for initial human authentication, 2FA checkpoints, CAPTCHA bypass, and token extraction. Subsequent high-throughput automation (comment checking, polling, replying) MUST convert authenticated cookies/tokens into lightweight worker executions (`curl_cffi` / `httpx`) to preserve server memory and CPU.
  4. **Process & Socket Isolation**: Profile locks (`SingletonLock`), Xauthority tokens, and Unix RFB sockets must remain strictly isolated per account.
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

### X. Unified Design System, shadcn/ui Light Mode & Persistent App Shell (NON-NEGOTIABLE)
* All UI components across inFlow MUST strictly use or extend standardized `shadcn/ui` primitives located in `src/components/ui/`.
* **Canonical Light Mode Standard**: inFlow strictly uses **shadcn/ui Light Mode** as its primary and canonical visual standard (clean white `#ffffff` surfaces, `#fafafa` canvas, subtle `#e4e4e7` zinc borders, solid `#18181b` primary elements, and muted pastel badges). Dark mode, glowing purple/neon gradients, and ambient blur blobs are strictly prohibited.
* Ad-hoc, hardcoded, or inline color styling and arbitrary background/border palettes across page routes are strictly prohibited. Brand styling and themes MUST be token-driven and managed centrally through CSS custom properties in `src/app/globals.css`.
* Visual identity and the inFlow official brand mark MUST remain consistent across all routes (Login, Dashboard, Back-Office) as a minimalist monochrome squircle with sleek typography. Rogue icons or mismatched page headers MUST NOT be used.
* **Persistent Workspace App Shell (`WorkspaceShell`)**:
  - All account workspace routes (`/@[account]/*`) MUST be rendered within a single, persistent Next.js nested layout shell (`src/app/[account]/layout.tsx`).
  - The `SidebarNav`, Top Navigation Toolbar, Bot Status Header, and global modals (Bot Monitor Drawer, VNC Viewer) MUST remain persistently mounted in the shell.
  - Sub-page transitions (e.g. switching between Comment Automation, DM Automation, or Logs) MUST NOT remount or tear down the shell, completely eliminating visual flickering, state resets, and duplicate network requests.

### XI. Bot Lifecycle, Dynamic Self-Service Provisioning & On-Demand VNC Guard (NON-NEGOTIABLE)
* **Deterministic Bot Lifecycle**: Every connected account tracks its dedicated bot state machine through explicit states:
  - `unprovisioned`: The page exists in Back-Office and is assigned to a user, but no isolated Hermes profile or virtual screen has been provisioned on the execution server.
  - `provisioning`: Profile creation, virtual display setup, and browser initialization are underway on the server.
  - `login_required`: Profile is ready; headed Chrome is navigated to Instagram login, awaiting user authentication or 2FA/CAPTCHA resolution.
  - `live`: Instagram session is authenticated, session tokens are harvested, and polling/auto-reply cycles are active.
  - `checkpoint_required`: Instagram triggered an identity check, phone/email verification, or CAPTCHA requiring human intervention.
  - `error` / `paused`: Profile execution encountered a fatal error or was paused by user/admin.
* **Tenant Self-Service Activation**:
  - Superadmin provisions the page handle in Back-Office and assigns it to a user.
  - When the tenant user selects an `unprovisioned` page, the dashboard displays a clear, confidence-inspiring Setup & Provisioning Wizard (hiding inactive post feeds).
  - Clicking "راه‌اندازی ربات اختصاصی" dispatches an authenticated provisioning request to the default Hermes agent/server orchestrator to initialize the profile and open Instagram in its dedicated headed browser.
* **On-Demand VNC Guard for Human Intervention**:
  - Raw VNC ports (RFB/websockify) MUST NEVER remain exposed or unauthenticated on the server.
  - When human interaction is required (initial login or checkpoint resolution), the server launches a temporary VNC Guard session (`vnc_guard.py`) secured by an ephemeral cryptographically random token and an automatic timeout killer (e.g., 10 minutes).
  - The Control Plane displays the secure noVNC session directly within the UI, allowing the user to safely authenticate into their Instagram account without exposing server infrastructure.
* **Persistent Top-Toolbar Bot Monitor**:
  - The main dashboard navigation header MUST feature a persistent Bot Status button with dynamic state badges (e.g., `لایو`, `در انتظار لاگین`, `راه‌اندازی نشده`, `خطا`).
  - Clicking the bot button opens a slide-over drawer or dialog displaying real-time bot telemetry, heartbeat, recent execution logs, and an on-demand button to open the live browser screen via VNC Guard.

### XII. Canonical @username URL Scoping & Zero-Flash Account Selection (NON-NEGOTIABLE)
* **Root Path Account Selector (`/`)**:
  - The default root route (`/`) serves strictly as the Account Selector / Page Selection Hub for authenticated users.
  - When landing on `/`, tenants are presented with an uncluttered, responsive dashboard of all Instagram accounts assigned to them, displaying real-time bot status, profile avatar, follower count, and a direct action to open that page's workspace.
  - If a user has no assigned accounts, the Empty Tenancy state is shown.
* **Deterministic `@username` Workspace Routing (`/@[account]`)**:
  - Every individual account workspace is deterministically scoped under its own path segment prefixed with `@`: `/@{username}` (e.g. `/@mahdiketabdar`, `/@r9spoort1`).
  - Next.js dynamic routing MUST handle `@` notation via `/@{account}` or dynamic segments without path conflict.
  - Deep linking, query parameters (such as `?post={shortcode}`), and modals function relative to that account's canonical URL.
* **Zero-Flash Route Synchronization**:
  - Workspace components MUST derive their initial and active account synchronously from the route parameter (`params`), completely eliminating hardcoded defaults, hydration flashes, or race conditions where another account is briefly loaded before switching.
  - Hard page refreshes on `/@username` MUST immediately fetch and display only that account's data.
  - Switching accounts via the sidebar selector MUST immediately transition the URL route to `/@{new_username}`.

### XIII. Global UX Laws, Form State Lifecycles, Feedback Hierarchy & Information Architecture (NON-NEGOTIABLE)
* **1. Universal UX Form State Lifecycle**:
  Every configuration form across inFlow (Post triggers, DM automation, Account settings) MUST conform to an explicit state machine:
  - `Pristine`: Form values match persisted server state. Save action is dormant/hidden; navigation is unrestricted.
  - `Dirty`: One or more inputs diverge from persisted values. Standard **Sticky Save Dock** surfaces at the viewport bottom; unsaved changes guard activates.
  - `Submitting`: Save is in-flight. Inputs and primary CTA show loading state; duplicate clicks or rapid navigation are disabled.
  - `Success`: Server confirmed persistence. Form resets to `Pristine`; dock auto-dismisses; standardized success toast is emitted.
  - `Error`: Mutation failed. Inputs retain entered values; error feedback is presented inline or via error toast; dock remains open for retry.
* **2. The Sticky Save Dock Law**:
  - Ad-hoc save buttons placed randomly inside individual cards or page tops are strictly prohibited.
  - When a form enters the `Dirty` state, a standardized **Floating Sticky Save Bar** MUST appear anchored to the bottom of the viewport with:
    1. Pulsating dirty status indicator with explicit count of modified rules.
    2. "لغو تغییرات" (Cancel / Reset) button that restores the form to persisted server state.
    3. "ذخیره تغییرات" (Save Changes) primary button showing a spinner during submission.
  - Global keyboard shortcut `Cmd+S` (macOS) and `Ctrl+S` (Windows/Linux) MUST trigger save on active dirty forms.
  - Navigation interception: Any attempt to transition routes, switch accounts, or close/refresh the tab with dirty changes MUST trigger a confirmation dialog blocking data loss.
* **3. Feature Activation & Progressive Disclosure Law**:
  - Master feature toggles (e.g., Comment Auto-Reply, DM Automation, Follow Gate) MUST use a universal `ActivationCard` component.
  - Anatomy: Feature Icon, Bold Title, Status Badge (`روشن` / `خاموش`), Two-state explanatory subtitle, and Primary Switch.
  - Inactive State Rule: When a feature is toggled OFF, all dependent child settings (triggers, prompts, actions) MUST be visually muted (opacity 50%, pointer-events disabled) with an informative alert banner explaining that the feature is currently dormant.
* **4. Feedback & Alert Hierarchy Standard**:
  The system MUST strictly enforce a 5-tier feedback hierarchy:
  1. *Inline Field Errors*: For field validation (e.g., missing keyword, invalid URL, empty prompt).
  2. *Global Toast Notifications*: For asynchronous action confirmations (`toast.success`, `toast.error`, `toast.info`). Replaces all ad-hoc local state alerts.
  3. *Sticky Save Dock*: Exclusively for form dirty state and save lifecycle.
  4. *Modal & Dialogs*: For focused auxiliary tasks (Logs Modal, Agent API inspect, VNC Viewer).
  5. *Destructive Confirmation Dialogs*: Mandatory for irreversible actions (deleting an account, resetting prompt rules, revoking tokens). Must require explicit dual-action confirmation with destructive button styling.
* **5. Single Scroll Container & Directional Predictability Law**:
  - Nesting multiple vertical scrollbars or combining window scrolling with arbitrary container scrolling is strictly prohibited.
  - The workspace content area MUST provide exactly ONE primary vertical scroll container.
  - Scrollbar positioning is strictly directional: rendering on the left edge for RTL (`fa`, `ar`) and right edge for LTR (`en`), styled with sleek zinc aesthetics and zero layout jitter.
* **6. Multilingual JSON Store & Parameterized Localization Law**:
  - Hardcoded user-facing strings in TypeScript code or JSX are strictly prohibited.
  - 100% of UI strings MUST reside in dedicated JSON assets (`src/locales/fa.json`, `src/locales/en.json`, `src/locales/ar.json`).
  - Dynamic phrases MUST use parameterized interpolation tokens `{paramName}` (e.g., `{count}`, `{username}`).
  - 100% key parity across all language files is mandatory, validated by automated linting.

## Governance

This Constitution supersedes all ad-hoc coding practices in the repository. AI agents (Hermes, Claude, Cursor, Copilot) must verify compliance with this Constitution before proposing or merging code changes.

Amendments to this Constitution require:
1. Formal proposition via `/speckit-constitution`.
2. Clear justification and impact analysis recorded in the Sync Impact Report.
3. Semantic version increment:
   - **MAJOR**: Breaking changes or removal of core architectural constraints.
   - **MINOR**: Addition of new principles or material expansions of existing guidance.
   - **PATCH**: Textual clarifications, wording improvements, and typo corrections.

**Version**: 1.7.0 | **Ratified**: 2026-10-18 | **Last Amended**: 2026-10-20
