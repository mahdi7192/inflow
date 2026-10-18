import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasAccountAccess } from "@/lib/auth-guard";
import { getAccountBotStatus, getOrCreateAccountBotBinding, updateAccountBotStatus } from "@/lib/db";
import { ServerOrchestrator } from "@/lib/server-orchestrator";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { account } = body;

    if (!account) {
      return NextResponse.json({ success: false, error: "Missing 'account' parameter" }, { status: 400 });
    }

    if (!hasAccountAccess(user, account)) {
      return NextResponse.json({ success: false, error: "Unauthorized access to this account" }, { status: 403 });
    }

    const currentBot = getAccountBotStatus(account);
    if (!currentBot) {
      return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
    }

    // If already live, prevent duplicate provisioning
    if (currentBot.bot_status === "live") {
      return NextResponse.json({
        success: true,
        status: "live",
        message: "ربات این پیج در حال حاضر فعال و متصل است.",
      });
    }

    // Set state to provisioning
    updateAccountBotStatus(
      account,
      "provisioning",
      "فرآیند راه‌اندازی ربات اختصاصی و ایجاد محیط ابری توسط کاربر آغاز شد.",
      "user"
    );

    // Get or generate dedicated API token for this account
    const binding = getOrCreateAccountBotBinding(account);

    // Invoke server orchestrator
    const result = await ServerOrchestrator.provisionProfile(account, binding.api_token);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          status: result.status,
          error: result.error || "خطا در برقراری ارتباط با سرور ارکستراتور هرمس",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      account,
      status: result.status,
      profile_name: result.profile_name,
      vnc_url: result.vnc_url,
      token: result.token,
      expires_at: result.expires_at,
      message: "محیط ابری و مانیتور ربات با موفقیت راه‌اندازی شدند. لطفاً وارد اینستاگرام شوید.",
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/bot/provision:", error);
    return NextResponse.json({ success: false, error: (error as Error).message || "Internal server error" }, { status: 500 });
  }
}
