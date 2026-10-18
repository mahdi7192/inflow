import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasAccountAccess } from "@/lib/auth-guard";
import { ServerOrchestrator } from "@/lib/server-orchestrator";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { account, target_url } = body;

    if (!account) {
      return NextResponse.json({ success: false, error: "Missing 'account' parameter" }, { status: 400 });
    }

    if (!hasAccountAccess(user, account)) {
      return NextResponse.json({ success: false, error: "Unauthorized access to this account" }, { status: 403 });
    }

    const result = await ServerOrchestrator.startVncSession(account, target_url);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || "خطا در باز کردن مانیتور VNC" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      account,
      vnc_url: result.vnc_url,
      token: result.token,
      expires_at: result.expires_at,
      timeout_seconds: result.timeout_seconds,
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/bot/vnc-session:", error);
    return NextResponse.json({ success: false, error: (error as Error).message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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

    const result = await ServerOrchestrator.stopVncSession(account);

    return NextResponse.json({
      success: result.success,
      account,
      message: "نشست مانیتور VNC با موفقیت بسته شد.",
    });
  } catch (error: unknown) {
    console.error("Error in DELETE /api/bot/vnc-session:", error);
    return NextResponse.json({ success: false, error: (error as Error).message || "Internal server error" }, { status: 500 });
  }
}
