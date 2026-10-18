# Contract: MCP SSE Stream & Action Dispatching (Option C)

## Overview

This contract governs the real-time Server-Sent Events (SSE) connection between `inFlow` (Control Plane) and the server-side AI agent (Execution Plane). When an operator interacts with the dashboard (e.g. clicking the "Sync" button), inFlow immediately pushes an execution event down the open SSE stream.

---

## 1. Connection Lifecycle

### Step 1: Agent Opens SSE Stream
The AI agent initiates an HTTP GET request with `Accept: text/event-stream`:

```http
GET /api/mcp/sse?token=inflow_bot_sec_991823 HTTP/1.1
Host: localhost:3000
Accept: text/event-stream
Cache-Control: no-cache
```

### Step 2: inFlow Server Acknowledges & Sends Initial Endpoint Event
inFlow responds with standard SSE headers and transmits the initial `endpoint` event containing the message POST URI:

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no

event: endpoint
data: /api/mcp/messages?sessionId=sess_8f29d10a&token=inflow_bot_sec_991823

```

### Step 3: Periodic Keepalive Ping
To prevent network timeouts through reverse proxies or firewalls, inFlow sends a ping event every 30 seconds:

```
event: ping
data: {"timestamp": 1729267200000}

```

---

## 2. Real-Time Action Dispatch Sequence (e.g. UI "Sync" Button)

When an operator in `inflow-dashboard.tsx` clicks the "Sync" button:

```text
[Dashboard UI]                   [inFlow Backend]                     [AI Agent (Server)]
      │                                 │                                      │
      │  POST /api/sync                 │                                      │
      │────────────────────────────────>│                                      │
      │                                 │ 1. Insert agent_jobs (status=pending)│
      │                                 │ 2. Find active SSE stream for account│
      │                                 │                                      │
      │                                 │  event: sync_requested               │
      │                                 │  data: {job_id, account, ...}        │
      │                                 │─────────────────────────────────────>│
      │  { success: true, job_id: 14 }  │                                      │
      │<────────────────────────────────│                                      │
      │                                 │                                      │
      │                                 │  POST /api/mcp/messages              │
      │                                 │  tools/call: inflow_complete_job     │
      │                                 │<─────────────────────────────────────│
      │                                 │ (Updates job=completed, posts synced)│
      │                                 │                                      │
      │  Poll /api/agent/jobs/14        │                                      │
      │  (or refreshed catalog)         │                                      │
      │────────────────────────────────>│                                      │
      │  Status: "completed"            │                                      │
      │<────────────────────────────────│                                      │
```

---

## 3. SSE Event Schemas

### Event: `sync_requested`

Dispatched when an operator clicks the sync action in the dashboard.

```
event: sync_requested
data: {
  "job_id": 14,
  "job_type": "sync_catalog",
  "account_username": "r9spoort1",
  "requested_by": "admin",
  "timestamp": "2026-10-18 18:05:00",
  "parameters": {
    "force_full": false
  }
}

```

### Event: `action_requested` (Generic Automation Trigger)

Dispatched for other on-demand agent operations (e.g. forced DM check or comment retry).

```
event: action_requested
data: {
  "job_id": 15,
  "job_type": "process_post",
  "account_username": "r9spoort1",
  "target_shortcode": "DehQhnjoEcr",
  "timestamp": "2026-10-18 18:06:12"
}

```

---

## 4. Disconnection & Reconnection Recovery

1. If an SSE connection drops (e.g. agent restart or network glitch), the agent MUST automatically reconnect with exponential backoff (1s, 2s, 4s, up to 15s).
2. Upon reconnecting, the agent executes `inflow_get_pending_jobs` to retrieve any sync or action requests dispatched while the connection was offline.
3. If no agent acknowledges a `pending` job within 5 minutes, inFlow's background cleaner transitions the job to `timed_out`.
