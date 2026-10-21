# Implementation Plan: Unified SocialAPI.ai Instagram Integration & Legacy Engine Decommissioning

**Branch**: `015-social-api-instagram-migration` | **Date**: 2026-10-21 | **Spec**: [spec.md](file:///Users/mahdi.ketabdar/dev/inFlow/.specify/specs/015-social-api-instagram-migration/spec.md)

**Input**: Feature specification from `.specify/specs/015-social-api-instagram-migration/spec.md`

---

## Summary

Replace 100% of the legacy private-protocol Instagram implementation (`instagrapi` Python daemon, MQTT push listeners, AES-256-GCM cookie vaults, password/2FA/sessionid login dialogs, and legacy bot/VNC modules) with a unified, server-side **SocialAPI.ai** integration (`https://api.social-api.ai/v1`) in Next.js. All account connections (`POST /v1/accounts/connect`, `GET /v1/accounts`), post syncing (`/v1/posts`, `/v1/inbox/comments`), comment reading/replying/moderation (`/v1/inbox/comments/{postId}`), DM conversations (`/v1/inbox/conversations/{id}/messages`), and real-time webhook events (`comment.received`, `dm.received`, `mention.received` verified via `X-SocialAPI-Signature`) will flow through a strictly typed `SocialApiClient` (`src/lib/social-api.ts`) and an idempotent automation engine (`src/lib/instagram-automation.ts`).

---

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js (v20+ ESM)  
**Primary Dependencies**: Next.js 16.4.2 (App Router, Turbopack), `better-sqlite3` 13.x, React 19, Tailwind CSS v4, `lucide-react`, `sonner`  
**Storage**: SQLite (`data/inflow.db` in WAL mode)  
**Testing**: TypeScript integration & i18n parity checks (`pnpm test:i18n`, `pnpm lint`, `pnpm build`)  
**Target Platform**: Web Application & Server-Side API (macOS / Linux server)  
**Project Type**: Full-stack Next.js 16 Web Application  
**Performance Goals**: Webhook ingestion & automated comment/DM dispatch < 5s (AI evaluation timeout 4.5s); zero external Python daemon overhead  
**Constraints**: Zero raw Instagram password/cookie collection; strict idempotency on `comment_id` and `message_id`; 100% adherence to `https://docs.social-api.ai/api-reference/introduction`  
**Scale/Scope**: Multi-tenant Instagram automation control plane supporting multiple accounts mapped to SocialAPI `account_id`s (`acc_...`)

---

## Constitution Check

*GATE: Passed before Phase 0 research and re-verified after Phase 1 design (Constitution v3.0.0).*

| Principle | Status | Verification Notes |
| :--- | :--- | :--- |
| **I. Spec-Driven Development** | PASS | `spec.md`, `research.md`, `data-model.md`, `contracts/`, and `quickstart.md` completed before implementation. |
| **II. Unified SocialAPI.ai Architecture & Managed OAuth** | PASS | Purges `engine/`, `instagrapi`, MQTT, and password modals; uses OAuth connect (`/v1/accounts/connect`). |
| **III. Absolute Idempotency & Safety** | PASS | Preserves `comment_logs.comment_id` and `dm_logs.message_id` unique locks across webhook and polling flows. |
| **IV. Package Management & Runtime Standards** | PASS | Uses `pnpm` exclusively and keeps `better-sqlite3` in `serverExternalPackages`. |
| **V. RTL Typography, BiDi & Tone of Voice** | PASS | All Persian UI uses `Vazirmatn`, explicit RTL direction, and zero "Bot/VNC" terminology. |
| **VI. Multi-Tenant Auth & Account Ownership** | PASS | Preserves 1-to-N `user_accounts` tenancy checks on all API routes. |
| **VII. Strict SocialAPI.ai Protocol Enforcement** | PASS | 100% of Instagram calls route through `src/lib/social-api.ts` (`https://api.social-api.ai/v1`). |
| **VIII. Direct Server-Side Execution & Signed Webhooks** | PASS | Verifies `X-SocialAPI-Signature` via HMAC-SHA256 at `/api/webhooks/social-api`. |
| **IX. Back-Office Exclusivity & Zero Leakage** | PASS | `sapi_key_...` and `social_webhook_secret` are stored in `app_settings` and managed only in `/backoffice`. |
| **X–XIII. Unified Design System, App Shell & UX Laws** | PASS | Preserves `WorkspaceShell`, shadcn/ui Light Mode, Sticky Save Bar, and `fa`/`en`/`ar` locale parity. |

---

## Project Structure

### Documentation (this feature)

```text
.specify/specs/015-social-api-instagram-migration/
├── plan.md              # This file (/speckit-plan output)
├── research.md          # Phase 0 research & architecture decisions
├── data-model.md        # Phase 1 SQLite schema & state transitions
├── quickstart.md        # Phase 1 end-to-end validation scenarios
├── contracts/
│   └── social-api-contracts.md
└── checklists/
    └── requirements.md
```

### Source Code Changes (repository root)

```text
# 1. DELETED LEGACY DIRECTORIES & FILES (Complete Purge)
engine/                                        # [DELETE ENTIRE DIRECTORY] instagrapi, mqtt_listener, session_vault, worker, server.py, etc.
src/lib/session-vault.ts                       # [DELETE] legacy cookie vault encryption
src/lib/server-orchestrator.ts                 # [DELETE] legacy bot ssh/vnc orchestrator
src/components/bot/                            # [DELETE ENTIRE DIRECTORY] bot-monitor-drawer, bot-setup-wizard, bot-toolbar-button, vnc-viewer-modal
src/app/api/bot/                               # [DELETE ENTIRE DIRECTORY] legacy bot provisioning & vnc routes
src/app/api/auth/instagram-login/route.ts      # [DELETE] legacy password/2FA/sessionid login route

# 2. NEW & UPDATED NEXT.JS MODULES (SocialAPI.ai Architecture)
src/
├── lib/
│   ├── social-api.ts                          # [NEW] Typed SocialAPI.ai REST client (/v1/accounts, /v1/posts, /v1/inbox/comments, /v1/inbox/conversations, /v1/webhooks)
│   ├── instagram-automation.ts                # [NEW] Idempotent comment & DM automation processor (shared by webhooks & sync)
│   ├── ai-client.ts                           # [UPDATE] Add evaluateTriggerWithAi() and generateReplyWithAi() helpers for TypeScript processor
│   └── db.ts                                  # [UPDATE] Add social_account_id to accounts, drop account_sessions, add SocialAPI settings helpers
├── app/
│   └── api/
│       ├── accounts/
│       │   ├── connect/route.ts               # [NEW] OAuth connect (POST /v1/accounts/connect) & account sync (GET /v1/accounts)
│       │   └── [username]/inbox/route.ts      # [UPDATE] Use SocialApiClient (/v1/inbox/conversations)
│       ├── webhooks/
│       │   └── social-api/route.ts            # [NEW] Signed webhook receiver (X-SocialAPI-Signature) for comment.received, dm.received, mention.received
│       ├── settings/
│       │   └── social-api/route.ts            # [NEW] Superadmin Back-Office API for SocialAPI key, webhook registration & connection test
│       ├── sync/route.ts                      # [UPDATE] Sync posts & comments via SocialApiClient instead of localhost:8765
│       └── posts/[shortcode]/comments/route.ts # [NEW] Read, reply, hide, like, or delete comments via /v1/inbox/comments/{postId}
└── components/
    ├── auth/
    │   └── account-login-dialog.tsx           # [UPDATE] Replace password/2FA/sessionid form with SocialAPI OAuth Connect & Account Linking UI
    └── backoffice/
        ├── ai-settings-panel.tsx              # [UPDATE] Include SocialAPI.ai Bearer Key, Webhook Secret & 1-click Webhook Registration alongside AI settings
        └── backoffice-client.tsx              # [UPDATE] Clean up any legacy bot references and surface SocialAPI connection status
```

**Structure Decision**: Consolidated single-project Next.js 16 architecture (`src/lib/social-api.ts` + Next.js Route Handlers), eliminating the legacy `engine/` Python daemon and all `instagrapi`/bot files.

---

## Complexity Tracking

No Constitution violations. Consolidating from a dual-runtime (Next.js + Python `instagrapi` daemon) into a single Next.js TypeScript runtime communicating with `https://api.social-api.ai/v1` significantly reduces architectural complexity and operational surface area.
