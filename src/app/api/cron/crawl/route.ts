import { NextRequest, NextResponse } from "next/server";
import { crawlAllAccounts } from "@/lib/crawler/crawl";

export const dynamic = "force-dynamic";
export const maxDuration = 600;

let running = false;

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const masterToken = process.env.INFLOW_MASTER_MCP_TOKEN || "inflow_master_sec_admin";
  const host = req.headers.get("host") || "";
  const fwd = req.headers.get("x-forwarded-for") || "";
  const isLocal =
    host.startsWith("127.0.0.1") || host.startsWith("localhost") || fwd.startsWith("127.0.0.1") || fwd.startsWith("::1");
  if (!isLocal && token !== masterToken) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (running) return NextResponse.json({ success: true, busy: true, results: [] });
  running = true;
  try {
    const account = req.nextUrl.searchParams.get("account") || undefined;
    const results = await crawlAllAccounts(account);
    return NextResponse.json({ success: true, results });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  } finally {
    running = false;
  }
}
