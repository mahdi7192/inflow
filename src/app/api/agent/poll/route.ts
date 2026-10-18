import { NextRequest, NextResponse } from "next/server";
import { getDb, PostRow } from "@/lib/db";

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

    if (account) {
      db.prepare(
        "UPDATE accounts SET last_heartbeat_at = ? WHERE username = ?"
      ).run(now, account);
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

    return NextResponse.json({
      success: true,
      polled_at: now,
      active_count: payload.length,
      active_posts: payload,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
