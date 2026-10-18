# Feature Specification: Local MCP Server & Agent Action Triggering

**Feature Branch**: `005-local-mcp-server`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "یک mcp لوکال برای اینکه بتونیم به هوش مصنوعی ران شده روی سرور بدیم تا بدونه چه فانکشنهایی داره نمیدونم برای ایتکه مثلا دکمه سینک زده میشه از هوش مصنوعی بخواد یک تولیزی رو کار کنه چیکار باید بکنیم؟"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Local MCP Server Tool Discovery for Server-Side AI (Priority: P1)

As an autonomous AI agent (such as Hermes Agent, Cursor, Claude, or a local server-side LLM worker), I want to connect to a local inFlow Model Context Protocol (MCP) server so that I can automatically discover all available inFlow tools, understand their parameter schemas, and call them safely to inspect accounts, fetch automation rules, and log interactions.

**Why this priority**: Core architectural capability. Exposing inFlow functionality via standard MCP tools turns inFlow into an AI-ready Control Plane, allowing any LLM runtime to interact with the platform natively without hardcoding brittle custom scripts.

**Independent Test**: Can be tested independently by connecting an MCP client (or inspector) to inFlow's MCP endpoint (e.g. `/api/mcp` or a local MCP process), sending an `initialize` and `tools/list` JSON-RPC request, and verifying that all inFlow tools (`inflow_list_accounts`, `inflow_get_active_automations`, `inflow_record_comment_interaction`, `inflow_push_scraped_posts`) are returned with valid JSON schemas.

**Acceptance Scenarios**:

1. **Given** an AI agent initialized with inFlow's MCP endpoint or configuration, **When** the agent sends `tools/list`, **Then** inFlow returns the complete catalog of tools with comprehensive descriptions, required parameter schemas, and typing.
2. **Given** an authorized AI agent invoking `inflow_get_active_automations` for an account, **When** the tool is executed, **Then** the MCP server queries inFlow's database and returns only active posts (`auto_reply = 1`) along with their keyword filters, AI prompt contexts, and direct message reply rules.
3. **Given** an agent invoking an MCP tool with missing or invalid arguments, **When** processed, **Then** the MCP server returns a standard JSON-RPC 2.0 error response with a clear descriptive message without crashing.

---

### User Story 2 - UI-Triggered Action Dispatching for AI Agent (Sync Button Execution) (Priority: P1)

As an operator in the inFlow dashboard, when I click the "Sync" button (or trigger an on-demand catalog refresh), I want inFlow to dispatch a sync action to the server-side AI agent so that the AI worker initiates the external scraping/synchronization routine on Instagram and ingests the updated media into inFlow.

**Why this priority**: Resolves the fundamental gap between user actions in the Control Plane and execution by the AI worker in the Execution Plane. Without this bridge, clicking "Sync" in the dashboard cannot instruct the AI to perform external actions.

**Independent Test**: Can be tested independently by connecting an AI agent over an MCP SSE stream (`GET /api/mcp/sse`), clicking the "Sync" button on the dashboard for an account, verifying that a real-time event notification is received over the SSE stream, checking that the AI agent acknowledges the job, executes its scraping routine, and posts the results back via MCP.

**Acceptance Scenarios**:

1. **Given** an operator viewing an Instagram account in the dashboard, **When** they click "Sync", **Then** inFlow creates an `agent_job` record with status `pending` and immediately streams a dispatch event over the active MCP SSE connection to the assigned AI agent.
2. **Given** an active AI agent connected via MCP SSE, **When** the sync event is received, **Then** the agent acknowledges receipt, transitions the job status to `running`, and initiates media synchronization.
3. **Given** the dashboard during an active sync job, **When** viewed by the operator, **Then** the UI displays an active synchronization indicator (e.g. "Sync in progress by agent...") until the job finishes or times out.

---

### User Story 3 - Ingesting Scraped Posts & Idempotent Log Reporting via MCP (Priority: P2)

