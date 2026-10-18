# Quickstart & Verification Guide: Local MCP Server & Agent Action Triggering

## Overview

This guide provides end-to-end validation procedures for verifying inFlow's Model Context Protocol (MCP) server, tool catalog, and real-time Server-Sent Events (SSE) action dispatching (Option C).

---

## 1. Prerequisites

1. inFlow server running locally:
   ```bash
   pnpm dev
   ```
2. Database initialized with sample accounts and posts (`data/inflow.db`).
3. An active bot token in `account_bot_bindings` (e.g. `inflow_bot_test_key_123` for account `r9spoort1`).

---

## 2. Verification Scenarios

### Scenario 1: MCP Server Health Check & Initialization

Verify that the MCP HTTP endpoint responds to health queries and standard JSON-RPC `initialize`.

```bash
# 1. Non-SSE Health Check
curl -s -H "Accept: application/json" http://localhost:3000/api/mcp | jq .
# Expected: { "name": "inFlow MCP Server", "status": "active", "version": "1.0.0", "protocolVersion": "2024-11-05" }

# 2. JSON-RPC Initialize
curl -s -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer inflow_bot_test_key_123" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": { "name": "TestClient", "version": "1.0" }
    }
  }' | jq .
# Expected: { "jsonrpc": "2.0", "id": 1, "result": { "protocolVersion": "2024-11-05", "capabilities": { "tools": {} } } }
```

---

### Scenario 2: Tool Discovery (`tools/list`)

Verify that the LLM/agent can discover all available inFlow tools.

```bash
curl -s -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer inflow_bot_test_key_123" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }' | jq '.result.tools[].name'
# Expected output includes:
# "inflow_list_accounts"
# "inflow_get_active_automations"
# "inflow_record_comment_interaction"
# "inflow_push_scraped_posts"
# "inflow_update_post_rules"
# "inflow_get_pending_jobs"
# "inflow_complete_job"
```

---

### Scenario 3: Real-Time SSE Action Dispatch (Sync Button Trigger)

Verify that clicking "Sync" in the dashboard immediately streams an event to the connected agent stream.

1. **Terminal 1: Start Agent SSE Stream Listener**
   ```bash
   curl -N -H "Accept: text/event-stream" \
     "http://localhost:3000/api/mcp/sse?token=inflow_bot_test_key_123&account=r9spoort1"
   # Output displays:
   # event: endpoint
   # data: /api/mcp/messages?sessionId=...
   ```

2. **Terminal 2: Trigger Sync Request (simulating the UI button click)**
   ```bash
   curl -s -X POST http://localhost:3000/api/sync \
     -H "Content-Type: application/json" \
     -d '{"account_username": "r9spoort1"}' | jq .
   # Expected response: { "success": true, "job_id": 1, "status": "dispatched" }
   ```

3. **Verify Terminal 1**:
   Observe that Terminal 1 instantly receives the streaming event:
   ```
   event: sync_requested
   data: {"job_id": 1, "job_type": "sync_catalog", "account_username": "r9spoort1"}
   ```

---

### Scenario 4: Ingesting Scraped Posts via MCP Tool

Simulate the agent finishing the scrape and calling `inflow_push_scraped_posts`.

```bash
curl -s -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer inflow_bot_test_key_123" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "inflow_push_scraped_posts",
      "arguments": {
        "account_username": "r9spoort1",
        "job_id": 1,
        "posts": [
          {
            "shortcode": "TEST_SHORTCODE_001",
            "post_type": "reel",
            "url": "https://www.instagram.com/r9spoort1/reel/TEST_SHORTCODE_001/",
            "thumbnail_url": "/media/thumbnails/DehQhnjoEcr.jpg",
            "caption": "Reel testing MCP push!"
          }
        ]
      }
    }
  }' | jq .
# Expected: { "jsonrpc": "2.0", "id": 3, "result": { "isError": false, "content": [...] } }
```

---

### Scenario 5: Idempotency Lock Enforcement

Verify that duplicate comment processing calls are safely skipped without double-reply risk.

```bash
# Call 1: New comment
curl -s -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer inflow_bot_test_key_123" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "inflow_record_comment_interaction",
      "arguments": {
        "account_username": "r9spoort1",
        "shortcode": "DehQhnjoEcr",
        "comment_id": "999888777111",
        "username": "tester_user",
        "comment_text": "قیمت چنده؟",
        "trigger_matched": true,
        "comment_reply_status": "sent",
        "comment_reply_text": "پاسخ در دایرکت خدمتتان ارسال شد",
        "dm_status": "sent"
      }
    }
  }' | jq .
# Expected: already_processed: false

# Call 2: Duplicate comment with identical comment_id
curl -s -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer inflow_bot_test_key_123" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "inflow_record_comment_interaction",
      "arguments": {
        "account_username": "r9spoort1",
        "shortcode": "DehQhnjoEcr",
        "comment_id": "999888777111",
        "username": "tester_user",
        "comment_text": "قیمت چنده؟",
        "trigger_matched": true,
        "comment_reply_status": "sent"
      }
    }
  }' | jq .
# Expected: already_processed: true (Idempotency Lock Guarded!)
```
