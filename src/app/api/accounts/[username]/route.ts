import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasAccountAccess } from "@/lib/auth-guard";
import { deleteAccount, getDb, type AccountRow } from "@/lib/db";

interface RouteParams {
  params: Promise<{
    username: string;
  }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { username } = await params;
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");
    if (!hasAccountAccess(user, cleanUsername)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    const db = getDb();
    const account = db
      .prepare("SELECT * FROM accounts WHERE username = ?")
      .get(cleanUsername) as AccountRow | undefined;
    if (!account) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      account: {
        username: account.username,
        display_name: account.display_name,
        bio: account.bio,
        account_persona: account.account_persona || "business",
        brand_cheat_sheet: account.brand_cheat_sheet || "",
        website_url: account.website_url || "",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." },
        { status: 401 }
      );
    }

    const { username } = await params;
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");

    if (!hasAccountAccess(user, cleanUsername)) {
      return NextResponse.json(
        { success: false, error: "شما دسترسی مجاز برای ویرایش این حساب را ندارید." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const db = getDb();
    const existing = db
      .prepare("SELECT * FROM accounts WHERE username = ?")
      .get(cleanUsername) as AccountRow | undefined;

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "حساب کاربری یافت نشد." },
        { status: 404 }
      );
    }

    const nextPersona =
      body.account_persona === "creator" || body.account_persona === "business"
        ? body.account_persona
        : existing.account_persona || "business";
    const nextBrandCheatSheet =
      typeof body.brand_cheat_sheet === "string"
        ? body.brand_cheat_sheet.trim()
        : existing.brand_cheat_sheet || "";
    const nextWebsiteUrl =
      typeof body.website_url === "string"
        ? body.website_url.trim()
        : existing.website_url || "";

    db.prepare(`
      UPDATE accounts
      SET account_persona = ?,
          brand_cheat_sheet = ?,
          website_url = ?,
          updated_at = datetime('now')
      WHERE username = ?
    `).run(nextPersona, nextBrandCheatSheet, nextWebsiteUrl, cleanUsername);

    const updated = db
      .prepare("SELECT * FROM accounts WHERE username = ?")
      .get(cleanUsername) as AccountRow;

    return NextResponse.json({
      success: true,
      account: {
        username: updated.username,
        account_persona: updated.account_persona || "business",
        brand_cheat_sheet: updated.brand_cheat_sheet || "",
        website_url: updated.website_url || "",
      },
    });
  } catch (error) {
    console.error("PATCH /api/accounts/[username] error:", error);
    return NextResponse.json(
      { success: false, error: "خطا در ذخیره تنظیمات هویت و تقلب‌نامه پیج." },
      { status: 500 }
    );
  }
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
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");

    if (!hasAccountAccess(user, cleanUsername)) {
      return NextResponse.json(
        { success: false, error: "شما دسترسی مجاز برای حذف این حساب را ندارید." },
        { status: 403 }
      );
    }

    const db = getDb();
    const account = db
      .prepare("SELECT username FROM accounts WHERE username = ?")
      .get(cleanUsername);
    if (!account) {
      return NextResponse.json(
        { success: false, error: "حساب کاربری یافت نشد." },
        { status: 404 }
      );
    }

    deleteAccount(cleanUsername);

    return NextResponse.json({
      success: true,
      message: `حساب @${cleanUsername} و تمام سوابق آن با موفقیت حذف شدند.`,
    });
  } catch (error) {
    console.error("DELETE /api/accounts/[username] error:", error);
    return NextResponse.json(
      { success: false, error: "خطا در پردازش درخواست حذف حساب." },
      { status: 500 }
    );
  }
}
