# Implementation Plan: SocialAPI OAuth Callback, Backoffice DB Migration & Instant Account Linking

**Branch**: `016-social-api-callback-and-backoffice-fix` | **Date**: 2026-10-21 | **Spec**: `.specify/specs/016-social-api-callback-and-backoffice-fix/spec.md`

## Summary

Deliver a complete fix for SocialAPI account onboarding and admin page listing:
1. Auto-migrate SQLite schema in `src/lib/db.ts` to add missing columns (`session_status`, `proxy_url`, `last_sync_at`) to `accounts` table.
2. Create localized Persian Next.js OAuth Callback page at `src/app/auth/callback/page.tsx` with clear status feedback and a "بازگشت به پنل مدیریت" button.
3. Update `src/app/api/accounts/connect/route.ts` to supply `/auth/callback` as `redirect_url` and improve `action: "sync"` to support auto-detecting and linking already connected accounts from SocialAPI.
4. Enhance `src/components/auth/account-login-dialog.tsx` to detect if the target account is already connected on SocialAPI and offer 1-click instant activation instead of initiating redundant OAuth requests.

## Technical Context

**Language/Version**: TypeScript 5.8 / Node.js 26.7
**Framework**: Next.js 15.2 (App Router)
**Storage**: SQLite (`better-sqlite3`) in `/opt/inflow/data/inflow.db`
**Target Platform**: Linux server (systemd `inflow.service` behind Nginx SSL)
**Constraints**: Zero downtime, backward compatibility with existing SQLite data, full Persian/RTL localization.

## Constitution Check

- Rule 1: No secret leakage (API keys redacted).
- Rule 2: Non-destructive DB migration (use `ALTER TABLE ... ADD COLUMN` only if column missing).
- Rule 3: Native Next.js App Router idioms.

## Project Structure

```text
.specify/specs/016-social-api-callback-and-backoffice-fix/
├── spec.md
├── plan.md
├── tasks.md
└── quickstart.md

src/
├── app/
│   ├── auth/
│   │   └── callback/
│   │       └── page.tsx                         # Persian Callback confirmation page
│   └── api/
│       └── accounts/
│           └── connect/
│               └── route.ts                     # Enhanced connect & sync endpoints
├── components/
│   └── auth/
│       └── account-login-dialog.tsx             # Smart account detection & 1-click sync
└── lib/
    └── db.ts                                    # Auto-migration for missing columns
```
