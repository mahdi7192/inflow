# Tasks: Local MCP Server & Agent Action Triggering

**Feature**: `005-local-mcp-server`
**Input**: [.specify/specs/005-local-mcp-server/plan.md](file:///Users/mahdi.ketabdar/dev/inFlow/.specify/specs/005-local-mcp-server/plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish database schemas, types, and directories required by the MCP server and job queue.

- [X] T001 Initialize MCP module directory structure in `src/lib/mcp/` and `src/app/api/mcp/`
- [X] T002 Define core MCP JSON-RPC 2.0 protocol types, tool schemas, and SSE session interfaces in `src/lib/mcp/types.ts`
- [X] T003 Extend SQLite schema with `agent_jobs` and `account_bot_bindings` tables, indexes, and seed test tokens in `src/lib/db.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core security, stream management, and tool registry that MUST be complete before user stories can execute.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Implement scoped bot token extraction and account tenancy verification in `src/lib/mcp/auth-guard.ts`
- [X] T005 Implement in-memory `AgentStreamRegistry` for persistent SSE stream tracking and event broadcasting in `src/lib/mcp/sse-manager.ts`
- [X] T006 [P] Declare full JSON Schema specifications for all inFlow MCP tools in `src/lib/mcp/tool-catalog.ts`

**Checkpoint**: Core foundation ready — MCP protocol handlers and SSE streams can now be mounted.

---

## Phase 3: User Story 1 - Local MCP Server Tool Discovery for Server-Side AI (Priority: P1) 🎯 MVP

**Goal**: Expose inFlow's tool catalog and active automations via JSON-RPC 2.0 so local AI agents (Hermes, Claude, Cursor) can discover and query inFlow tools over HTTP and Stdio.

**Independent Test**: Connect an MCP client or send cURL requests to `POST /api/mcp` with `initialize` and `tools/list`, verifying all tools are returned with valid JSON schemas, and call `inflow_get_active_automations` to fetch active post rules.

### Implementation for User Story 1

- [X] T007 [P] [US1] Implement core tool execution handlers for `inflow_list_accounts`, `inflow_get_active_automations`, and `inflow_update_post_rules` in `src/lib/mcp/tool-executor.ts`
- [X] T008 [US1] Implement HTTP route handler for `GET /api/mcp` (health check) and `POST /api/mcp` (JSON-RPC 2.0 dispatcher for `initialize`, `ping`, `tools/list`, `tools/call`) in `src/app/api/mcp/route.ts`
- [X] T009 [P] [US1] Implement standalone command-line Stdio bridge script reading `stdin` and writing `stdout` in `src/cli/mcp.ts`
- [X] T010 [US1] Add `mcp:stdio` script entry in `package.json` for running the local CLI MCP server

**Checkpoint**: At this point, User Story 1 is fully functional as an MVP. Server-side AI agents can initialize and call inFlow tools directly.

---

## Phase 4: User Story 2 - UI-Triggered Action Dispatching for AI Agent (Sync Button Execution) (Priority: P1)

**Goal**: When an operator clicks "Sync" in the dashboard, inFlow creates a pending job in `agent_jobs` and immediately streams a `sync_requested` notification down the active SSE connection to the server-side AI agent.

**Independent Test**: Open an SSE connection to `GET /api/mcp/sse`, click "Sync" in the dashboard for an account, and verify that the SSE stream instantly outputs the `sync_requested` event with `job_id`, transitioning the UI to the syncing state.

### Implementation for User Story 2

- [X] T011 [US2] Implement dedicated SSE stream endpoint supporting connection registration, client ping keepalives, and session cleanup in `src/app/api/mcp/sse/route.ts`
- [X] T012 [US2] Update sync endpoint `POST /api/sync` to create a `sync_catalog` job in `agent_jobs` and broadcast a `sync_requested` event via `AgentStreamRegistry` in `src/app/api/sync/route.ts`
- [X] T013 [US2] Implement job status polling endpoint `GET /api/sync/status` returning current job execution status in `src/app/api/sync/status/route.ts`
- [X] T014 [US2] Update `handleSync` and button states in `src/components/inflow-dashboard.tsx` to display real-time status ("Syncing with agent...", "Synced") based on active job state

**Checkpoint**: Real-time action dispatching over SSE is functional. The UI "Sync" button directly triggers the server-side AI worker with zero-polling latency.

---

## Phase 5: User Story 3 - Ingesting Scraped Posts & Idempotent Log Reporting via MCP (Priority: P2)

**Goal**: Enable the AI agent to push scraped Instagram media and record comment interactions back into inFlow with strict `comment_id` idempotency locking.

**Independent Test**: Invoke `inflow_push_scraped_posts` via MCP to insert 10 media items into `posts`, and invoke `inflow_record_comment_interaction` twice with the same `comment_id` to verify that duplicate comment processing is prevented.

### Implementation for User Story 3

- [X] T015 [P] [US3] Implement `inflow_push_scraped_posts` tool handler supporting transactional batch upserting into the `posts` table in `src/lib/mcp/tool-executor.ts`
- [X] T016 [P] [US3] Implement `inflow_record_comment_interaction` tool handler enforcing unique `comment_id` conflict handling in `src/lib/mcp/tool-executor.ts`
- [X] T017 [US3] Implement `inflow_get_pending_jobs` and `inflow_complete_job` tool handlers in `src/lib/mcp/tool-executor.ts`
- [X] T018 [US3] Connect `inflow_complete_job` to transition `agent_jobs` status to `completed` and update `accounts.last_heartbeat_at` in `src/lib/mcp/tool-executor.ts`

**Checkpoint**: Full bidirectional cycle is operational: AI agent receives sync events, executes external actions, and reports results and logs back to inFlow safely.

---

## Phase 6: User Story 4 - Agent Health, Heartbeat & Job Status Monitoring (Priority: P3)

**Goal**: Provide operational visibility into agent connection status (active/offline), track heartbeats, and handle stale job timeouts.

**Independent Test**: View the dashboard with an active agent stream, disconnect the agent for >5 minutes, and verify that the UI shows an agent offline warning and times out stale pending jobs gracefully.

### Implementation for User Story 4

- [X] T019 [US4] Implement stale job timeout detection (marking jobs > 5 minutes unacknowledged as `timed_out`) in `src/lib/db.ts`
- [X] T020 [US4] Add agent connection and heartbeat status badge to the account header in `src/components/inflow-dashboard.tsx`
- [X] T021 [US4] Add error and timeout notification toast alerts when an agent fails to pick up a sync request in `src/components/inflow-dashboard.tsx`

**Checkpoint**: Complete observability and fault tolerance implemented across the UI and backend.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end verification, type checks, linting, and design system audit.

- [X] T022 [P] Verify all 5 validation scenarios defined in `quickstart.md` using cURL commands
- [X] T023 Run typecheck and ESLint validation across all new files using `pnpm build`
- [X] T024 Audit UI components in `inflow-dashboard.tsx` to guarantee pure shadcn/ui zinc Light Mode compliance and Vazirmatn RTL rendering

---

## Dependencies & Execution Order

### Phase Dependencies

```text
┌─────────────────┐
│ Phase 1: Setup  │
└────────┬────────┘
         │
         ▼
┌───────────────────────┐
│ Phase 2: Foundational │
└────────┬──────────────┘
         │
         ├──────────────────────────┐
         ▼                          ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│ Phase 3: User Story 1   │  │ Phase 4: User Story 2   │
│ (MCP Tools & Discovery) │  │ (Real-Time SSE Sync)    │
└────────┬────────────────┘  └──────────┬──────────────┘
         │                              │
         └──────────────┬───────────────┘
                        ▼
             ┌─────────────────────────┐
             │ Phase 5: User Story 3   │
             │ (Push Scraped & Logs)   │
             └──────────┬──────────────┘
                        ▼
             ┌─────────────────────────┐
             │ Phase 6: User Story 4   │
             │ (Monitoring & Health)   │
             └──────────┬──────────────┘
                        ▼
             ┌─────────────────────────┐
             │ Phase 7: Polish & Audit │
             └─────────────────────────┘
```

### Parallel Opportunities

- **Phase 1**: T001, T002, T003 can be prepared in quick sequence.
- **Phase 2**: T006 (Tool schemas) can be written in parallel with T004 (Auth guard) and T005 (SSE manager).
- **Phase 3**: T007 (Tool executors) and T009 (Stdio script) can be developed in parallel.
- **Phase 4 & 5**: Once Foundational is complete, T015 (Push scraped posts) and T016 (Record comment interaction) can be implemented in parallel.

---

## Implementation Strategy

### MVP First (Phases 1, 2, and 3)
1. Complete Setup (DB extensions, types).
2. Complete Foundational (Auth guard, SSE manager, tool catalog).
3. Complete User Story 1 (HTTP route `/api/mcp` and Stdio runner).
4. **VALIDATION**: Test `initialize`, `tools/list`, and `inflow_get_active_automations` with cURL. This provides an immediately usable MCP server for local agents!

### Incremental Delivery (Phases 4, 5, 6, 7)
1. Add User Story 2 (Real-time SSE event dispatch on "Sync" click).
2. Add User Story 3 (Pushing scraped posts and comment logs with idempotency).
3. Add User Story 4 (Agent status indicator and timeout handling).
4. Polish and run `pnpm build` to verify zero errors.
