import { NextRequest } from "next/server";
import { getDb } from "../db";
import { getSessionUser } from "../auth-guard";
import { AccountBotBindingRow } from "./types";

export interface McpAuthContext {
  authenticated: boolean;
  accountUsername?: string;
  isSuperadmin: boolean;
  error?: string;
}

/**
 * Extracts authentication credentials from request headers or query params
 * per mcp-server-protocol standards:
 * 1. Authorization: Bearer <TOKEN>
 * 2. x-api-key: <TOKEN>
 * 3. Query param ?token=<TOKEN> or ?apiKey=<TOKEN>
 * 4. Fallback to active inFlow user session (for dashboard/backoffice queries)
 */
export async function authenticateMcpRequest(
  req: NextRequest | Request
): Promise<McpAuthContext> {
  const url = new URL(req.url);

  // 1. Check Bearer token
  const authHeader = req.headers.get("authorization") || "";
  let token = "";
  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  }

  // 2. Check x-api-key or x-shop-api-key
  if (!token) {
    token = (
      req.headers.get("x-api-key") ||
      req.headers.get("x-shop-api-key") ||
      ""
    ).trim();
  }

  // 3. Check query parameters
  if (!token) {
    token = (
      url.searchParams.get("token") ||
      url.searchParams.get("apiKey") ||
      ""
    ).trim();
  }

  const db = getDb();

  // If a bot API token was provided, validate against account_bot_bindings
  if (token) {
    const binding = db
      .prepare(
        "SELECT * FROM account_bot_bindings WHERE api_token = ?"
      )
      .get(token) as AccountBotBindingRow | undefined;

    if (binding) {
      // Refresh heartbeat
      const now = new Date().toISOString().replace("T", " ").slice(0, 19);
      db.prepare(
        "UPDATE account_bot_bindings SET last_heartbeat_at = ? WHERE id = ?"
      ).run(now, binding.id);
      db.prepare(
        "UPDATE accounts SET last_heartbeat_at = ? WHERE username = ?"
      ).run(now, binding.account_username);

      return {
        authenticated: true,
        accountUsername: binding.account_username,
        isSuperadmin: false,
      };
    }

    // Check if token matches a superadmin master token in env
    const masterToken = process.env.INFLOW_MASTER_MCP_TOKEN || "inflow_master_sec_admin";
    if (token === masterToken) {
      return {
        authenticated: true,
        isSuperadmin: true,
      };
    }

    return {
      authenticated: false,
      isSuperadmin: false,
      error: "Invalid or expired MCP API token",
    };
  }

  // Fallback: Check if request has an active inFlow web session
  try {
    const sessionUser = await getSessionUser();
    if (sessionUser) {
      return {
        authenticated: true,
        isSuperadmin: sessionUser.role === "superadmin",
      };
    }
  } catch {
    // No session available
  }

  return {
    authenticated: false,
    isSuperadmin: false,
    error: "Authentication required. Provide Bearer token, x-api-key, or session.",
  };
}

/**
 * Validates that the authenticated context has permission to access or mutate
 * the target account_username.
 */
export function canAccessAccount(
  auth: McpAuthContext,
  targetAccount: string
): boolean {
  if (!auth.authenticated) return false;
  if (auth.isSuperadmin) return true;
  if (!targetAccount) return false;
  return auth.accountUsername?.toLowerCase() === targetAccount.toLowerCase();
}
