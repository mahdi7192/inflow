import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "./db";
import {
  SESSION_COOKIE_NAME,
  SafeUser,
  UserRow,
  UserSessionRow,
  nowTimestamp,
} from "./auth";

/**
 * Retrieves the currently authenticated user from the session cookie.
 * Validates expiration, active status, and resolves authorized Instagram accounts.
 */
export async function getSessionUser(): Promise<SafeUser | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const db = getDb();
  const now = nowTimestamp();

  // Find session and join with active user
  const row = db
    .prepare(
      `
      SELECT 
        s.id as session_id,
        s.session_token,
        s.expires_at,
        u.id,
        u.username,
        u.display_name,
        u.role,
        u.status,
        u.last_login_at,
        u.created_at
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token = ?
    `
    )
    .get(sessionToken) as
    | (UserRow & UserSessionRow & { session_id: number })
    | undefined;

  if (!row) {
    return null;
  }

  // Check expiration
  if (row.expires_at < now) {
    db.prepare("DELETE FROM user_sessions WHERE id = ?").run(row.session_id);
    return null;
  }

  // Check if account is suspended
  if (row.status === "suspended") {
    return null;
  }

  // Fetch assigned accounts
  let assignedAccounts: string[] = [];

  if (row.role === "superadmin") {
    // Superadmin has access to all registered accounts
    const allAccounts = db
      .prepare("SELECT username FROM accounts")
      .all() as { username: string }[];
    assignedAccounts = allAccounts.map((a) => a.username);
  } else {
    // Standard tenant has access only to explicitly assigned accounts
    const assignedRows = db
      .prepare("SELECT account_username FROM user_accounts WHERE user_id = ?")
      .all(row.id) as { account_username: string }[];
    assignedAccounts = assignedRows.map((r) => r.account_username);
  }

  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    role: row.role,
    status: row.status,
    assigned_accounts: assignedAccounts,
    last_login_at: row.last_login_at,
    created_at: row.created_at,
  };
}

/**
 * Checks if a user has permission to access or mutate a specific Instagram account.
 */
export function hasAccountAccess(user: SafeUser, accountUsername: string): boolean {
  if (user.role === "superadmin") {
    return true;
  }
  return user.assigned_accounts.includes(accountUsername);
}

/**
 * Validates that the current request has an authenticated session with superadmin privileges.
 * Returns { user, errorResponse: null } if authorized, or { user: null, errorResponse } if rejected.
 */
export async function requireSuperadmin(): Promise<
  | { user: SafeUser; errorResponse: null }
  | { user: null; errorResponse: NextResponse }
> {
  const user = await getSessionUser();
  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 }
      ),
    };
  }

  if (user.role !== "superadmin") {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { success: false, error: "Forbidden: Superadmin role required" },
        { status: 403 }
      ),
    };
  }

  return { user, errorResponse: null };
}

