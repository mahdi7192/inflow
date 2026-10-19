import { NextRequest, NextResponse } from "next/server";
import { getDb, updateAccountProfileFromAgent } from "@/lib/db";
import { getSessionUser, hasAccountAccess } from "@/lib/auth-guard";
import { authenticateMcpRequest } from "@/lib/mcp/auth-guard";
import { AgentStreamManager } from "@/lib/mcp/sse-manager";
import { ServerOrchestrator } from "@/lib/server-orchestrator";

export async function POST(req: NextRequest) {
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
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const accountUsername = String(
      body.account || body.account_username || botAccount || ""
    ).trim();

    // Verify tenancy if target account specified and authenticated as web user
    if (authUser && accountUsername && !hasAccountAccess(authUser, accountUsername)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: You do not have access to this Instagram account",
        },
        { status: 403 }
      );
    }

    // Lazy Profile Metadata Enrichment from Agent
    if (body.profile && typeof body.profile === "object" && accountUsername) {
      const p = body.profile as Record<string, string | undefined>;
      updateAccountProfileFromAgent(accountUsername, {
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        bio: p.bio,
        followers_text: p.followers_text,
      });
    }

    // Case 1: If worker pushes an array of scraped posts during sync
    if (Array.isArray(body.posts) && body.posts.length > 0) {
      const upsertPost = db.prepare(`
        INSERT INTO posts (
          account_username, shortcode, media_id, url, post_type, thumbnail_url, caption,
          synced_at, updated_at, sort_index
        ) VALUES (
          @account_username, @shortcode, @media_id, @url, @post_type, @thumbnail_url, @caption,
          @synced_at, @updated_at, @sort_index
        )
        ON CONFLICT(shortcode) DO UPDATE SET
          caption = COALESCE(NULLIF(excluded.caption, ''), posts.caption),
          thumbnail_url = COALESCE(NULLIF(excluded.thumbnail_url, ''), posts.thumbnail_url),
          synced_at = excluded.synced_at,
          updated_at = excluded.updated_at
      `);

      let insertedCount = 0;
      const tx = db.transaction((items: Record<string, unknown>[]) => {
        items.forEach((item, idx) => {
          const sc = String(item.shortcode || "").trim();
          if (!sc) return;
          const acc = String(item.account_username || accountUsername || "r9spoort1");
          upsertPost.run({
            account_username: acc,
            shortcode: sc,
            media_id: String(item.media_id || ""),
            url: String(item.url || `https://www.instagram.com/${acc}/p/${sc}/`),
            post_type: item.post_type === "post" ? "post" : "reel",
            thumbnail_url: String(
              item.thumbnail_url || "/media/thumbnails/DehQhnjoEcr.jpg"
            ),
            caption: String(item.caption || ""),
            synced_at: now,
            updated_at: now,
            sort_index: idx,
          });
          insertedCount++;
        });
      });

      tx(body.posts as Record<string, unknown>[]);

      // If tied to a job ID, complete the job
      const jobId = body.job_id ? Number(body.job_id) : null;
      if (jobId) {
        db.prepare(`
          UPDATE agent_jobs
          SET status = 'completed',
              result_summary = ?,
              completed_at = ?
          WHERE id = ?
        `).run(
          JSON.stringify({ synced_count: insertedCount }),
          now,
          jobId
        );
      }

      if (accountUsername) {
        db.prepare(
          "UPDATE accounts SET last_heartbeat_at = ?, updated_at = ? WHERE username = ?"
        ).run(now, now, accountUsername);
      }

      const countRow = (
        accountUsername
          ? db.prepare("SELECT COUNT(*) as total FROM posts WHERE account_username = ?").get(accountUsername)
          : db.prepare("SELECT COUNT(*) as total FROM posts").get()
      ) as { total: number };

      return NextResponse.json({
        success: true,
        synced_at: now,
        synced_count: insertedCount,
        stats: { total: countRow.total },
      });
    }

    // Case 2: On-demand Sync triggered by UI operator
    const targetAccount = accountUsername || "r9spoort1";

    // Insert job into agent_jobs
    const insertJob = db.prepare(`
      INSERT INTO agent_jobs (
        account_username, job_type, status, payload, created_at
      ) VALUES (?, 'sync_catalog', 'pending', ?, ?)
    `);

    const jobPayload = JSON.stringify({
      requested_by: authUser ? authUser.username : "api_client",
      force_full: Boolean(body.force_full),
    });

    const info = insertJob.run(targetAccount, jobPayload, now);
    const jobId = Number(info.lastInsertRowid);

    // Broadcast real-time SSE event to active agent streams (Option C)
    const streamsReached = AgentStreamManager.broadcastToAccount(
      targetAccount,
      "sync_requested",
      {
        job_id: jobId,
        job_type: "sync_catalog",
        account_username: targetAccount,
        requested_at: now,
        parameters: { force_full: Boolean(body.force_full) },
      }
    );

    // If no real-time SSE stream is listening, execute isolated sync via ServerOrchestrator
    if (streamsReached === 0) {
      if (body.wait || body.await_sync) {
        try {
          const syncResult = await ServerOrchestrator.syncAccount(targetAccount);
          const countRow = db
            .prepare("SELECT COUNT(*) as total FROM posts WHERE account_username = ?")
            .get(targetAccount) as { total: number } | undefined;
          return NextResponse.json({
            success: syncResult.success,
            job_id: jobId,
            status: syncResult.success ? "completed" : "failed",
            posts_synced: syncResult.posts_synced || countRow?.total || 0,
            followers_text: syncResult.followers_text || "",
            error: syncResult.error,
            stats: { total: countRow?.total || 0 },
            message: syncResult.success
              ? "Sync completed successfully"
              : syncResult.error || "Sync failed",
          });
        } catch (err: unknown) {
          return NextResponse.json(
            {
              success: false,
              error: (err as Error).message,
              status: "failed",
            },
            { status: 500 }
          );
        }
      }

      ServerOrchestrator.syncAccount(targetAccount).catch((err) => {
        console.error(`[Sync] Background sync failed for ${targetAccount}:`, err);
      });
    }

    return NextResponse.json({
      success: true,
      job_id: jobId,
      status: "dispatched",
      streams_reached: streamsReached,
      agent_online: streamsReached > 0,
      account_username: targetAccount,
      message:
        streamsReached > 0
          ? "Sync event dispatched in real-time over active agent stream"
          : "Sync job queued in database and triggered via isolated server orchestrator.",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
