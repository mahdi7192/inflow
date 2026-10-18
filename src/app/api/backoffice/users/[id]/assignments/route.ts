import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-guard";
import { nowTimestamp, UserRow } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 }
      );
    }

    if (sessionUser.role !== "superadmin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Superadmin role required" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const targetUserId = parseInt(id, 10);

    if (isNaN(targetUserId)) {
      return NextResponse.json(
        { success: false, error: "شناسه کاربر نامعتبر است" },
        { status: 400 }
      );
    }

    const db = getDb();
    const existing = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(targetUserId) as UserRow | undefined;

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "کاربر یافت نشد" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const accountUsernames: string[] = Array.isArray(body.account_usernames)
      ? body.account_usernames.map((u: unknown) => String(u).trim().toLowerCase())
      : [];

    const now = nowTimestamp();

    // Perform atomic reassignment in a transaction
    const assignTx = db.transaction(() => {
      // Clear current assignments for this target user
      db.prepare("DELETE FROM user_accounts WHERE user_id = ?").run(targetUserId);

      // Insert new assignments (enforcing 1-to-N: one account belongs to 1 user at a time)
      const deleteExistingAccount = db.prepare(
        "DELETE FROM user_accounts WHERE account_username = ?"
      );
      const insertAssignment = db.prepare(
        "INSERT INTO user_accounts (user_id, account_username, created_at) VALUES (?, ?, ?)"
      );

      for (const username of accountUsernames) {
        if (!username) continue;
        deleteExistingAccount.run(username);
        insertAssignment.run(targetUserId, username, now);
      }
    });

    assignTx();

    return NextResponse.json({
      success: true,
      user_id: targetUserId,
      assigned_accounts: accountUsernames,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
