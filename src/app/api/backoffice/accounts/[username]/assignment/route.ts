import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth-guard";
import { assignAccountToUser, getDb } from "@/lib/db";

interface RouteParams {
  params: Promise<{
    username: string;
  }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireSuperadmin();
    if (auth.errorResponse) return auth.errorResponse;

    const { username } = await params;
    const cleanUsername = username.trim().toLowerCase();

    const db = getDb();
    const account = db.prepare("SELECT username FROM accounts WHERE username = ?").get(cleanUsername);
    if (!account) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { user_id } = body;

    const targetUserId = user_id ? Number(user_id) : null;
    if (targetUserId) {
      const user = db.prepare("SELECT id FROM users WHERE id = ?").get(targetUserId);
      if (!user) {
        return NextResponse.json(
          { success: false, error: "Target user not found" },
          { status: 404 }
        );
      }
    }

    assignAccountToUser(cleanUsername, targetUserId);

    return NextResponse.json({
      success: true,
      message: targetUserId
        ? `Account assigned to user #${targetUserId}`
        : "Account unassigned successfully",
      account_username: cleanUsername,
      assigned_user_id: targetUserId,
    });
  } catch (error) {
    console.error("PUT /api/backoffice/accounts/[username]/assignment error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update account assignment" },
      { status: 500 }
    );
  }
}
