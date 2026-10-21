# Feature Specification: Instagram Provider Abstraction, Event Aggregator, Action Queue & Automation Engine Overhaul

**Feature Branch**: `017-instagram-abstraction-queue-and-automation-overhaul`
**Created**: 2026-10-21
**Status**: Implemented
**Input**: User architectural and functional requirements for inFlow (`/opt/inflow`):
1. Decouple Instagram communication behind a clean Provider Abstraction Layer (`IInstagramProvider`) so future changes to the underlying Instagram transport (`SocialAPI` or alternative providers) do not require rewriting business logic.
2. Introduce a dedicated Action Queue (`action_queue`) and Rate-Limited Action Executor (`ActionExecutor`) to respect Instagram bulk/burst rate limits: business logic only enqueues commands, and the execution layer dispatches them with pacing, retry, and backoff.
3. Introduce a unified Data Ingestion Aggregator (`InstagramEventAggregator`) supporting both Event-driven (Webhook) and Database/Polling ingestion paths, normalizing and deduplicating events before passing them to the Automation Engine.
4. Fix all bugs across the Comment and Direct Message (DM) modules across all 3 trigger modes (`all`, `keywords` via script, `ai_context` via 9Router/LLM) and both action modes (`direct` static text and `ai` generated response).
5. Enrich AI response generation with: (a) admin instructions from panel config, (b) triggered user's profile info including real name and username, (c) the application language selected in the panel (`fa`/`en`/`ar`), and (d) the user's incoming trigger text.
6. Fundamentally fix the `Require Follow` (`pending_follow`) mechanism in both Comment and DM modules: verify real follow status live via Instagram participant profile (`is_user_follow_business`) instead of trusting button clicks blindly, and carefully orchestrate the cross-module state machine when a user is in `pending_follow` from a Comment while DM automation is also active.
7. Maintain multi-turn Conversation History (recent messages context) in DM AI replies so the assistant continues the conversation naturally without greeting the user repeatedly on every message.

---

## User Scenarios & Testing

### User Story 1 - Provider Abstraction Layer (`IInstagramProvider`) (Priority: P1)
As a system architect, I want all Instagram operations (account listing, post/comment fetching, comment replies, private replies, DM conversations/messages, participant profile & live follow check, and webhook parsing) encapsulated behind a provider-agnostic interface (`IInstagramProvider`), with `SocialApiInstagramProvider` as the concrete adapter, so that replacing or upgrading the Instagram gateway requires zero changes to automation logic or API routes.

**Independent Test**: Invoke `getInstagramProvider()` to fetch participant profile, list comments, and enqueue/execute replies without importing `SocialApiClient` in the automation engine.

**Acceptance Scenarios**:
1. **Given** the automation engine, aggregator, and executor modules, **When** inspecting their dependencies, **Then** they depend exclusively on `IInstagramProvider` and domain types in `src/lib/instagram/provider.ts`.
2. **Given** an incoming webhook (`dm.received`, `dm.postback`, `comment.received`), **When** parsed via `provider.parseWebhookPayload()`, **Then** `author.id`, `author.name`, `metadata.payload`, and `metadata.title` are extracted accurately without falling back to `@user`.

---

### User Story 2 - Unified Ingestion Aggregator (`InstagramEventAggregator`) (Priority: P1)
As a platform operator, I want a single aggregator layer that ingests Instagram events from both real-time Webhooks and periodic Polling/Sync, normalizes them, deduplicates them in `incoming_events`, enriches participant identity, and routes them to the Automation Engine, so that event-driven and polling modes behave identically and never fabricate false events.

**Independent Test**: Trigger both `POST /api/webhooks/social-api` and `POST /api/cron/poll` with the same comment or DM ID and verify it is recorded once in `incoming_events` and processed once by the Automation Engine.

**Acceptance Scenarios**:
1. **Given** a webhook delivery (`comment.received`, `dm.received`, or `dm.postback`), **When** received by `/api/webhooks/social-api`, **Then** `InstagramEventAggregator` records the normalized event in `incoming_events`, invokes `AutomationEngine`, and triggers `ActionExecutor` to drain due queued actions.
2. **Given** the periodic poller (`/api/cron/poll`), **When** polling active posts and active DM conversations, **Then** `InstagramEventAggregator` fetches only real comments and real incoming conversation messages (`direction === "incoming"`), never fabricates synthetic `"فالو کردم"` messages, and routes unseen events to `AutomationEngine`.

---

