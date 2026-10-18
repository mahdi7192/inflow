# Configuration Schema: Hermes Agent Profile & MCP Binding

**Target Runtime**: Hermes Agent / Claude Desktop / Cursor / Local LLM Worker
**Protocol**: Model Context Protocol (MCP) 2024-11-05
**Binding Model**: 1-to-1 Profile-to-Page Isolation

---

## 1. Remote HTTP / SSE Profile Configuration

For Hermes bot profiles running on remote Linux servers or Docker containers connecting to the inFlow Control Plane via HTTP/SSE.

### Schema: `config.json` (or `hermes.json`)

```json
{
  "mcpServers": {
    "inflow": {
      "url": "https://inflow.example.com/api/mcp",
      "headers": {
        "Authorization": "Bearer inf_3f789d20c54a8b1e4f6291a0c8d7e6f54b3a2c1e0f9d8c7b"
      }
    }
  }
}
```

### Properties:
- `url` (string, required): Full URL to inFlow's `/api/mcp` endpoint.
- `headers.Authorization` (string, required): Format `Bearer inf_<hex_token>`.
- Tool calls and SSE streams will automatically inherit this Bearer token.

---

## 2. Local CLI Stdio Profile Configuration

For Hermes bots running directly on the same server as the inFlow repository using standard input/output (`stdio`) transport.

### Schema: `config.json`

```json
{
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
```

---

## 3. Security & Isolation Guarantees

1. **Profile Isolation**: Each Hermes profile on the server MUST configure its own `inflow` entry with its page's unique token. Multiple Hermes profiles MUST NOT share the same `inf_...` token.
2. **Restricted Tool Scope**: When an agent authenticates using `inf_...`, inFlow's MCP server restricts tool calls (`inflow_get_active_automations`, `inflow_push_scraped_posts`, `inflow_record_comment_interaction`) to that page only. Attempting to pass a different `account_username` parameter in tool calls causes an immediate permission error.
