# Implementation Plan: Unified Panel Architecture, Shell & Global UX Design System

**Branch**: `012-unified-panel-architecture` | **Date**: 2026-10-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from [spec.md](./spec.md)

---

## Summary

Harmonize inFlow's workspace architecture and interaction design across all account routes by introducing a persistent Next.js nested layout shell (`WorkspaceShell`), a universal Form State machine with bottom Sticky Save Bar, standard `ActivationCard` toggles with progressive disclosure, a single directional scroll container, a centralized multilingual JSON localization engine with dynamic parameter interpolation, and a codified brand identity and tone of voice handbook.

---

## Technical Context

**Language/Version**: TypeScript 5.8+, React 19.3.0, Next.js 16.4.2 (App Router with Turbopack).

**Primary Dependencies**: `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `sonner` (or shadcn toast provider).

**Storage**: SQLite 3 via `better-sqlite3` in `data/inflow.db` (WAL mode enabled). No breaking database schema migrations required.

**Testing**: Linting via `eslint`, Next.js build validation (`pnpm build`), and automated i18n key parity script (`tests/i18n-parity.test.ts`).

**Target Platform**: Modern Desktop, Tablet, and Mobile Web Browsers (Chrome, Safari, Firefox, Edge) with bidirectional support (`rtl` and `ltr`).

**Project Type**: Multi-Tenant SaaS Control Plane Web Application.

**Performance Goals**:
- Zero-flash sub-page transitions (<50ms) between Comment Automation, DM Automation, and Activity Logs.
- 0 unnecessary remounts of `SidebarNav`, TopBar, and Bot Telemetry Modals.
- 60fps smooth drawer animations and sticky dock transitions.

**Constraints**:
- Strict light mode default (pure white surfaces `#ffffff`, zinc borders `#e4e4e7`, solid zinc primary `#18181b`).
- Single vertical scroll container per workspace; zero double-scrollbar collisions.
- Explicit Vazirmatn typography in Persian/Arabic locales with bidirectional text isolation (`<bdi>`).
- 100% JSON locale key parity across `fa.json`, `en.json`, and `ar.json`.

**Scale/Scope**:
- 1 persistent workspace shell (`WorkspaceShell`) hosting all account routes (`/@[account]/*`).
- 2 primary automation modules (Comments & DMs) fully migrated to the new shell and UX contract.
- 3 localized JSON dictionaries (`fa.json`, `en.json`, `ar.json`).
- 4 new reusable UI primitives (`ActivationCard`, `StickySaveBar`, `ConfirmDialog`, `PageContainer`).

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status | Notes |
| :--- | :--- | :--- | :--- |
| **I. Spec-Driven Development** | Follow GitHub Spec-Kit workflow | **PASSED** | Governed by `spec.md`, `plan.md`, `tasks.md`. |
| **II. Control vs Execution Plane** | Keep browser bots/proxies out of inFlow | **PASSED** | Purely control plane; communicates via REST/MCP. |
| **III. Absolute Idempotency** | Guarantee safe deduplicated operations | **PASSED** | Existing `comment_id` unique locks preserved. |
| **IV. Package & Runtime Standards** | Use `pnpm`, `better-sqlite3` external | **PASSED** | Strict `pnpm` usage; config unchanged. |
| **V. RTL Typography & Tone** | Vazirmatn font, `<bdi>` isolation, respectful tone | **PASSED** | Fixed global `--font-sans`, Terminology Dictionary enforced. |
| **VI. Multi-Tenant Tenancy** | 1-to-N user account isolation | **PASSED** | Verified in `[account]/layout.tsx` server component. |
| **VII. Strict 1-to-1 Bot Binding** | Dedicated Hermes profiles | **PASSED** | Intact. |
| **VIII. Per-Page Scoped Tokens** | Tokens scoped to `account_username` | **PASSED** | Intact. |
| **IX. Back-Office Exclusivity** | Zero technical leak to tenants | **PASSED** | Tenant views remain high-level and clean. |
| **X. Unified Design System & Shell** | shadcn Light Mode, persistent WorkspaceShell | **PASSED** | Nested layout at `[account]/layout.tsx` eliminates tearing. |
| **XI. Bot Lifecycle & VNC Guard** | Persistent monitor button & VNC modal | **PASSED** | Shell houses bot status and VNC drawer globally. |
| **XII. Canonical @username Scoping** | Zero-flash URL routing at `/@username` | **PASSED** | Synchronous route derivation in nested layout. |
| **XIII. Global UX Laws & Form States** | Sticky Save Dock, ActivationCard, JSON store | **PASSED** | Fully codified in contracts and data models. |

