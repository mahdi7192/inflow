# Architectural Research: Admin Page Management, Dedicated Per-Page Tokens & Hermes MCP Configuration

**Feature Branch**: `006-admin-page-mcp-tokens`
**Status**: Completed

## Overview & Context

This research artifact explores the technical decisions, data model enhancements, security boundaries, and user interface contracts required to fulfill **Constitution v1.4.0** (specifically Principles VI, VII, VIII, IX, and X). The goal is to provide a seamless, minimalist workflow for Superadmins to register Instagram pages, manage per-page scoped tokens, generate Hermes MCP configurations, and assign pages to tenants, while guaranteeing zero technical leakage to regular tenants.

---

## Key Research Decisions

### Decision 1: Minimalist Page Provisioning vs. Full Profile Scraping on Creation

- **Problem**: When a Superadmin wants to onboard a new Instagram page to inFlow, should they be forced to fill out display names, bios, follower counts, or wait for a synchronous Instagram scraping job before the page can exist in the system?
- **Decision**: **Pure Minimalist Registration (ID/Username Only)**.
  - The Superadmin provides only the Instagram handle/identifier (e.g. `r9spoort1`).
  - The Control Plane creates the `accounts` record immediately with sensible default fallbacks (`display_name = ''`, `avatar_url = ''`, `bio = ''`, `followers_text = null`, `status = 'active'`).
  - Concurrently, an `account_bot_bindings` record is provisioned with a dedicated, cryptographically secure API token (`inf_...`) and assigned bot profile ID (`hermes-<username>`).
  - Rich metadata (display name, avatar, bio, follower count) is lazily synchronized by the execution agent during runtime polling or catalog scraping (`POST /api/sync` or MCP tools).
- **Rationale**: Completely aligns with user input ("پیج چیزی نیست جز یک آی دی بقیه دیتاهاش مهم نیست لازم هم باشه ایجنت داره بعدا بهمون میده"). It decouples page creation in the Control Plane from external Instagram network latency, preventing timeout errors or blocked workflows.
- **Alternatives Considered**:
  - *Synchronous Scraping on Creation*: Rejected because if Instagram proxies fail, the admin cannot onboard the page.
  - *Manual Multi-field Form*: Rejected because entering avatar URLs and bios manually is tedious, prone to obsolescence, and redundant when the agent can discover it automatically.

---

### Decision 2: Per-Page Token Architecture & Cryptographic Generation

- **Problem**: Where should API tokens reside, and what is their scope?
- **Decision**: **Tokens are strictly 1-to-1 with Instagram Pages (`account_username`)**, stored in `account_bot_bindings`.
  - Format: High-entropy hexadecimal token prefixed with `inf_` (e.g. `inf_` + 24 bytes = 48 hex characters, e.g. `inf_a1b2c3d4...`).
  - The token is cryptographically bound to `accounts.username`.
  - There is **no concept of a user-level MCP token**. Even if a user owns 5 pages, each page has its own isolated Hermes profile and its own distinct token.
- **Rationale**:
  - Enforces Constitution Principle VII and VIII: Strict 1-to-1 page-to-bot profile isolation.
  - If one bot profile or token is compromised or revoked, other pages belonging to the same user remain completely unaffected.
- **Alternatives Considered**:
  - *User-scoped API token*: Rejected because a single user token would allow one Hermes bot profile to manipulate all 5 pages owned by that user, violating profile isolation and anti-shadowban boundaries.

---

### Decision 3: Hermes MCP Configuration Format & Copyable Snippets

- **Problem**: How should Hermes Agent (and other MCP-compatible clients) receive their server connection details?
- **Decision**: The Back-Office UI will provide a dedicated "Hermes MCP Config" dialog with ready-to-copy configuration blocks in standard formats:
  1. **Remote HTTP / SSE (Standard Hermes Server Config)**:
     ```json
     {
       "mcpServers": {
         "inflow": {
           "url": "https://<host>/api/mcp",
           "headers": {
             "Authorization": "Bearer inf_3f789d20c54a8b1e4f6291a0c8d7e6f54b3a2c1e0f9d8c7b"
           }
         }
       }
     }
     ```
  2. **Local CLI Stdio (Embedded Process Config)**:
     ```json
     {
       "mcpServers": {
         "inflow": {
           "command": "node",
           "args": ["<repo_path>/dist/cli/mcp.mjs"],
           "env": {
             "INFLOW_API_TOKEN": "inf_3f789d20c54a8b1e4f6291a0c8d7e6f54b3a2c1e0f9d8c7b",
             "INFLOW_ACCOUNT": "r9spoort1"
           }
         }
       }
     }
     ```
  3. **Raw Token & Quick Details**: Direct display of `api_token` with visibility toggle and 1-click clipboard copy.
- **Rationale**: Eliminates human configuration error during server provisioning. The Superadmin simply clicks "Copy", opens the server Hermes profile config, and pastes it.
- **Alternatives Considered**:
  - *Displaying raw token only*: Superadmins would have to manually format the JSON-RPC or MCP server URLs, introducing configuration typos.

---

### Decision 4: Token Rotation & Immediate Invalidation

- **Problem**: What happens if an admin suspects a token leak or needs to rotate credentials?
- **Decision**: Provide a "Regenerate Token" action in the Back-Office UI.
  - Generates a new secure token for `account_bot_bindings` and updates `updated_at`.
  - Invalidation is immediate (sub-millisecond) because all inbound API/MCP authentication routes (`/api/agent/poll`, `/api/mcp`, `/api/posts/[shortcode]/logs`) validate against `account_bot_bindings.api_token` on every request.
  - The UI updates the visible token and MCP configuration snippets instantly without requiring a page refresh.
- **Rationale**: Guarantees zero stale token window and supports security best practices.

---

### Decision 5: Page Assignment & Tenancy Model in Back-Office

- **Problem**: How should Superadmins allocate pages to users?
- **Decision**: Two-way assignment workflow:
  1. **From Page Management**: In the Pages list, each page indicates its owner. Superadmins can click "Assign User" or choose a user from a dropdown.
  2. **From User Management**: In the Users list, the "Assign Accounts" modal lists all pages, marking currently assigned vs unassigned pages.
  - Single ownership invariant: A page can be assigned to at most one user (`user_accounts.account_username UNIQUE`). Assigning a page to User B automatically releases it from User A (with an explicit confirmation badge).
- **Rationale**: Provides maximum operational convenience for the Superadmin regardless of whether they start by creating pages or onboarding users.

---

### Decision 6: Absolute Zero-Technical-Leakage Architecture for Standard Tenants

- **Problem**: How to ensure standard tenants never see tokens, MCP settings, or infrastructure details?
- **Decision**: Multi-layered defense:
  1. **Server-Side Route Protection**: All `/backoffice` pages and `/api/backoffice/*` endpoints verify `user.role === 'superadmin'`. Non-superadmins receive 403 Forbidden or are redirected to `/`.
  2. **Data Sanitization**: Endpoints queried by standard tenants (`/api/accounts`, `/api/auth/me`) explicitly exclude `account_bot_bindings`, `api_token`, and webhook configuration from their SQL SELECT statements and JSON payloads.
  3. **UI Cleanliness**: The tenant dashboard UI contains zero tabs, buttons, or dialogs referencing API keys, MCP, or bot profiles. Regular tenants only see:
     - Assigned pages selector
     - Reel/post list and auto-reply toggle
     - Keyword and AI trigger settings
     - DM reply message template
     - Interaction and comment history logs
- **Rationale**: Directly enforces Constitution Principle IX. Non-technical business users enjoy a clean, distraction-free interface while maintaining complete platform security.
