# Tasks: Instagram Provider Abstraction, Event Aggregator, Action Queue & Automation Engine Overhaul

**Input**: Design documents from `.specify/specs/017-instagram-abstraction-queue-and-automation-overhaul/`

## Phase 1: Setup & Database Schema Migration (Foundational)

- [X] T001 Update `src/lib/db.ts` `migrateSchema()` to ensure `incoming_events` and `action_queue` tables and columns (`dedupe_key`, `social_account_id`, `target_conversation_id`, `target_user_id`, `metadata_json`, `executed_at`, `author_full_name`, `sender_full_name`, `app_language`) exist with indexes.
- [X] T002 Add database helper functions in `src/lib/db.ts` for `app_language` persistence and DM conversation history lookup.

## Phase 2: User Story 1 - Provider Abstraction Layer (`IInstagramProvider`)

- [X] T003 [US1] Create `src/lib/instagram/provider.ts` defining `IInstagramProvider` and provider-agnostic domain types (`InstagramParticipantProfile`, `NormalizedInstagramEvent`, `InstagramButton`, etc.).
- [X] T004 [US1] Update `src/lib/social-api.ts` to fix `getParticipantProfile` (`GET /v1/platforms/instagram/accounts/{id}/participants/{participantId}/profile`) and `checkFollowStatus` (`Boolean(profile.is_user_follow_business)`).
- [X] T005 [US1] Create `src/lib/instagram/social-api-provider.ts` implementing `IInstagramProvider` over `SocialApiClient`, including accurate webhook parsing (`data.author`, `raw_payload.sender`, `data.metadata.payload`, `data.metadata.title`).

## Phase 3: User Story 3 - Decoupled Action Queue & Rate-Limited Executor

- [X] T006 [US3] Create `src/lib/instagram/action-executor.ts` with `enqueueInstagramAction()` (idempotent via `dedupe_key`) and `ActionExecutor.processActionQueue()` with per-account pacing, template-to-text private reply fallback, `429` `Retry-After` / exponential backoff, and `comment_logs` / `dm_logs` status synchronization.

## Phase 4: User Story 4 & 6 - Enriched AI Context, Panel Language & DM Conversation History

- [X] T007 [US4] Refactor `src/lib/ai-client.ts` (`evaluateTriggerWithAi` and `generateContextualReplyWithAi`) to accept `userFullName`, `username`, `appLanguage` (`fa`/`en`/`ar`), `incomingText`, `instructions`, and `conversationHistory` (multi-turn messages for `mode: "dm_chat"` without repeating greetings).
- [X] T008 [P] [US4] Update `src/app/api/posts/[shortcode]/route.ts`, `src/app/api/accounts/[username]/dm-automation/route.ts`, `src/components/post-detail-view.tsx`, and `src/components/dms/dm-automation-view.tsx` to persist and pass the active panel language (`app_language`).

## Phase 5: User Story 5 - Automation Engine & Cross-Module `pending_follow` State Machine

- [X] T009 [US5] Create `src/lib/instagram/automation-engine.ts` implementing Comment and DM trigger evaluation (`all`, normalized Persian/English `keywords`, `ai_context`), live participant profile & follow verification (`isUserFollowBusiness`), cross-module `pending_follow` state machine (Comment + DM coexistence, button click verification, retry prompt on unverified click, consumption of follow confirmation signals), active AI thread continuation, and queueing all outbound commands via `enqueueInstagramAction`.
- [X] T010 [US5] Update `src/lib/instagram-automation.ts` as a clean facade delegating to `AutomationEngine` and `ActionExecutor` for backward compatibility.

## Phase 6: User Story 2 - Unified Ingestion Aggregator (`InstagramEventAggregator`)

- [X] T011 [US2] Create `src/lib/instagram/aggregator.ts` implementing `ingestWebhookPayload()`, `ingestNormalizedEvent()`, and `pollActiveAccountsAndPosts()` (polling both active post comments and real incoming conversation messages without fabricating fake `poll_follow_` events).
- [X] T012 [US2] Update `src/app/api/webhooks/social-api/route.ts`, `src/app/api/cron/poll/route.ts`, and `src/app/api/sync/route.ts` to use `InstagramEventAggregator` and `ActionExecutor`.

## Phase 7: Verification, Build & Live Service Restart

- [X] T013 Clean up corrupted `@user` / synthetic `poll_follow_` test artifacts in SQLite if needed, run comprehensive end-to-end verification tests covering all scenarios (Comment + DM triggers, AI context with real name & language, multi-turn DM memory without repeated greeting, and cross-module `pending_follow` verification), build production Next.js bundle (`npm run build`), and restart `inflow.service`.
