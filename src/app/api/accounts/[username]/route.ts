import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasAccountAccess } from "@/lib/auth-guard";
import { deleteAccount, getDb } from "@/lib/db";
import { ServerOrchestrator } from "@/lib/server-orchestrator";

interface RouteParams {
  params: Promise<{
    username: string;
  }>;
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
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
        { success: false, error: "شما دسترسی مجاز برای حذف این حساب را ندارید." },
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

    // 1. Completely destroy bot profile directory, terminate Chrome/VNC, and disable background worker service
    try {
      await ServerOrchestrator.destroyProfile(cleanUsername);
    } catch (destroyErr) {
      console.warn(`[Account Delete] Warning destroying profile for ${cleanUsername}:`, destroyErr);
    }

    // 2. Remove all related database records
    deleteAccount(cleanUsername);

    return NextResponse.json({
      success: true,
      message: `حساب @${cleanUsername} و تمام سوابق ربات هوش مصنوعی آن با موفقیت به طور کامل حذف شدند.`,
    });
  } catch (error) {
    console.error("DELETE /api/accounts/[username] error:", error);
    return NextResponse.json(
      { success: false, error: "خطا در پردازش درخواست حذف حساب." },
      { status: 500 }
    );
  }
}
