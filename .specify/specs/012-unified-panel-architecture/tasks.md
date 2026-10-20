# Tasks: Unified Panel Architecture, Shell & Global UX Design System

**Input**: Design documents from [`.specify/specs/012-unified-panel-architecture/`](./)  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)  
**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story mapping (`[US1]`, `[US2]`, `[US4]`, `[US5]`)
- Every task includes explicit file paths

---

## Phase 1: Setup (Dependencies & Theme Foundation)

**Purpose**: Project initialization, CSS variables, and directory structure

- [x] T001 Install `sonner` package for unified toast notifications via `package.json`
- [x] T002 [P] Update `src/app/globals.css` with `@utility font-vazir`, global `--font-sans` Vazirmatn tokens, and sleek zinc scrollbar rules
- [x] T003 [P] Create localization directory and initial schema files in `src/locales/fa.json`, `src/locales/en.json`, and `src/locales/ar.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core UI primitives, form contracts, and layout components required by all user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Implement JSON locale loader and dynamic parameter interpolation utility `t(key, params)` in `src/lib/i18n.ts`
- [x] T005 [P] Create layout primitives `PageContainer`, `PageHeader`, `PageBody`, `PageFooter` in `src/components/layout/page-layout.tsx`
- [x] T006 [P] Create `WorkspaceContext` provider in `src/components/layout/workspace-context.tsx` managing active account, profile, language, and dirty navigation state
- [x] T007 [P] Create universal `ActivationCard` component with progressive disclosure support in `src/components/ui/activation-card.tsx`
- [x] T008 [P] Create universal `StickySaveBar` component in `src/components/ui/sticky-save-bar.tsx`
- [x] T009 [P] Create `UnsavedChangesModal` navigation guard in `src/components/ui/unsaved-changes-modal.tsx`
- [x] T010 [P] Create accessible `ConfirmDialog` primitive for destructive actions in `src/components/ui/confirm-dialog.tsx`
- [x] T011 [P] Create `SonnerToaster` component with RTL direction and Vazirmatn font styling in `src/components/ui/sonner.tsx`

**Checkpoint**: Foundation ready - UI primitives, form docks, and layout contracts are available for story implementation.

---

## Phase 3: User Story 1 - Unified Workspace Shell & Seamless Navigation (Priority: P1) 🎯 MVP

**Goal**: Persistent workspace shell (`WorkspaceShell`) hosting sidebar navigation, topbar, single scroll container, and global bot modals across all `/@[account]/*` routes with zero layout shift and zero unmounting.

**Independent Test**: Navigate to `/@r9spoort1/comments`, switch to `/@r9spoort1/dms`, and verify the sidebar, topbar, and bot monitor drawer remain mounted without remounting, flickering, or repeating database queries.

### Implementation for User Story 1

- [x] T012 [US1] Create persistent `WorkspaceShell` client component in `src/components/layout/workspace-shell.tsx` hosting `SidebarNav`, TopBar, Bot telemetry drawer, VNC viewer modal, Toaster, and single scroll container
- [x] T013 [US1] Create nested layout `src/app/[account]/layout.tsx` (Server Component) with authentication guard, account authorization check, database queries, and 404/unauthorized error states
- [x] T014 [US1] Refactor `src/components/sidebar-nav.tsx` to integrate with `WorkspaceContext` without local drawer duplication
- [x] T015 [US1] Refactor `src/app/[account]/comments/page.tsx` to strip redundant layout wrappers and render inside `WorkspaceShell`
- [x] T016 [US1] Refactor `src/app/[account]/dms/page.tsx` to strip duplicate sidebar, topbar, and drawer wrappers
- [x] T017 [US1] Refactor `src/app/[account]/dms/logs/page.tsx` to render pure content inside `WorkspaceShell`

**Checkpoint**: User Story 1 complete! Persistent shell boundary is active across all account routes with zero-flash tab switching.

---

## Phase 4: User Story 2 & 3 - Universal Activation Card, Form Lifecycle & Sticky Save Dock (Priority: P1)

**Goal**: Standardize activation toggle cards and provide a floating sticky save dock with `Cmd+S` / `Ctrl+S` shortcuts and unsaved changes navigation protection across Comments and DMs.

**Independent Test**: Modify any setting in Post Detail or DM Automation; verify the bottom Sticky Save Dock surfaces, `Cmd+S` saves the form with spinner/checkmark, and navigating away with dirty changes prompts the confirmation guard.

### Implementation for User Stories 2 & 3

- [x] T018 [US2] Create `useFormState` custom hook in `src/lib/use-form-state.ts` providing dirty detection, reset, submit lifecycle, and `beforeunload` registration
- [x] T019 [US2] Refactor `PostDetailView` in `src/components/post-detail-view.tsx` to use `ActivationCard`, progressive disclosure, `StickySaveBar`, and `useFormState`
- [x] T020 [US2] Refactor `DmAutomationView` in `src/components/dms/dm-automation-view.tsx` to use `ActivationCard`, progressive disclosure, and `StickySaveBar`
- [x] T021 [US2] Replace ad-hoc local `toastMsg` and `syncAlert` states in `src/components/post-detail-view.tsx` and `src/components/dms/dm-automation-view.tsx` with global `sonner` toasts
- [x] T022 [US2] Connect `UnsavedChangesModal` in `src/components/layout/workspace-shell.tsx` to intercept sidebar and account-switcher navigation when `isDirty === true`

**Checkpoint**: User Stories 2 & 3 complete! Form save workflows, progressive disclosure, and navigation guards are 100% harmonized.

---

## Phase 5: User Story 4 - Centralized Multi-Language JSON Architecture & Key Parity (Priority: P2)

**Goal**: Extract 100% of user-facing copy into `fa.json`, `en.json`, and `ar.json` with dynamic `{paramName}` substitution, standardized terminology, and automated parity testing.

**Independent Test**: Run parity validation test; switch language between FA, EN, and AR to verify instant translation updates without page reload.

### Implementation for User Story 4

- [x] T023 [US4] Extract all Persian strings into `src/locales/fa.json` according to the Terminology Dictionary
- [x] T024 [P] [US4] Translate and mirror all keys in `src/locales/en.json`
- [x] T025 [P] [US4] Translate and mirror all keys in `src/locales/ar.json`
- [x] T026 [US4] Create automated test script `tests/i18n-parity.test.ts` to verify 100% key parity across `fa.json`, `en.json`, and `ar.json`
- [x] T027 [US4] Add npm script `"test:i18n": "tsx tests/i18n-parity.test.ts"` in `package.json`

**Checkpoint**: User Story 4 complete! All translations reside in JSON files with guaranteed 100% key parity.

---

## Phase 6: User Story 5 - Single Scroll Container, Typography & BiDi Isolation (Priority: P2)

**Goal**: Eliminate double scrollbars, establish predictable left/right scrollbar alignment matching language direction, and wrap Latin terms/usernames in `<bdi>`.

**Independent Test**: Scroll through views in Persian (scrollbar on left) and English (scrollbar on right); verify no window double scrollbars exist and Vazirmatn is consistently applied.

### Implementation for User Story 5

- [x] T028 [US5] Verify and enforce single scroll container on `WorkspaceShell` content viewport and lock outer window scroll in `src/components/layout/workspace-shell.tsx`
- [x] T029 [US5] Wrap Instagram handles (`@username`), technical tokens (`AI`, `DM`, `MCP`, `API`), and dynamic counts in `<bdi>` in `src/components/sidebar-nav.tsx`, `src/components/post-detail-view.tsx`, and `src/components/dms/dm-automation-view.tsx`
- [x] T030 [US5] Update `LanguageDropdown` in `src/components/ui/language-dropdown.tsx` to dynamically toggle root `dir` and persist selection in cookies/localStorage

**Checkpoint**: User Story 5 complete! Single scroll container and bidirectional typography rendering are flawless.

---

## Phase 7: Polish & Cross-Cutting Verification

**Purpose**: Quality gates, linting, build checks, and end-to-end verification

- [x] T031 Run ESLint validation across all modified files via `pnpm lint`
- [x] T032 Execute production build (`pnpm build`) to verify Turbopack bundling and Server/Client boundaries
- [x] T033 Execute `quickstart.md` validation scenarios (persistent shell, single scroll, dirty save dock, i18n parity)

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: No dependencies - starts immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion - BLOCKS all user stories.
- **User Story 1 (Phase 3 - MVP)**: Depends on Phase 2 - Establishes the persistent shell boundary.
- **User Story 2 & 3 (Phase 4)**: Depends on Phase 3 completion - Integrates form docks and toggles into the shell.
- **User Story 4 (Phase 5)**: Depends on Phase 2 completion - Can proceed in parallel with US1/US2.
- **User Story 5 (Phase 6)**: Depends on Phase 3 and Phase 5 completion.
- **Polish (Phase 7)**: Depends on all user stories being complete.

### Parallel Opportunities
- **Phase 1**: T002 and T003 can run in parallel.
- **Phase 2**: T005, T006, T007, T008, T009, T010, T011 can all be implemented in parallel once T004 is defined.
- **Phase 5**: T024 (`en.json`) and T025 (`ar.json`) can run in parallel once T023 (`fa.json`) is populated.

---

## Implementation Strategy: MVP First

1. **Step 1**: Complete Setup (Phase 1) + Foundational (Phase 2) → UI primitives & form docks ready.
2. **Step 2**: Implement User Story 1 (Phase 3) → **MVP Milestone**: Persistent `WorkspaceShell` active; tab transitions are zero-flash.
3. **Step 3**: Implement User Stories 2 & 3 (Phase 4) → `ActivationCard` + `StickySaveBar` active in Comments and DMs.
4. **Step 4**: Implement User Story 4 (Phase 5) → JSON localization and parity test verified.
5. **Step 5**: Implement User Story 5 (Phase 6) → Single scrollbar and BiDi isolation verified.
6. **Step 6**: Execute Phase 7 (ESLint, `pnpm build`, Quickstart validation).
