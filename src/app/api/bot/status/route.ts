import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasAccountAccess } from "@/lib/auth-guard";
import { getAccountBotStatus, getBotLifecycleLogs } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const account = searchParams.get("account");

    if (!account) {
      return NextResponse.json({ success: false, error: "Missing 'account' parameter" }, { status: 400 });
    }

    if (!hasAccountAccess(user, account)) {
      return NextResponse.json({ success: false, error: "Unauthorized access to this account" }, { status: 403 });
    }

    const botStatus = getAccountBotStatus(account);
    if (!botStatus) {
      return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
    }

    let vncExpiresInSec = 0;
    if (botStatus.bot_vnc_active && botStatus.bot_vnc_expires_at) {
      const diff = Math.max(0, Math.floor((new Date(botStatus.bot_vnc_expires_at).getTime() - Date.now()) / 1000));
      vncExpiresInSec = diff;
    }

    const logs = getBotLifecycleLogs(account, 10);

    return NextResponse.json({
      success: true,
      account: botStatus.username,
      bot_profile_name: botStatus.bot_profile_name,
      bot_status: botStatus.bot_status,
      bot_vnc_active: Boolean(botStatus.bot_vnc_active),
      vnc_expires_in_sec: vncExpiresInSec,
      last_heartbeat_at: botStatus.last_heartbeat_at,
      bot_last_error: botStatus.bot_last_error,
      logs: logs.map((l) => ({
        id: l.id,
        from_status: l.from_status,
        to_status: l.to_status,
        message: l.message,
        actor: l.actor,
        created_at: l.created_at,
      })),
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/bot/status:", error);
    return NextResponse.json({ success: false, error: (error as Error).message || "Internal server error" }, { status: 500 });
  }
}
