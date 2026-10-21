# Feature Specification: SocialAPI OAuth Callback, Backoffice DB Migration & Instant Account Linking

**Feature Branch**: `016-social-api-callback-and-backoffice-fix`
**Created**: 2026-10-21
**Status**: Ready for Implementation
**Input**: User feedback:
1. When connecting via SocialAPI, returning to panel still says "نیازمند لاگین" and clicking again tries to create a new duplicate account on SocialAPI even though it already exists.
2. Backoffice admin list of pages must be fetched properly from our own database.
3. Callback confirmation page must be in Persian with a clear return-to-panel button.

---

## User Scenarios & Testing

### User Story 1 - Dedicated Persian OAuth Callback Confirmation Page (Priority: P1)
As an Instagram page owner or administrator, when I complete authorization via SocialAPI/Instagram, I want to be redirected to a dedicated, localized Persian confirmation page (`/auth/callback`) with a clear "بازگشت به پنل مدیریت" button, so that I receive immediate visual confirmation of the successful connection and my account state is automatically saved as active in the database.

**Independent Test**: Complete or simulate an OAuth redirect to `/auth/callback?username=maktb.test&account_id=acc_01M5FMA8N1FPJ8ZEVZ93PFQZDW`. Verify that the page renders a Persian success card, updates `session_status = 'active'` and `social_account_id` in SQLite, and provides a direct navigation button back to the workspace (`/@maktb.test/comments`) or backoffice.

**Acceptance Scenarios**:
1. **Given** an OAuth authorization redirect from SocialAPI, **When** the browser lands on `/auth/callback`, **Then** the page automatically synchronizes the account with the local database, marks `session_status = 'active'`, and displays a success notification in Persian with the account's details.
2. **Given** the confirmation view, **When** the user clicks "بازگشت به پنل مدیریت", **Then** the browser navigates back to the account workspace or dashboard seamlessly.
3. **Given** an error during OAuth authorization or sync failure, **When** landing on the callback page, **Then** a clear Persian error message is presented along with a retry button.

---

### User Story 2 - Resilient Backoffice SQLite Schema Migration & Direct Account Querying (Priority: P1)
As a platform administrator, I want the Backoffice to list all accounts directly and reliably from our local SQLite database without crashes caused by missing columns, so that the admin dashboard always reflects existing registered pages.

**Independent Test**: Send a GET request to `/api/backoffice/accounts` and load the `/backoffice` page. Verify that SQLite returns HTTP 200 with the full list of accounts from `inflow.db` and renders each account with its assigned user and active status.

**Acceptance Scenarios**:
1. **Given** an existing SQLite database with legacy schema, **When** the application starts or `getDb()` is invoked, **Then** `migrateSchema` automatically ensures `session_status`, `proxy_url`, and `last_sync_at` exist in `accounts` table via `ALTER TABLE` checks.
2. **Given** a call to `/api/backoffice/accounts`, **When** executed by an authenticated administrator, **Then** the endpoint returns all accounts from our database without any SQLite column errors.
3. **Given** the Backoffice UI, **When** viewing the account management table, **Then** all accounts stored in our database appear correctly with their status badges.

---

### User Story 3 - Smart Account Detection & 1-Click Sync in Login Dialog (Priority: P1)
As an operator connecting an account that already exists in the SocialAPI platform (e.g. `maktb.test`), I want the login dialog to detect that the account is already authorized in SocialAPI and offer a 1-click "اتصال و فعال‌سازی فوری" instead of forcing a new OAuth connection session, so that duplicate account creation is avoided.

**Independent Test**: Open the account connection dialog for an account that is already connected in SocialAPI. Verify the dialog detects the existing account, displays an instant sync/connect action, and when clicked, marks the local account as active immediately.

**Acceptance Scenarios**:
1. **Given** an account already present with `status: "active"` on SocialAPI, **When** the operator opens the connection dialog, **Then** the dialog highlights that the account is already verified in SocialAPI and displays a direct "اتصال و فعال‌سازی فوری" button.
2. **Given** the operator clicks "اتصال و فعال‌سازی فوری", **When** the sync action completes, **Then** the account is linked with its `social_account_id` and the session status is immediately updated to `active` in the local database and UI.
3. **Given** the operator initiates an OAuth flow, **When** `/api/accounts/connect` initiates the flow, **Then** `redirect_url` points directly to `/auth/callback?username={username}` so the callback flow handles post-authorization automatically.

---

## Edge Cases

- User lands on `/auth/callback` without query parameters: Display a graceful Persian message "اطلاعات بازگشت یافت نشد" and a button to go back to the dashboard.
- SocialAPI OAuth returns an error parameter (`?error=...`): Display the localized error details in Persian with guidance to retry.
- Multiple local accounts matching different usernames: The callback identifies the specific target account via the `username` query param or matches by `social_account_id`.

## Functional Requirements

- **FR-001**: System MUST provide an OAuth callback page at `/auth/callback` in Persian with RTL layout and a return button.
- **FR-002**: System MUST guarantee that `migrateSchema` in `src/lib/db.ts` creates `session_status`, `proxy_url`, and `last_sync_at` columns on `accounts` if they are missing.
- **FR-003**: System MUST provide automatic account linking in `/api/accounts/connect` when `action = "sync"` or `action = "callback"`.
- **FR-004**: System MUST supply the callback URL (`${origin}/auth/callback?username=${username}`) as the `redirect_url` when initiating OAuth in `/api/accounts/connect`.
- **FR-005**: Account connection dialog MUST detect existing SocialAPI accounts matching the current username and allow instant 1-click activation without initiating duplicate OAuth flows.

## Measurable Success Criteria

- **SC-001**: `GET /api/backoffice/accounts` returns HTTP 200 with all 7 accounts currently stored in the local SQLite database.
- **SC-002**: Navigating to `/auth/callback` displays a clean Persian UI with no console or runtime errors.
- **SC-003**: Linking `maktb.test` updates its `session_status` to `'active'` in `inflow.db` and the UI badge switches to "فعال" (Active).
