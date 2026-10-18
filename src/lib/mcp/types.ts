/**
 * Model Context Protocol (MCP) & JSON-RPC 2.0 Types
 * Specification Protocol Version: 2024-11-05
 */

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponseSuccess {
  jsonrpc: "2.0";
  id: string | number | null;
  result: unknown;
}

export interface JsonRpcErrorObject {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcResponseError {
  jsonrpc: "2.0";
  id: string | number | null;
  error: JsonRpcErrorObject;
}

export type JsonRpcResponse = JsonRpcResponseSuccess | JsonRpcResponseError;

export interface McpToolProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: Record<string, unknown>;
}

export interface McpToolInputSchema {
  type: "object";
  properties: Record<string, McpToolProperty | Record<string, unknown>>;
  required?: string[];
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: McpToolInputSchema;
}

export interface McpToolCallResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}

export interface AgentJobRow {
  id: number;
  account_username: string;
  job_type: "sync_catalog" | "check_dms" | "process_post" | string;
  status: "pending" | "running" | "completed" | "failed" | "timed_out";
  payload: string;
  result_summary: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface AccountBotBindingRow {
  id: number;
  account_username: string;
  bot_profile_id: string;
  api_token: string;
  webhook_url: string | null;
  last_heartbeat_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActiveAgentStream {
  sessionId: string;
  accountUsername: string;
  botProfileId?: string;
  connectedAt: Date;
  lastPingAt: Date;
  controller: ReadableStreamDefaultController<Uint8Array>;
}
