# Research: Local MCP Server & Agent Action Triggering

## Overview

This research document analyzes the technical foundations, protocol standards, and architectural patterns required to implement a local Model Context Protocol (MCP) server for `inFlow`, along with real-time SSE action dispatching (Option C) for user-triggered operations (such as the dashboard "Sync" button).

---

## Technical Decisions

### Decision 1: MCP Transport & Endpoint Routing in Next.js 16 App Router

- **Context**: The AI agent (Hermes Agent, Claude Desktop, Cursor, or local Python workers) runs on the server or workstation and needs to discover inFlow's tools, query active automation configurations, and push results back.
- **Decision**: Provide dual transport:
  1. **HTTP/SSE Endpoint (`/api/mcp`)**: Native Next.js 16 App Router route handler supporting `GET` (for SSE stream connection or JSON health check) and `POST` (for JSON-RPC 2.0 message dispatching) following the standard Model Context Protocol specification (`protocolVersion: "2024-11-05"`).
  2. **Local Stdio Runner (`src/cli/mcp.ts` / `scripts/mcp-stdio.ts`)**: Node.js executable script reading JSON-RPC lines from `stdin` and writing responses to `stdout`, allowing zero-network local agent execution.
- **Rationale**:
  - Complies with `mcp-server-protocol` standards.
  - HTTP/SSE allows local and remote agents (including agents running in Docker or separate virtual environments) to connect over localhost without file descriptor sharing.
  - Stdio allows direct sub-process embedding for tools like Claude Desktop or Cursor without needing a running web server.
- **Alternatives Considered**:
  - *WebSockets*: Not supported by the MCP core standard; rejected in favor of standard HTTP/SSE + JSON-RPC 2.0.
  - *Stdio-only*: Prevents background daemons or web workers on the server from communicating with a running inFlow web application.

---

### Decision 2: Real-Time SSE Stream Architecture & Event Dispatching (Option C)

- **Context**: When an operator clicks "Sync" in the dashboard, inFlow must immediately instruct the connected AI agent to execute its scraping tool without waiting for a periodic polling interval.
- **Decision**: Implement a Node.js-level `AgentStreamManager` in `src/lib/mcp/sse-manager.ts`:
  - When an AI agent connects via `GET /api/mcp/sse` (or `GET /api/mcp` with `Accept: text/event-stream`), inFlow establishes a persistent `ReadableStream`.
  - The connection is registered in-memory keyed by `account_username` and `session_id`.
  - Initial event streamed:
    ```
    event: endpoint
    data: /api/mcp?sessionId=<SESSION_ID>
    ```
  - Periodic heartbeat:
    ```
    event: ping
    data: {"timestamp": 1729267200000}
    ```
  - When a user clicks "Sync" in the UI, `POST /api/sync` invokes `AgentStreamManager.notifyAccount(account_username, 'sync_requested', payload)`.
  - The event is streamed immediately down the open SSE connection:
    ```
    event: sync_requested
    data: {"job_id": 42, "account": "r9spoort1", "requested_at": "2026-10-18 18:00:00"}
    ```
  - The AI agent receives the event, triggers its Instagram scraping routine, and posts results back using `inflow_push_scraped_posts`.
- **Rationale**: Delivers sub-100ms response time from button click to agent execution while keeping the agent strictly in the Execution Plane.
- **Alternatives Considered**:
  - *Periodic HTTP Polling only*: Introduces 30–120 seconds of latency before the agent discovers the sync request, leading to poor user experience.
  - *Direct Execution in Route Handler*: Violates Constitution Principle II (Control Plane isolation; never run Instagram scraping inside Next.js).

---

### Decision 3: Resilient Job Queue & State Tracking (`agent_jobs` Table)

