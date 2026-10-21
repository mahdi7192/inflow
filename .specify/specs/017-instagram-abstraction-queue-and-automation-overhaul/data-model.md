# Phase 1 Data Model: Instagram Provider Abstraction, Event Aggregator, Action Queue & Automation Engine Overhaul

## 1. `incoming_events` Table (Event Ingestion Aggregator)
Stores normalized, deduplicated events from both Webhook (`source = 'webhook'`) and Polling (`source = 'polling'`).
- `id`: `INTEGER PRIMARY KEY AUTOINCREMENT`
- `account_username`: `TEXT NOT NULL`
- `event_type`: `TEXT NOT NULL` (`'comment' | 'dm' | 'postback' | 'mention'`)
- `post_shortcode`: `TEXT`
- `post_media_id`: `TEXT`
- `event_id`: `TEXT UNIQUE NOT NULL` (e.g., `cmt:<commentId>`, `dm:<messageId>`)
- `conversation_id`: `TEXT DEFAULT NULL`
- `author_username`: `TEXT NOT NULL`
- `author_full_name`: `TEXT DEFAULT ''`
- `author_id`: `TEXT NOT NULL DEFAULT ''`
- `event_text`: `TEXT NOT NULL DEFAULT ''`
- `payload_json`: `TEXT DEFAULT NULL`
- `source`: `TEXT NOT NULL DEFAULT 'webhook'`
- `event_timestamp`: `INTEGER NOT NULL`
- `status`: `TEXT NOT NULL DEFAULT 'pending'` (`'pending' | 'processed' | 'skipped' | 'failed'`)
- `processed_at`: `TEXT DEFAULT NULL`
- `created_at`: `TEXT NOT NULL DEFAULT (datetime('now'))`

## 2. `action_queue` Table (Outbound Action Queue & Executor)
Stores outbound commands enqueued by `AutomationEngine` and executed by `ActionExecutor`.
- `id`: `INTEGER PRIMARY KEY AUTOINCREMENT`
- `dedupe_key`: `TEXT UNIQUE` (Idempotency key preventing duplicate outbound actions)
- `account_username`: `TEXT NOT NULL`
- `social_account_id`: `TEXT DEFAULT ''`
- `event_id`: `TEXT NOT NULL`
- `action_type`: `TEXT NOT NULL` (`'COMMENT_REPLY' | 'PRIVATE_REPLY' | 'DM_SEND' | 'FOLLOW_GATE_PROMPT' | 'FOLLOW_RETRY_PROMPT'`)
- `target_username`: `TEXT NOT NULL`
- `target_user_id`: `TEXT DEFAULT ''`
- `target_post_shortcode`: `TEXT`
- `target_media_id`: `TEXT`
- `target_comment_id`: `TEXT`
- `target_conversation_id`: `TEXT DEFAULT ''`
- `payload_text`: `TEXT NOT NULL`
- `metadata_json`: `TEXT DEFAULT NULL` (JSON: `{ buttons?, quickReplies?, fallbackText?, commentLogId?, dmLogId? }`)
- `priority`: `INTEGER NOT NULL DEFAULT 1` (1 = interactive/high, 2 = normal, 3 = bulk/retry)
- `scheduled_at`: `TEXT NOT NULL`
- `status`: `TEXT NOT NULL DEFAULT 'pending'` (`'pending' | 'processing' | 'sent' | 'failed'`)
- `retry_count`: `INTEGER NOT NULL DEFAULT 0`
- `max_retries`: `INTEGER NOT NULL DEFAULT 3`
- `error_message`: `TEXT`
- `executed_at`: `TEXT DEFAULT NULL`
- `created_at`: `TEXT NOT NULL DEFAULT (datetime('now'))`
- `updated_at`: `TEXT NOT NULL DEFAULT (datetime('now'))`

## 3. Enhancements to `comment_logs`, `dm_logs`, `posts`, `dm_automations`
- `comment_logs`:
  - `author_full_name TEXT NOT NULL DEFAULT ''`
  - `dm_status`: `'none' | 'queued' | 'pending_follow' | 'sent' | 'failed' | 'skipped'`
  - `comment_reply_status`: `'none' | 'locked' | 'queued' | 'sent' | 'failed' | 'skipped'`
- `dm_logs`:
  - `sender_full_name TEXT NOT NULL DEFAULT ''`
  - `reply_status`: `'locked' | 'queued' | 'pending_follow' | 'sent' | 'failed' | 'skipped'`
- `posts`:
  - `app_language TEXT NOT NULL DEFAULT 'fa'`
- `dm_automations`:
  - `app_language TEXT NOT NULL DEFAULT 'fa'`
