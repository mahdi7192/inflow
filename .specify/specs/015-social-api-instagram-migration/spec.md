# Feature Specification: Unified SocialAPI.ai Instagram Integration & Legacy Engine Decommissioning

**Feature Branch**: `015-social-api-instagram-migration`

**Created**: 2026-10-21

**Status**: Draft

**Input**: User description: "خب دقیقا یک راهکار درست پیدا کردم استراتژی ما برای سکشن کار با اینستاگرام باید تغییر کنه همه کدهای مربوط به کار با اینستاگرام باید طبق داکیومنت زیر بره جلو https://docs.social-api.ai/api-reference/introduction و کدهای مربوط به کتابخونه فعلی و پکیج هم کامل پاک بشه"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Official Account Connection via Managed OAuth Flow (Priority: P1)

As an account operator or administrator, I want to connect my Instagram account through the official OAuth authorization link instead of typing raw Instagram passwords or pasting browser cookies, so that my account connects securely without risk of security checkpoints, 2FA lockouts, or shadowbans.

**Why this priority**: Replaces the fragile private-protocol credential login with the compliant SocialAPI.ai authorization flow (`POST /v1/accounts/connect` and `GET /v1/accounts`), forming the foundation for all Instagram operations.

**Independent Test**: Initiate account connection from the dashboard, complete the authorization redirect flow, and verify the Instagram account appears as connected with its remote account identifier synchronized in the platform.

**Acceptance Scenarios**:

1. **Given** an operator on the account connection view, **When** they click "اتصال اکانت اینستاگرام" (Connect Instagram Account), **Then** the system requests an authorization URL for the `instagram` platform and redirects or opens the official authorization flow without asking for an Instagram password inside inFlow.
2. **Given** a completed authorization handshake, **When** the user returns to inFlow or clicks "همگام‌سازی اکانت‌ها" (Sync Accounts), **Then** the system retrieves the connected account profile (`account_id`, username, display name, avatar) and marks the account status as `active`.
3. **Given** an account whose authorization token is revoked by the user on Instagram, **When** the system detects the disconnected status, **Then** the account badge updates to `reauth_required` ("نیاز به اتصال مجدد") with a 1-click button to re-initiate the OAuth connection.

---

### User Story 2 - Complete Decommissioning of Legacy Private-Protocol Packages & Code (Priority: P1)

As a platform owner, I want all code, dependencies, and background services related to the legacy Instagram library (`instagrapi`), raw mobile MQTT listeners, encrypted cookie vaults, and password/2FA login modals completely removed from the repository, so that the system has zero technical debt or maintenance burden from unofficial scraping libraries.

**Why this priority**: Directly fulfills the user's explicit mandate to purge the current library, packages, and legacy Instagram interaction code completely.

**Independent Test**: Inspect dependency manifests and source directories to verify that `instagrapi` and related private-protocol modules are 100% deleted, and the application builds and runs cleanly using only the unified SocialAPI integration.

**Acceptance Scenarios**:

1. **Given** the project repository, **When** inspecting package manifests and backend code, **Then** `instagrapi`, `pycryptodomex`, custom MQTT listeners, session cookie vaults, and legacy CDP/bot clients are completely removed.
2. **Given** the user interface, **When** opening account connection or settings dialogs, **Then** all username/password input forms, 2FA code prompts, and session cookie import fields are gone, replaced by the unified OAuth connection action and SocialAPI key configuration in Back-Office.

---

### User Story 3 - Automated Comment Ingestion, Replies & Moderation via Unified Inbox (Priority: P1)

As an account owner, I want incoming comments on my posts and reels to be received via real-time webhooks or unified inbox polling and automatically replied to (publicly and via DM) according to my post rules, so that my customer engagement runs reliably through the official API contract.

**Why this priority**: Core value proposition of inFlow (comment auto-reply and trigger evaluation) migrated to the new provider endpoints (`/v1/inbox/comments` and `comment.received` webhooks).

**Independent Test**: Post a comment on a monitored Instagram post; verify inFlow receives the event, evaluates trigger rules (all, keywords, or AI context), dispatches the public comment reply and private DM, and records the `comment_id` in `comment_logs` with strict idempotency.

**Acceptance Scenarios**:

