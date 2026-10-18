# Implementation Plan: Admin Page Management, Dedicated Per-Page Tokens & Hermes MCP Configuration

**Branch**: `006-admin-page-mcp-tokens` | **Date**: 2026-10-18 | **Spec**: [.specify/specs/006-admin-page-mcp-tokens/spec.md](file:///Users/mahdi.ketabdar/dev/inFlow/.specify/specs/006-admin-page-mcp-tokens/spec.md)

**Input**: Feature specification from `.specify/specs/006-admin-page-mcp-tokens/spec.md`

## Summary

Implement the Back-Office administration suite for Instagram Pages and Hermes MCP profile integration according to **Constitution v1.4.0**:
1. **Minimalist Page Provisioning**: Enable Superadmins to register an Instagram page simply by typing its handle/ID (`username`), with automatic, non-blocking generation of a dedicated, high-entropy API token (`inf_...`) and bot profile binding (`hermes-<username>`).
2. **Hermes MCP Config Snippet Generator**: Provide a modal in Back-Office displaying ready-to-copy Hermes MCP configuration JSON/YAML blocks and raw token details with 1-click clipboard actions, along with instant token rotation/regeneration.
3. **Tenancy Assignment & Ownership**: Enable Superadmins to assign/reassign registered pages to platform users, enforcing strict 1-to-N user-to-page ownership.
4. **Strict Zero-Technical-Leakage**: Guarantee that standard tenant users never see or receive API tokens, MCP server settings, or execution-plane internals anywhere in the UI or API payloads.
5. **Lazy Profile Metadata Enrichment**: Allow worker agents to update auxiliary profile fields (display name, bio, avatar, follower counts) during normal polling or sync cycles.

---

## Technical Context

**Language/Version**: TypeScript 5+ / Node.js 20+ (ESM native)

**Primary Dependencies**: Next.js 16 (App Router), `better-sqlite3`, Tailwind CSS v4, shadcn/ui primitives, lucide-react

**Storage**: SQLite (`data/inflow.db` with WAL mode enabled), managing `accounts`, `account_bot_bindings`, `user_accounts`, and `users`

**Testing**: cURL test scripts, REST API route checks, UI modal verification via `quickstart.md`

**Target Platform**: Linux server & macOS local development environment

**Project Type**: Full-Stack SaaS Control Plane (Next.js web application + Back-Office administration plane)

**Performance Goals**:
- Page registration and token generation < 100ms
- Hermes MCP configuration snippet rendering < 50ms
- Token regeneration and instant invalidation propagation < 50ms

**Constraints**:
- Strict Control Plane isolation per Constitution Principle II (no browser automation inside Next.js)
- Multi-tenant 1-to-N isolation per Constitution Principle VI (1 user owns N pages; 1 page owned by at most 1 user)
- Dedicated per-page token binding per Constitution Principle VIII (token belongs to the page, not the user)
- Absolute zero-technical-leakage for standard tenants per Constitution Principle IX
- Unified shadcn/ui Light Mode and Vazirmatn RTL compliance per Constitution Principles V and X

**Scale/Scope**: Multi-tenant, multi-page platform with isolated Hermes execution profiles

---

## Constitution Check

*GATE: All 10 principles validated against Constitution v1.4.0. Zero violations.*

| Principle | Status | Justification / Validation |
| :--- | :--- | :--- |
| **I. Spec-Driven Development** | PASS | Rigorously follows Spec-Kit workflow (`/speckit-specify` -> `/speckit-plan` -> `/speckit-tasks` -> `/speckit-implement`). |
| **II. Control Plane Isolation** | PASS | inFlow only manages page metadata, tokens, and MCP configurations. Hermes bots execute in the isolated Execution Plane. |
| **III. Absolute Idempotency & Safety** | PASS | Preserved on all comment interactions and log reporting. |
| **IV. Package & Runtime Standards** | PASS | Strictly uses `pnpm`, Next.js 16 App Router, and `better-sqlite3` in WAL mode. |
| **V. RTL Typography & BiDi Architecture** | PASS | Back-Office UI tabs, modals, and tables use `Vazirmatn` font, native RTL layout, and proper BiDi spacing for code snippets. |
| **VI. Multi-Tenant User Authentication & Minimalist Page Entity** | PASS | Minimalist page creation requires only `username`; 1-to-N tenancy ownership is strictly enforced in `user_accounts`. |
| **VII. Strict 1-to-1 Page-to-Bot Binding** | PASS | Every registered page is automatically bound to exactly one isolated bot profile (`hermes-<username>`). |
| **VIII. Per-Page Scoped Tokens & Direct MCP Connection** | PASS | Tokens and MCP connections belong strictly to the page, never to the user. Hermes profile MCP is configured with page's dedicated key. |
| **IX. Back-Office Exclusivity & Zero-Leakage Tenant Abstraction** | PASS | Standard tenants have 0% visibility into tokens, MCP, or APIs. All management is exclusively isolated to Superadmin Back-Office. |
| **X. Unified Design System & shadcn/ui Light Mode** | PASS | Clean `#ffffff` surfaces, `#fafafa` canvas, `#e4e4e7` zinc borders, solid `#18181b` primary elements, and monochrome squircle brand mark. |

---

## Project Structure

### Documentation (this feature)

```text
.specify/specs/006-admin-page-mcp-tokens/
├── plan.md                              # This implementation plan
├── research.md                          # Phase 0 architectural decisions and research
├── data-model.md                        # Phase 1 schema, state transitions, and entities
├── quickstart.md                        # Phase 1 runnable validation scenarios
├── checklists/
│   └── requirements.md                  # Quality requirements checklist
└── contracts/
    ├── admin-pages-api.md               # Back-Office page CRUD and assignment APIs
    ├── page-token-mcp-api.md            # Per-page token inspection and regeneration APIs
    └── hermes-mcp-config-schema.md      # Hermes agent profile configuration schemas
```

### Source Code Layout

```text
src/
├── app/
│   ├── api/
│   │   ├── backoffice/
│   │   │   ├── accounts/
│   │   │   │   ├── route.ts             # GET (list pages) & POST (minimalist page creation)
│   │   │   │   └── [username]/
│   │   │   │       ├── route.ts         # DELETE (remove page)
│   │   │   │       ├── assignment/
│   │   │   │       │   └── route.ts     # PUT (assign/reassign page to user)
│   │   │   │       └── token/
│   │   │   │           └── route.ts     # GET (inspect & MCP config) & POST (regenerate)
│   │   │   └── users/                   # Existing user management APIs
│   │   ├── agent/poll/route.ts          # Bearer token validation against account_bot_bindings
│   │   ├── mcp/route.ts                 # Bearer token validation for MCP tool calls
│   │   └── sync/route.ts                # Lazy profile metadata ingestion
│   └── backoffice/
│       ├── page.tsx                     # Back-Office server page with Superadmin guard
│       └── backoffice-client.tsx        # Multi-tab view: "Users" & "Pages & MCP Tokens"
├── components/
│   └── backoffice/
│       ├── account-table.tsx            # Table listing pages, owner, token preview, and actions
│       ├── create-account-modal.tsx     # Minimalist dialog (enter username + optional user)
│       ├── hermes-mcp-modal.tsx         # Modal displaying token & copyable Hermes MCP config
│       ├── user-table.tsx               # Existing user table
│       ├── create-user-modal.tsx        # Existing user creation dialog
│       └── assign-accounts-modal.tsx    # User-centric account assignment dialog
└── lib/
    ├── db.ts                            # Core SQLite queries & helpers for accounts/bindings
    └── i18n.ts                          # Persian/Arabic/English translations for new UI strings
```

---

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| *None* | All architecture conforms 100% to Constitution v1.4.0. | N/A |