### User Story 3 - Decoupled Action Queue & Rate-Limited Executor (Priority: P1)
As an Instagram account owner, I want all outbound Instagram actions (public comment replies, private replies, direct messages, and follow-gate prompts/releases) to be placed into a persistent queue (`action_queue`) by the Automation Engine and executed by a dedicated `ActionExecutor` with per-account rate limiting and exponential backoff, so that burst traffic never violates Instagram's rate limits or drops messages.

**Independent Test**: Enqueue multiple outbound actions for an account in `action_queue` and run `ActionExecutor.processDueActions()`, verifying that actions execute in priority/FIFO order with per-account pacing and update `comment_logs` / `dm_logs` statuses upon completion.

**Acceptance Scenarios**:
1. **Given** a matched comment or DM trigger, **When** `AutomationEngine` completes evaluation, **Then** it inserts outbound commands into `action_queue` (`status = 'pending'`) with unique `dedupe_key`s and performs zero direct outbound send calls.
2. **Given** queued actions in `action_queue`, **When** `ActionExecutor` runs, **Then** it enforces per-account rate limits, handles template-to-text fallbacks for private replies, retries transient `429`/`5xx` errors with backoff, and updates the linked `comment_logs` and `dm_logs` records to `sent` or `failed`.

---

### User Story 4 - Enriched Comment & DM Triggers/Actions + Panel Language & User Profile Context (Priority: P1)
As a page admin configuring Comment or DM automation, I want all 3 trigger modes (`all`, `keywords` script matching, `ai_context` via 9Router/LLM) and both action modes (`direct` text and `ai` generated reply) to work reliably, and when `ai` action mode is selected, the AI must receive my custom panel instructions, the triggered user's real name and username, the panel's selected language (`fa`/`en`/`ar`), and the user's trigger text.

**Independent Test**: Trigger an AI reply on a comment or DM when the panel language is set, and verify the prompt sent to the LLM includes the user's full name (`Mahdi Ketabdar`), username (`@mahdiketabdar`), panel language, trigger text, and custom admin instructions.

**Acceptance Scenarios**:
1. **Given** a keyword trigger with Persian/English keywords, **When** a user sends text with Arabic/Persian character variants (`ی`/`ي`, `ک`/`ك`, half-space), **Then** the script matcher normalizes and matches accurately.
2. **Given** an AI reply action in Comment or DM, **When** `generateContextualReplyWithAi` is called, **Then** it injects the user's full name (fetched via participant profile when available) and username, the active panel language (`fa`/`en`/`ar`), the user's incoming trigger text, and the admin's instructions.

---

### User Story 5 - Live Follow Verification & Cross-Module `pending_follow` State Machine (Priority: P1)
As a page admin enabling `Require Follow` on Posts (Comment module) and/or DM Automation, I want the system to verify whether the user actually follows the business page via live Instagram participant profile (`is_user_follow_business`) before releasing any gated content, and cleanly coordinate state when both Comment and DM modules are active for the same user.

**Independent Test**:
1. User comments on a `require_follow` post -> receives Follow Gate prompt with `"فالو کردم"` button (`pending_follow`).
2. User clicks `"فالو کردم"` WITHOUT following (`is_user_follow_business` is `false`/absent) -> system does NOT send the reward DM; instead it enqueues a polite retry reminder with the `"فالو کردم"` button and consumes the button click so the DM module does not treat `"فالو کردم"` as a chat message.
3. While still in `pending_follow` from the comment, user sends a normal DM -> if DM module does not require follow, DM module answers the question without releasing the comment's gated reward; if DM module also requires follow, the DM reply is also held in `pending_follow` without spamming duplicate gate prompts.
4. User follows the page (`is_user_follow_business === true`) and clicks `"فالو کردم"` -> all held rewards (`pending_follow` comments and DMs) are queued and delivered.

**Acceptance Scenarios**:
1. **Given** a user who is ALREADY following the page (`is_user_follow_business === true`), **When** they trigger a DM or Comment with `require_follow = 1`, **Then** the system skips the follow gate prompt and queues the final reply immediately.
2. **Given** a user in `pending_follow` who taps `"فالو کردم"` or types `"فالو کردم"` while `is_user_follow_business` is `false`, **Then** the reward is NOT sent, `dm_status`/`reply_status` remains `pending_follow`, a retry prompt with button is queued, and the event is consumed by the follow gate.
3. **Given** a user in `pending_follow` who follows the page (`is_user_follow_business === true`) and taps `"فالو کردم"`, **Then** all pending comment/DM rewards for that user are queued for delivery and the confirmation click is consumed without triggering a redundant generic DM reply.

