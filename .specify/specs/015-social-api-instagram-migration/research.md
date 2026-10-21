# Phase 0 Research: Unified SocialAPI.ai Instagram Integration & Legacy Decommissioning

**Feature**: `015-social-api-instagram-migration`  
**Date**: 2026-10-21

---

## 1. Decommissioning Legacy Private-Protocol Stack (`instagrapi` & `engine/`)

### Decision
Completely remove the `engine/` Python directory (`instagrapi`, `pycryptodomex`, `mqtt_listener.py`, `session_vault.py`, `instagram_client.py`, `ig_client.py`, `cdp_client.py`, `humanizer.py`, `server.py`, `worker.py`, `requirements.txt`, `run_worker.sh`, `inflow-worker@.service`) and all legacy Next.js bot/session-vault modules (`src/lib/session-vault.ts`, `src/lib/server-orchestrator.ts`, `src/components/bot/*`, `src/app/api/bot/*`, `src/app/api/auth/instagram-login/route.ts`).

### Rationale
- The user explicitly mandated removing all code and packages associated with the previous Instagram library and migrating 100% of Instagram interactions to `https://docs.social-api.ai/api-reference/introduction`.
- Because SocialAPI.ai provides a normalized HTTPS REST API (`https://api.social-api.ai/v1`) and standard HTTP webhooks (`X-SocialAPI-Signature`), Next.js 16 Route Handlers can call SocialAPI.ai directly using native `fetch` in TypeScript (`src/lib/social-api.ts`). Maintaining a separate Python FastAPI proxy on port `8765` is redundant overhead.

### Alternatives Considered
- *Keep Python `engine/` as a wrapper around SocialAPI.ai*: Rejected because it adds cross-process operational failure modes (`503 Service Unavailable` when Python daemon stops) without adding any protocol capability over native Node.js/TypeScript `fetch`.

---

## 2. SocialAPI.ai Endpoint Mapping & Authentication

### Decision
Implement a centralized TypeScript service `src/lib/social-api.ts` (`SocialApiClient`) that reads `social_api_key` from SQLite `app_settings` (with fallback to `process.env.SOCIAL_API_KEY`) and attaches `Authorization: Bearer <sapi_key>` to all requests against `https://api.social-api.ai/v1`.

| inFlow Capability | SocialAPI.ai Endpoint | Method | Payload / Query |
| :--- | :--- | :--- | :--- |
| **OAuth Connect** | `/v1/accounts/connect` | `POST` | `{"platform": "instagram", "redirect_url": "..."}` |
| **List Connected Accounts** | `/v1/accounts` | `GET` | `?platform=instagram` |
| **List Comment-Enabled Posts** | `/v1/inbox/comments` | `GET` | `?account_id={acc_id}` |
| **Publish / List Posts** | `/v1/posts` | `GET` / `POST` | `{"account_id": "...", ...}` |
| **List Post Comments** | `/v1/inbox/comments/{postId}` | `GET` | `?account_id={acc_id}` |
| **Reply to Comment** | `/v1/inbox/comments/{postId}` | `POST` | `{"account_id": "acc_...", "comment_id": "cmt_...", "text": "..."}` |
| **Moderate Comment** | `/v1/inbox/comments/{postId}/{commentId}[/hide\|/like]` | `POST` / `DELETE` | `{"account_id": "acc_..."}` |
| **List DM Conversations** | `/v1/inbox/conversations` | `GET` | `?account_id={acc_id}` |
| **Send DM Message** | `/v1/inbox/conversations/{id}/messages` | `POST` | `{"account_id": "acc_...", "text": "..."}` |
| **List Mentions** | `/v1/accounts/{id}/mentions` | `GET` | Pagination cursor |
| **Register Webhooks** | `/v1/webhooks` | `POST` / `GET` | `{"url": "...", "events": ["comment.received", "dm.received", "mention.received"]}` |

### Rationale
Matches the official SocialAPI.ai REST specification while keeping credentials strictly server-side.

### Alternatives Considered
- *Client-side calls to SocialAPI.ai*: Rejected due to Constitution Principle IX (Zero Technical Leakage — tenants must never see `sapi_key_...` tokens).

---

## 3. Real-Time Webhook Ingestion & Automation Processor

### Decision
Create a unified automation processor (`src/lib/instagram-automation.ts`) invoked by:
1. **Real-Time Webhook Endpoint** (`POST /api/webhooks/social-api`): Validates `X-SocialAPI-Signature` using `crypto.createHmac('sha256', webhookSecret)` and processes `comment.received`, `dm.received`, and `mention.received` events immediately.
2. **On-Demand / Scheduled Sync** (`POST /api/sync`): Fetches latest posts, comments, and conversations via `SocialApiClient` and runs the same idempotent processor for any unprocessed items.

### Rationale
Combining real-time webhooks with on-demand sync guarantees zero missed comments even during local development or webhook tunnel restarts, while `comment_logs.comment_id` and `dm_logs.message_id` `UNIQUE` constraints prevent double-replies.

### Alternatives Considered
- *Webhook-only without sync fallback*: Rejected because operators testing locally without public tunnel URLs still need the "همگام‌سازی" (Sync) button to pull posts and process comments.
