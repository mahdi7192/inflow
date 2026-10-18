import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth-guard";
import { getDb, getBackofficeAccounts, createAccountMinimal } from "@/lib/db";

export async function GET() {
  try {
    const auth = await requireSuperadmin();
    if (auth.errorResponse) return auth.errorResponse;

    const db = getDb();
    const accounts = getBackofficeAccounts();

    // Fetch list of active users for dropdown assignment
    const users = db
      .prepare(`
        SELECT id, username, display_name, role, status
        FROM users
        ORDER BY id ASC
      `)
      .all() as { id: number; username: string; display_name: string; role: string; status: string }[];

    return NextResponse.json({
      success: true,
      accounts,
      users,
    });
  } catch (error) {
    console.error("GET /api/backoffice/accounts error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSuperadmin();
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json().catch(() => ({}));
    const { username, user_id } = body;

    if (!username || typeof username !== "string") {
      return NextResponse.json(
        { success: false, error: "Instagram username is required" },
        { status: 400 }
      );
    }

    try {
      const result = createAccountMinimal(username, user_id ? Number(user_id) : null);
      return NextResponse.json(
        {
          success: true,
          message: "Page registered successfully",
          account: result.account,
          bot_binding: result.binding,
          assigned_user_id: result.assigned_user_id,
        },
        { status: 201 }
      );
    } catch (err: unknown) {
      const errMsg = (err as Error).message;
      if (errMsg === "INVALID_USERNAME") {
        return NextResponse.json(
          { success: false, error: "Invalid Instagram username format. Must be 1-30 characters (letters, numbers, dots, underscores)." },
          { status: 400 }
        );
      }
      if (errMsg === "ACCOUNT_EXISTS") {
        return NextResponse.json(
          { success: false, error: "An Instagram page with this handle is already registered." },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (error) {
    console.error("POST /api/backoffice/accounts error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to register Instagram page" },
      { status: 500 }
    );
  }
}
