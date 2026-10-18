# Contract: inFlow MCP Tool Catalog Specification

## Overview

This contract specifies all tools exposed by the `inFlow` Model Context Protocol (MCP) server. Each tool adheres strictly to standard JSON Schema specifications, enabling LLMs (Hermes Agent, Claude, Cursor, OpenAI/Gemini models) to execute operations with zero ambiguity.

---

### 1. `inflow_list_accounts`

Lists Instagram accounts registered in inFlow and accessible by the authenticated agent.

#### Input Schema:
```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

#### Output Example:
```json
{
  "accounts": [
    {
      "username": "r9spoort1",
      "display_name": "R9 Sport Store",
      "followers_text": "42.8K",
      "posts_count": 84,
      "status": "active",
      "agent_interval_sec": 120,
      "last_heartbeat_at": "2026-10-18 17:45:00"
    }
  ]
}
```

---

### 2. `inflow_get_active_automations`

Retrieves all active posts and reels (`auto_reply = 1`) along with their trigger conditions and comment/DM action rules for a specific account.

#### Input Schema:
```json
{
  "type": "object",
  "properties": {
    "account_username": {
      "type": "string",
      "description": "Instagram account username (e.g. 'r9spoort1')"
    }
  },
  "required": ["account_username"]
}
```

#### Output Example:
```json
{
  "account_username": "r9spoort1",
  "active_count": 1,
  "active_posts": [
    {
      "shortcode": "DehQhnjoEcr",
      "url": "https://www.instagram.com/r9spoort1/reel/DehQhnjoEcr/",
      "post_type": "reel",
      "caption": "بجامه وتر پروڤ من جوردن...",
      "rules": {
        "trigger_type": "keywords",
        "trigger_keywords": ["قیمت", "سایز", "خرید"],
        "trigger_context": "",
        "comment_action": {
          "type": "direct",
          "text": "پاسخ در دایرکت ارسال شد 📩"
        },
        "dm_action": {
          "type": "direct",
          "text": "سلام! قیمت محصول ۳۰ هزار دینار است.",
          "require_follow": true
        }
      },
      "processed_comment_ids": ["18141068992562035", "18331872475263668"]
    }
  ]
}
```

---

### 3. `inflow_record_comment_interaction`

Records a processed comment interaction. Enforces idempotency via `comment_id`. If `comment_id` has already been recorded, the server safely returns `{ success: true, already_processed: true }` without duplicating database rows or causing duplicate replies.

#### Input Schema:
```json
{
  "type": "object",
  "properties": {
    "account_username": {
      "type": "string",
      "description": "Instagram username managing the post"
    },
    "shortcode": {
      "type": "string",
      "description": "Instagram post shortcode (e.g. 'DehQhnjoEcr')"
    },
    "comment_id": {
      "type": "string",
      "description": "Unique Instagram comment ID (Idempotency Key)"
    },
    "username": {
      "type": "string",
      "description": "Instagram commenter handle"
    },
    "comment_text": {
      "type": "string",
      "description": "Raw text of the comment"
    },
    "trigger_matched": {
      "type": "boolean",
      "description": "Whether the comment matched trigger criteria"
    },
    "comment_reply_status": {
      "type": "string",
      "enum": ["none", "sent", "failed", "skipped"],
      "description": "Status of the public comment reply"
    },
    "comment_reply_text": {
      "type": "string",
      "description": "Text posted as comment reply (if any)"
    },
    "dm_status": {
      "type": "string",
      "enum": ["none", "sent", "pending_follow", "failed", "skipped"],
      "description": "Status of direct message delivery"
    },
    "dm_text": {
      "type": "string",
      "description": "Message dispatched via DM (if any)"
    }
  },
  "required": ["account_username", "shortcode", "comment_id", "username", "comment_text"]
}
```

#### Output Example:
```json
{
  "success": true,
  "comment_id": "18499001122334455",
  "already_processed": false,
  "processed_at": "2026-10-18 18:02:11"
}
```

---

### 4. `inflow_push_scraped_posts`

Ingests or updates scraped posts and reels into the inFlow catalog. Used by the AI agent when finishing an on-demand sync or periodic catalog scrape.

#### Input Schema:
```json
{
  "type": "object",
  "properties": {
    "account_username": {
      "type": "string",
      "description": "Instagram account username"
    },
    "job_id": {
      "type": "integer",
      "description": "Associated agent_jobs ID (if dispatched via job)"
    },
    "posts": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "shortcode": { "type": "string" },
          "media_id": { "type": "string" },
          "url": { "type": "string" },
          "post_type": { "type": "string", "enum": ["post", "reel"] },
          "thumbnail_url": { "type": "string" },
          "caption": { "type": "string" }
        },
        "required": ["shortcode"]
      }
    }
  },
  "required": ["account_username", "posts"]
}
```

#### Output Example:
```json
{
  "success": true,
  "account_username": "r9spoort1",
  "synced_count": 18,
  "total_posts": 84,
  "synced_at": "2026-10-18 18:05:00"
}
```

---

### 5. `inflow_update_post_rules`

Updates automation rules (triggers, AI context, reply templates, master toggle) for a given post.

#### Input Schema:
```json
{
  "type": "object",
  "properties": {
    "shortcode": { "type": "string" },
    "auto_reply": { "type": "boolean" },
    "trigger_type": { "type": "string", "enum": ["all", "keywords", "ai_context"] },
    "trigger_keywords": { "type": "array", "items": { "type": "string" } },
    "trigger_context": { "type": "string" },
    "comment_action_type": { "type": "string", "enum": ["none", "direct", "ai"] },
    "comment_action_text": { "type": "string" },
    "dm_action_type": { "type": "string", "enum": ["none", "direct", "ai"] },
    "dm_action_text": { "type": "string" },
    "dm_require_follow": { "type": "boolean" }
  },
  "required": ["shortcode"]
}
```

---

### 6. `inflow_get_pending_jobs`

Queries unhandled or in-progress jobs for an account. Serves as a fallback for agents reconnecting after network interruption.

#### Input Schema:
```json
{
  "type": "object",
  "properties": {
    "account_username": { "type": "string" }
  },
  "required": ["account_username"]
}
```

#### Output Example:
```json
{
  "jobs": [
    {
      "id": 14,
      "job_type": "sync_catalog",
      "status": "pending",
      "payload": { "force_full": false },
      "created_at": "2026-10-18 18:03:00"
    }
  ]
}
```

---

### 7. `inflow_complete_job`

Reports completion or failure of an asynchronous agent job.

#### Input Schema:
```json
{
  "type": "object",
  "properties": {
    "job_id": { "type": "integer" },
    "status": { "type": "string", "enum": ["completed", "failed"] },
    "result_summary": { "type": "object" },
    "error_message": { "type": "string" }
  },
  "required": ["job_id", "status"]
}
```