As an AI agent that has finished scraping an Instagram account or replying to comments, I want to call inFlow MCP tools (`inflow_push_scraped_posts` and `inflow_record_comment_interaction`) so that newly discovered reels/posts and processed comment interactions are securely stored in inFlow with strict idempotency guarantees.

**Why this priority**: Ensures that external actions executed by the agent correctly update the Control Plane state while strictly adhering to Constitution Principle III (Idempotency and anti-shadowban protection).

**Independent Test**: Can be tested independently by having the agent call `inflow_push_scraped_posts` with a list of 10 media items, verifying they appear in `posts`, and calling `inflow_record_comment_interaction` twice with the same `comment_id`, verifying that the second call is safely recognized as already processed.

**Acceptance Scenarios**:

1. **Given** an AI agent that has scraped new reels from Instagram, **When** it calls `inflow_push_scraped_posts` with shortcodes and metadata, **Then** inFlow upserts the media records into the `posts` table and marks the sync job as `completed`.
2. **Given** an incoming user comment processed by the AI agent, **When** the agent calls `inflow_record_comment_interaction`, **Then** inFlow verifies the `comment_id` uniqueness, logs the comment text and reply status, and returns confirmation.
3. **Given** a repeat call with an existing `comment_id`, **When** processed, **Then** inFlow returns `{ success: true, already_processed: true }` without inserting duplicates.

---

### User Story 4 - Agent Health, Heartbeat & Job Status Monitoring (Priority: P3)

As a system operator, I want to see the status of the local AI agent (online/offline, last heartbeat, current job execution) directly in the inFlow dashboard so that I know whether the AI is actively listening to sync requests and automation triggers.

**Why this priority**: Provides operational visibility and prevents user confusion when the server-side AI worker is stopped or undergoing maintenance.

**Independent Test**: Can be tested independently by checking the account status badge or sync indicator in the sidebar, stopping the AI agent, and verifying that the dashboard warns when the agent heartbeat has expired.

**Acceptance Scenarios**:

1. **Given** an AI agent periodically calling MCP tools or sending heartbeats, **When** the last interaction occurred within the configured threshold (< 3 minutes), **Then** the dashboard displays an "Agent Active" status indicator.
2. **Given** an AI agent that has not communicated for more than 5 minutes, **When** the operator views the dashboard, **Then** a warning indicator informs the user that the background agent is offline.
3. **Given** a sync request dispatched while the agent is offline, **When** the request exceeds the allowed timeout, **Then** the job status transitions to `timed_out` with a clear user notice.

---

### Edge Cases

- **Agent Offline During Sync Request**: If the user clicks "Sync" while the AI agent is offline or stopped, the job is queued in the database. When the agent comes back online, it detects the pending job. If no agent picks it up within 5 minutes, the job is marked `timed_out` and the UI resets.
- **Concurrent Sync Requests**: If a user clicks "Sync" multiple times rapidly, inFlow deduplicates the request and maintains only one active `pending` or `running` sync job per account at a time.
- **Unauthorized Cross-Account Access**: If an AI agent configured for Account A attempts to call an MCP tool or update posts for Account B, inFlow validates tenant token bindings and rejects the call with an authorization error.
- **Malformed Scraper Payloads**: If the AI agent passes incomplete media payloads (e.g. missing `shortcode`), inFlow skips invalid items and processes valid ones, returning a partial success report.
- **Long-Running Scrape Operations**: If an Instagram scrape takes 30-60 seconds, the agent periodically updates job progress (`running`, progress percentage) so the dashboard does not assume the worker has hung.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose a Model Context Protocol (MCP) server conforming to JSON-RPC 2.0 and MCP protocol version standards.
- **FR-002**: The MCP server MUST expose `inflow_list_accounts` to allow AI agents to discover managed accounts and their settings.
- **FR-003**: The MCP server MUST expose `inflow_get_active_automations` returning all active posts (`auto_reply = 1`), trigger criteria (keywords, AI context), and reply definitions (comment text, DM text, require_follow).
- **FR-004**: The MCP server MUST expose `inflow_record_comment_interaction` to record comment processing logs with strict `comment_id` unique locking.
- **FR-005**: The MCP server MUST expose `inflow_push_scraped_posts` allowing AI agents to insert or update media catalog items in inFlow.
- **FR-006**: The system MUST implement an asynchronous `agent_jobs` queue/registry supporting job creation, status tracking (`pending`, `running`, `completed`, `failed`, `timed_out`), and result payloads.
- **FR-007**: When a user clicks "Sync" in the dashboard, the system MUST create an `agent_job` of type `sync_catalog` for the target account.
- **FR-008**: The system MUST support live real-time action dispatching to the AI agent over an established Model Context Protocol (MCP) Server-Sent Events (SSE) connection (`GET /api/mcp/sse`). When an operator triggers an action (such as clicking the "Sync" button), the system MUST stream an immediate notification event over the active SSE stream to the connected AI agent worker, prompting it to execute the target tool and sync operation. If no active SSE connection is open, the job MUST remain queued in `agent_jobs` until an agent connects.
- **FR-009**: The MCP server MUST support scoped authentication (Bearer API token or API key) mapped to authorized Instagram accounts per Constitution Principle VIII.
- **FR-010**: The dashboard UI MUST reflect real-time or polling-based sync job status (idle, queued, syncing, completed, error).
- **FR-011**: The MCP server MUST support dual transport modes: HTTP/SSE endpoint (for network and remote agents) and standard stdio (for local command-line subprocess runners).
- **FR-012**: All monetary values or costs in tool definitions (if applicable) MUST explicitly indicate "in Toman" (به تومان) adhering to MCP guidelines.

