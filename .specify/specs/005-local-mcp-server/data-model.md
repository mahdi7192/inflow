# Data Model: Local MCP Server & Agent Action Triggering

## Database Schema Extensions (`data/inflow.db`)

To support the Local Model Context Protocol (MCP) server, real-time Server-Sent Events (SSE) dispatching, and background job lifecycle tracking, the SQLite database is extended with the following tables and relationships.

---

### 1. `agent_jobs` (Asynchronous Job State Machine)

Tracks all background and on-demand jobs dispatched to AI agents (such as Instagram catalog synchronization triggered by the UI "Sync" button).

```sql
CREATE TABLE IF NOT EXISTS agent_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_username TEXT NOT NULL,
  job_type TEXT NOT NULL,                  -- 'sync_catalog' | 'check_dms' | 'process_post'
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'running' | 'completed' | 'failed' | 'timed_out'
  payload TEXT DEFAULT '{}',               -- JSON string of job input parameters
  result_summary TEXT DEFAULT NULL,        -- JSON string of execution results returned by agent
  error_message TEXT DEFAULT NULL,         -- Error details if failed or timed out
  created_at TEXT NOT NULL,                -- ISO-like timestamp 'YYYY-MM-DD HH:MM:SS'
  started_at TEXT DEFAULT NULL,            -- Timestamp when agent acknowledged and started
  completed_at TEXT DEFAULT NULL,          -- Timestamp when agent completed or failed
  FOREIGN KEY (account_username) REFERENCES accounts(username) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_jobs_account_status 
  ON agent_jobs (account_username, status);

CREATE INDEX IF NOT EXISTS idx_agent_jobs_created 
  ON agent_jobs (created_at DESC);
```

#### Lifecycle State Transitions:

```text
       [UI / System Event]
                │
                ▼
           ┌─────────┐
           │ PENDING │
           └────┬────┘
                │ Agent receives SSE event or claims job
                ▼
           ┌─────────┐
           │ RUNNING │
           └───┬─┬───┘
               │ │
     ┌─────────┘ └──────────┐
     ▼                      ▼
┌───────────┐         ┌──────────┐
│ COMPLETED │         │  FAILED  │
└───────────┘         └──────────┘
                            ▲
                            │ Exceeds timeout (5 min)
                      ┌─────┴─────┐
                      │ TIMED_OUT │
                      └───────────┘
```

---

### 2. `account_bot_bindings` (Bot Profile Authentication & Scoping)

Enforces Constitution Principle VII (Strict 1-to-1 Page-to-Bot Binding) and Principle VIII (Scoped Inter-Plane API Tokens). Maps each Instagram account to an authorized bot authentication token.

```sql
CREATE TABLE IF NOT EXISTS account_bot_bindings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_username TEXT UNIQUE NOT NULL,    -- 1-to-1 relationship with accounts.username
  bot_profile_id TEXT NOT NULL,             -- Unique identifier for the Hermes or worker profile
  api_token TEXT UNIQUE NOT NULL,           -- Scoped bearer token 'inflow_bot_<hash>'
  webhook_url TEXT DEFAULT NULL,            -- Optional fallback webhook endpoint
  last_heartbeat_at TEXT DEFAULT NULL,      -- Updated on every MCP message or SSE ping
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (account_username) REFERENCES accounts(username) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_account_bot_token 
  ON account_bot_bindings (api_token);
```

---

### 3. In-Memory SSE Registry (`AgentStreamRegistry`)

For high-speed real-time event streaming down active `text/event-stream` connections (Option C), an in-memory session registry tracks active client streams:

```typescript
interface ActiveAgentStream {
  sessionId: string;
  accountUsername: string;
  botProfileId?: string;
  connectedAt: Date;
  lastPingAt: Date;
  controller: ReadableStreamDefaultController<Uint8Array>;
}
```

- When an agent connects to `GET /api/mcp/sse`, a stream is registered in `AgentStreamRegistry`.
- When an operator clicks "Sync" in `inflow-dashboard.tsx`, `AgentStreamRegistry.broadcastToAccount(account, event, data)` writes directly to the stream.
- When the agent disconnects or drops, the controller closes and is cleaned up from the registry.

---

### 4. Existing Tables Integration

| Existing Table | Integration with MCP Server |
| :--- | :--- |
| `accounts` | Updated: `last_heartbeat_at` refreshed whenever an MCP tool is called or SSE stream is active. |
| `posts` | Queried by `inflow_get_active_automations`; upserted by `inflow_push_scraped_posts`. |
| `comment_logs` | Written by `inflow_record_comment_interaction` with strict `comment_id` UNIQUE conflict handling. |
| `users` & `user_accounts` | Superadmins can access all accounts via MCP; tenants can only access assigned accounts. |
