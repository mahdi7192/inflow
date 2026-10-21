# Tasks: SocialAPI OAuth Callback, Backoffice DB Migration & Instant Account Linking

**Input**: Design documents from `.specify/specs/016-social-api-callback-and-backoffice-fix/`

## Phase 1: Database Migration (Foundational)

- [X] T001 [Foundational] Update `src/lib/db.ts` `migrateSchema()` to ensure `session_status`, `proxy_url`, and `last_sync_at` columns are created on `accounts` table.
- [X] T002 [Foundational] Run DB migration against `/opt/inflow/data/inflow.db` and verify table columns with `PRAGMA table_info(accounts)`.

## Phase 2: User Story 1 - Dedicated Persian OAuth Callback Confirmation Page

- [X] T003 [US1] Create `/opt/inflow/src/app/auth/callback/page.tsx` with Persian RTL layout, state handling, and "بازگشت به پنل مدیریت" button.
- [X] T004 [US1] Update `src/app/api/accounts/connect/route.ts` to set default OAuth `redirect_url` to `/auth/callback?username={username}`.
- [X] T005 [US1] Update `src/app/api/accounts/connect/route.ts` to support `action: "callback"` or `action: "sync"` linking the authenticated SocialAPI account into SQLite.

## Phase 3: User Story 2 - Backoffice Account Management

- [X] T006 [US2] Verify `GET /api/backoffice/accounts` successfully returns accounts from local SQLite database.
- [X] T007 [US2] Test `/backoffice` UI to confirm all pages from the database are displayed properly.

## Phase 4: User Story 3 - Smart Account Detection & 1-Click Sync in Login Dialog

- [X] T008 [US3] Update `src/components/auth/account-login-dialog.tsx` to detect if target account username already exists in SocialAPI accounts list.
- [X] T009 [US3] Add 1-click "همگام‌سازی و فعال‌سازی فوری" button when existing SocialAPI account is detected to avoid duplicate OAuth creation.

## Phase 5: Verification & Deployment

- [X] T010 Build Next.js application (`pnpm build`).
- [X] T011 Restart `inflow.service` via `systemctl restart inflow.service`.
- [X] T012 End-to-end verification of `/auth/callback`, `/api/backoffice/accounts`, and account status for `maktb.test`.
