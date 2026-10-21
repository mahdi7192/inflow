# Tasks: Unified SocialAPI.ai Instagram Integration & Legacy Engine Decommissioning

**Input**: Design documents from `.specify/specs/015-social-api-instagram-migration/`  
**Prerequisites**: [plan.md](file:///Users/mahdi.ketabdar/dev/inFlow/.specify/specs/015-social-api-instagram-migration/plan.md), [spec.md](file:///Users/mahdi.ketabdar/dev/inFlow/.specify/specs/015-social-api-instagram-migration/spec.md), [research.md](file:///Users/mahdi.ketabdar/dev/inFlow/.specify/specs/015-social-api-instagram-migration/research.md), [data-model.md](file:///Users/mahdi.ketabdar/dev/inFlow/.specify/specs/015-social-api-instagram-migration/data-model.md), [social-api-contracts.md](file:///Users/mahdi.ketabdar/dev/inFlow/.specify/specs/015-social-api-instagram-migration/contracts/social-api-contracts.md)

**Organization**: Tasks are grouped by user story to enable independent implementation and verification of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`, `[US4]`, `[US5]`)
- Exact file paths are included in every task description.

---

## Phase 1: Setup & Legacy Purge (User Story 2 - Complete Decommissioning of Legacy Packages & Code)

**Goal**: Completely remove all code, dependencies, and services related to `instagrapi`, the Python `engine/` daemon, MQTT listeners, cookie vaults, and legacy bot/VNC modules (`[US2]`).

**Independent Test**: Verify `engine/`, `src/lib/session-vault.ts`, `src/lib/server-orchestrator.ts`, `src/components/bot/`, `src/app/api/bot/`, and `src/app/api/auth/instagram-login/` no longer exist in the repository.

- [X] T001 [P] [US2] Delete the entire legacy Python engine directory `engine/` (including `engine/requirements.txt`, `engine/instagram_client.py`, `engine/ig_client.py`, `engine/cdp_client.py`, `engine/mqtt_listener.py`, `engine/session_vault.py`, `engine/humanizer.py`, `engine/matcher.py`, `engine/rate_limiter.py`, `engine/ai_service.py`, `engine/db.py`, `engine/server.py`, `engine/worker.py`, `engine/run_worker.sh`, `engine/inflow-worker@.service`)
- [X] T002 [P] [US2] Delete legacy Next.js session vault and orchestrator utilities `src/lib/session-vault.ts` and `src/lib/server-orchestrator.ts`
- [X] T003 [P] [US2] Delete legacy bot/VNC UI components directory `src/components/bot/` (`bot-monitor-drawer.tsx`, `bot-setup-wizard.tsx`, `bot-toolbar-button.tsx`, `vnc-viewer-modal.tsx`)
- [X] T004 [P] [US2] Delete legacy bot and raw credential API routes `src/app/api/bot/` and `src/app/api/auth/instagram-login/route.ts`
- [X] T005 [US2] Clean up legacy bot/VNC imports and dead state handlers in `src/components/dms/dm-logs-page-view.tsx`, `src/components/layout/workspace-context.tsx`, `src/components/inflow-dashboard.tsx`, and `src/app/api/backoffice/accounts/[username]/route.ts`

---

## Phase 2: Foundational Infrastructure (Database Schema, SocialAPI.ai Client & AI Evaluator)

**Purpose**: Core infrastructure that MUST be complete before any SocialAPI user story can be finalized.

**⚠️ CRITICAL**: Blocks User Stories 1, 3, 4, and 5.

- [X] T006 Update SQLite schema and helpers in `src/lib/db.ts` to add `social_account_id TEXT DEFAULT NULL` to `accounts`, drop legacy `account_sessions` table, and add `getSocialApiConfig()` / `saveSocialApiConfig()` helpers for `app_settings` (`social_api_key`, `social_webhook_secret`, `social_webhook_id`, `social_api_base_url`)
- [X] T007 Create typed `SocialApiClient` in `src/lib/social-api.ts` implementing all official endpoints from `https://docs.social-api.ai/api-reference/introduction`:
  - `connectAccount()` (`POST /v1/accounts/connect`)
  - `listAccounts()` (`GET /v1/accounts`)
  - `listPosts()` & `publishPost()` & `validatePost()` (`GET /v1/posts`, `POST /v1/posts`, `POST /v1/posts/validate`)
  - `listCommentedPosts()` & `listPostComments()` & `replyToComment()` (`GET /v1/inbox/comments`, `GET /v1/inbox/comments/{postId}`, `POST /v1/inbox/comments/{postId}`)
  - `moderateComment()` (`DELETE /v1/inbox/comments/{postId}/{commentId}`, `POST|DELETE .../hide`, `POST|DELETE .../like`)
  - `listConversations()` & `sendConversationMessage()` (`GET /v1/inbox/conversations`, `POST /v1/inbox/conversations/{id}/messages`)
  - `listMentions()` (`GET /v1/accounts/{id}/mentions`)
  - `registerWebhook()` & `listWebhooks()` (`POST /v1/webhooks`, `GET /v1/webhooks`)
  - `verifyWebhookSignature()` (`HMAC-SHA256` against `X-SocialAPI-Signature`)
- [X] T008 [P] Extend `src/lib/ai-client.ts` with `evaluateTriggerWithAi()` and `generateContextualReplyWithAi()` (4.5s timeout + static fallback) so Next.js routes can evaluate `ai_context` rules directly

**Checkpoint**: Foundation ready (`src/lib/db.ts`, `src/lib/social-api.ts`, `src/lib/ai-client.ts`).

---

## Phase 3: User Story 1 - Official Account Connection via Managed OAuth Flow (Priority: P1) 🎯 MVP

**Goal**: Allow operators and admins to connect Instagram accounts via SocialAPI's OAuth flow (`POST /v1/accounts/connect` and `GET /v1/accounts`) and manage SocialAPI credentials in Back-Office without ever typing raw Instagram passwords or cookies.

**Independent Test**: Configure `sapi_key_...` in Back-Office, open the Account Connection dialog in the workspace, initiate OAuth or sync connected accounts, and verify the account is linked with `social_account_id` and `session_status = 'active'`.

- [X] T009 [P] [US1] Create Superadmin SocialAPI configuration route `src/app/api/settings/social-api/route.ts` supporting `GET` (masked key & webhook status) and `POST` (`save` credentials, `test` via `GET /v1/accounts`, and `register_webhook` via `POST /v1/webhooks`)
- [X] T010 [P] [US1] Create OAuth account connection and synchronization route `src/app/api/accounts/connect/route.ts` supporting `POST` (`initiate` OAuth via `POST /v1/accounts/connect` and `sync` connected Instagram accounts via `GET /v1/accounts`)
- [X] T011 [US1] Update `src/app/api/accounts/[username]/route.ts` to remove legacy `localhost:8765` engine calls and support updating/disconnecting `social_account_id` cleanly
- [X] T012 [US1] Rewrite `src/components/auth/account-login-dialog.tsx` to remove all password, 2FA, and `sessionid` inputs and replace them with the official SocialAPI OAuth Connect button, account selector from `/v1/accounts`, and connection status verification
- [X] T013 [US1] Update `src/components/backoffice/ai-settings-panel.tsx` to include a dedicated **تنظیمات درگاه رسمی اینستاگرام (SocialAPI.ai)** card (API Key input, Webhook Secret input, Test Connection button, and 1-click Webhook Registration button)

**Checkpoint**: User Story 1 & User Story 2 are complete and independently verifiable.

---

## Phase 4: User Story 3 - Automated Comment Ingestion, Replies & Moderation via Unified Inbox (Priority: P1)

**Goal**: Process incoming comments via real-time webhooks (`comment.received`) and `/v1/inbox/comments/{postId}`, evaluate triggers (`all`, `keywords`, `ai_context`), send public replies (`POST /v1/inbox/comments/{postId}`) and private DMs, and support comment moderation (`hide`, `like`, `delete`) with strict `comment_id` idempotency.

**Independent Test**: Send a signed `comment.received` webhook to `/api/webhooks/social-api` (or trigger comment sync), verify trigger evaluation, public comment reply, DM dispatch, and idempotent logging in `comment_logs`.

- [X] T014 [US3] Create idempotent automation processor `src/lib/instagram-automation.ts` handling `processIncomingComment()` (idempotency lock on `comment_logs.comment_id`, trigger evaluation, reply via `SocialApiClient.replyToComment`, DM via `SocialApiClient.sendConversationMessage`) and `processIncomingDm()` (idempotency lock on `dm_logs.message_id`)
- [X] T015 [P] [US3] Create signed webhook receiver endpoint `src/app/api/webhooks/social-api/route.ts` verifying `X-SocialAPI-Signature` and routing `comment.received`, `dm.received`, and `mention.received` events to `src/lib/instagram-automation.ts`
- [X] T016 [P] [US3] Create post comments & moderation endpoint `src/app/api/posts/[shortcode]/comments/route.ts` supporting `GET` (list comments via `/v1/inbox/comments/{postId}`), `POST` (manual reply, hide/unhide, like/unlike), and `DELETE` (delete comment)

**Checkpoint**: Automated and manual comment workflows operate 100% on SocialAPI.ai.

---

## Phase 5: User Story 4 - Direct Message Inbox & Conversation Management (Priority: P2)

**Goal**: Power the workspace Direct Messages inbox using `GET /v1/inbox/conversations` and `POST /v1/inbox/conversations/{id}/messages`.

**Independent Test**: Open the Live DM Inbox modal in `/@[account]/dms`, load conversations, send a message, and verify delivery via SocialAPI.ai.

- [X] T017 [US4] Rewrite `src/app/api/accounts/[username]/inbox/route.ts` to list conversations via `SocialApiClient.listConversations()` and send messages via `SocialApiClient.sendConversationMessage()`
- [X] T018 [US4] Update `src/components/dms/dm-live-inbox-modal.tsx` to align thread IDs and participant fields with the normalized `/v1/inbox/conversations` response format

**Checkpoint**: Direct Message Inbox works end-to-end on SocialAPI.ai.

---

## Phase 6: User Story 5 - Post Catalog Synchronization & Media Publishing (Priority: P2)

**Goal**: Synchronize Instagram posts and reels catalog and process recent comments on active posts via `/api/sync` using `SocialApiClient`.

**Independent Test**: Click the Sync button in `/@[account]`, verify posts are fetched via SocialAPI.ai and upserted into `posts`, and active post comments are synced.

- [X] T019 [US5] Rewrite `src/app/api/sync/route.ts` to remove `localhost:8765` engine calls and instead synchronize account profile, posts (`/v1/posts` & `/v1/inbox/comments`), and recent unprocessed comments on active posts via `SocialApiClient` and `processIncomingComment()`
- [X] T020 [P] [US5] Update `src/app/api/posts/route.ts` to support publishing/scheduling new posts via `SocialApiClient.publishPost()` (`POST /v1/posts`) alongside listing local monitored posts

**Checkpoint**: All 5 user stories are complete and integrated.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Localization parity, documentation alignment, and final build verification.

- [X] T021 [P] Update localization files `src/locales/fa.json`, `src/locales/en.json`, and `src/locales/ar.json` for OAuth connection states and SocialAPI labels, and verify 100% key parity via `pnpm test:i18n`
- [X] T022 [P] Update `AGENTS.md` architecture documentation to reflect the unified SocialAPI.ai integration and removal of `engine/` / `instagrapi`
- [X] T023 Run `pnpm lint` and `pnpm build` to verify zero TypeScript, ESLint, or Next.js build errors across the entire repository
