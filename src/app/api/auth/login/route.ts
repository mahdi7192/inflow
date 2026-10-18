import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SEC,
  UserRow,
  generateSessionToken,
  getSessionExpiryDate,
  nowTimestamp,
  verifyPassword,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = (body.username || "").trim();
    const password = body.password || "";

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Case-insensitive lookup (schema uses COLLATE NOCASE)
    const user = db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(username) as UserRow | undefined;

    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 }
      );
    }

    if (user.status === "suspended") {
      return NextResponse.json(
        {
          success: false,
          error: "Account has been suspended. Please contact administrator.",
        },
        { status: 403 }
      );
    }

    // Generate and persist session
    const sessionToken = generateSessionToken();
    const expiresAt = getSessionExpiryDate();
    const now = nowTimestamp();

    db.prepare(
      `
      INSERT INTO user_sessions (session_token, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `
    ).run(sessionToken, user.id, expiresAt, now);

    db.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").run(
      now,
      user.id
    );

    // Fetch authorized accounts
    let assignedAccounts: string[] = [];
    if (user.role === "superadmin") {
      const allAccounts = db
        .prepare("SELECT username FROM accounts")
        .all() as { username: string }[];
      assignedAccounts = allAccounts.map((a) => a.username);
    } else {
      const assigned = db
        .prepare(
          "SELECT account_username FROM user_accounts WHERE user_id = ?"
        )
        .all(user.id) as { account_username: string }[];
      assignedAccounts = assigned.map((r) => r.account_username);
    }

    // Set HTTP-only session cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SEC,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        assigned_accounts: assignedAccounts,
      },
    });
  } catch (error) {
    console.error("Login route error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
