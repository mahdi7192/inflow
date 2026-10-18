# Tasks: Sidebar Navigation, Topbar Decluttering & Deep Linking

**Feature**: Sidebar Navigation, Topbar Decluttering & Deep Linking
**Branch**: `004-sidebar-nav-deep-linking`
**Date**: 2026-10-18
**Spec**: [spec.md](file:///Users/mahdi.ketabdar/dev/inFlow/.specify/specs/004-sidebar-nav-deep-linking/spec.md) | **Plan**: [plan.md](file:///Users/mahdi.ketabdar/dev/inFlow/.specify/specs/004-sidebar-nav-deep-linking/plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, directory structure, and foundational UI components.

- [X] T001 [P] Initialize Feature 004 tracking and verify clean working tree in `.specify/specs/004-sidebar-nav-deep-linking/`
- [X] T002 [P] Create reusable `LanguageDropdown` component structure in `src/components/ui/language-dropdown.tsx` per contract `contracts/language-dropdown-contract.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core application routing and layout primitives that MUST be completed before user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Wrap `InflowDashboard` in a React `<Suspense>` boundary in `src/app/page.tsx` to enable client-side search parameter parsing for deep-linking
- [X] T004 [P] Verify and update RTL/LTR direction helper in `src/lib/i18n.ts` to support smooth document direction flipping

**Checkpoint**: Foundation ready — user story implementation can now proceed.

---

## Phase 3: User Story 1 - Clean Sidebar Navigation Shell (Priority: P1) 🎯 MVP

**Goal**: Deliver a dedicated Sidebar Navigation on the reading edge for desktop screens with a mobile slide-over drawer, relocating account switching, sync, worker modal access, and logout from the overcrowded top header.

**Independent Test**: Load the dashboard on a desktop screen (>=1024px); confirm persistent sidebar contains brand logo, account switcher dropdown, navigation links, sync button, and user footer. Resize to mobile (<1024px); confirm sidebar collapses into a drawer toggled by the header menu button.

### Implementation for User Story 1

- [X] T005 [P] [US1] Create `SidebarNav` component in `src/components/sidebar-nav.tsx` implementing `SidebarNavProps` per `contracts/app-shell-contract.md`
- [X] T006 [US1] Integrate `SidebarNav` and mobile drawer into `src/components/inflow-dashboard.tsx` with responsive layout wrapper (`flex flex-col lg:flex-row min-h-screen`)
- [X] T007 [US1] Declutter top header bar in `src/components/inflow-dashboard.tsx`, removing redundant buttons and keeping only minimal title/context and mobile drawer toggle

**Checkpoint**: User Story 1 is fully functional as a clean, responsive App Shell on desktop and mobile.

---

## Phase 4: User Story 2 - URL Deep-Linking & State Persistence for Post Selection (Priority: P1)

**Goal**: Synchronize selected post state with URL query parameter `?post={shortcode}`, ensuring page refresh (F5 / Cmd+R), direct link sharing, and browser back/forward buttons seamlessly persist the active post configuration view.

**Independent Test**: Click any post card; verify browser URL updates to `?post={shortcode}`. Refresh the browser; verify the page reloads directly into the post detail view. Click "بازگشت" or browser Back; verify URL resets and catalog list displays.

### Implementation for User Story 2

- [X] T008 [US2] Implement URL search parameter reader and updater (`useSearchParams`, `useRouter`, `usePathname`) in `src/components/inflow-dashboard.tsx` to drive `selectedShortcode`
- [X] T009 [US2] Update post selection click handler in `src/components/inflow-dashboard.tsx` to push `?post={shortcode}` into the URL history
- [X] T010 [US2] Update `PostDetailView` back navigation in `src/components/post-detail-view.tsx` and `src/components/inflow-dashboard.tsx` to clear `?post` from URL on return
- [X] T011 [US2] Add invalid/missing shortcode fallback handling in `src/components/inflow-dashboard.tsx` to gracefully return to the catalog if a non-existent shortcode is provided in the URL

**Checkpoint**: User Stories 1 AND 2 are both fully functional and URL navigation is preserved across browser refreshes.

---

## Phase 5: User Story 3 - Unified Language Switcher Menu (Priority: P2)

**Goal**: Standardize language selection to a compact dropdown showing only the active language, used identically on both the dashboard and the login page.

**Independent Test**: Inspect the language selector on `/` and `/login`; verify both use the compact `LanguageDropdown` showing only the active language (e.g. "فارسی") and opening a menu on click.

### Implementation for User Story 3

- [X] T012 [P] [US3] Implement full dropdown menu, active checkmark, and click-outside handler in `src/components/ui/language-dropdown.tsx`
- [X] T013 [US3] Integrate `LanguageDropdown` into the dashboard top header in `src/components/inflow-dashboard.tsx`
- [X] T014 [P] [US3] Integrate `LanguageDropdown` into the login view in `src/app/login/page.tsx`, replacing the old three-button strip
- [X] T015 [P] [US3] Integrate `LanguageDropdown` into the back-office client header in `src/app/backoffice/backoffice-client.tsx` for platform-wide consistency

**Checkpoint**: Language selection is visually identical, compact, and unified across the entire platform.

---

## Phase 6: User Story 4 - Content Toolbar View Mode Toggle & Manual Post Creation Removal (Priority: P2)

**Goal**: Relocate the Cards/Grid view mode toggle into the content toolbar next to search/filters, and completely remove manual post/reel registration controls.

**Independent Test**: Check the catalog toolbar above posts; verify Cards/Grid toggle is located next to filter tabs and search. Check header and sidebar; verify "ثبت پست / ریلز" button and modal are completely absent.

### Implementation for User Story 4

- [X] T016 [US4] Relocate the view mode toggle (`LayoutGrid` and `List`) from top bar into the content filter toolbar in `src/components/inflow-dashboard.tsx`
- [X] T017 [US4] Remove `AddPostModal` state, import, and "ثبت پست / ریلز" trigger button from `src/components/inflow-dashboard.tsx`
- [X] T018 [P] [US4] Clean up unused `AddPostModal` exports in `src/components/modals/create-modals.tsx` while preserving `AddAccountModal`

**Checkpoint**: Content controls are unified in the catalog toolbar, and manual post creation is eliminated.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end verification, type checks, build validation, and design compliance.

- [X] T019 Validate RTL/LTR dynamic flipping and Vazirmatn font styling across all viewport sizes in `src/app/globals.css` and `src/components/sidebar-nav.tsx`
- [X] T020 Execute full quickstart validation scenarios from `.specify/specs/004-sidebar-nav-deep-linking/quickstart.md`
- [X] T021 Run TypeScript verification (`tsc --noEmit`), ESLint (`pnpm lint`), and production build (`pnpm build`) to ensure zero errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories.
- **User Stories (Phases 3–6)**: Depend on Foundational phase completion.
  - User Story 1 (P1) and User Story 2 (P1) form the core MVP.
  - User Story 3 (P2) and User Story 4 (P2) can proceed sequentially or in parallel.
- **Polish (Phase 7)**: Depends on completion of all user story phases.

### User Story Dependencies

- **User Story 1 (P1)**: Can start immediately after Foundational. Delivers the App Shell structure.
- **User Story 2 (P1)**: Depends on `src/app/page.tsx` `<Suspense>` boundary from Foundational. Implements deep-linking on top of US1.
- **User Story 3 (P2)**: Depends on `LanguageDropdown` component from Phase 1.
- **User Story 4 (P2)**: Modifies `inflow-dashboard.tsx` content toolbar and cleans up modal imports.

---

## Parallel Opportunities

- `T001` and `T002` can execute in parallel.
- `T004` can execute in parallel with `T003`.
- `T005` (creating `SidebarNav`) can execute independently before integrating with `inflow-dashboard.tsx` in `T006`.
- `T012`, `T014`, and `T015` can execute in parallel across different files.
- `T018` can execute in parallel with `T016`.

---

## Implementation Strategy

### MVP First (Phases 1, 2, and 3)
1. Complete Setup (`T001`, `T002`) and Foundational (`T003`, `T004`).
2. Complete User Story 1 (`T005`–`T007`) to deliver the clean desktop sidebar and mobile drawer.
3. Validate independent test for User Story 1.

### Incremental Delivery
1. Add User Story 2 (`T008`–`T011`) → verify URL updates and page refresh persistence.
2. Add User Story 3 (`T012`–`T015`) → verify unified language dropdown on `/` and `/login`.
3. Add User Story 4 (`T016`–`T018`) → verify content toolbar view toggle and removal of manual post registration.
4. Execute Polish phase (`T019`–`T021`) → verify build, lint, and quickstart scenarios.
