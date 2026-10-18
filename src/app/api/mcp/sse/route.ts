import { NextRequest, NextResponse } from "next/server";
import { authenticateMcpRequest } from "@/lib/mcp/auth-guard";
import { AgentStreamManager } from "@/lib/mcp/sse-manager";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticateMcpRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json(
      { error: "Unauthorized: Valid API token required" },
      { status: 401 }
    );
  }

  const sessionId = "sess_" + crypto.randomBytes(12).toString("hex");
  const account = auth.accountUsername || req.nextUrl.searchParams.get("account") || "*";

  let pingInterval: NodeJS.Timeout | null = null;
  let isCleanedUp = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      AgentStreamManager.register({
        sessionId,
        accountUsername: account,
        connectedAt: new Date(),
        lastPingAt: new Date(),
        controller,
      });

      // Send initial endpoint announcement
      const origin = req.nextUrl.origin || "";
      const endpointUri = `${origin}/api/mcp?sessionId=${sessionId}`;
      const initialMessage = `event: endpoint\ndata: ${endpointUri}\n\n`;
      controller.enqueue(new TextEncoder().encode(initialMessage));

      // Periodic ping every 25 seconds
      pingInterval = setInterval(() => {
        try {
          const pingMessage = `event: ping\ndata: {"timestamp":${Date.now()}}\n\n`;
          controller.enqueue(new TextEncoder().encode(pingMessage));
        } catch {
          if (pingInterval) clearInterval(pingInterval);
          AgentStreamManager.unregister(sessionId);
        }
      }, 25000);
    },
    cancel() {
      if (isCleanedUp) return;
      isCleanedUp = true;
      if (pingInterval) clearInterval(pingInterval);
      AgentStreamManager.unregister(sessionId);
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
