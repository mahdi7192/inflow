import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasAccountAccess } from "@/lib/auth-guard";
import { getDb, DMAutomationRow } from "@/lib/db";

interface RouteParams {
  params: Promise<{
    username: string;
  }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." },
        { status: 401 }
      );
    }

    const { username } = await params;
    const cleanUsername = username.trim().toLowerCase();

    if (!hasAccountAccess(user, cleanUsername)) {
      return NextResponse.json(
        { success: false, error: "دسترسی مجاز به این حساب را ندارید." },
        { status: 403 }
      );
    }

    const db = getDb();
    const account = db.prepare("SELECT username FROM accounts WHERE username = ?").get(cleanUsername);
    if (!account) {
      return NextResponse.json(
        { success: false, error: "حساب کاربری یافت نشد." },
        { status: 404 }
      );
    }

    let automation = db
      .prepare("SELECT * FROM dm_automations WHERE account_username = ?")
      .get(cleanUsername) as DMAutomationRow | undefined;

    if (!automation) {
      const now = new Date().toISOString().replace("T", " ").slice(0, 19);
      db.prepare(`
        INSERT INTO dm_automations (
          account_username, enabled, trigger_type, trigger_context, trigger_keywords,
          reply_mode, direct_reply_text, ai_prompt_instructions, web_context_urls,
          mcp_servers_config, require_follow, follow_prompt_text, story_handling_mode,
          updated_at, created_at
        ) VALUES (?, 0, 'all', '', '', 'direct', '', '', '[]', '[]', 0, 'سلام! برای دریافت پاسخ و مشاوره کامل، لطفاً ابتدا پیج را فالو کنید 🙏', 'auto', ?, ?)
      `).run(cleanUsername, now, now);

      automation = db
        .prepare("SELECT * FROM dm_automations WHERE account_username = ?")
        .get(cleanUsername) as DMAutomationRow;
    }

    return NextResponse.json({
      success: true,
      automation,
    });
  } catch (error) {
    console.error("GET /api/accounts/[username]/dm-automation error:", error);
    return NextResponse.json(
      { success: false, error: "خطا در دریافت اطلاعات اتوماسیون دایرکت." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." },
        { status: 401 }
      );
    }

    const { username } = await params;
    const cleanUsername = username.trim().toLowerCase();

    if (!hasAccountAccess(user, cleanUsername)) {
      return NextResponse.json(
        { success: false, error: "دسترسی مجاز به این حساب را ندارید." },
        { status: 403 }
      );
    }

    const db = getDb();
    const account = db.prepare("SELECT username FROM accounts WHERE username = ?").get(cleanUsername);
    if (!account) {
      return NextResponse.json(
        { success: false, error: "حساب کاربری یافت نشد." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    let current = db
      .prepare("SELECT * FROM dm_automations WHERE account_username = ?")
      .get(cleanUsername) as DMAutomationRow | undefined;

    if (!current) {
      db.prepare(`
        INSERT INTO dm_automations (
          account_username, enabled, trigger_type, trigger_context, trigger_keywords,
          reply_mode, direct_reply_text, ai_prompt_instructions, web_context_urls,
          mcp_servers_config, require_follow, follow_prompt_text, story_handling_mode,
          updated_at, created_at
        ) VALUES (?, 0, 'all', '', '', 'direct', '', '', '[]', '[]', 0, 'سلام! برای دریافت پاسخ و مشاوره کامل، لطفاً ابتدا پیج را فالو کنید 🙏', 'auto', ?, ?)
      `).run(cleanUsername, now, now);

      current = db
        .prepare("SELECT * FROM dm_automations WHERE account_username = ?")
        .get(cleanUsername) as DMAutomationRow;
    }

    const enabled = body.enabled !== undefined ? (body.enabled ? 1 : 0) : current.enabled;
    const trigger_type = body.trigger_type !== undefined ? body.trigger_type : current.trigger_type;
    const trigger_context = body.trigger_context !== undefined ? String(body.trigger_context) : current.trigger_context;
    const trigger_keywords = body.trigger_keywords !== undefined ? String(body.trigger_keywords) : current.trigger_keywords;
    const reply_mode = body.reply_mode !== undefined ? body.reply_mode : current.reply_mode;
    const direct_reply_text = body.direct_reply_text !== undefined ? String(body.direct_reply_text) : current.direct_reply_text;
    const ai_prompt_instructions = body.ai_prompt_instructions !== undefined ? String(body.ai_prompt_instructions) : current.ai_prompt_instructions;
    
    let web_context_urls = current.web_context_urls;
    if (body.web_context_urls !== undefined) {
      web_context_urls = Array.isArray(body.web_context_urls)
        ? JSON.stringify(body.web_context_urls)
        : String(body.web_context_urls);
    }

    let mcp_servers_config = current.mcp_servers_config;
    if (body.mcp_servers_config !== undefined) {
      mcp_servers_config = Array.isArray(body.mcp_servers_config)
        ? JSON.stringify(body.mcp_servers_config)
        : String(body.mcp_servers_config);
    }

    const require_follow = body.require_follow !== undefined ? (body.require_follow ? 1 : 0) : current.require_follow;
    const follow_prompt_text = body.follow_prompt_text !== undefined ? String(body.follow_prompt_text) : current.follow_prompt_text;
    const story_handling_mode = body.story_handling_mode !== undefined ? String(body.story_handling_mode) : current.story_handling_mode;

    db.prepare(`
      UPDATE dm_automations SET
        enabled = ?,
        trigger_type = ?,
        trigger_context = ?,
        trigger_keywords = ?,
        reply_mode = ?,
        direct_reply_text = ?,
        ai_prompt_instructions = ?,
        web_context_urls = ?,
        mcp_servers_config = ?,
        require_follow = ?,
        follow_prompt_text = ?,
        story_handling_mode = ?,
        updated_at = ?
      WHERE account_username = ?
    `).run(
      enabled,
      trigger_type,
      trigger_context,
      trigger_keywords,
      reply_mode,
      direct_reply_text,
      ai_prompt_instructions,
      web_context_urls,
      mcp_servers_config,
      require_follow,
      follow_prompt_text,
      story_handling_mode,
      now,
      cleanUsername
    );

    const updated = db
      .prepare("SELECT * FROM dm_automations WHERE account_username = ?")
      .get(cleanUsername) as DMAutomationRow;

    return NextResponse.json({
      success: true,
      automation: updated,
      message: enabled !== current.enabled
        ? (enabled ? "اتوماسیون دایرکت فعال شد." : "اتوماسیون دایرکت متوقف شد.")
        : "تنظیمات اتوماسیون دایرکت با موفقیت ذخیره شد.",
    });
  } catch (error) {
    console.error("POST /api/accounts/[username]/dm-automation error:", error);
    return NextResponse.json(
      { success: false, error: "خطا در به‌روزرسانی تنظیمات اتوماسیون دایرکت." },
      { status: 500 }
    );
  }
}
