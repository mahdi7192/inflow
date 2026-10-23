import { NextRequest, NextResponse } from "next/server";
import { normalizeStoryDefaultMode } from "@/lib/stories";
import { getSessionUser, hasAccountAccess } from "@/lib/auth-guard";
import { getDb, saveAppLanguage, DMAutomationRow } from "@/lib/db";
import { crawlAccount } from "@/lib/crawler/crawl";
import { normalizeSiteInput } from "@/lib/crawler/url";
import { normalizeGoal, normalizeTone, parseSecondaryGoals, getRecommendedGoals } from "@/lib/dm-goals";

function buildCrawlPayload(db: ReturnType<typeof getDb>, username: string) {
  const acc = db
    .prepare("SELECT website_url, account_persona FROM accounts WHERE username = ?")
    .get(username) as { website_url?: string; account_persona?: string } | undefined;
  const pages = db
    .prepare("SELECT url, title, kind, score, last_crawled_at FROM site_pages WHERE account_username = ? ORDER BY score DESC, id ASC LIMIT 500")
    .all(username);
  return {
    website_url: acc?.website_url || "",
    account_persona: acc?.account_persona || "business",
    recommended_goals: getRecommendedGoals(acc?.account_persona),
    pages,
  };
}

function withDefaults(automation: DMAutomationRow, persona: string) {
  return {
    ...automation,
    tone: normalizeTone(automation.tone),
    primary_goal: normalizeGoal(automation.primary_goal, persona),
    secondary_goals: parseSecondaryGoals(automation.secondary_goals, normalizeGoal(automation.primary_goal, persona)),
  };
}

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

    const crawl = buildCrawlPayload(db, cleanUsername);
    return NextResponse.json({
      success: true,
      automation: withDefaults(automation, crawl.account_persona),
      crawl,
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

    if (body.action === "crawl_now") {
      const result = await crawlAccount(cleanUsername);
      const crawlNow = buildCrawlPayload(db, cleanUsername);
      const auto = db.prepare("SELECT * FROM dm_automations WHERE account_username = ?").get(cleanUsername) as DMAutomationRow | undefined;
      return NextResponse.json({
        success: result.status !== "failed" && result.status !== "skipped",
        result,
        crawl: crawlNow,
        automation: auto ? withDefaults(auto, crawlNow.account_persona) : null,
        error: result.status === "skipped" ? "ابتدا آدرس وب‌سایت را وارد و ذخیره کنید." : result.status === "failed" ? "کرال انجام نشد؛ آدرس یا دسترسی سایت را بررسی کنید." : undefined,
      });
    }

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
    const story_handling_mode = body.story_handling_mode !== undefined ? normalizeStoryDefaultMode(body.story_handling_mode) : current.story_handling_mode;
    const app_language =
      body.app_language && ["fa", "en", "ar"].includes(String(body.app_language))
        ? String(body.app_language)
        : current.app_language || "fa";

    if (body.app_language) {
      saveAppLanguage(app_language, cleanUsername);
    }

    const personaRow = db.prepare("SELECT account_persona FROM accounts WHERE username = ?").get(cleanUsername) as { account_persona?: string } | undefined;
    const tone = body.tone !== undefined ? normalizeTone(body.tone) : normalizeTone(current.tone);
    const tone_sample = body.tone_sample !== undefined ? String(body.tone_sample).slice(0, 600) : current.tone_sample || "";
    const primary_goal = body.primary_goal !== undefined ? normalizeGoal(body.primary_goal, personaRow?.account_persona) : normalizeGoal(current.primary_goal, personaRow?.account_persona);
    const secondary_goals = JSON.stringify(
      parseSecondaryGoals(body.secondary_goals !== undefined ? body.secondary_goals : current.secondary_goals, primary_goal)
    );

    let websiteChanged = false;
    if (body.website_url !== undefined) {
      const raw = String(body.website_url).trim();
      const norm = raw ? normalizeSiteInput(raw) : null;
      if (raw && !norm) {
        return NextResponse.json({ success: false, error: "آدرس وب‌سایت معتبر نیست." }, { status: 400 });
      }
      const nextUrl = norm ? norm.origin + (norm.pathname !== "/" ? norm.pathname : "") : "";
      const prevUrl = (db.prepare("SELECT website_url FROM accounts WHERE username = ?").get(cleanUsername) as { website_url?: string }).website_url || "";
      if (nextUrl !== prevUrl) {
        db.prepare("UPDATE accounts SET website_url = ? WHERE username = ?").run(nextUrl, cleanUsername);
        if (!nextUrl) db.prepare("DELETE FROM site_pages WHERE account_username = ?").run(cleanUsername);
        websiteChanged = true;
      }
    }
    if (body.brand_cheat_sheet !== undefined) {
      db.prepare("UPDATE accounts SET brand_cheat_sheet = ? WHERE username = ?").run(String(body.brand_cheat_sheet).slice(0, 8000), cleanUsername);
    }

    let activated_at = current.activated_at;
    if (enabled === 1 && (!current.enabled || !current.activated_at)) {
      activated_at = now;
    } else if (enabled === 0) {
      activated_at = null;
    }

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
        app_language = ?,
        tone = ?,
        tone_sample = ?,
        primary_goal = ?,
        secondary_goals = ?,
        activated_at = ?,
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
      app_language,
      tone,
      tone_sample,
      primary_goal,
      secondary_goals,
      activated_at,
      now,
      cleanUsername
    );

    if (websiteChanged) {
      // Kick a background crawl for the new site (non-blocking).
      void crawlAccount(cleanUsername).catch(() => {});
    }

    const updated = db
      .prepare("SELECT * FROM dm_automations WHERE account_username = ?")
      .get(cleanUsername) as DMAutomationRow;

    const crawlOut = buildCrawlPayload(db, cleanUsername);
    return NextResponse.json({
      success: true,
      automation: withDefaults(updated, crawlOut.account_persona),
      crawl: crawlOut,
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

// The settings UI historically saves with PUT; keep it as an alias of POST.
export const PUT = POST;
