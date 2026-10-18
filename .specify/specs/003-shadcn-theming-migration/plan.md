# Implementation Plan: Migrate to shadcn/ui & Centralized Token Theming

**Branch**: `003-shadcn-theming-migration` | **Date**: 2026-10-18 | **Spec**: [spec.md](file:///Users/mahdi.ketabdar/dev/inFlow/.specify/specs/003-shadcn-theming-migration/spec.md)

**Input**: Feature specification from `.specify/specs/003-shadcn-theming-migration/spec.md`

## Summary

Migrate inFlow's user interface to a standardized, token-driven `shadcn/ui` architecture using Tailwind CSS v4. Centralize color tokens (`--primary`, `--background`, `--card`, `--border`, `--ring`) in `src/app/globals.css`, establish `components.json` for shadcn tooling, implement atomic primitives (`Button`, `Input`, `Card`, `Badge`, `Switch`, `BrandLogo`) in `src/components/ui/`, and refactor `/login`, `/`, and `/backoffice` to eliminate ad-hoc styling and rogue Vercel logos while preserving RTL/Vazirmatn standards.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+ (ESM native)

**Primary Dependencies**: Next.js 16 (App Router + Turbopack), React 19, Tailwind CSS v4, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`

**Storage**: N/A (Frontend theming and UI primitives; database unchanged)

**Testing**: Production build validation (`pnpm build`), TypeScript type checking (`tsc --noEmit`), ESLint (`pnpm lint`)

**Target Platform**: Modern desktop and mobile browsers (Chrome, Safari, Firefox, Edge)

**Project Type**: Next.js Web Application (Control Plane)

**Performance Goals**: Sub-second Turbopack compile times, zero client runtime CSS-in-JS overhead, smooth 60fps animations and transitions

**Constraints**: Authentic shadcn/ui Light Mode (pure white `#ffffff` surfaces, `#fafafa` canvas, `#e4e4e7` zinc borders, `#18181b` primary buttons), native RTL bidirectional support with Vazirmatn font, strict adherence to Constitution Principle X

**Scale/Scope**: 3 core route layouts (`/login`, `/`, `/backoffice`), 6 core UI primitives, 1 centralized stylesheet

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Principle I: SDD** | Spec-Driven Development workflow followed | **PASS** | `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md` created |
| **Principle II: Plane Isolation** | No execution bots or browser scraping in Control Plane | **PASS** | Strictly UI presentation layer changes |
| **Principle IV: Package Standards** | Use `pnpm` exclusively; no external heavy runtimes | **PASS** | Uses existing lightweight CVA / Tailwind v4 stack |
| **Principle V: RTL Typography** | BiDi support, `dir="rtl"`, Vazirmatn font | **PASS** | All primitives and layouts support RTL/LTR dynamic switching |
| **Principle X: Unified Design System** | All UI uses standardized `shadcn/ui` primitives in `src/components/ui/`; tokens in `globals.css` | **PASS** | Central objective of this implementation plan |

## Project Structure

### Documentation (this feature)

```text
.specify/specs/003-shadcn-theming-migration/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Technical research & decisions
├── data-model.md        # Token schema & component contracts
├── quickstart.md        # End-to-end verification guide
├── contracts/
│   └── ui-primitives-contract.md # UI component interfaces
└── checklists/
    └── requirements.md  # Quality validation checklist
```

### Source Code (repository root)

```text
components.json          # Standard shadcn/ui configuration
src/
├── app/
│   ├── globals.css      # Centralized CSS custom properties & theme tokens
│   ├── layout.tsx       # Root layout with Vazirmatn & Geist font definitions
│   ├── page.tsx         # Dashboard server route
│   ├── login/
│   │   └── page.tsx     # Login view migrated to shadcn primitives
│   └── backoffice/
│       └── backoffice-client.tsx # Backoffice client view migrated to primitives
└── components/
    ├── ui/
    │   ├── brand-logo.tsx # Official unified inFlow brand mark
    │   ├── button.tsx   # CVA-powered Button primitive
    │   ├── input.tsx    # Accessible Input primitive
    │   ├── textarea.tsx # Accessible Textarea primitive
    │   ├── card.tsx     # Card container primitives
    │   ├── badge.tsx    # Status Badge primitive
    │   ├── switch.tsx   # Accessible Switch toggle primitive
    │   ├── icons.tsx    # Vector icons
    │   └── primitives.tsx # Backward-compatibility re-exports
    ├── post-detail-view.tsx # Post automation editor migrated to primitives
    ├── empty-tenancy-view.tsx # Tenant zero-state view migrated to primitives
    └── inflow-dashboard.tsx # Dashboard view migrated to primitives & brand logo
```

**Structure Decision**: Standard Next.js 16 App Router structure with atomic `shadcn/ui` primitives isolated in `src/components/ui/` and tokens centralized in `globals.css`.

## Complexity Tracking

*No constitutional violations; no complex abstractions introduced.*
