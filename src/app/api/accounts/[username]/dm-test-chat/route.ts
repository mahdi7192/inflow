import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { runDmAgent } from "@/lib/agent/dm-agent";
import type { ChatTurnMessage } from "@/lib/ai-client";

interface AccountRow {
  username: string;
  persona?: string;
  bio?: string;
  brand_cheat_sheet?: string;
  website_url?: string;
}

interface DMAutomationRow {
  account_persona?: string;
  tone?: string;
  tone_sample?: string;
  primary_goal?: string;
  secondary_goals?: string;
  extra_instructions?: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const cleanUsername = username.replace(/^@/, "");
  const db = getDb();

  const account = db
    .prepare("SELECT * FROM accounts WHERE username = ?")
    .get(cleanUsername) as AccountRow | undefined;

  if (!account) {
    return NextResponse.json({ error: "اکانت یافت نشد." }, { status: 404 });
  }

  const auto = db
    .prepare("SELECT * FROM dm_automations WHERE account_username = ?")
    .get(cleanUsername) as DMAutomationRow | undefined;

  const sitePagesCount = (
    db
      .prepare("SELECT COUNT(*) as c FROM site_pages WHERE account_username = ?")
      .get(cleanUsername) as { c: number } | undefined
  )?.c ?? 0;

  const body = await request.json().catch(() => ({}));
  const message = (body.message || "").trim();
  const history: ChatTurnMessage[] = Array.isArray(body.history) ? body.history : [];

  if (!message) {
    return NextResponse.json({ error: "متن پیام الزامی است." }, { status: 400 });
  }

  try {
    const result = await runDmAgent({
      accountUsername: cleanUsername,
      accountPersona: account.persona || auto?.account_persona || "business",
      accountBio: account.bio || "",
      brandCheatSheet: account.brand_cheat_sheet || "",
      websiteUrl: account.website_url || "",
      senderUsername: "test_visitor",
      senderFullName: "کاربر آزمایشی",
      incomingText: message,
      history,
      contextCaption: "شبیه‌ساز و تست زنده دایرکت اینستاگرام",
      tone: body.overrideConfig?.tone ?? auto?.tone ?? "friendly",
      toneSample: body.overrideConfig?.tone_sample ?? auto?.tone_sample,
      primaryGoal: body.overrideConfig?.primary_goal ?? auto?.primary_goal ?? "sales",
      secondaryGoals: body.overrideConfig?.secondary_goals ?? auto?.secondary_goals,
      extraInstructions: body.overrideConfig?.extra_instructions ?? auto?.extra_instructions,
      hasSiteData: sitePagesCount > 0,
      isTest: true,
    });

    if (!result) {
      return NextResponse.json(
        { error: "هوش مصنوعی پاسخی تولید نکرد؛ لطفاً تنظیمات هوش مصنوعی را بررسی کنید." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      replyText: result.replyText,
      link: result.link,
      handedOff: result.handedOff,
      steps: result.steps,
    });
  } catch (error: unknown) {
    console.error("Test chat failed:", error);
    const msg = error instanceof Error ? error.message : "خطا در پردازش هوش مصنوعی";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