### Key Entities

- **Agent Job (`agent_jobs`)**:
  - `id` (INTEGER PRIMARY KEY)
  - `account_username` (TEXT NOT NULL)
  - `job_type` (TEXT NOT NULL, e.g. `sync_catalog`, `check_dms`, `process_post`)
  - `status` (TEXT NOT NULL: `pending` | `running` | `completed` | `failed` | `timed_out`)
  - `payload` (TEXT / JSON: input parameters for the agent)
  - `result_summary` (TEXT / JSON: summary of results returned by the agent)
  - `created_at`, `started_at`, `completed_at` (TEXT)
- **MCP Tool Definition**:
  - `name` (TEXT: e.g. `inflow_get_active_automations`)
  - `description` (TEXT: instructions for LLM tool selection)
  - `inputSchema` (JSON: parameter definitions and validation rules)
- **Agent Bot Binding**:
  - `account_username` (TEXT UNIQUE)
  - `webhook_url` (TEXT: optional outbound endpoint for the local worker)
  - `api_token` (TEXT: scoped authentication secret for the bot)
  - `last_heartbeat_at` (TEXT)

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of defined inFlow MCP tools can be discovered and initialized by standard MCP clients (Claude Desktop, Cursor, Hermes Agent) via `tools/list` in under 300ms.
- **SC-002**: Triggering a "Sync" action in the dashboard creates an actionable agent job in under 150ms.
- **SC-003**: The AI agent successfully acknowledges and transitions a pending sync job to `running` within 5 seconds under standard polling or webhook dispatch.
- **SC-004**: Catalog sync operations can ingest up to 100 scraped posts/reels in a single batch without dropping records or exceeding 2 seconds of database execution time.
- **SC-005**: 100% of comment interactions logged through MCP preserve the unique `comment_id` constraint, guaranteeing zero duplicate replies.
- **SC-006**: Operators receive clear visual feedback on sync progress and agent connectivity directly in the UI without requiring page reloads.

---

## Assumptions

- The AI agent (Hermes Agent, local Python scraper, or LLM runner) runs on the same server or accessible local network as inFlow.
- External Instagram interaction (browser sessions, scraping, DM dispatching) remains strictly in the Execution Plane per Constitution Principle II.
- Standard MCP protocol specifications (JSON-RPC 2.0 over HTTP/SSE and Stdio) are supported by the AI agent environment.
- The inFlow database (`data/inflow.db`) is the authoritative source of truth for accounts, posts, automation rules, and comment idempotency locks.