1. **Given** a monitored post with `auto_reply = 1`, **When** a new comment arrives via `comment.received` webhook or `/v1/inbox/comments/{postId}` sync, **Then** the system checks `comment_logs` for `comment_id` idempotency, evaluates the configured trigger (`all`, `keywords`, or `ai_context`), and dispatches the reply via `POST /v1/inbox/comments/{postId}`.
2. **Given** a comment that also requires a direct message follow-up, **When** the trigger matches, **Then** the system sends the configured static or AI-generated DM to the commenter and logs both statuses (`comment_reply_status` and `dm_status`).
3. **Given** a duplicate webhook delivery or repeated poll for an already processed `comment_id`, **When** received by the system, **Then** the system immediately skips execution to guarantee zero double-replies.

---

### User Story 4 - Direct Message Inbox & Conversation Management (Priority: P2)

As an account operator, I want to view my Instagram direct message conversations and send replies directly from the inFlow workspace using the unified conversations API, so that I can manage customer inquiries in one place.

**Why this priority**: Ensures the Direct Messages section of the workspace operates seamlessly on the new `/v1/inbox/conversations` endpoints.

**Independent Test**: Open the Direct Messages tab for a connected account, view the list of conversation threads, select a thread, send a text reply, and verify it is delivered through the `/v1/inbox/conversations/{id}/messages` endpoint.

**Acceptance Scenarios**:

1. **Given** an operator on the Direct Messages view, **When** the page loads or receives a `dm.received` event, **Then** the conversation list and message history are fetched and displayed accurately.
2. **Given** an active conversation thread, **When** the operator types a message and clicks "ارسال" (Send), **Then** the message is dispatched via `POST /v1/inbox/conversations/{id}/messages` and immediately appears in the thread history.

---

### User Story 5 - Post Catalog Synchronization & Media Publishing (Priority: P2)

As an account operator, I want to synchronize my Instagram posts and reels catalog and manage post-level automation rules using the unified posts endpoints, so that I can configure triggers on any of my published content.

**Why this priority**: Keeps the post/reel grid in the workspace synchronized with the connected Instagram account.

**Independent Test**: Click the Sync button in the workspace, verify posts and reels are populated in the grid with thumbnails and captions, and configure automation rules on a post.

**Acceptance Scenarios**:

1. **Given** a connected Instagram account, **When** the operator triggers catalog synchronization, **Then** the system fetches the account's posts/comment-enabled media and upserts them into the `posts` table while preserving existing automation rules.
2. **Given** Back-Office administration, **When** the superadmin configures the platform SocialAPI credentials (`SOCIAL_API_KEY` and webhook secret), **Then** all workspace operations authenticate using `Authorization: Bearer sapi_key_...` without exposing credentials to standard tenants.

---

### Edge Cases

- **Webhook Signature Verification Failure**: What happens when an inbound request to the webhook endpoint has an invalid or missing `X-SocialAPI-Signature` header? The system MUST reject the request with `401 Unauthorized` and log the security event without processing any actions.
- **Disconnected Account / Expired OAuth Token**: How does the system handle API responses indicating the Instagram account connection is no longer valid? The system transitions the account status to `reauth_required` and displays a clear Persian alert banner prompting the user to reconnect via OAuth.
- **Provider Rate Limiting or Temporary Outage**: If SocialAPI returns `429 Too Many Requests` or `5xx` errors, the system records the error gracefully, avoids locking the `comment_id` as permanently sent, and surfaces a polite Persian toast notification to the user.
- **Duplicate Webhook Events**: If SocialAPI delivers the same `comment.received` or `dm.received` webhook payload multiple times, the `comment_id` unique constraint in `comment_logs` guarantees idempotent single execution.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Complete Purge of Legacy Instagram Code & Packages
- **FR-001**: The system MUST completely remove the `instagrapi` package, `pycryptodomex`, custom MQTT push listeners (`mqtt_listener.py`), encrypted cookie vaults (`session_vault.py`), and all legacy private-protocol client modules (`instagram_client.py`, `ig_client.py`, `cdp_client.py`, `humanizer.py`).
- **FR-002**: The system MUST remove all UI forms and API endpoints that collect raw Instagram passwords, Two-Factor Authentication (2FA) codes, or raw `sessionid` cookies.

