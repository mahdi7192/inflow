# Feature Specification: Admin Page Management, Dedicated Per-Page Tokens & Hermes MCP Configuration

**Feature Branch**: `006-admin-page-mcp-tokens`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "ما یکسری کاربر داریم که میتونن چند پیج اینستاگرامی داشته باشند. هر پیج token مخصوص خودش رو داره که mcp مستقیم به همون پیج وصله نه کاربر. یعنی ما برای هر پیج یک پروفایل مجزا هرمس بالا میاریم و باید mcp رو با کلید منحصر به فرد اون پیج کانفیگ کنیم. این نمایش کلید و تعریف پیج و امثالهم همه تو ادمین انجام میشه. سمت یوزر عادی عملا نه نیازه کلید ها رو ببینه نه mcp و این چیزا رو و نه api رو. من تو ادمین میتونم یوزر اضافه کنم پیج های یک یوزر روهم مشخص کنم. پیج چیزی نیست جز یک آی دی بقیه دیتاهاش مهم نیست لازم هم باشه ایجنت داره بعدا بهمون میده."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Minimalist Page Registration & Dedicated Token Generation in Back-Office (Priority: P1)

As a Superadmin managing the platform, I want to quickly register a new Instagram page simply by typing its Instagram handle/ID (without having to provide avatars, biographies, or follower metrics), so that the page is immediately created and a dedicated, cryptographically secure API token is provisioned for it automatically.

**Why this priority**: Core architectural requirement. Instagram pages must be onboarded seamlessly as minimalist identifiers, with all technical bindings and tokens generated instantly in the Control Plane.

**Independent Test**: Can be tested independently by logging in as Superadmin, navigating to Back-Office Pages, entering a new username (e.g. `r9spoort1`), clicking "Register Page", and verifying that the page record is created, its status is `active`, and a unique API token is generated in the binding registry without requiring any external Instagram scraping.

**Acceptance Scenarios**:

1. **Given** a Superadmin on the Back-Office Pages interface, **When** they submit a valid Instagram username (e.g. `r9spoort1`), **Then** inFlow registers the account, creates an isolated bot profile association, generates a unique secret token, and displays a success notification.
2. **Given** a Superadmin attempting to register a username that already exists in the system, **When** submitted, **Then** inFlow prevents duplicate registration and displays a clear validation message.
3. **Given** a newly registered page, **When** examined, **Then** auxiliary fields (display name, avatar, bio, follower count) default to clean fallback values without blocking system operation.

---

### User Story 2 - Hermes MCP Configuration Snippet & Token Management for Superadmin (Priority: P1)

As a Superadmin configuring an isolated Hermes agent profile on the server for an Instagram page, I want to view, copy, or regenerate the page's dedicated API token and copy a ready-to-paste Hermes MCP configuration block directly from the Back-Office UI, so that I can configure the page's Hermes worker in seconds without manual JSON/YAML editing or syntax mistakes.

**Why this priority**: Eliminates human error during bot profile deployment and directly implements the 1-to-1 page-to-MCP architecture defined in Constitution Principle VIII.

**Independent Test**: Can be tested independently by opening the "Hermes MCP Config" dialog for any registered page, verifying the masked token and copy-to-clipboard button, verifying the rendered JSON/YAML snippet contains the correct server endpoint and page token, and testing token regeneration to ensure the old token is invalidated.

**Acceptance Scenarios**:

1. **Given** a registered Instagram page in Back-Office, **When** the Superadmin clicks "Hermes MCP Config", **Then** a modal opens displaying the page handle, the dedicated token (masked with toggle visibility and one-click copy), and a ready-to-use Hermes `mcp_servers` configuration block.
2. **Given** the Hermes MCP configuration snippet in the modal, **When** the Superadmin clicks "Copy Configuration", **Then** the complete, valid configuration JSON is copied to the system clipboard.
3. **Given** a token that has been compromised or requires rotation, **When** the Superadmin clicks "Regenerate Token" and confirms, **Then** a new secure token is generated immediately, the previous token is revoked, and the displayed MCP configuration block updates in real time.

---

### User Story 3 - Page Assignment & Tenancy Ownership Management (Priority: P2)

As a Superadmin, I want to assign registered Instagram pages to tenant users (or reassign/unassign them), so that each user can only access and manage their own assigned pages while each page remains owned by at most one user.

