# API Contract: Per-Page Token Management & Inbound Validation

**Endpoint Group**: `/api/backoffice/accounts/[username]/token` & Inter-plane validation
**Authentication**:
- Administrative inspection/rotation: Session Cookie (`role: 'superadmin'`)
- Inter-plane execution: HTTP Bearer Token (`Authorization: Bearer inf_...`)

---

## 1. Inspect Page Token & MCP Configuration

### `GET /api/backoffice/accounts/[username]/token`

Allows Superadmins to inspect the active token for an account and fetch pre-rendered configuration snippets for Hermes Agent.

#### Response: `200 OK`

```json
{
  "success": true,
  "account_username": "r9spoort1",
  "bot_profile_id": "hermes-r9spoort1",
  "api_token": "inf_3f789d20c54a8b1e4f6291a0c8d7e6f54b3a2c1e0f9d8c7b",
  "created_at": "2026-10-18 10:00:00",
  "updated_at": "2026-10-18 10:00:00",
  "last_heartbeat_at": "2026-10-18 17:45:00",
  "hermes_mcp_config": {
    "http_sse": {
      "mcpServers": {
        "inflow": {
          "url": "http://localhost:3000/api/mcp",
          "headers": {
            "Authorization": "Bearer inf_3f789d20c54a8b1e4f6291a0c8d7e6f54b3a2c1e0f9d8c7b"
          }
        }
      }
    },
    "stdio": {
      "mcpServers": {
        "inflow": {
          "command": "node",
          "args": ["dist/cli/mcp.mjs"],
          "env": {
            "INFLOW_API_TOKEN": "inf_3f789d20c54a8b1e4f6291a0c8d7e6f54b3a2c1e0f9d8c7b",
            "INFLOW_ACCOUNT": "r9spoort1"
          }
        }
      }
    }
  }
}
```

---

## 2. Regenerate Page Token (Instant Rotation)

### `POST /api/backoffice/accounts/[username]/token`

Immediately invalidates the current token and issues a new cryptographically secure token.

#### Response: `200 OK`

```json
{
  "success": true,
  "message": "Token regenerated successfully. Previous token has been revoked.",
  "account_username": "r9spoort1",
  "bot_profile_id": "hermes-r9spoort1",
  "new_api_token": "inf_9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f",
  "updated_at": "2026-10-18 18:20:00"
}
```

---

## 3. Inbound Inter-Plane Token Validation Contract

Used by execution endpoints (`/api/agent/poll`, `/api/mcp`, `/api/posts/[shortcode]/logs`):

```text
Header: Authorization: Bearer <token>
Query/Body: target account_username
```

### Verification Rules:
1. Extract Bearer token from header.
2. Query `account_bot_bindings WHERE api_token = ?`.
3. If not found: return HTTP `401 Unauthorized` (`{ "success": false, "error": "Invalid or revoked API token" }`).
4. Compare `binding.account_username` with the requested operation's target account.
5. If mismatch: return HTTP `403 Forbidden` (`{ "success": false, "error": "Token not authorized for this account" }`).
6. Update `account_bot_bindings.last_heartbeat_at = now()` and proceed.
