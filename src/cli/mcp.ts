#!/usr/bin/env node
import readline from "readline";
import { getDb } from "../lib/db";
import { INFLOW_MCP_TOOLS } from "../lib/mcp/tool-catalog";
import { executeMcpTool } from "../lib/mcp/tool-executor";
import { McpAuthContext } from "../lib/mcp/auth-guard";
import { JsonRpcRequest } from "../lib/mcp/types";

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = {
  name: "inFlow MCP Server (Stdio)",
  version: "1.0.0",
};

// Parse optional --token or --account from process.argv
let token = process.env.INFLOW_MCP_TOKEN || "";
let account = process.env.INFLOW_MCP_ACCOUNT || "";

for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === "--token" && process.argv[i + 1]) {
    token = process.argv[++i];
  } else if (process.argv[i] === "--account" && process.argv[i + 1]) {
    account = process.argv[++i];
  }
}

// In local stdio mode, default to superadmin or first account if no token specified
const db = getDb();
let authContext: McpAuthContext = {
  authenticated: true,
  isSuperadmin: true,
  accountUsername: account || undefined,
};

if (token) {
  const binding = db
    .prepare("SELECT * FROM account_bot_bindings WHERE api_token = ?")
    .get(token) as { account_username: string } | undefined;

  if (binding) {
    authContext = {
      authenticated: true,
      isSuperadmin: false,
      accountUsername: binding.account_username,
    };
  }
}

function sendJson(response: unknown): void {
  process.stdout.write(JSON.stringify(response) + "\n");
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", async (line: string) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let request: JsonRpcRequest;
  try {
    request = JSON.parse(trimmed);
  } catch {
    sendJson({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: "Parse error: Invalid JSON" },
    });
    return;
  }

  const id = request.id ?? null;
  const method = request.method;

  if (method && method.startsWith("notifications/")) {
    return;
  }

  if (method === "ping") {
    sendJson({ jsonrpc: "2.0", id, result: {} });
    return;
  }

  if (method === "initialize") {
    sendJson({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      },
    });
    return;
  }

  if (method === "tools/list") {
    sendJson({
      jsonrpc: "2.0",
      id,
      result: { tools: INFLOW_MCP_TOOLS },
    });
    return;
  }

  if (method === "tools/call") {
    const params = request.params || {};
    const toolName = String(params.name || "").trim();
    const args = (params.arguments as Record<string, unknown>) || {};

    try {
      const result = await executeMcpTool(toolName, args, authContext);
      sendJson({ jsonrpc: "2.0", id, result });
    } catch (err) {
      sendJson({
        jsonrpc: "2.0",
        id,
        error: { code: -32603, message: (err as Error).message },
      });
    }
    return;
  }

  sendJson({
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: `Method not found: ${method}` },
  });
});