#### SocialAPI.ai Client & Authentication Architecture
- **FR-003**: All Instagram interactions MUST be executed exclusively through the official SocialAPI.ai REST architecture (`https://api.social-api.ai/v1/...`) authenticated via `Authorization: Bearer <sapi_key>`.
- **FR-004**: Superadmins MUST be able to configure and update the SocialAPI API Key and Webhook Secret centrally in Back-Office (`/backoffice`) or environment configuration, keeping them 100% hidden from standard tenants.
- **FR-005**: Account connection (`POST /v1/accounts/connect` with `{"platform": "instagram"}`) MUST generate an official OAuth authorization link and map the resulting SocialAPI `account_id` (`acc_...`) to the local Instagram account record in SQLite.
- **FR-006**: Account synchronization (`GET /v1/accounts`) MUST update local account metadata (remote `account_id`, username, display name, avatar, connection status).

#### Comments, DMs, Posts & Real-Time Webhooks
- **FR-007**: The system MUST fetch post catalogs and comment-enabled media using SocialAPI endpoints (`/v1/posts` and `/v1/inbox/comments`) and synchronize them into the local `posts` table.
- **FR-008**: The system MUST list post comments via `GET /v1/inbox/comments/{postId}` and dispatch public comment replies and moderation actions via `POST /v1/inbox/comments/{postId}`.
- **FR-009**: The system MUST list DM conversations via `GET /v1/inbox/conversations` and send outbound direct messages via `POST /v1/inbox/conversations/{id}/messages`.
- **FR-010**: The system MUST provide a webhook receiver endpoint that verifies the `X-SocialAPI-Signature` header and processes real-time `comment.received`, `dm.received`, and `mention.received` events.
- **FR-011**: Every automated comment reply and DM triggered by either webhook or polling MUST enforce strict idempotency via the unique `comment_id` lock in `comment_logs`.

### Key Entities

- **Connected Instagram Account (`accounts`)**: Represents an Instagram business/creator page assigned to a tenant, storing the local `username`, display metadata, connection status (`active`, `reauth_required`, `unauthenticated`, `paused`), and the mapped SocialAPI `account_id` (`acc_...`).
- **Monitored Post (`posts`)**: Stores Instagram post/reel metadata (shortcode, remote post ID, caption, thumbnail) and automation rules (`trigger_type`, `comment_action`, `dm_action`).
- **Comment Execution Log (`comment_logs`)**: Immutable idempotency record keyed by `comment_id` tracking trigger match results, public reply status, and DM status.
- **Platform Integration Credentials**: System-level configuration managed in Back-Office storing the SocialAPI Bearer key (`sapi_key_...`), Webhook Signing Secret, and AI Provider API Key.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of legacy private-protocol libraries (`instagrapi`), MQTT listeners, cookie vaults, and password-based Instagram login screens are removed from the codebase and dependency tree.
- **SC-002**: Operators can connect an Instagram account via the official OAuth redirect flow in under 60 seconds with zero password entry inside inFlow.
- **SC-003**: 100% of Instagram operations (account listing, OAuth connect, post syncing, comment reading/replying, DM listing/sending, and webhook ingestion) strictly follow the SocialAPI.ai `/v1/` specification.
- **SC-004**: Automated comment replies and DMs execute within 10 seconds of receiving a `comment.received` event, with 0% duplicate replies across 1,000+ processed comments.
- **SC-005**: Standard tenants have zero exposure to raw SocialAPI keys, webhook secrets, or internal infrastructure settings in the UI or browser network payloads.

---

## Assumptions

- **Architecture Consolidation**: Since SocialAPI.ai provides a clean, unified HTTPS REST API (`https://api.social-api.ai/v1/*`) and standard HTTP webhooks, Next.js Server Routes (or a lightweight internal service layer) can communicate directly with SocialAPI.ai without needing the heavy Python `instagrapi` daemon, removing cross-process complexity while preserving all SQLite data models (`accounts`, `posts`, `comment_logs`).
- **Workspace API Key Scope**: A master SocialAPI.ai workspace API key (`sapi_key_...`) managed by the Superadmin in `/backoffice` (or `.env`) can manage multiple connected client Instagram accounts (`acc_...`), each mapped to its respective tenant in `inFlow`.
- **AI Contextual Processing**: Direct AI API evaluation (OpenAI / Gemini configured in Back-Office) remains responsible for evaluating `ai_context` triggers and drafting dynamic replies before dispatching them through SocialAPI.ai endpoints.
