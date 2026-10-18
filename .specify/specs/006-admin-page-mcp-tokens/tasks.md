# Implementation Tasks: Admin Page Management, Dedicated Per-Page Tokens & Hermes MCP Configuration

**Feature Branch**: `006-admin-page-mcp-tokens`
**Status**: Completed
**Spec**: [.specify/specs/006-admin-page-mcp-tokens/spec.md](file:///Users/mahdi.ketabdar/dev/inFlow/.specify/specs/006-admin-page-mcp-tokens/spec.md)
**Plan**: [.specify/specs/006-admin-page-mcp-tokens/plan.md](file:///Users/mahdi.ketabdar/dev/inFlow/.specify/specs/006-admin-page-mcp-tokens/plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Multi-language localization and design token readiness

- [X] T001 Initialize feature localization and register comprehensive translation strings in `src/lib/i18n.ts` for Persian (FA), English (EN), and Arabic (AR) covering page management, token generation, Hermes MCP config modals, and tenancy assignment.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database functions and Superadmin authorization guards that MUST be complete before user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Implement database query functions in `src/lib/db.ts` for minimalist account registration, automatic `account_bot_bindings` token generation, token regeneration, account assignment, and backoffice account queries.
- [X] T003 [P] Verify and export Superadmin role guard helper in `src/lib/auth.ts` to strictly validate session role before executing administrative Back-Office mutations.

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Minimalist Page Registration & Dedicated Token Generation (Priority: P1) 🎯 MVP

**Goal**: Superadmins can register a new Instagram page simply by typing its handle/ID, automatically generating a dedicated `inf_...` token and `account_bot_bindings` record.

**Independent Test**: Login as Superadmin, submit a new Instagram handle in Back-Office, and verify the page and token are immediately created in SQLite without requiring external scraping.

### Implementation for User Story 1

- [X] T004 [US1] Create Back-Office Accounts API endpoint in `src/app/api/backoffice/accounts/route.ts` supporting `GET` (list all accounts with binding/owner details) and `POST` (create minimalist page by username with auto-generated token).
- [X] T005 [P] [US1] Create minimalist page creation dialog in `src/components/backoffice/create-account-modal.tsx` with Instagram handle input, optional user assignment dropdown, regex validation, and RTL styling.
- [X] T006 [US1] Create `src/components/backoffice/account-table.tsx` to display registered pages, minimalist status, assigned tenant, bot profile ID, and action triggers adhering to shadcn/ui Light Mode.
- [X] T007 [US1] Integrate the "Pages & Hermes MCP" tab, statistics badges, and creation modal into `src/app/backoffice/backoffice-client.tsx`.

**Checkpoint**: At this point, User Story 1 is fully functional and testable independently (MVP delivered!).

---

## Phase 4: User Story 2 - Hermes MCP Configuration Snippet & Token Management (Priority: P1)

**Goal**: Superadmin can view, copy, or regenerate the page's dedicated API token and copy a ready-to-use Hermes MCP client configuration block directly from the Back-Office UI.

**Independent Test**: Open the "Hermes MCP Config" dialog for any page, verify masked token and 1-click copy, verify rendered JSON config is valid for Hermes, and test token regeneration to verify instant invalidation.

### Implementation for User Story 2

- [X] T008 [US2] Implement token inspection and regeneration API endpoint in `src/app/api/backoffice/accounts/[username]/token/route.ts` supporting `GET` (return token & pre-rendered Hermes MCP config) and `POST` (rotate token and revoke previous one).
- [X] T009 [P] [US2] Create Hermes MCP configuration modal in `src/components/backoffice/hermes-mcp-modal.tsx` displaying the masked token, visibility toggle, 1-click clipboard copy, token regeneration confirmation, and copyable Hermes `mcpServers` JSON block.
- [X] T010 [US2] Wire "Hermes MCP Config" action button in `src/components/backoffice/account-table.tsx` to open `hermes-mcp-modal.tsx`.
- [X] T011 [US2] Enforce per-page Bearer token authentication in `src/app/api/agent/poll/route.ts` and `src/app/api/mcp/route.ts` ensuring inbound requests validate `account_bot_bindings.api_token` for the requested account.

**Checkpoint**: At this point, User Stories 1 and 2 are fully functional and integrated.

---

## Phase 5: User Story 3 - Page Assignment & Tenancy Ownership Management (Priority: P2)

**Goal**: Superadmin can assign or reassign registered pages to tenant users, enforcing strict 1-to-N ownership.

**Independent Test**: Assign an unassigned page to a tenant in Back-Office, verify the page appears in that tenant's account switcher, reassign it to another tenant, and verify access transfers cleanly.

### Implementation for User Story 3

- [X] T012 [US3] Implement page assignment API endpoint in `src/app/api/backoffice/accounts/[username]/assignment/route.ts` supporting `PUT` to link or unassign a page to a `user_id`.
- [X] T013 [P] [US3] Implement page deletion API endpoint in `src/app/api/backoffice/accounts/[username]/route.ts` supporting `DELETE` with cascade deletion of bindings.
- [X] T014 [US3] Add quick-assign dropdown or modal trigger in `src/components/backoffice/account-table.tsx` allowing instant reassignment of any page.
- [X] T015 [US3] Update existing `src/components/backoffice/assign-accounts-modal.tsx` to reflect newly registered minimalist pages and show their assignment status.

**Checkpoint**: Tenancy ownership and assignment workflow is complete and verifiable.

---

## Phase 6: User Story 4 - Strict Zero-Technical-Leakage for Standard Tenants (Priority: P1)

**Goal**: Guarantee that standard tenant users never see API tokens, MCP settings, or execution-plane agent internals anywhere in the UI or client-side payloads.

**Independent Test**: Login as a standard tenant, inspect dashboard and network traffic, verify zero tokens/MCP configs appear, and verify attempting to access `/backoffice` returns 403 or redirects to `/`.

### Implementation for User Story 4

- [X] T016 [US4] Audit and sanitize tenant endpoints in `src/app/api/accounts/route.ts` and `src/app/api/auth/me/route.ts` to guarantee `api_token` and `account_bot_bindings` are completely omitted from tenant responses.
- [X] T017 [US4] Enforce role-based redirection in `src/app/backoffice/page.tsx` and middleware to ensure non-superadmins are immediately redirected to `/`.
- [X] T018 [US4] Verify dashboard views (`src/app/page.tsx`, account switcher, settings) contain zero technical/MCP leakage for standard tenants.

**Checkpoint**: Zero-technical-leakage security boundary is mathematically and visually airtight.

---

## Phase 7: User Story 5 - Lazy Profile Metadata Enrichment by Worker Agent (Priority: P3)

**Goal**: Allow execution workers presenting a valid page token to supply updated profile metadata during routine polling or sync cycles.

**Independent Test**: Send a sync payload with updated profile fields using the page's token, and verify that the page's display name, bio, and avatar update automatically.

### Implementation for User Story 5

- [X] T019 [US5] Update `POST /api/sync/route.ts` and `inflow_push_scraped_posts` tool in `src/app/api/mcp/route.ts` to accept optional profile metadata (`display_name`, `avatar_url`, `bio`, `followers_text`) and update the `accounts` record in `data/inflow.db`.
- [X] T020 [US5] Verify that updated metadata displays seamlessly in the dashboard header, account switcher, and Back-Office account table without requiring manual entry.

**Checkpoint**: Lazy profile enrichment cycle is operational.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Design system verification, RTL typography, and end-to-end validation

- [X] T021 [P] Verify strict compliance with Constitution Principle X (shadcn/ui Light Mode, pure white `#ffffff` cards, `#fafafa` canvas, `#e4e4e7` borders, `#18181b` primary buttons) across all new Back-Office modals and tables.
- [X] T022 [P] Verify native RTL alignment, Vazirmatn font styling, and proper bidirectional punctuation/code block isolation in all new Back-Office components per Constitution Principle V.
- [X] T023 Run end-to-end quickstart validation scenarios from `.specify/specs/006-admin-page-mcp-tokens/quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
  - User Story 1 (P1 - MVP)
  - User Story 2 (P1)
  - User Story 3 (P2)
  - User Story 4 (P1)
  - User Story 5 (P3)
- **Polish (Phase 8)**: Depends on all desired user stories being complete.

### Parallel Opportunities

- Within Phase 2: T002 and T003 can run in parallel.
- Within Phase 3 (US1): T005 and T006 can run in parallel once T004 is defined.
- Within Phase 4 (US2): T008 and T009 can proceed in parallel.
- Within Phase 5 (US3): T012 and T013 can proceed in parallel.
- Within Phase 8: T021 and T022 can proceed in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1 (Localization setup)
2. Complete Phase 2 (Foundational database helpers & guards)
3. Complete Phase 3 (User Story 1 - Minimalist Page Registration & Table)
4. Validate MVP: Superadmin can create a page by handle and see it in the Back-Office table with an auto-generated token!

### Incremental Delivery
1. Foundation + US1 (MVP) -> Minimalist page onboarding.
2. US2 -> Hermes MCP config modal + 1-click copy + token rotation.
3. US3 -> Page assignment & tenancy management.
4. US4 -> Zero-leakage verification.
5. US5 -> Lazy profile enrichment by agent.
6. Polish -> Design tokens & RTL verification.
