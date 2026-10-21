# API Contracts: SocialAPI.ai Integration & Next.js Route Handlers

**Feature**: `015-social-api-instagram-migration`  
**Base External Provider**: `https://api.social-api.ai/v1`

---

## 1. Outbound Provider Contract (`src/lib/social-api.ts` -> `https://api.social-api.ai/v1`)

All outbound calls include header:
```http
Authorization: Bearer <sapi_key_...>
Content-Type: application/json
```

### 1.1 Account Connection & Discovery
- **`POST /v1/accounts/connect`**
  - Request: `{ "platform": "instagram", "redirect_url"?: string }`
  - Response: `{ "url"?: string, "auth_url"?: string, "account_id"?: string, "status"?: string }`
- **`GET /v1/accounts`**
  - Response: `{ "data": [{ "id": "acc_...", "platform": "instagram", "username": "...", "display_name": "...", "avatar_url": "...", "status": "connected" }], "count": number }`

### 1.2 Unified Inbox: Comments
- **`GET /v1/inbox/comments`** (List comment-enabled posts)
  - Query: `?account_id={social_account_id}`
- **`GET /v1/inbox/comments/{postId}`** (List comments on a post)
  - Query: `?account_id={social_account_id}&cursor={cursor}`
  - Response: `{ "data": [{ "id": "cmt_...", "post_id": "...", "username": "...", "user_id": "...", "text": "...", "created_at": "..." }], "pagination": { "has_more": boolean, "next_cursor": string } }`
- **`POST /v1/inbox/comments/{postId}`** (Reply to a comment)
  - Request: `{ "account_id": "acc_...", "comment_id": "cmt_...", "text": "..." }`
- **Comment Moderation**:
  - `DELETE /v1/inbox/comments/{postId}/{commentId}` (Delete comment)
  - `POST /v1/inbox/comments/{postId}/{commentId}/hide` / `DELETE .../hide` (Hide / Unhide)
  - `POST /v1/inbox/comments/{postId}/{commentId}/like` / `DELETE .../like` (Like / Unlike)

### 1.3 Unified Inbox: Direct Messages (Conversations)
- **`GET /v1/inbox/conversations`**
  - Query: `?account_id={social_account_id}&cursor={cursor}`
  - Response: `{ "data": [{ "id": "sapi_dm_...", "platform": "instagram", "participant_name": "...", "participant_id": "...", "last_message": "...", "last_message_at": "...", "unread_count": number, "messages"?: [...] }], "pagination": { "has_more": boolean, "next_cursor": string } }`
- **`POST /v1/inbox/conversations/{id}/messages`**
  - Request: `{ "account_id": "acc_...", "text": "..." }`

### 1.4 Posts & Mentions
- **`GET /v1/posts`** & **`POST /v1/posts`**
- **`GET /v1/accounts/{id}/mentions`**

### 1.5 Webhooks Management
- **`POST /v1/webhooks`**
  - Request: `{ "url": "https://<domain>/api/webhooks/social-api", "events": ["comment.received", "dm.received", "mention.received"] }`
  - Response: `{ "id": "wh_...", "secret": "whsec_..." }`

---

## 2. Internal Next.js API Contracts

### 2.1 `POST /api/accounts/connect` (Replaces `/api/auth/instagram-login`)
Initiates an OAuth connection or syncs connected SocialAPI Instagram accounts for the authenticated user.
- **Request**: `{ "username": "r9spoort1", "action": "initiate" | "sync", "social_account_id"?: "acc_..." }`
- **Response (`initiate`)**: `{ "success": true, "auth_url": "https://...", "accounts": [...] }`
- **Response (`sync`)**: `{ "success": true, "account": { "username": "r9spoort1", "social_account_id": "acc_...", "session_status": "active" } }`

### 2.2 `POST /api/webhooks/social-api`
Receives real-time events from SocialAPI.ai.
- **Headers**: `X-SocialAPI-Signature: <hmac_sha256_hex>`
- **Body**:
```json
{
  "event": "comment.received",
  "account_id": "acc_01HZ9X3Q4R5M6N7P8V2K0W1J",
  "data": {
    "id": "cmt_18499001122334455",
    "post_id": "17895695668004550",
    "shortcode": "DehQhnjoEcr",
    "username": "customer_username",
    "user_id": "usr_123",
    "text": "قیمت چنده؟",
    "created_at": "2026-10-21T15:30:00Z"
  }
}
```
- **Response**: `200 OK` `{ "received": true, "processed": true }` (or `401 Unauthorized` if signature fails).

### 2.3 `GET / POST /api/settings/social-api` (Superadmin Back-Office Only)
Manages `social_api_key`, `social_webhook_secret`, tests connection via `GET /v1/accounts`, and registers webhooks via `POST /v1/webhooks`.

### 2.4 `GET / POST /api/accounts/[username]/inbox`
- **`GET`**: Calls `SocialApiClient.listConversations(accountId)` and returns normalized threads for the workspace DM inbox modal.
- **`POST`**: Calls `SocialApiClient.sendConversationMessage(conversationId, accountId, text)` to dispatch a DM reply.

### 2.5 `POST /api/sync`
Calls `SocialApiClient` to sync account profile info, posts catalog (`/v1/posts` & `/v1/inbox/comments`), and recent unprocessed comments on active posts (`auto_reply = 1`).
