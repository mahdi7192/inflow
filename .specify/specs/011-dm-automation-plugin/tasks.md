# Tasks: Direct Message (DM) Automation Plugin with Knowledge & MCP Context

**Input**: Design documents from `.specify/specs/011-dm-automation-plugin/`  
**Prerequisites**: [plan.md](file:///Users/mahdi.ketabdar/dev/inFlow/.specify/specs/011-dm-automation-plugin/plan.md), [spec.md](file:///Users/mahdi.ketabdar/dev/inFlow/.specify/specs/011-dm-automation-plugin/spec.md), [data-model.md](file:///Users/mahdi.ketabdar/dev/inFlow/.specify/specs/011-dm-automation-plugin/data-model.md), [contracts/](file:///Users/mahdi.ketabdar/dev/inFlow/.specify/specs/011-dm-automation-plugin/contracts/), [research.md](file:///Users/mahdi.ketabdar/dev/inFlow/.specify/specs/011-dm-automation-plugin/research.md), [quickstart.md](file:///Users/mahdi.ketabdar/dev/inFlow/.specify/specs/011-dm-automation-plugin/quickstart.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish data models, TypeScript interfaces, and internationalization dictionary.

- [x] T001 Register DM Automation internationalization keys and Persian/English copy in `src/lib/i18n.ts`
- [x] T002 [P] Define TypeScript interfaces for `DMAutomationRow`, `DMLogRow`, and API payloads in `src/lib/db.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database tables, indices, and backend REST endpoints that MUST be ready before UI components or agent polling can interact.

- [x] T003 Implement SQLite schema migrations for `dm_automations` and `dm_logs` tables with unique constraint indexes in `src/lib/db.ts`
- [x] T004 [P] Implement REST endpoint `GET /api/accounts/[username]/dm-automation` in `src/app/api/accounts/[username]/dm-automation/route.ts`
- [x] T005 [P] Implement REST endpoint `POST /api/accounts/[username]/dm-automation` for configuration updates and instant toggle in `src/app/api/accounts/[username]/dm-automation/route.ts`
- [x] T006 [P] Implement REST endpoints `GET` and `POST /api/accounts/[username]/dm-logs` with atomic `message_id` unique locking in `src/app/api/accounts/[username]/dm-logs/route.ts`
- [x] T007 Extend worker polling endpoint in `src/app/api/agent/poll/route.ts` to return `dm_automation` configuration and recent `processed_dm_ids`

**Checkpoint**: Core foundation ready — database tables and REST/polling endpoints are live.

---

## Phase 3: User Story 1 - DM Automation Configuration & Instant Master Toggle (Priority: P1) 🎯 MVP

**Goal**: Deliver a dedicated workspace view at `/@{username}/dms` with an instant, real-time master toggle featuring optimistic auto-save and toast feedback, plus seamless sidebar navigation.

**Independent Test**: Navigate to `/@{username}/dms`, flip the master switch ON/OFF, observe immediate toast confirmation and verify `enabled` state in SQLite with zero manual "Save Changes" requirement.

- [x] T008 [US1] Update root route `/` in `src/app/page.tsx` to redirect unauthenticated users to `/login` and authenticated users directly to their active account's primary workspace
- [x] T009 [P] [US1] Add plugin navigation items for Comment Automation and Direct Message Automation in `src/components/sidebar-nav.tsx`
- [x] T010 [P] [US1] Implement instant Master Toggle component with optimistic state update and toast notifications in `src/components/dms/dm-header-toggle.tsx`
- [x] T011 [US1] Create DM Automation workspace page route in `src/app/[account]/dms/page.tsx`
- [x] T012 [US1] Create top-level DM workspace container with header and status indicators in `src/components/dms/dm-automation-view.tsx`

**Checkpoint**: User Story 1 MVP complete and testable independently.

---

## Phase 4: User Story 2 - Flexible Trigger Matching & Dual-Mode Replies (Direct vs. AI) (Priority: P1)

**Goal**: Allow users to select between All DMs, Keywords, or AI Semantic Intent triggers, and configure Direct text templates vs AI Prompt instructions.

**Independent Test**: Configure an AI Semantic condition (e.g. "سوالات خرید و موجودی") vs Keywords; verify in UI and via API that triggers and reply modes save and serialize properly.

- [x] T013 [P] [US2] Implement Trigger Selector component (`all`, `keywords`, `ai_context`) with interactive helper chips in `src/components/dms/dm-trigger-selector.tsx`
- [x] T014 [P] [US2] Implement Direct Reply text template card in `src/components/dms/dm-direct-reply-card.tsx`
- [x] T015 [US2] Implement rich AI Prompt editor with guideline chips, persona templates, and copyable token elements in `src/components/dms/dm-ai-prompt-editor.tsx`
- [x] T016 [US2] Integrate trigger and reply mode cards with draft dirty-state indicator and save action in `src/components/dms/dm-automation-view.tsx`

**Checkpoint**: Dual-layer triggers and reply modes fully functional.

---

## Phase 5: User Story 3 - Rapid Web Context & MCP Knowledge Source Injection (Priority: P2)

**Goal**: Enable store owners to configure fast-scrape website URLs and toggle connected MCP servers to ground AI replies in live product inventory and business facts.

**Independent Test**: Add a store URL and select an MCP tool; verify configuration is stored in `dm_automations` and delivered to worker agent via `/api/agent/poll`.

- [x] T017 [P] [US3] Implement Web Context URLs manager card with fast-read validation in `src/components/dms/dm-web-context-card.tsx`
- [x] T018 [P] [US3] Implement MCP Servers selection card with available tools preview in `src/components/dms/dm-mcp-servers-card.tsx`
- [x] T019 [US3] Integrate Web Context and MCP cards into `src/components/dms/dm-automation-view.tsx`

**Checkpoint**: External knowledge sources seamlessly configurable.

---

## Phase 6: User Story 4 - Follower Gating & Follow-Verification for DMs (Priority: P2)

**Goal**: Allow creators to require users to follow the account before receiving full responses, sending customizable follow requests and tracking `pending_follow` state.

**Independent Test**: Enable `require_follow`, send DM from non-follower; verify status is logged as `pending_follow` and custom follow prompt is delivered.

- [x] T020 [P] [US4] Implement Follow-Gating toggle and custom prompt text card in `src/components/dms/dm-follow-gate-card.tsx`
- [x] T021 [US4] Implement `pending_follow` state transition and follower re-verification logic in `src/app/api/accounts/[username]/dm-logs/route.ts`
- [x] T022 [US4] Integrate follow-gating card into `src/components/dms/dm-automation-view.tsx`

**Checkpoint**: Follower conversion gating operational.

---

## Phase 7: User Story 5 - Lightweight Story Reply Context Handling (Priority: P3)

**Goal**: Recognize incoming Story Replies cleanly: apply direct matching in direct mode, and automatically inject story content/caption into the AI context in AI mode.

**Independent Test**: Log a story reply DM event; verify `is_story_reply = 1` and `story_content` are displayed in the DM logs table.

- [x] T023 [P] [US5] Implement DM Logs audit table with story reply badges and tool execution previews in `src/components/dms/dm-logs-table.tsx`
- [x] T024 [US5] Implement story content injection into AI prompt payload in `src/app/api/accounts/[username]/dm-logs/route.ts`
- [x] T025 [US5] Add Story Handling settings section to `src/components/dms/dm-automation-view.tsx`

**Checkpoint**: Story replies contextually handled and auditable.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Design consistency, responsive ergonomics, RTL typography, and validation run.

- [x] T026 [P] Audit all DM UI components for strict compliance with shadcn/ui Light Mode and Vazirmatn RTL typography
- [x] T027 [P] Verify debouncing, toast ergonomics, and error handling across network interruptions in `src/components/dms/dm-automation-view.tsx`
- [x] T028 Execute end-to-end quickstart validation scenarios defined in `.specify/specs/011-dm-automation-plugin/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1; blocks all user stories.
- **User Story 1 (Phase 3 - MVP)**: Depends on Phase 2; provides the base container and master toggle.
- **User Stories 2 to 5 (Phases 4-7)**: Depend on Phase 3 container components; can be implemented sequentially or in parallel.
- **Polish (Phase 8)**: Depends on all user story implementations.

### Parallel Opportunities
- T002, T004, T005, T006 can run in parallel during Foundational phase.
- T009 and T010 can be developed in parallel during User Story 1.
- T013 and T014 can run in parallel during User Story 2.
- T017 and T018 can run in parallel during User Story 3.
- T020 and T023 can run in parallel.
- T026 and T027 can run in parallel during Polish.

---

## Implementation Strategy

### MVP First (Phases 1, 2, and 3)
1. Complete Setup (T001-T002) and Foundational (T003-T007).
2. Complete User Story 1 (T008-T012): Root routing, sidebar links, DM workspace route, and instant master toggle.
3. Validate User Story 1 independently in browser before moving forward.

### Incremental Delivery
1. Add User Story 2 (T013-T016): Trigger selectors and AI prompt editor.
2. Add User Story 3 (T017-T019): Web URLs and MCP servers.
3. Add User Story 4 (T020-T022): Follower gating.
4. Add User Story 5 (T023-T025): Story reply context and DM logs table.
5. Final Polish & Quickstart Run (T026-T028).
