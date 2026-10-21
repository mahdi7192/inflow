import { NextRequest, NextResponse } from "next/server";
import { pollActiveAccountsAndPosts } from "@/lib/instagram/aggregator";
import { getInstagramProvider } from "@/lib/instagram/social-api-provider";

export async function GET(req: NextRequest) {
  return handlePoll(req);
}

export async function POST(req: NextRequest) {
  return handlePoll(req);
}

async function handlePoll(req: NextRequest) {
  try {
    // 1. Authorization: Allow local systemd timer requests or valid master token
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const masterToken =
      process.env.INFLOW_MASTER_MCP_TOKEN || "inflow_master_sec_admin";

    const host = req.headers.get("host") || "";
    const forwardedFor = req.headers.get("x-forwarded-for") || "";
    const isLocal =
      host.startsWith("127.0.0.1") ||
      host.startsWith("localhost") ||
      forwardedFor.startsWith("127.0.0.1") ||
      forwardedFor.startsWith("::1");

    if (!isLocal && token !== masterToken) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const provider = getInstagramProvider();
    if (!provider.hasCredentials()) {
      return NextResponse.json(
        { success: false, error: "Instagram provider credentials missing" },
        { status: 400 }
      );
    }

    const accountUsername =
      new URL(req.url).searchParams.get("account") || undefined;

    const summary = await pollActiveAccountsAndPosts({
      accountUsername,
      provider,
    });

    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    return NextResponse.json({
      success: true,
      active_posts: summary.postsPolled,
      accounts_polled: summary.accountsPolled,
      processed_comments: summary.commentsIngested,
      processed_dms: summary.dmsIngested,
      released_follow_gates: summary.followAutoReleased,
      action_queue: summary.queueSummary,
      polled_at: now,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
