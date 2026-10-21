# Data Model: Direct Native Instagram Integration & Zero-Password Session Vault

**Feature**: `014-native-instagram-engine`  
**Date**: 2026-10-21 (Updated)  
**Status**: Completed

---

## 1. Entity-Relationship Diagram

```mermaid
erDiagram
    users ||--o{ user_accounts : owns
    accounts ||--o{ user_accounts : assigned_to
    accounts ||--|| account_sessions : encrypted_vault
    accounts ||--o{ posts : contains
    posts ||--o{ comment_logs : tracks
    users ||--o{ ai_settings : configures

    users {
        int id PK
        string username UK
        string display_name
        string role
        string status
    }

    user_accounts {
        int id PK
        int user_id FK
        string account_username FK
        string created_at
    }

    accounts {
        int id PK
        string username UK
        string display_name
        string avatar_url
        string bio
        string followers_text
        int posts_count
        string session_status
        string proxy_url
        string last_sync_at
        string updated_at
    }

    account_sessions {
        int id PK
        string account_username UK, FK
        string encrypted_session_data
        string encryption_iv
        string encryption_tag
        int is_valid
        string last_validated_at
        string updated_at
        string created_at
    }

    ai_settings {
        int id PK
        int user_id FK
        string provider
        string api_key_ciphertext
        string model_name
        string updated_at
    }

    posts {
        int id PK
        string account_username FK
        string shortcode UK
        string post_type
        string thumbnail_url
        string caption
        int auto_reply
        string trigger_type
        string trigger_context
        string trigger_keywords
        string comment_action_type
        string comment_action_text
        string dm_action_type
        string dm_action_text
    }

    comment_logs {
        int id PK
        string comment_id UK
        string account_username
        string shortcode
        string username
        string comment_text
        int trigger_matched
        string comment_reply_status
        string dm_status
        string created_at
    }
```

---

## 2. Table Schemas & Constraints

### 2.1 Refactored Table: `accounts` (Zero-Bot Schema)

Retires all legacy bot/VNC fields (`bot_status`, `bot_vnc_active`, `bot_vnc_token`, etc.) in favor of clean session health indicators:

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Account record ID |
| `username` | `TEXT` | `UNIQUE NOT NULL` | Instagram username handle (e.g. `mahdiketabdar`) |
| `display_name` | `TEXT` | `NULL` | Full name on Instagram profile |
| `avatar_url` | `TEXT` | `NULL` | Profile picture CDN URL |
| `bio` | `TEXT` | `NULL` | Account biography |
| `followers_text`| `TEXT` | `NULL` | Formatted follower count (e.g. `511`) |
| `posts_count` | `INTEGER` | `DEFAULT 0` | Total posts count |
| `session_status`| `TEXT` | `NOT NULL DEFAULT 'unauthenticated'` | `unauthenticated` \| `active` \| `reauth_required` \| `paused` \| `error` |
| `proxy_url` | `TEXT` | `NULL` | Optional SOCKS5 or HTTP proxy URL |
| `last_sync_at` | `TEXT` | `NULL` | Timestamp of last successful API sync/poll |
| `updated_at` | `TEXT` | `NOT NULL` | ISO timestamp of record update |
| `created_at` | `TEXT` | `NOT NULL` | ISO timestamp of record creation |

---

### 2.2 Table: `account_sessions` (Zero-Password Encrypted Vault)

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Session vault ID |
| `account_username` | `TEXT` | `UNIQUE NOT NULL REFERENCES accounts(username) ON DELETE CASCADE` | Associated Instagram account |
| `encrypted_session_data`| `TEXT` | `NOT NULL` | AES-256-GCM ciphertext of settings (cookies, UUIDs, tokens) |
| `encryption_iv` | `TEXT` | `NOT NULL` | 12-byte initialization vector |
| `encryption_tag` | `TEXT` | `NOT NULL` | 16-byte authentication tag |
| `is_valid` | `INTEGER` | `NOT NULL DEFAULT 1` | `1` if session is working; `0` if expired |
| `last_validated_at` | `TEXT` | `NULL` | Last verification timestamp |
| `updated_at` | `TEXT` | `NOT NULL` | Timestamp |
| `created_at` | `TEXT` | `NOT NULL` | Timestamp |

---

### 2.3 New Table: `ai_settings` (Direct API Key Configuration)

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Settings ID |
| `user_id` | `INTEGER` | `NOT NULL REFERENCES users(id)` | Tenant owner |
| `provider` | `TEXT` | `NOT NULL DEFAULT 'openai'` | `'openai'` \| `'gemini'` \| `'anthropic'` |
| `api_key_ciphertext` | `TEXT` | `NOT NULL` | Encrypted API key |
| `model_name` | `TEXT` | `NOT NULL DEFAULT 'gpt-4o-mini'` | LLM model identifier |
| `updated_at` | `TEXT` | `NOT NULL` | Timestamp |

---

## 3. Session Status Lifecycle

```mermaid
stateDiagram-v2
    [*] --> unauthenticated : Account created / imported
    unauthenticated --> active : In-App Login with credentials succeeds
    unauthenticated --> unauthenticated : Bad password error
    active --> active : Background mobile sync & MQTT running smoothly
    active --> reauth_required : Instagram invalidates session (LoginRequired)
    reauth_required --> active : 1-Click Re-login with credentials succeeds
    active --> paused : Operator pauses account
    paused --> active : Operator resumes account
```
