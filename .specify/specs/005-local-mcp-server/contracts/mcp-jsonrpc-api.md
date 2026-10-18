# Contract: MCP JSON-RPC 2.0 API & Transport Protocol

## Overview

The `inFlow` Model Context Protocol (MCP) server implements the standard Model Context Protocol specification (`protocolVersion: "2024-11-05"`) over dual transports: HTTP/SSE and Stdio.

---

## 1. Transport Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/mcp` / `/api/mcp/sse` | **SSE Connection**: When `Accept: text/event-stream` is requested, initiates persistent SSE connection.<br>**Health Check**: If standard HTTP `Accept: application/json` is requested, returns server health JSON. |
| `POST` | `/api/mcp` / `/api/mcp/messages` | **JSON-RPC Message Endpoint**: Handles all client tool invocations, initialization, and queries. |

### Authentication

Supported authentication methods (any of the following):
1. `Authorization: Bearer <API_TOKEN>`
2. `x-api-key: <API_TOKEN>`
3. Query parameter: `?token=<API_TOKEN>` or `?apiKey=<API_TOKEN>`

If unauthenticated or invalid token, returns HTTP 401:
```json
{
  "jsonrpc": "2.0",
  "id": null,
  "error": {
    "code": -32001,
    "message": "Unauthorized: Valid API token required"
  }
}
```

---

## 2. Core Protocol Methods

### A. `initialize`

Client initiates connection and negotiates protocol capabilities.

#### Request:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "roots": { "listChanged": true },
      "sampling": {}
    },
    "clientInfo": {
      "name": "Hermes Agent",
      "version": "1.0.0"
    }
  }
}
```

#### Response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": { "listChanged": false },
      "prompts": {},
      "resources": {}
    },
    "serverInfo": {
      "name": "inFlow MCP Server",
      "version": "1.0.0"
    }
  }
}
```

---

### B. `notifications/initialized`

Client notification acknowledging successful initialization.

#### Request:
```json
{
  "jsonrpc": "2.0",
  "method": "notifications/initialized"
}
```

#### Response:
HTTP 202 Accepted (empty body).

---

### C. `ping`

Keepalive check.

#### Request:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "ping"
}
```

#### Response:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {}
}
```

---

### D. `tools/list`

Discovers all available inFlow tools and their parameter schemas.

#### Request:
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/list"
}
```

#### Response:
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "tools": [
      {
        "name": "inflow_list_accounts",
        "description": "List all Instagram accounts managed by inFlow and their current automation status.",
        "inputSchema": {
          "type": "object",
          "properties": {},
          "required": []
        }
      },
      {
        "name": "inflow_get_active_automations",
        "description": "Retrieve active posts/reels and their auto-reply rules for an Instagram account.",
        "inputSchema": {
          "type": "object",
          "properties": {
            "account_username": {
              "type": "string",
              "description": "Target Instagram username (e.g. 'r9spoort1')"
            }
          },
          "required": ["account_username"]
        }
      }
    ]
  }
}
```

---

### E. `tools/call`

Executes a specific inFlow tool.

#### Request:
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "inflow_get_active_automations",
    "arguments": {
      "account_username": "r9spoort1"
    }
  }
}
```

#### Response:
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"account\":\"r9spoort1\",\"active_count\":2,\"posts\":[...]}"
      }
    ],
    "isError": false
  }
}
```

---

## 3. Standard JSON-RPC Error Codes

| Error Code | Meaning | Description |
| :--- | :--- | :--- |
| `-32700` | Parse Error | Invalid JSON was received by the server. |
| `-32600` | Invalid Request | The JSON sent is not a valid Request object. |
| `-32601` | Method Not Found | The method does not exist or is not available. |
| `-32602` | Invalid Params | Invalid tool arguments or missing required fields. |
| `-32603` | Internal Error | Internal database or server execution failure. |
| `-32001` | Unauthorized / Forbidden | Missing token or account tenancy violation. |