- **Context**: Network drops, agent restarts, or temporary disconnections can disrupt an SSE connection. The system needs guaranteed auditability and fallback recovery.
- **Decision**: Back the SSE dispatch with a persistent `agent_jobs` table in SQLite (`data/inflow.db`):
  - States: `pending` -> `running` -> `completed` | `failed` | `timed_out`.
  - When "Sync" is clicked:
    1. A row is inserted: `status = 'pending'`, `job_type = 'sync_catalog'`, `account_username = 'r9spoort1'`.
    2. SSE notification is broadcast.
    3. If the agent receives the SSE event, it calls `inflow_update_job_status(job_id, 'running')`.
    4. If the agent was briefly offline, upon reconnecting or during its heartbeat cycle it calls `inflow_get_pending_jobs(account)` to claim any unhandled jobs.
    5. When the agent finishes scraping, it calls `inflow_complete_job(job_id, { count: 15, status: 'ok' })`.
  - The UI polls `GET /api/agent/jobs?account=...` or `/api/sync/status` to show accurate loading states.
- **Rationale**: Combines the real-time speed of SSE with the rock-solid durability and auditability of a relational state machine.

---

### Decision 4: Authentication, Scoped Tokens & Tenancy (Constitution Principle VI & VIII)

- **Context**: In multi-account and multi-tenant environments, one bot profile must not be able to read or mutate another tenant's posts or automation rules.
- **Decision**:
  - Support flexible authentication per `mcp-server-protocol`:
    1. Header `Authorization: Bearer <API_TOKEN>`
    2. Header `x-api-key: <API_TOKEN>`
    3. Query parameter `?token=<API_TOKEN>` or `?apiKey=<API_TOKEN>`
  - Authenticate tokens against `account_bot_bindings` or a dedicated bot auth registry table.
  - Every tool execution validates that the requested `account_username` matches the authenticated scope.
  - Superadmin tokens can query across accounts; standard bot tokens are strictly bound to a single `account_username`.
- **Rationale**: Enforces Constitution Principle VII (1-to-1 Page-to-Bot Binding) and Principle VIII (Scoped Inter-Plane API Tokens).

---

### Decision 5: Tool Catalog & Schema Design

- **Context**: The LLM needs precise schemas and clear Persian/English descriptions to invoke tools reliably without hallucinating parameters.
- **Decision**: Implement the following standardized tool definitions:
  1. `inflow_list_accounts`: Returns list of accounts, bio, followers, active automation count, and sync status.
  2. `inflow_get_active_automations`: Returns active posts (`auto_reply = 1`), caption, trigger keywords, AI context, comment reply text, DM text, and follow requirement.
  3. `inflow_record_comment_interaction`: Ingests comment text, commenter username, reply status (`sent`/`failed`/`skipped`), DM status, and idempotency lock key `comment_id`.
  4. `inflow_push_scraped_posts`: Accepts an array of scraped Instagram posts/reels (`shortcode`, `media_id`, `url`, `post_type`, `thumbnail_url`, `caption`) and upserts them into `posts`.
  5. `inflow_update_post_rules`: Allows the AI agent or operator to update rules (`trigger_keywords`, `trigger_context`, `comment_action_text`, `dm_action_text`, `auto_reply`).
  6. `inflow_get_pending_jobs`: Returns uncompleted jobs assigned to the account.
  7. `inflow_complete_job`: Marks a job as completed with a structured summary payload.

---

## Technology Matrix

| Component | Choice | Rationale |
| :--- | :--- | :--- |
| **Protocol** | Model Context Protocol (`2024-11-05`) | Industry standard for LLM tool integration |
| **Format** | JSON-RPC 2.0 | Mandatory standard for MCP messages |
| **Transport 1** | Next.js Route Handler HTTP/SSE (`/api/mcp`) | Network/remote agent access with zero added server infrastructure |
| **Transport 2** | Stdio CLI bridge (`src/cli/mcp.ts`) | Direct terminal/CLI agent support |
| **Real-Time Stream** | Node.js `ReadableStream` + EventEmitter | High performance, memory-efficient in Next.js App Router |
| **Persistence** | SQLite (`better-sqlite3`) in WAL mode | Sub-millisecond ACID transactions, zero external database setup |
