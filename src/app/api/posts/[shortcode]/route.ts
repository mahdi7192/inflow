import { NextRequest, NextResponse } from "next/server";
import { getDb, saveAppLanguage, PostRow } from "@/lib/db";
import { getSessionUser, hasAccountAccess } from "@/lib/auth-guard";
import { getPlaybookById } from "@/lib/playbooks";

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

    const playbookId =
      typeof body.playbook_id === "string"
        ? body.playbook_id.trim() || "custom"
        : existing.playbook_id || "custom";
    const preset = getPlaybookById(playbookId);

    const cheatSheet =
      typeof body.cheat_sheet === "string"
        ? body.cheat_sheet
        : existing.cheat_sheet || "";
    const targetUrl =
      typeof body.target_url === "string"
        ? body.target_url.trim()
        : existing.target_url || "";
    const targetButtonText =
      typeof body.target_button_text === "string"
        ? body.target_button_text.trim().slice(0, 80)
        : existing.target_button_text || "";
    const smartModeration =
      body.smart_moderation !== undefined
        ? body.smart_moderation
          ? 1
          : 0
        : existing.smart_moderation || 0;

    const triggerType =
      body.trigger_type ?? preset?.defaults.trigger_type ?? existing.trigger_type;
    const triggerContext =
      body.trigger_context ?? preset?.defaults.trigger_context ?? existing.trigger_context;
    const triggerKeywords = body.trigger_keywords ?? existing.trigger_keywords;
    const commentActionType =
      body.comment_action_type ??
      preset?.defaults.comment_action_type ??
      existing.comment_action_type;
    const commentActionText =
      body.comment_action_text ??
      preset?.defaults.comment_action_text ??
      existing.comment_action_text;
    const dmActionType =
      body.dm_action_type ??
      preset?.defaults.dm_action_type ??
      existing.dm_action_type;
    const dmActionText =
      body.dm_action_text ??
      preset?.defaults.dm_action_text ??
      existing.dm_action_text;
    const dmRequireFollow =
      body.dm_require_follow !== undefined
        ? body.dm_require_follow
          ? 1
          : 0
        : preset !== undefined && body.apply_playbook_defaults
        ? preset.defaults.dm_require_follow
        : existing.dm_require_follow;

    const appLanguage =
      body.app_language && ["fa", "en", "ar"].includes(String(body.app_language))
        ? (String(body.app_language) as "fa" | "en" | "ar")
        : existing.app_language || "fa";

    if (body.app_language) {
      saveAppLanguage(appLanguage, existing.account_username);
    }

    const automationEnabledAt =
      autoReply === 1 && existing.auto_reply === 0
        ? now
        : existing.automation_enabled_at || (autoReply === 1 ? now : null);

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
        playbook_id = @playbook_id,
        cheat_sheet = @cheat_sheet,
        target_url = @target_url,
        target_button_text = @target_button_text,
        smart_moderation = @smart_moderation,
        automation_enabled_at = @automation_enabled_at,
        app_language = @app_language,
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
      playbook_id: playbookId,
      cheat_sheet: cheatSheet,
      target_url: targetUrl,
      target_button_text: targetButtonText,
      smart_moderation: smartModeration,
      automation_enabled_at: automationEnabledAt,
      app_language: appLanguage,
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
