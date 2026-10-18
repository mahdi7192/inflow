import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasAccountAccess } from "@/lib/auth-guard";
import { getAccountBotStatus, updateAccountBotStatus, BotStatus } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { account, action } = body;

    if (!account || !action) {
      return NextResponse.json({ success: false, error: "Missing 'account' or 'action'" }, { status: 400 });
    }

    if (!hasAccountAccess(user, account)) {
      return NextResponse.json({ success: false, error: "Unauthorized access to this account" }, { status: 403 });
    }

    const botStatus = getAccountBotStatus(account);
    if (!botStatus) {
      return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
    }

    let nextStatus: BotStatus = botStatus.bot_status;
    let message = "";

    if (action === "pause") {
      if (botStatus.bot_status !== "live") {
        return NextResponse.json({ success: false, error: "Only live bots can be paused" }, { status: 400 });
      }
      nextStatus = "paused";
      message = "اتوماسیون توسط کاربر متوقف شد.";
    } else if (action === "resume") {
      if (botStatus.bot_status !== "paused") {
        return NextResponse.json({ success: false, error: "Only paused bots can be resumed" }, { status: 400 });
      }
      nextStatus = "live";
      message = "فعالیت اتوماسیون توسط کاربر از سر گرفته شد.";
    } else if (action === "retry") {
      nextStatus = botStatus.bot_profile_name ? "login_required" : "unprovisioned";
      message = "راه‌اندازی مجدد توسط کاربر درخواست شد.";
    } else {
      return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 });
    }

    updateAccountBotStatus(account, nextStatus, message, "user", null);

    return NextResponse.json({
      success: true,
      account,
      status: nextStatus,
      message,
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/bot/state:", error);
    return NextResponse.json({ success: false, error: (error as Error).message || "Internal server error" }, { status: 500 });
  }
}