---

## Project Structure

### Documentation (this feature)

```text
.specify/specs/012-unified-panel-architecture/
├── spec.md                     # Feature specification with exhaustive UX flows
├── plan.md                     # Implementation plan (this file)
├── research.md                 # Technical decisions and rationale
├── data-model.md               # Data models and state contracts
├── quickstart.md               # End-to-end verification guide
├── checklists/
│   └── requirements.md         # Quality validation checklist
└── contracts/
    ├── shell-layout-contract.md      # Shell & layout nesting hierarchy
    ├── form-state-contract.md        # Form state machine & StickySaveBar
    ├── activation-card-contract.md   # Universal ActivationCard & progressive disclosure
    └── i18n-locale-contract.md       # Centralized JSON localization & interpolation
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── layout.tsx                    # Root HTML layout (dir, lang, font variables)
│   ├── globals.css                   # Tailwind v4 theme, font-sans fallback, scrollbar styling
│   └── [account]/
│       ├── layout.tsx                # NEW: Persistent Account Workspace Layout (Server Component)
│       ├── page.tsx                  # Canonical redirect to /@{account}/comments
│       ├── comments/
│       │   ├── page.tsx              # Lightweight Comments Catalog View
│       │   └── [shortcode]/page.tsx  # Post Detail View using ActivationCard + StickySaveBar
│       └── dms/
│           ├── page.tsx              # DM Automation View using ActivationCard + StickySaveBar
│           └── logs/page.tsx         # Dedicated DM Logs View
├── components/
│   ├── layout/
│   │   ├── workspace-shell.tsx       # NEW: Persistent Client Shell (Sidebar, TopBar, Modals, Single Scroll)
│   │   ├── workspace-context.tsx     # NEW: React context for active account, bot telemetry & language
│   │   └── page-layout.tsx           # NEW: PageContainer, PageHeader, PageBody, PageFooter primitives
│   ├── ui/
│   │   ├── activation-card.tsx       # NEW: Universal toggle card with progressive disclosure
│   │   ├── sticky-save-bar.tsx       # NEW: Universal bottom dock for dirty forms with Cmd+S
│   │   ├── confirm-dialog.tsx        # NEW: Accessible modal for destructive & confirmation actions
│   │   ├── unsaved-changes-modal.tsx # NEW: Navigation guard dialog
│   │   └── sonner.tsx                # Toast provider integration
│   ├── sidebar-nav.tsx               # Updated to work inside persistent shell without unmounting
│   ├── dms/
│   │   ├── dm-automation-view.tsx    # Refactored: Stripped of duplicate sidebar/header, uses new primitives
│   │   └── dm-logs-page-view.tsx     # Refactored: Content-only view within WorkspaceShell
│   └── post-detail-view.tsx          # Refactored: Uses ActivationCard and StickySaveBar
├── locales/
│   ├── fa.json                       # NEW: Canonical Persian dictionary
│   ├── en.json                       # NEW: Complete English dictionary
│   └── ar.json                       # NEW: Complete Arabic dictionary
└── lib/
    └── i18n.ts                       # Refactored: Loads JSON assets, supports {param} interpolation
```

---

## Complexity Tracking

*No constitution violations. All designs adhere strictly to Principles I through XIII.*

| Violation | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| *None* | N/A | N/A |
