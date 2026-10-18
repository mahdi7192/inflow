import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth-guard";
import { getOrCreateAccountBotBinding, regenerateAccountToken, getDb } from "@/lib/db";

interface RouteParams {
  params: Promise<{
    username: string;
  }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
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

    const binding = getOrCreateAccountBotBinding(cleanUsername);

    // Resolve base host URL from incoming request
    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
    const baseUrl = `${protocol}://${host}`;

    const hermesMcpConfig = {
      http_sse: {
        mcpServers: {
          inflow: {
            url: `${baseUrl}/api/mcp`,
            headers: {
              Authorization: `Bearer ${binding.api_token}`,
            },
          },
        },
      },
      stdio: {
        mcpServers: {
          inflow: {
            command: "node",
            args: ["dist/cli/mcp.mjs"],
            env: {
              INFLOW_API_TOKEN: binding.api_token,
              INFLOW_ACCOUNT: cleanUsername,
            },
          },
        },
      },
    };

    return NextResponse.json({
      success: true,
      account_username: cleanUsername,
      bot_profile_id: binding.bot_profile_id,
      api_token: binding.api_token,
      created_at: binding.created_at,
      updated_at: binding.updated_at,
      last_heartbeat_at: binding.last_heartbeat_at,
      hermes_mcp_config: hermesMcpConfig,
    });
  } catch (error) {
    console.error("GET /api/backoffice/accounts/[username]/token error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to inspect account token" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
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

    const result = regenerateAccountToken(cleanUsername);

    return NextResponse.json({
      success: true,
      message: "Token regenerated successfully. Previous key revoked immediately.",
      account_username: cleanUsername,
      new_api_token: result.api_token,
      updated_at: result.updated_at,
    });
  } catch (error) {
    console.error("POST /api/backoffice/accounts/[username]/token error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to regenerate token" },
      { status: 500 }
    );
  }
}
