import { NextRequest, NextResponse } from "next/server";
import { authenticateMcpRequest } from "@/lib/mcp/auth-guard";
import { INFLOW_MCP_TOOLS } from "@/lib/mcp/tool-catalog";
import { executeMcpTool } from "@/lib/mcp/tool-executor";
import { AgentStreamManager } from "@/lib/mcp/sse-manager";
import { JsonRpcRequest } from "@/lib/mcp/types";
import crypto from "crypto";

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = {
  name: "inFlow MCP Server",
  version: "1.0.0",
};

/**
 * GET /api/mcp
 * Dual behavior:
 * - If Accept: text/event-stream -> Opens SSE stream
 * - Otherwise -> Returns JSON health check status
 */
export async function GET(req: NextRequest) {
  const acceptHeader = req.headers.get("accept") || "";

  if (acceptHeader.includes("text/event-stream")) {
    const auth = await authenticateMcpRequest(req);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: "Unauthorized: Valid API token required" },
        { status: 401 }
      );
    }

    const sessionId = "sess_" + crypto.randomBytes(12).toString("hex");
    const account = auth.accountUsername || "*";

    let cleanupStream: (() => void) | null = null;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        AgentStreamManager.register({
          sessionId,
          accountUsername: account,
          connectedAt: new Date(),
          lastPingAt: new Date(),
          controller,
        });

        // Send initial endpoint message per MCP standard
        const origin = req.nextUrl.origin || "";
        const endpointUri = `${origin}/api/mcp?sessionId=${sessionId}`;
        const initialMsg = `event: endpoint\ndata: ${endpointUri}\n\n`;
        controller.enqueue(new TextEncoder().encode(initialMsg));

        cleanupStream = () => {
          AgentStreamManager.unregister(sessionId);
        };
      },
      cancel() {
        if (cleanupStream) cleanupStream();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  // Non-SSE Health Check Fallback
  return NextResponse.json(
    {
      name: SERVER_INFO.name,
      status: "active",
      version: SERVER_INFO.version,
      protocolVersion: PROTOCOL_VERSION,
      toolsCount: INFLOW_MCP_TOOLS.length,
      activeSseConnections: AgentStreamManager.getActiveCount(),
    },
    { status: 200 }
  );
}

/**
 * POST /api/mcp
 * Handles MCP JSON-RPC 2.0 requests:
 * initialize, ping, notifications/initialized, tools/list, tools/call
 */
export async function POST(req: NextRequest) {
  let body: JsonRpcRequest;
  try {
    const text = await req.text();
    if (!text || !text.trim()) {
      // Empty POST body fallback to initialize per MCP protocol guidelines
      body = {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {},
      };
    } else {
      body = JSON.parse(text);
    }
  } catch {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: "Parse error: Invalid JSON payload received",
        },
      },
      { status: 400 }
    );
  }

  const id = body.id ?? null;
  const method = body.method;

  // Handle notifications: MUST return HTTP 202 Accepted with empty body
  if (method && method.startsWith("notifications/")) {
    return new Response(null, { status: 202 });
  }

  // Handle ping without requiring strict authentication
  if (method === "ping") {
    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      result: {},
    });
  }

  // Handle initialize
  if (method === "initialize") {
    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {
          tools: {
            listChanged: false,
          },
          prompts: {},
          resources: {},
        },
        serverInfo: SERVER_INFO,
      },
    });
  }

  // Authentication check for all operations (tools/list, tools/call)
  const auth = await authenticateMcpRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32001,
          message: `Unauthorized: ${auth.error || "Valid token required"}`,
        },
      },
      { status: 401 }
    );
  }

  // Handle tools/list
  if (method === "tools/list") {
    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      result: {
        tools: INFLOW_MCP_TOOLS,
      },
    });
  }

  // Handle tools/call
  if (method === "tools/call") {
    const params = body.params || {};
    const toolName = String(params.name || "").trim();
    const args = (params.arguments as Record<string, unknown>) || {};

    if (!toolName) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32602,
            message: "Invalid params: Missing tool name",
          },
        },
        { status: 400 }
      );
    }

    try {
      const toolResult = await executeMcpTool(toolName, args, auth);
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: toolResult,
      });
    } catch (err) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32603,
            message: `Tool execution failed: ${(err as Error).message}`,
          },
        },
        { status: 500 }
      );
    }
  }

  // Method not recognized
  return NextResponse.json(
    {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32601,
        message: `Method not found: ${method}`,
      },
    },
    { status: 404 }
  );
}
