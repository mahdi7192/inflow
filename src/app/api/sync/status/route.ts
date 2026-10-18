import { NextRequest, NextResponse } from "next/server";
import { getDb, cleanupStaleAgentJobs } from "@/lib/db";
import { getSessionUser, hasAccountAccess } from "@/lib/auth-guard";
import { authenticateMcpRequest } from "@/lib/mcp/auth-guard";
import { AgentStreamManager } from "@/lib/mcp/sse-manager";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getSessionUser();
    let botAccount = "";

    if (!authUser) {
      const mcpAuth = await authenticateMcpRequest(req);
      if (mcpAuth.authenticated) {
        botAccount = mcpAuth.accountUsername || "";
      } else {
        return NextResponse.json(
          { success: false, error: "Unauthenticated" },
          { status: 401 }
        );
      }
    }

    const db = getDb();
    cleanupStaleAgentJobs(db);

    const { searchParams } = new URL(req.url);
    const account = (searchParams.get("account") || botAccount || "").trim();
    const jobId = searchParams.get("job_id");

    if (authUser && account && !hasAccountAccess(authUser, account)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    let job: Record<string, unknown> | undefined;

    if (jobId) {
      job = db
        .prepare("SELECT * FROM agent_jobs WHERE id = ?")
        .get(Number(jobId)) as Record<string, unknown> | undefined;
    } else if (account) {
      job = db
        .prepare(
          "SELECT * FROM agent_jobs WHERE account_username = ? ORDER BY id DESC LIMIT 1"
        )
        .get(account) as Record<string, unknown> | undefined;
    }

    const isConnectedSse = account
      ? AgentStreamManager.isAccountConnected(account)
      : AgentStreamManager.getActiveCount() > 0;

    // Check last heartbeat from account record
    let isHeartbeatFresh = false;
    if (account) {
      const accRow = db
        .prepare("SELECT last_heartbeat_at FROM accounts WHERE username = ?")
        .get(account) as { last_heartbeat_at: string | null } | undefined;

      if (accRow?.last_heartbeat_at) {
        const lastHb = new Date(accRow.last_heartbeat_at).getTime();
        const diffMs = Date.now() - lastHb;
        isHeartbeatFresh = diffMs < 3 * 60 * 1000; // < 3 minutes
      }
    }

    return NextResponse.json({
      success: true,
      job: job
        ? {
            id: job.id,
            account_username: job.account_username,
            job_type: job.job_type,
            status: job.status,
            result_summary:
              typeof job.result_summary === "string"
                ? JSON.parse(job.result_summary || "{}")
                : job.result_summary,
            error_message: job.error_message,
            created_at: job.created_at,
            started_at: job.started_at,
            completed_at: job.completed_at,
          }
        : null,
      agent_status: {
        sse_connected: isConnectedSse,
        heartbeat_active: isHeartbeatFresh,
        is_online: isConnectedSse || isHeartbeatFresh,
        active_sse_streams: AgentStreamManager.getActiveCount(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
