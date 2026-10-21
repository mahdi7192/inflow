# Quickstart Validation Guide: SocialAPI.ai Instagram Integration

**Feature**: `015-social-api-instagram-migration`

---

## 1. Prerequisites & Environment

1. Node.js (v20+) and `pnpm` installed.
2. Zero Python daemon required (`engine/` directory is completely removed).
3. Configure SocialAPI.ai key either in `.env.local` (`SOCIAL_API_KEY=sapi_key_...`) or directly via the Back-Office UI (`/backoffice`).

```bash
pnpm install
pnpm dev
```

---

## 2. Validation Scenarios

### Scenario 1: Verify Complete Removal of Legacy Library & Packages
1. Check that `engine/` directory, `instagrapi`, `pycryptodomex`, `src/lib/session-vault.ts`, `src/components/bot/`, and `/api/auth/instagram-login` no longer exist.
2. Run `pnpm build` and `pnpm lint` to confirm zero broken imports or references to legacy modules.

### Scenario 2: Configure SocialAPI.ai Credentials in Back-Office
1. Sign in as Superadmin (`admin`) and navigate to `/backoffice`.
2. Open the **تنظیمات SocialAPI و هوش مصنوعی** tab.
3. Enter your `sapi_key_...` Bearer token and click **تست اتصال به SocialAPI** (which verifies `GET https://api.social-api.ai/v1/accounts`).
4. Save settings.

### Scenario 3: OAuth Account Connection (`POST /v1/accounts/connect` & `GET /v1/accounts`)
1. Navigate to an Instagram workspace (`/@username`) or click the **وضعیت اتصال اکانت** badge in the top header.
2. Click **اتصال اکانت از طریق SocialAPI (OAuth)**.
3. Verify no Instagram password, 2FA code, or `sessionid` cookie input exists in the modal; instead, the user is guided through the official OAuth authorization or linked to a connected SocialAPI account (`acc_...`).

### Scenario 4: Sync Posts & Automated Comment Reply (`/v1/inbox/comments` & Webhooks)
1. Click **همگام‌سازی** (Sync) in the workspace to fetch posts via SocialAPI.ai.
2. Enable **پاسخ خودکار کامنت** on a post and save via the Sticky Save Bar (`Cmd+S`).
3. Send a signed `comment.received` payload to `POST /api/webhooks/social-api` (or trigger comment sync).
4. Verify inFlow evaluates the trigger, sends the comment reply via `POST /v1/inbox/comments/{postId}`, sends the DM via `POST /v1/inbox/conversations/{id}/messages`, and logs the `comment_id` in `comment_logs` with strict idempotency.
