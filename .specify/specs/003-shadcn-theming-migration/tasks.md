# Tasks: Migrate to shadcn/ui & Centralized Token Theming

**Feature Branch**: `003-shadcn-theming-migration`  
**Specification**: [spec.md](file:///Users/mahdi.ketabdar/dev/inFlow/.specify/specs/003-shadcn-theming-migration/spec.md)  
**Implementation Plan**: [plan.md](file:///Users/mahdi.ketabdar/dev/inFlow/.specify/specs/003-shadcn-theming-migration/plan.md)

---

## Phase 1: Setup & Configuration (Shared Infrastructure)

**Purpose**: Establish shadcn/ui configuration and centralized theme tokens in CSS.

- [x] T001 Create `components.json` at repository root with standard shadcn/ui settings for Tailwind CSS v4 and path aliases
- [x] T002 [P] Update `src/app/globals.css` with semantic CSS custom properties in `:root` and configure `@theme inline` mappings

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement atomic, accessible UI primitives in `src/components/ui/` with full RTL/Vazirmatn support.

**⚠️ CRITICAL**: No user story migration work can begin until this phase is complete.

- [x] T003 [P] Implement official brand mark component in `src/components/ui/brand-logo.tsx` with responsive sizes and typography
- [x] T004 [P] Implement CVA-powered Button primitive in `src/components/ui/button.tsx` supporting variants (`default`, `secondary`, `outline`, `ghost`, `destructive`, `brand`) and sizes
- [x] T005 [P] Implement accessible Input primitive in `src/components/ui/input.tsx` with focus-ring styling and icon support
- [x] T006 [P] Implement accessible Textarea primitive in `src/components/ui/textarea.tsx` with focus-ring styling and auto-resize support
- [x] T007 [P] Implement composite Card primitives in `src/components/ui/card.tsx` (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`)
- [x] T008 [P] Implement Badge primitive in `src/components/ui/badge.tsx` with semantic status variants
- [x] T009 [P] Implement accessible Switch toggle primitive in `src/components/ui/switch.tsx`
- [x] T010 Update `src/components/ui/primitives.tsx` to re-export new atomic components for backward compatibility during migration

**Checkpoint**: Core UI primitives ready in `src/components/ui/` - migration of pages can now proceed.

---

## Phase 3: User Story 1 - Regular Tenant Workflow & Core Dashboard (Priority: P1) 🎯 MVP

**Goal**: Modernize and unify the entire regular tenant (non-admin) experience, including post automation rules, post cards, and zero-state views.

**Independent Test**: A regular tenant logging in can navigate posts, open the automation editor, configure triggers and responses, and see a unified, polished UI driven by theme tokens.

- [x] T011 [US1] Refactor `src/app/login/page.tsx` to use standardized `Card`, `Input`, and `Button` primitives, removing raw HTML form tags and hardcoded purple styles
- [x] T012 [US1] Refactor `src/components/inflow-dashboard.tsx` post cards, filter tabs, active language switcher, and badges to consume standardized `Button`, `Badge`, `Switch`, and `Card` primitives
- [x] T013 [US1] Refactor `src/components/post-detail-view.tsx` (the core tenant automation editor) to use standardized `Card`, `Input`, `Textarea`, `Button`, `Badge`, and `Switch` primitives
- [x] T014 [US1] Refactor `src/components/empty-tenancy-view.tsx` (tenant with no accounts assigned) to use standardized `Card` and `Button` primitives

**Checkpoint**: The entire regular tenant workflow (login, dashboard cards, automation detail view, empty state) is 100% unified with token-driven primitives.

---

## Phase 4: User Story 2 - Modals, Logs & Back-Office Management (Priority: P1)

**Goal**: Standardize interactive modal dialogs and operator back-office views across the platform.

**Independent Test**: All modal dialogs (interaction logs, add post/account, agent API, user management) render with unified card backgrounds, consistent inputs, and standard action buttons.

- [x] T015 [US2] Refactor `src/components/modals/logs-modal.tsx`, `src/components/modals/create-modals.tsx`, and `src/components/modals/agent-api-modal.tsx` to use standardized `Input`, `Button`, `Badge`, and `Card` primitives
- [x] T016 [US2] Refactor `src/app/backoffice/backoffice-client.tsx` search bar, KPI cards, and user table action buttons to use standardized `Input`, `Button`, and `Card` primitives
- [x] T017 [US2] Refactor `src/components/backoffice/create-user-modal.tsx` and `src/components/backoffice/assign-accounts-modal.tsx` to use standardized `Input`, `Button`, and `Card` primitives

**Checkpoint**: All modals and administrative views across both tenant and back-office planes are completely migrated.

---

## Phase 5: User Story 3 - Official inFlow Brand Mark & Header Consistency (Priority: P2)

**Goal**: Unify the visual brand identity across all navigation headers, eliminating rogue Vercel triangle logos.

**Independent Test**: Verify that `/login`, `/`, and `/backoffice` feature the identical inFlow official brand mark and consistent header height.

- [x] T018 [US3] Replace Vercel triangle logo (`▲`) in `src/components/inflow-dashboard.tsx` header with the standardized `<BrandLogo size="sm" />`
- [x] T019 [US3] Update `src/app/login/page.tsx` header to consume `<BrandLogo size="default" />`
- [x] T020 [US3] Update `src/app/backoffice/backoffice-client.tsx` header to integrate `<BrandLogo size="sm" />` alongside the back navigation

**Checkpoint**: Official inFlow branding is uniform across all screens.

---

## Phase 6: Polish, Verification & Quality Gates

**Purpose**: Validate cross-cutting concerns, bidirectional RTL switching, and production build compliance.

- [x] T021 [P] Validate dynamic RTL/LTR direction switching and Persian Vazirmatn rendering across all newly migrated components (including post detail editor and textareas)
- [x] T022 Run full production build (`pnpm build`) and linting (`pnpm lint`) to verify zero TypeScript or styling errors
- [x] T023 Run end-to-end scenarios documented in `quickstart.md` to confirm token propagation and visual fidelity across tenant and admin views

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion — blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion (Tenant experience & MVP).
- **User Story 2 (Phase 4)**: Depends on Phase 2 completion (Modals & Back-Office).
- **User Story 3 (Phase 5)**: Depends on Phase 2 completion (Headers & Branding).
- **Polish (Phase 6)**: Depends on all user story phases being complete.

### Parallel Opportunities

- T002 (`globals.css`) can proceed in parallel with T001 (`components.json`).
- T003 through T009 (independent UI primitives) can be developed concurrently in separate files under `src/components/ui/`.
- T021 can run as soon as US1 and US3 are implemented.
