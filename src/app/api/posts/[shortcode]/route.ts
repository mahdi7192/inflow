import { NextRequest, NextResponse } from "next/server";
import { getDb, PostRow } from "@/lib/db";
import { getSessionUser, hasAccountAccess } from "@/lib/auth-guard";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ shortcode: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 }
      );
    }

    const { shortcode } = await context.params;
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

    if (!hasAccountAccess(user, post.account_username)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: You do not have access to this Instagram account",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, post });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

async function handleUpdate(
  req: NextRequest,
  context: { params: Promise<{ shortcode: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 }
      );
    }

    const { shortcode } = await context.params;
    const body = await req.json();
    const db = getDb();

    const existing = db
      .prepare("SELECT * FROM posts WHERE shortcode = ?")
      .get(shortcode) as PostRow | undefined;

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "پست یافت نشد" },
        { status: 404 }
      );
    }

    if (!hasAccountAccess(user, existing.account_username)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: You do not have access to this Instagram account",
        },
        { status: 403 }
      );
    }

    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    const autoReply =
      body.auto_reply !== undefined
        ? body.auto_reply
          ? 1
          : 0
        : existing.auto_reply;

    const triggerType = body.trigger_type ?? existing.trigger_type;
    const triggerContext = body.trigger_context ?? existing.trigger_context;
    const triggerKeywords = body.trigger_keywords ?? existing.trigger_keywords;
    const commentActionType =
      body.comment_action_type ?? existing.comment_action_type;
    const commentActionText =
      body.comment_action_text ?? existing.comment_action_text;
    const dmActionType = body.dm_action_type ?? existing.dm_action_type;
    const dmActionText = body.dm_action_text ?? existing.dm_action_text;
    const dmRequireFollow =
      body.dm_require_follow !== undefined
        ? body.dm_require_follow
          ? 1
          : 0
        : existing.dm_require_follow;

    db.prepare(`
      UPDATE posts SET
        auto_reply = @auto_reply,
        trigger_type = @trigger_type,
        trigger_context = @trigger_context,
        trigger_keywords = @trigger_keywords,
        comment_action_type = @comment_action_type,
        comment_action_text = @comment_action_text,
        dm_action_type = @dm_action_type,
        dm_action_text = @dm_action_text,
        dm_require_follow = @dm_require_follow,
        updated_at = @updated_at
      WHERE shortcode = @shortcode
    `).run({
      shortcode,
      auto_reply: autoReply,
      trigger_type: triggerType,
      trigger_context: triggerContext,
      trigger_keywords: triggerKeywords,
      comment_action_type: commentActionType,
      comment_action_text: commentActionText,
      dm_action_type: dmActionType,
      dm_action_text: dmActionText,
      dm_require_follow: dmRequireFollow,
      updated_at: now,
    });

    const updatedPost = db
      .prepare(`
        SELECT 
          p.*,
          (SELECT COUNT(*) FROM comment_logs l WHERE l.shortcode = p.shortcode) as logs_count,
          (SELECT COUNT(*) FROM comment_logs l WHERE l.shortcode = p.shortcode AND l.dm_status = 'sent') as dms_count,
          (SELECT COUNT(*) FROM comment_logs l WHERE l.shortcode = p.shortcode AND l.comment_reply_status = 'sent') as replies_count
        FROM posts p
        WHERE p.shortcode = ?
      `)
      .get(shortcode);

    return NextResponse.json({ success: true, post: updatedPost });
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
  return handleUpdate(req, context);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ shortcode: string }> }
) {
  return handleUpdate(req, context);
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ shortcode: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 }
      );
    }

    const { shortcode } = await context.params;
    const db = getDb();
    const existing = db
      .prepare("SELECT account_username FROM posts WHERE shortcode = ?")
      .get(shortcode) as { account_username: string } | undefined;

    if (existing && !hasAccountAccess(user, existing.account_username)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: You do not have access to this Instagram account",
        },
        { status: 403 }
      );
    }

    db.prepare("DELETE FROM posts WHERE shortcode = ?").run(shortcode);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
