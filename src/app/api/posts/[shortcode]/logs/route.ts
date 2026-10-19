import { NextRequest, NextResponse } from "next/server";
import { getDb, CommentLogRow, PostRow } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ shortcode: string }> }
) {
  try {
    const { shortcode } = await context.params;
    const db = getDb();

    const logs = db
      .prepare(
        `SELECT l.* FROM comment_logs l
         LEFT JOIN posts p ON l.shortcode = p.shortcode
         WHERE l.shortcode = ?
           AND (l.username IS NULL OR LOWER(l.username) != LOWER(COALESCE(p.account_username, '')))
         ORDER BY l.id DESC`
      )
      .all(shortcode) as CommentLogRow[];

    const totalComments = logs.length;
    const triggerMatches = logs.filter((l) => l.trigger_matched === 1).length;
    const commentsReplied = logs.filter(
      (l) => l.comment_reply_status === "sent"
    ).length;
    const dmsSent = logs.filter((l) => l.dm_status === "sent").length;
    const pendingCount = logs.filter(
      (l) => l.dm_status === "pending_follow" || l.comment_reply_status === "locked"
    ).length;

    return NextResponse.json({
      shortcode,
      summary: {
        total_comments: totalComments,
        trigger_matches: triggerMatches,
        comments_replied: commentsReplied,
        dms_sent: dmsSent,
        pending_count: pendingCount,
      },
      logs,
      pending: logs.filter((l) => l.dm_status === "pending_follow"),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ shortcode: string }> }
) {
  try {
    const { shortcode } = await context.params;
    const body = await req.json();
    const db = getDb();

    const post = db
      .prepare("SELECT * FROM posts WHERE shortcode = ?")
      .get(shortcode) as PostRow | undefined;

    if (!post) {
      return NextResponse.json(
        { success: false, error: "پست یافت نشد" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    const commentId =
      body.comment_id ||
      `sim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // Check if comment_id is already locked/processed (idempotency check)
    const existingLog = db
      .prepare("SELECT * FROM comment_logs WHERE comment_id = ?")
      .get(commentId) as CommentLogRow | undefined;

    if (existingLog && !body.force_update) {
      return NextResponse.json({
        success: true,
        already_processed: true,
        log: existingLog,
      });
    }

    db.prepare(`
      INSERT INTO comment_logs (
        comment_id, account_username, shortcode, media_id, user_id, username,
        comment_text, trigger_matched, comment_reply_status, comment_reply_text,
        dm_status, dm_text, created_at, processed_at
      ) VALUES (
        @comment_id, @account_username, @shortcode, @media_id, @user_id, @username,
        @comment_text, @trigger_matched, @comment_reply_status, @comment_reply_text,
        @dm_status, @dm_text, @created_at, @processed_at
      )
      ON CONFLICT(comment_id) DO UPDATE SET
        trigger_matched = excluded.trigger_matched,
        comment_reply_status = excluded.comment_reply_status,
        comment_reply_text = excluded.comment_reply_text,
        dm_status = excluded.dm_status,
        dm_text = excluded.dm_text,
        processed_at = excluded.processed_at
    `).run({
      comment_id: commentId,
      account_username: post.account_username,
      shortcode,
      media_id: body.media_id || post.media_id || "",
      user_id: body.user_id || "",
      username: String(body.username || "instagram_user").replace(/^@/, ""),
      comment_text: body.comment_text || "",
      trigger_matched: body.trigger_matched ? 1 : 0,
      comment_reply_status: body.comment_reply_status || "none",
      comment_reply_text: body.comment_reply_text || "",
      dm_status: body.dm_status || "none",
      dm_text: body.dm_text || "",
      created_at: body.created_at || now,
      processed_at: now,
    });

    const savedLog = db
      .prepare("SELECT * FROM comment_logs WHERE comment_id = ?")
      .get(commentId);

    return NextResponse.json({
      success: true,
      already_processed: false,
      log: savedLog,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
