# Phase 0 Research: Instagram Provider Abstraction, Event Aggregator, Action Queue & Automation Engine Overhaul

## Decision 1: Live Instagram Follow Verification Endpoint
- **Decision**: Use `GET /v1/platforms/instagram/accounts/{id}/participants/{participantId}/profile` via `IInstagramProvider.getParticipantProfile(accountId, participantId)`.
- **Rationale**:
  - Previously, `SocialApiClient.checkFollowStatus` called `/v1/accounts/{id}/followers/check?user_id=...` which does not exist in SocialAPI (returns 404).
  - Official SocialAPI documentation (`/api-reference/instagram/get-an-instagram-messaging-participants-profile` and `/platforms/instagram`) confirms `GET /v1/platforms/instagram/accounts/{id}/participants/{participantId}/profile` returns `{ id, username, name, follower_count, is_user_follow_business, is_business_follow_user, is_verified_user, profile_pic }`.
  - Note: `is_user_follow_business` is omitted (`undefined`) when `false` and `true` when the participant follows the business account. If the participant has not yet messaged or tapped a button in DM, Instagram returns `403 platform.instagram.230`.
- **Alternatives considered**: Relying on `FOLLOW_CONFIRMED` button payload alone — rejected because users can tap `"فالو کردم"` without actually following the page.

## Decision 2: Webhook Payload Envelope Normalization (`dm.received` & `dm.postback`)
- **Decision**: Extract sender identity from `data.author` (`data.author.id`, `data.author.name`) and `raw_payload.sender.id` in addition to fallback fields, and extract postback payloads from `data.metadata.payload` and `data.metadata.title`.
- **Rationale**:
  - In production `dm_logs`, `sender_username` was logged as `'user'` and `sender_id` as `''` because `webhooks/social-api/route.ts` checked `data.sender` instead of `data.author`.
  - In `dm.postback` events, SocialAPI places `title` and `payload` inside `data.metadata`, not `data.content.metadata`.

## Decision 3: Cross-Module `pending_follow` State Machine (Comment + DM Coexistence)
- **Decision**: Implement a unified Follow Gate State Machine inside `AutomationEngine` that coordinates `comment_logs` (`dm_status = 'pending_follow'`) and `dm_logs` (`reply_status = 'pending_follow'`) per `(account_username, user_id / username)`.
- **Rationale**:
  - When a user comments on a post with `dm_require_follow = 1`, Instagram allows only ONE private reply per comment (`POST /v1/inbox/comments/{postId}/{commentId}/private-reply`). Therefore, the Follow Gate prompt (with the `"فالو کردم"` postback button) must be sent as that Private Reply, and once the user taps the button (opening the 24h DM window) and `is_user_follow_business === true` is verified, the held reward DM is sent via `sendDirectMessage` (`POST /v1/inbox/conversations/{conversationId}/messages`).
  - If the user taps `"فالو کردم"` while `is_user_follow_business !== true`:
    - Do NOT release `pending_follow` items.
    - Enqueue a polite Follow Retry prompt with the `"فالو کردم"` button in the conversation.
    - Consume the event so the DM Automation module does NOT treat `"فالو کردم"` as a normal chat message.
  - If the user is in `pending_follow` from a Comment (`is_user_follow_business !== true`) and sends a normal DM question (not a follow confirmation):
    - If DM Automation has `require_follow = 0`: the Comment reward remains in `pending_follow` (unreleased), while the DM Automation module answers their normal DM question according to DM rules.
    - If DM Automation has `require_follow = 1`: the DM reply is also saved as `pending_follow` and tied to the same follow gate so once they follow and tap `"فالو کردم"`, all pending rewards are released together.

## Decision 4: Action Queue & Rate-Limited Executor
- **Decision**: Persist all outbound Instagram commands in SQLite `action_queue` (`COMMENT_REPLY`, `PRIVATE_REPLY`, `DM_SEND`, `FOLLOW_GATE_PROMPT`, `FOLLOW_RETRY_PROMPT`) with `dedupe_key` idempotency, and execute them via `ActionExecutor` with per-account pacing (minimum gap between sends + per-minute cap + `Retry-After` / exponential backoff on `429`).
- **Rationale**: Decouples business logic from network I/O and protects Instagram accounts against burst rate limits.

## Decision 5: Multi-Turn Conversation Memory & Enriched AI Context
- **Decision**:
  - Pass `userFullName` (`profile.name`), `username` (`profile.username`), `appLanguage` (`fa`/`en`/`ar`), `incomingText`, and `instructions` to `generateContextualReplyWithAi`.
  - Separate prompt modes into `"comment"`, `"comment_dm"`, and `"dm_chat"`.
  - For `"dm_chat"`, load the last 8 sent exchanges from `dm_logs` for the same thread/user (excluding follow-gate control messages) and pass them as structured chat history (`user` / `assistant` turns), instructing the LLM never to repeat greetings in ongoing conversations.
