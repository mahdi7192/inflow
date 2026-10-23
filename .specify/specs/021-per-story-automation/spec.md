# Spec 021: Per-Story Automation (Story ≠ DM separation)

## Problem
Story replies arrive as DMs and were evaluated by the generic DM rules (`dm_automations`: trigger_type, reply_mode, keywords) with only an `auto|ignore` switch. UI mixed master toggle, story toggle, follow lock and brand cheat sheet.

## Requirements
1. Table `stories` (id = story_id PK) with own automation config: auto_reply, trigger_type (all|keywords|ai_context), trigger_keywords, reply_mode (direct|ai), reply_text, target_url, cheat_sheet, require_follow, emoji_reaction_action (ignore|like|quick_reply). Rows are kept after expiry (logs reference them).
2. Account-level default `dm_automations.story_handling_mode`: `auto` (AI reply) | `configured_only` | `ignore`.
3. Sync from `SocialApiClient.listActiveInstagramStories` (0 credits). API: `GET /api/accounts/[username]/stories`, `PATCH /api/accounts/[username]/stories/[id]`.
4. Engine: for `event.isStoryReply` use ONLY story config (else account default). NEVER generic DM trigger rules. Pure-emoji replies never hit the LLM. Brand cheat sheet always injected; story/post cheat sheet has priority. No story_id in webhook -> account default.
5. UI: section "استوری‌های فعال (۲۴ ساعت)" above the posts toolbar (wrapping grid, no horizontal scroll), `StoryPlaybookDrawer`, account default control. DM page: tab renamed "تنظیمات دایرکت مستقیم", story toggle + redundant master button removed, source badge per conversation.

## Payload findings
See PROJECT_STATE.md (Spec 021). Story-reply webhook fields consumed: `data.is_story_reply`, `data.metadata.is_story_reply`, `data.story_id`, `data.story_content`.
