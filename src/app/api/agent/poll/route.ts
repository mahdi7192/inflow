import { NextRequest, NextResponse } from "next/server";
import { getDb, PostRow, DMAutomationRow } from "@/lib/db";

/**
 * Hermes Agent Control Plane Polling Endpoint
 * Called every ~2 minutes by the background agent on the Linux server.
 * GET /api/agent/poll?account=r9spoort1
 */
export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const account = searchParams.get("account");
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    // Validate Authorization Bearer token if provided
    const authHeader = req.headers.get("authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      const binding = db
        .prepare("SELECT * FROM account_bot_bindings WHERE api_token = ?")
        .get(token) as { id: number; account_username: string } | undefined;

      if (!binding) {
        return NextResponse.json(
          { success: false, error: "Invalid or revoked API token" },
          { status: 401 }
        );
      }

      if (account && binding.account_username !== account) {
        return NextResponse.json(
          { success: false, error: "Token not authorized for this account" },
          { status: 403 }
        );
      }

      db.prepare("UPDATE account_bot_bindings SET last_heartbeat_at = ? WHERE id = ?").run(
        now,
        binding.id
      );
    }

    if (account) {
      db.prepare(
        "UPDATE accounts SET last_heartbeat_at = ? WHERE username = ?"
      ).run(now, account);

      const acc = db.prepare("SELECT status, bot_status FROM accounts WHERE username = ?").get(account) as { status: string; bot_status: string } | undefined;
      if (acc && (acc.status === "paused" || acc.bot_status === "paused")) {
        return NextResponse.json({
          success: true,
          polled_at: now,
          paused: true,
          active_count: 0,
          active_posts: [],
          message: "اتوماسیون برای این اکانت متوقف است.",
        });
      }
    } else {
      db.prepare("UPDATE accounts SET last_heartbeat_at = ?").run(now);
    }

    let postsQuery = `
      SELECT * FROM posts
      WHERE auto_reply = 1
    `;
    const params: string[] = [];

    if (account) {
      postsQuery += " AND account_username = ?";
      params.push(account);
    }

    postsQuery += " ORDER BY updated_at DESC";

    const activePosts = db.prepare(postsQuery).all(...params) as PostRow[];

    const getProcessedIds = db.prepare(
      "SELECT comment_id FROM comment_logs WHERE shortcode = ?"
    );

    const payload = activePosts.map((post) => {
      const processedRows = getProcessedIds.all(post.shortcode) as {
        comment_id: string;
      }[];
      return {
        account_username: post.account_username,
        shortcode: post.shortcode,
        url: post.url,
        post_type: post.post_type,
        caption: post.caption,
        rules: {
          trigger_type: post.trigger_type,
          trigger_context: post.trigger_context,
          trigger_keywords: post.trigger_keywords
            ? post.trigger_keywords
                .split(",")
                .map((k) => k.trim())
                .filter(Boolean)
            : [],
          comment_action: {
            type: post.comment_action_type,
            text: post.comment_action_text,
          },
          dm_action: {
            type: post.dm_action_type,
            text: post.dm_action_text,
            require_follow: post.dm_require_follow === 1,
          },
        },
        processed_comment_ids: processedRows.map((r) => r.comment_id),
      };
    });

    let dmAutomationPayload: any = null;
    let processedDmIds: string[] = [];

    if (account) {
      const dmRow = db
        .prepare("SELECT * FROM dm_automations WHERE account_username = ?")
        .get(account) as DMAutomationRow | undefined;

      if (dmRow) {
        dmAutomationPayload = {
          enabled: dmRow.enabled,
          trigger_type: dmRow.trigger_type,
          trigger_context: dmRow.trigger_context,
          trigger_keywords: dmRow.trigger_keywords
            ? dmRow.trigger_keywords
                .split(",")
                .map((k) => k.trim())
                .filter(Boolean)
            : [],
          reply_mode: dmRow.reply_mode,
          direct_reply_text: dmRow.direct_reply_text,
          ai_prompt_instructions: dmRow.ai_prompt_instructions,
          require_follow: dmRow.require_follow,
          follow_prompt_text: dmRow.follow_prompt_text,
          story_handling_mode: dmRow.story_handling_mode,
        };

        const recentDmLogs = db
          .prepare("SELECT message_id FROM dm_logs WHERE account_username = ? ORDER BY processed_at DESC LIMIT 200")
          .all(account) as { message_id: string }[];
        processedDmIds = recentDmLogs.map((l) => l.message_id);
      }
    }

    return NextResponse.json({
      success: true,
      polled_at: now,
      active_count: payload.length,
      active_posts: payload,
      dm_automation: dmAutomationPayload,
      processed_dm_ids: processedDmIds,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
