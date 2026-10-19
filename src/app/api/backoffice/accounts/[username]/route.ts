import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth-guard";
import { deleteAccount, getDb } from "@/lib/db";

interface RouteParams {
  params: Promise<{
    username: string;
  }>;
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
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

    // 1. Destroy profile files and services
    try {
      const { ServerOrchestrator } = await import("@/lib/server-orchestrator");
      await ServerOrchestrator.destroyProfile(cleanUsername);
    } catch (destroyErr) {
      console.warn(`[Backoffice Delete] Warning destroying profile for ${cleanUsername}:`, destroyErr);
    }

    // 2. Remove database rows
    deleteAccount(cleanUsername);

    return NextResponse.json({
      success: true,
      message: `Account @${cleanUsername} and its bindings have been deleted successfully.`,
    });
  } catch (error) {
    console.error("DELETE /api/backoffice/accounts/[username] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
