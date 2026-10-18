# Implementation Plan: Sidebar Navigation, Topbar Decluttering & Deep Linking

**Branch**: `004-sidebar-nav-deep-linking` | **Date**: 2026-10-18 | **Spec**: [spec.md](file:///Users/mahdi.ketabdar/dev/inFlow/.specify/specs/004-sidebar-nav-deep-linking/spec.md)

**Input**: Feature specification from `.specify/specs/004-sidebar-nav-deep-linking/spec.md`

## Summary

Refactor inFlow's dashboard layout from an overcrowded top header to a modern SaaS App Shell featuring a dedicated Sidebar Navigation on desktop with an accessible slide-over drawer on mobile. Implement URL deep linking and history state synchronization using Next.js App Router search parameters (`?post={shortcode}`), ensuring page refreshes and browser back/forward buttons seamlessly persist the active post detail view. Relocate the catalog view mode toggle (Cards vs. Grid) into the content toolbar next to search/filters, completely remove manual post registration controls in favor of automated Instagram Sync, and introduce a unified, compact Language Dropdown Menu shared identically between the dashboard, back-office, and login views.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+ (ESM native)

**Primary Dependencies**: Next.js 16 (App Router + Turbopack), React 19, Tailwind CSS v4, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`

**Storage**: N/A (State is driven by URL query parameters and local storage for language preference; database models remain unchanged)

**Testing**: Production build validation (`pnpm build`), TypeScript type checking (`tsc --noEmit`), ESLint validation (`pnpm lint`)

**Target Platform**: Modern desktop and mobile browsers (Chrome, Safari, Firefox, Edge)

**Project Type**: Next.js Web Application (Control Plane)

**Performance Goals**: Instantaneous URL shallow synchronization with zero unnecessary network re-fetches, 60fps mobile drawer animations, zero layout shift (CLS = 0)

**Constraints**: Strict adherence to shadcn/ui Light Mode standards (Constitution Principle X), native RTL typography with Vazirmatn font (Constitution Principle V), multi-tenant account isolation (Constitution Principle VI)

**Scale/Scope**: 1 unified App Shell, 1 reusable Language Dropdown, 1 refactored Dashboard view, 1 updated Login view

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Principle I: SDD** | Spec-Driven Development workflow followed | **PASS** | `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md` created |
| **Principle II: Plane Isolation** | No execution bots or browser scraping in Control Plane | **PASS** | Strictly frontend layout, routing, and UI presentation changes |
| **Principle III: Idempotency** | Guard comment and automation locks | **PASS** | No changes to backend idempotency locks or API contracts |
| **Principle IV: Package Standards** | Use `pnpm` exclusively; no external heavy runtimes | **PASS** | Uses existing lightweight React / Tailwind / Lucide stack |
| **Principle V: RTL Typography** | BiDi support, `dir="rtl"`, Vazirmatn font | **PASS** | Sidebar naturally flips to right edge in RTL and left in LTR; all typography in Vazirmatn |
| **Principle VI: Multi-Tenant** | Scoped user account ownership | **PASS** | Sidebar account switcher respects tenant assigned accounts; switching accounts resets stale post params |
| **Principle X: Unified Design System** | All UI uses standardized `shadcn/ui` primitives in `src/components/ui/`; tokens in `globals.css` | **PASS** | Light mode standard (`#ffffff` surfaces, `#fafafa` canvas, `#e4e4e7` zinc borders, `#18181b` primary buttons) strictly preserved |

## Project Structure

### Documentation (this feature)

```text
.specify/specs/004-sidebar-nav-deep-linking/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Technical research & decisions (Phase 0)
├── data-model.md        # State schema & transitions (Phase 1)
├── quickstart.md        # End-to-end verification guide (Phase 1)
├── contracts/
│   ├── app-shell-contract.md       # Sidebar and header component contracts
│   └── language-dropdown-contract.md # Language dropdown specification
└── checklists/
    └── requirements.md  # Quality validation checklist
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── layout.tsx       # Root layout with Vazirmatn font & direction handling
│   ├── page.tsx         # Dashboard route wrapped in Suspense boundary for useSearchParams
│   └── login/
│       └── page.tsx     # Migrated to unified LanguageDropdown component
├── components/
│   ├── ui/
│   │   ├── language-dropdown.tsx # NEW: Unified compact language switcher menu
│   │   ├── brand-logo.tsx        # inFlow official brand mark
│   │   ├── button.tsx            # shadcn/ui button primitive
│   │   ├── card.tsx              # shadcn/ui card primitive
│   │   └── primitives.tsx        # Standard primitives
│   ├── sidebar-nav.tsx           # NEW: Dedicated desktop & mobile sidebar navigation
│   ├── inflow-dashboard.tsx      # REFACTORED: App Shell, URL searchParams syncing, content toolbar
│   └── modals/
│       ├── agent-api-modal.tsx   # Hermes API modal (triggered from sidebar)
│       └── create-modals.tsx     # AddAccountModal retained; AddPostModal removed
```

**Structure Decision**: Standard Next.js 16 App Router structure with dedicated navigation shell components (`sidebar-nav.tsx`), centralized language dropdown primitive (`language-dropdown.tsx`), and clean query-parameter state management in `inflow-dashboard.tsx`.

## Complexity Tracking

*No constitutional violations; no complex abstractions introduced.*