---

### User Story 6 - Multi-Turn Conversation Memory in DM AI Replies (Priority: P1)
As an Instagram user chatting with an AI-enabled business DM, I want the AI to remember the last several messages of our conversation so it responds naturally in context and never repeats `"سلام ... عزیز، وقتتون بخیر"` on every follow-up message.

**Independent Test**: Send `"سلام"` followed by `"چطوری"` in the same DM thread with AI reply mode enabled; verify the first reply greets the user by name and the second reply continues the conversation directly without repeating a greeting.

**Acceptance Scenarios**:
1. **Given** an ongoing DM conversation (`thread_id`) with prior messages in `dm_logs`, **When** a new incoming DM triggers an AI reply (`mode: "dm_chat"`), **Then** the last up to 8 turns (`user`/`assistant` pairs) are passed as conversation history to the LLM, and the system prompt explicitly forbids re-greeting in an ongoing conversation.
2. **Given** an active AI conversation thread where the initial message matched a `keywords` or `ai_context` trigger, **When** the user sends a follow-up reply in the same thread within 24 hours, **Then** the DM engine recognizes the active conversation context and continues responding.

---

## Requirements

### Functional Requirements
- **FR-001**: Provide `IInstagramProvider` interface and `SocialApiInstagramProvider` implementation under `src/lib/instagram/`.
- **FR-002**: Fix participant profile and follow status lookup to use `GET /v1/platforms/instagram/accounts/{id}/participants/{participantId}/profile` and read `is_user_follow_business`, `name`, and `username`.
- **FR-003**: Fix webhook parsing for `dm.received` and `dm.postback` to read `data.author.id`, `data.author.name`, `raw_payload.sender.id`, `data.metadata.payload`, and `data.metadata.title`.
- **FR-004**: Implement `InstagramEventAggregator` in `src/lib/instagram/aggregator.ts` unifying Webhook and Polling event ingestion with `incoming_events` deduplication.
- **FR-005**: Remove the buggy synthetic `poll_follow_...` fabrication loop in `src/app/api/cron/poll/route.ts` and replace with real conversation message ingestion + queue execution.
- **FR-006**: Implement `ActionQueue` and `ActionExecutor` in `src/lib/instagram/action-executor.ts` backed by `action_queue` table with `dedupe_key`, per-account rate limiting, and retry backoff.
- **FR-007**: Refactor `AutomationEngine` (`src/lib/instagram/automation-engine.ts` & `src/lib/instagram-automation.ts` facade) so logic only enqueues actions into `action_queue`.
- **FR-008**: Enrich `evaluateTriggerWithAi` and `generateContextualReplyWithAi` in `src/lib/ai-client.ts` with `userFullName`, `username`, `appLanguage`, `incomingText`, `instructions`, and `conversationHistory`.
- **FR-009**: Persist and propagate the panel language (`app_language`: `fa` | `en` | `ar`) from the UI (`workspace-context.tsx`, `post-detail-view.tsx`, `dm-automation-view.tsx`) to the backend.
- **FR-010**: Implement strict live follow verification and cross-module state machine for `pending_follow` across `comment_logs` and `dm_logs`.

### Key Entities
- **IncomingEvent (`incoming_events`)**: Normalized record of every comment, DM, or postback ingested via webhook or polling.
- **QueuedAction (`action_queue`)**: Outbound Instagram command (`COMMENT_REPLY`, `PRIVATE_REPLY`, `DM_SEND`, `FOLLOW_GATE_PROMPT`, `FOLLOW_RETRY_PROMPT`) awaiting rate-limited execution.
- **ParticipantProfile**: Live Instagram user profile (`id`, `username`, `name`, `is_user_follow_business`, `follower_count`).

---

## Success Criteria

### Measurable Outcomes
- **SC-001**: 0% false follow-gate releases — clicking `"فالو کردم"` without actually following the page (`is_user_follow_business !== true`) never releases gated content.
- **SC-002**: 100% of outbound automation replies are persisted in `action_queue` before execution and dispatched via `ActionExecutor` with per-account pacing.
- **SC-003**: 0 occurrences of `@user` placeholder when `author.id` / `participant_id` is provided by Instagram.
- **SC-004**: Follow-up messages in AI DM conversations include prior conversation history and 0 repeated opening greetings.
