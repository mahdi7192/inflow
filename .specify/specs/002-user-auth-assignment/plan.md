# Implementation Plan: User Authentication and Multi-Account Assignment

**Branch**: `002-user-auth-assignment` | **Date**: 2026-10-18 | **Spec**: [spec.md](file:///Users/mahdi.ketabdar/dev/inFlow/.specify/specs/002-user-auth-assignment/spec.md)

**Input**: Feature specification from `.specify/specs/002-user-auth-assignment/spec.md`

---

## Summary

Implement multi-tenant credential authentication and 1-to-N Instagram account ownership in the inFlow Control Plane. The implementation provides secure session management via database-backed tokens and HTTP-only cookies, password hashing with native `scrypt`, role-based access control (`superadmin` vs `tenant`), server-side tenancy enforcement on all data endpoints, a dedicated Back-Office management plane for user CRUD and account assignment, and full RTL Persian/Arabic localization.

---

## Technical Context

**Language/Version**: TypeScript 5, Node.js v20+ / v26+ (ESM native)

**Primary Dependencies**:
- Next.js 16.4.2 (App Router, Turbopack)
- React 19.3.0
- Tailwind CSS v4
- Lucide React (UI icons)
- Native Node.js `crypto` (`scrypt`, `randomBytes`)

**Storage**:
- SQLite via `better-sqlite3` (^13.0.3) located at `data/inflow.db` (WAL mode enabled, foreign keys enabled)
- New tables: `users`, `user_sessions`, `user_accounts`

**Testing**:
- Contract tests & end-to-end scenarios described in [`quickstart.md`](file:///Users/mahdi.ketabdar/dev/inFlow/.specify/specs/002-user-auth-assignment/quickstart.md)
- TypeScript static type checking (`pnpm build`)
- ESLint validation (`pnpm lint`)

**Target Platform**: Next.js Server on macOS / Linux Server

**Project Type**: Web Application (Next.js Control Plane)

**Performance Goals**:
- Auth session validation: <1ms per request via indexed SQLite session lookup
- Login response latency: <100ms
- Zero horizontal data leakage between tenants

**Constraints**:
- Must preserve `better-sqlite3` in `serverExternalPackages` in `next.config.ts`
- Must maintain strict RTL typography using `Vazirmatn` for Persian and Arabic
- Must adhere strictly to GitHub Spec-Kit workflow and inFlow Constitution

**Scale/Scope**:
- 2 user roles (`superadmin`, `tenant`)
- 1-to-N account ownership model
- Dedicated Back-Office management plane (`/backoffice`)
- Localized in Persian, Arabic, and English

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Compliance Status | Details |
| :--- | :--- | :---: | :--- |
| **I. Spec-Driven Development** | Follow GitHub Spec-Kit phases | **PASSED** | Spec, research, data-model, contracts, and quickstart produced before implementation. |
| **II. Plane Isolation** | inFlow remains strictly Control Plane | **PASSED** | No Instagram browser bots or credentials in inFlow. Auth guards human operators. |
| **III. Absolute Idempotency** | No duplicate Instagram interactions | **PASSED** | Unchanged; `comment_logs` and unique `comment_id` remain intact. |
| **IV. Package & Runtime Standards** | Strictly `pnpm`, SQLite WAL | **PASSED** | No new native external packages needed; using Node `crypto`. |
| **V. RTL & BiDi Standards** | `dir="rtl"` and Vazirmatn for Persian/Arabic | **PASSED** | All login, switcher, and back-office strings registered in `i18n.ts`. |
| **VI. Multi-Tenant User Auth** | 1-to-N user-to-accounts tenancy | **PASSED** | Enforced via `user_accounts` table with `UNIQUE(account_username)`. |
| **VII. Bot Profile Binding** | 1-to-1 page-to-bot profile | **PASSED** | Control Plane data model keeps accounts bound to bots without interference. |
| **VIII. Inter-Plane Scoped API** | Worker agent tokens | **PASSED** | Preserves separate inter-plane token architecture for Hermes bots. |
| **IX. Back-Office Admin Plane** | Separation of admin concerns | **PASSED** | Superadmin portal isolated at `/backoffice` and `/api/backoffice/*`. |

---

## Project Structure

### Documentation (this feature)

```text
.specify/specs/002-user-auth-assignment/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan (this file)
├── research.md          # Architecture decisions & technical research
├── data-model.md        # Database schema, ER diagrams & constraints
├── quickstart.md        # Step-by-step verification scenarios
├── contracts/           # API contracts
│   ├── auth-api.md
│   ├── backoffice-api.md
│   └── tenancy-api.md
└── checklists/
    └── requirements.md  # Spec quality validation checklist
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts       # POST /api/auth/login
│   │   │   ├── logout/route.ts      # POST /api/auth/logout
│   │   │   └── me/route.ts          # GET /api/auth/me
│   │   ├── backoffice/
│   │   │   └── users/
│   │   │       ├── route.ts         # GET, POST /api/backoffice/users
│   │   │       ├── [id]/route.ts    # PATCH, DELETE /api/backoffice/users/[id]
│   │   │       └── [id]/assignments/route.ts # POST /api/backoffice/users/[id]/assignments
│   │   ├── accounts/route.ts        # GET /api/accounts (tenancy filtered)
│   │   ├── posts/
│   │   │   ├── route.ts             # GET /api/posts (tenancy filtered)
│   │   │   └── [shortcode]/route.ts # PATCH /api/posts/[shortcode] (tenancy checked)
│   │   └── sync/route.ts            # POST /api/sync (tenancy checked)
│   ├── login/
│   │   └── page.tsx                 # Login UI page (RTL, BiDi, Vazirmatn)
│   ├── backoffice/
│   │   └── page.tsx                 # Back-Office admin UI page
│   ├── layout.tsx                   # Root layout with language/direction support
│   └── page.tsx                     # Tenant dashboard with tenancy guard
├── components/
│   ├── backoffice/
│   │   ├── user-table.tsx           # User roster & management table
│   │   ├── create-user-modal.tsx    # Modal to create tenant/admin
│   │   └── assign-accounts-modal.tsx# Modal to assign Instagram accounts
│   ├── inflow-dashboard.tsx         # Updated with user badge, account switcher filter, logout
│   └── ui/                          # UI primitives & icons
└── lib/
    ├── auth.ts                      # Password hashing (scrypt), session token creation, cookie helpers
    ├── auth-guard.ts                # Server-side auth & tenancy verification utilities
    ├── db.ts                        # SQLite schema migrations (users, user_sessions, user_accounts) & seeding
    └── i18n.ts                      # Localized strings for auth, backoffice, and tenancy
```

---

## Complexity Tracking

No constitutional violations exist. Architecture utilizes native Node.js cryptography and SQLite tables without extraneous external frameworks, maintaining high performance, instant revocation, and zero dependency footprint.
