import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasAccountAccess } from "@/lib/auth-guard";
import { validateAccountToken, updateAccountBotStatus, clearAccountVncSession } from "@/lib/db";
import { ServerOrchestrator } from "@/lib/server-orchestrator";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    let isAuthorized = false;
    let accountFromToken: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      const binding = validateAccountToken(token);
      if (binding) {
        isAuthorized = true;
        accountFromToken = binding.account_username;
      }
    }

    const body = await request.json();
    const account = body.account || accountFromToken;
    const verified = body.verified ?? true;

    if (!account) {
      return NextResponse.json({ success: false, error: "Missing 'account' parameter" }, { status: 400 });
    }

    if (!isAuthorized) {
      const user = await getSessionUser();
      if (!user) {
        return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
      }
      if (!hasAccountAccess(user, account)) {
        return NextResponse.json({ success: false, error: "Unauthorized access to this account" }, { status: 403 });
      }
    }

    // Call orchestrator verification
    const verification = await ServerOrchestrator.verifySession(account);

    if (verification.authenticated) {
      updateAccountBotStatus(
        account,
        "live",
        "نشست معتبر اینستاگرام با موفقیت تایید شد و ربات در وضعیت لایو قرار گرفت.",
        "system"
      );
      clearAccountVncSession(account);

      // Stop VNC session to clean up the interactive session
      ServerOrchestrator.stopVncSession(account).catch(() => {});

      // Automatically trigger sync for the newly logged-in account
      ServerOrchestrator.syncAccount(account).catch((err) => {
        console.error(`[SessionHarvested] Auto sync failed for ${account}:`, err);
      });

      return NextResponse.json({
        success: true,
        account,
        status: "live",
        message: "ربات اختصاصی با موفقیت فعال و لایو شد و همگام‌سازی پروفایل آغاز گردید.",
      });
    }

    return NextResponse.json({
      success: false,
      account,
      status: "login_required",
      message: "کوکی‌های معتبر اینستاگرام در مرورگر یافت نشد. لطفاً ابتدا لاگین نمایید.",
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/bot/session-harvested:", error);
    return NextResponse.json({ success: false, error: (error as Error).message || "Internal server error" }, { status: 500 });
  }
}