**Why this priority**: Enforces Constitution Principle VI (Multi-Tenant User Authentication & Account Ownership). Superadmins must have effortless control over user-to-page allocations.

**Independent Test**: Can be tested independently by creating a tenant user `tenant1`, assigning page `r9spoort1` to them, verifying `r9spoort1` appears in `tenant1`'s account switcher, reassigning `r9spoort1` to `tenant2`, and verifying `tenant1` immediately loses access while `tenant2` gains access.

**Acceptance Scenarios**:

1. **Given** an existing tenant user and unassigned pages, **When** the Superadmin assigns one or more pages to the user, **Then** the system establishes the 1-to-N ownership relationship.
2. **Given** a page already assigned to User A, **When** the Superadmin reassigns it to User B in Back-Office, **Then** the ownership transfers cleanly, revoking User A's access and granting access to User B.
3. **Given** an unassigned page in Back-Office, **When** viewed, **Then** it is visually labeled as "Unassigned" with a quick-action button to assign it to an active user.

---

### User Story 4 - Strict Zero-Technical-Leakage for Standard Tenants (Priority: P1)

As a Standard Tenant user logged into inFlow, I want a clean, business-focused dashboard where I can configure auto-reply triggers, write direct message templates, and review comment interactions for my assigned pages without seeing any API keys, tokens, MCP server settings, or execution-plane agent internals, so that the platform is simple, secure, and user-friendly.

**Why this priority**: Core architectural principle (Constitution Principle IX - Zero Technical Leakage). Regular users must never be exposed to infrastructure-level keys or worker details.

**Independent Test**: Can be tested independently by logging in as a standard tenant user, inspecting the dashboard navigation, pages, and network requests, verifying that no tokens or MCP configs are displayed or sent in client payloads, and attempting to access `/backoffice` or administrative token routes, verifying that HTTP 403 Forbidden is returned.

**Acceptance Scenarios**:

1. **Given** an authenticated standard tenant user, **When** browsing their dashboard, reels, automation rules, and comment logs, **Then** zero API tokens, secret keys, or MCP server connection snippets are visible anywhere in the UI.
2. **Given** an authenticated standard tenant user, **When** they attempt to directly navigate to `/backoffice` or call `/api/backoffice/*`, **Then** the application rejects the request with an authorization error and redirects them to `/`.
3. **Given** a tenant user with multiple assigned pages, **When** using the account selector, **Then** only their assigned pages are listed, and selecting a page filters the dashboard context exclusively to that page.

---

### User Story 5 - Lazy Profile Metadata Enrichment by Worker Agent (Priority: P3)

As an autonomous Hermes agent running for a page, when I interact with inFlow (e.g. polling active automations or reporting scraped posts), I want to be able to supply updated profile metadata (display name, bio, avatar URL, follower count) so that inFlow automatically enriches the page's profile over time without requiring manual administrative entry.

**Why this priority**: Complements the minimalist page registration model. Since pages are registered with just an ID, the agent automatically populates rich profile data during its regular execution cycle.

**Independent Test**: Can be tested independently by registering page `minimal_shop` with empty metadata, sending a worker sync or profile update with avatar URL and follower count, and verifying that the page entity in inFlow updates its metadata seamlessly.

**Acceptance Scenarios**:

1. **Given** a page registered with only an ID, **When** the assigned Hermes agent submits profile details during execution, **Then** inFlow updates the account's `display_name`, `avatar_url`, `bio`, and `followers_text` in the database.
2. **Given** enriched metadata received from the agent, **When** the tenant or Superadmin views the page, **Then** the updated avatar, display name, and followers count appear seamlessly in the UI.

---

### Edge Cases

