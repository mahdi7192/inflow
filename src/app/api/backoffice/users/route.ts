import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-guard";
import { hashPassword, nowTimestamp, UserRow } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 }
      );
    }

    if (user.role !== "superadmin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Superadmin role required" },
        { status: 403 }
      );
    }

    const db = getDb();

    // Fetch all users
    const users = db
      .prepare(`
        SELECT 
          id, username, display_name, role, status, last_login_at, created_at, updated_at
        FROM users
        ORDER BY id ASC
      `)
      .all() as Omit<UserRow, "password_hash">[];

    // Fetch account assignments for each user
    const assignments = db
      .prepare(`
        SELECT user_id, account_username FROM user_accounts
      `)
      .all() as { user_id: number; account_username: string }[];

    const userAccountsMap: Record<number, string[]> = {};
    for (const a of assignments) {
      if (!userAccountsMap[a.user_id]) {
        userAccountsMap[a.user_id] = [];
      }
      userAccountsMap[a.user_id].push(a.account_username);
    }

    const usersWithAccounts = users.map((u) => ({
      ...u,
      assigned_accounts: userAccountsMap[u.id] || [],
    }));

    // Fetch all available accounts
    const accounts = db
      .prepare("SELECT username, display_name, avatar_url FROM accounts ORDER BY id ASC")
      .all() as { username: string; display_name: string; avatar_url: string }[];

    return NextResponse.json({
      success: true,
      users: usersWithAccounts,
      available_accounts: accounts,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 }
      );
    }

    if (user.role !== "superadmin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Superadmin role required" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const username = String(body.username || "").trim().toLowerCase();
    const displayName = String(body.display_name || username).trim();
    const password = String(body.password || "");
    const role = body.role === "superadmin" ? "superadmin" : "tenant";

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "نام کاربری و رمز عبور الزامی است" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "رمز عبور باید حداقل ۶ کاراکتر باشد" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check duplicate
    const existing = db
      .prepare("SELECT id FROM users WHERE username = ?")
      .get(username);

    if (existing) {
      return NextResponse.json(
        { success: false, error: "این نام کاربری قبلاً در سامانه ثبت شده است" },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(password);
    const now = nowTimestamp();

    const insert = db.prepare(`
      INSERT INTO users (username, display_name, password_hash, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?)
    `);

    const result = insert.run(username, displayName, passwordHash, role, now, now);
    const newUserId = Number(result.lastInsertRowid);

    return NextResponse.json(
      {
        success: true,
        user: {
          id: newUserId,
          username,
          display_name: displayName,
          role,
          status: "active",
          assigned_accounts: [],
          created_at: now,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