- **Duplicate Account Registration**: Attempting to register an Instagram username that is already present in `accounts` MUST be rejected with a user-friendly error message ("This Instagram handle is already registered").
- **Token Invalidation During Active Polling**: When a Superadmin regenerates a page token, any worker request presenting the old token MUST immediately receive HTTP 401 Unauthorized. The new token must be active instantaneously.
- **User Suspension or Deletion**: If a user is suspended or deleted, their assigned pages remain intact in `accounts` and transition to "Unassigned" status without deleting comment logs or automation configurations.
- **Unassigned Page Automation**: If a page is registered but not yet assigned to any user, its automations remain inactive by default (`auto_reply = 0`) until a tenant configures it or a Superadmin explicitly enables it.
- **Tenant Accessing Unassigned or Other Tenants' Pages**: Any attempt by a tenant user to query or mutate an account not in their `user_accounts` list MUST return HTTP 403 Forbidden.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Superadmins MUST be able to register a new Instagram page by providing only its Instagram username/handle (`username`).
- **FR-002**: Upon page registration, the system MUST automatically generate a unique, cryptographically secure API token (`api_token`) and bind it to the page in `account_bot_bindings`.
- **FR-003**: Superadmins MUST be able to view, copy, and regenerate the dedicated API token for any registered Instagram page in the Back-Office interface.
- **FR-004**: The system MUST provide a ready-to-copy Hermes MCP configuration snippet for each page, formatted with the page's specific server URL, tool scope, and unique API token.
- **FR-005**: Superadmins MUST be able to assign, reassign, and unassign registered Instagram pages to platform users, enforcing strict 1-to-N ownership (one user can own multiple pages, each page belongs to at most one user).
- **FR-006**: The platform MUST enforce strict Zero Technical Leakage: standard tenant users MUST NOT have access to API tokens, secret keys, MCP configuration snippets, or worker server endpoints in any UI view or client response.
- **FR-007**: Standard tenant users MUST only be permitted to view, configure, and inspect data for Instagram pages explicitly assigned to their account.
- **FR-008**: The system MUST support lazy metadata enrichment, allowing worker agents presenting a valid page token to update profile information (display name, bio, avatar URL, follower metrics) during normal polling or sync cycles.
- **FR-009**: All administrative page and token management views MUST strictly adhere to the unified shadcn/ui Light Mode design system (zinc palette, clean `#ffffff` cards, `#fafafa` canvas, `#18181b` primary elements) and native RTL typography (`Vazirmatn` font).
- **FR-010**: All inter-plane API endpoints (`/api/agent/poll`, `/api/posts/[shortcode]/logs`, `/api/mcp`) MUST validate that the incoming Bearer token belongs specifically to the targeted `account_username`.

### Key Entities *(include if feature involves data)*

- **Account (Page)**:
  - `id`: Unique numeric identifier
  - `username`: Instagram handle/ID (unique identifier)
  - `display_name`, `avatar_url`, `bio`, `followers_text`: Profile metadata (minimalist by default, lazily populated by agent)
  - `status`: `active` or `paused`
- **AccountBotBinding (Page Execution Binding & Token)**:
  - `account_username`: Target page handle (unique 1-to-1 relationship with `accounts.username`)
  - `bot_profile_id`: Unique identifier for the dedicated Hermes bot profile (e.g. `hermes-r9spoort1`)
  - `api_token`: Cryptographically secure random token (unique per page)
  - `last_heartbeat_at`: Timestamp of latest poll or MCP interaction
- **UserAccount (Tenancy Ownership)**:
  - `user_id`: ID of the platform user
  - `account_username`: Assigned page handle (unique per page, enforcing single ownership)
- **User**:
  - `id`, `username`, `display_name`, `role` (`superadmin` | `tenant`), `status` (`active` | `suspended`)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Superadmins can register a new Instagram page and copy its complete Hermes MCP configuration in under 30 seconds.
- **SC-002**: 100% of standard tenant views and API responses are completely free of tokens, secrets, and MCP configuration details (Zero Technical Leakage).
- **SC-003**: 100% of cross-account access attempts by tenant users or worker tokens are rejected with HTTP 403 Forbidden.
- **SC-004**: Token regeneration takes effect in under 100 milliseconds across all inter-plane endpoints, immediately revoking the superseded token.
- **SC-005**: Generated Hermes MCP configuration snippets are 100% syntactically valid JSON/YAML ready for instant copy-pasting into Hermes agent profile configs.
- **SC-006**: Back-Office Pages and Token management interfaces render natively in RTL with 100% adherence to shadcn/ui Light Mode design tokens.

## Assumptions

- Superadmins have administrative credentials and access to the server environment where isolated Hermes bot profiles are provisioned.
- Each Hermes bot profile runs in its own isolated process/container on the server and is dedicated to exactly one Instagram account.
- The execution agent communicates with inFlow's Control Plane via HTTP/HTTPS using standard MCP or REST protocols.
- Standard tenants require no technical knowledge of APIs or MCP; their user experience is centered solely on content rules and customer interactions.
