import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasAccountAccess } from "@/lib/auth-guard";
import { getDb, DMLogRow } from "@/lib/db";

interface RouteParams {
  params: Promise<{
    username: string;
  }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." },
        { status: 401 }
      );
    }

    const { username } = await params;
    const cleanUsername = username.trim().toLowerCase();

    if (!hasAccountAccess(user, cleanUsername)) {
      return NextResponse.json(
        { success: false, error: "دسترسی مجاز به این حساب را ندارید." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 200);
    const status = searchParams.get("status");

    const db = getDb();

    let query = `
      SELECT * FROM dm_logs
      WHERE account_username = ?
    `;
    const queryParams: any[] = [cleanUsername];

    if (status && status !== "all") {
      query += ` AND reply_status = ?`;
      queryParams.push(status);
    }

    query += ` ORDER BY processed_at DESC LIMIT ?`;
    queryParams.push(limit);

    const logs = db.prepare(query).all(...queryParams) as DMLogRow[];

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error("GET /api/accounts/[username]/dm-logs error:", error);
    return NextResponse.json(
      { success: false, error: "خطا در دریافت لاگ‌های دایرکت." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const db = getDb();
    const { username } = await params;
    const cleanUsername = username.trim().toLowerCase();

    // Verify authentication via Bearer token (agent) OR user session (UI)
    const authHeader = req.headers.get("authorization") || "";
    let isAuthorized = false;

    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      const binding = db
        .prepare("SELECT * FROM account_bot_bindings WHERE api_token = ?")
        .get(token) as { id: number; account_username: string } | undefined;

      if (binding && binding.account_username.toLowerCase() === cleanUsername) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      try {
        const user = await getSessionUser();
        if (user && hasAccountAccess(user, cleanUsername)) {
          isAuthorized = true;
        }
      } catch {
        // Fallback for background environments without cookie store
      }
    }

    // Also allow if account exists and request is agent / internal
    const accountExists = db.prepare("SELECT username FROM accounts WHERE username = ?").get(cleanUsername);
    if (!accountExists) {
      return NextResponse.json(
        { success: false, error: "حساب کاربری یافت نشد." },
        { status: 404 }
      );
    }

    // Default authorize worker logging if account is registered
    if (!isAuthorized && !authHeader) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "دسترسی غیرمجاز." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      message_id,
      thread_id = "",
      sender_username = "",
      sender_id = "",
      incoming_text = "",
      is_story_reply = 0,
      story_id = null,
      story_content = null,
      trigger_matched = 1,
      reply_status = "sent",
      reply_text = "",
      tools_invoked = null,
      error_details = null,
    } = body;

    if (!message_id) {
      return NextResponse.json(
        { success: false, error: "پارامتر message_id الزامی است." },
        { status: 400 }
      );
    }

    // Atomic idempotency check
    const existing = db
      .prepare("SELECT id, reply_status FROM dm_logs WHERE message_id = ?")
      .get(message_id) as { id: number; reply_status: string } | undefined;

    if (existing) {
      return NextResponse.json({
        success: true,
        already_processed: true,
        log_id: existing.id,
        status: existing.reply_status,
      });
    }

    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    const toolsStr = tools_invoked
      ? (typeof tools_invoked === "string" ? tools_invoked : JSON.stringify(tools_invoked))
      : null;

    try {
      const insertStmt = db.prepare(`
        INSERT INTO dm_logs (
          message_id, thread_id, account_username, sender_username, sender_id,
          incoming_text, is_story_reply, story_id, story_content,
          trigger_matched, reply_status, reply_text, tools_invoked,
          error_details, processed_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = insertStmt.run(
        message_id,
        thread_id,
        cleanUsername,
        sender_username,
        sender_id,
        incoming_text,
        is_story_reply ? 1 : 0,
        story_id,
        story_content,
        trigger_matched ? 1 : 0,
        reply_status,
        reply_text,
        toolsStr,
        error_details,
        now,
        now
      );

      return NextResponse.json({
        success: true,
        log_id: result.lastInsertRowid,
      });
    } catch (insertErr: any) {
      // Catch race condition constraint violation
      if (insertErr?.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return NextResponse.json({
          success: true,
          already_processed: true,
        });
      }
      throw insertErr;
    }
  } catch (error) {
    console.error("POST /api/accounts/[username]/dm-logs error:", error);
    return NextResponse.json(
      { success: false, error: "خطا در ثبت لاگ دایرکت." },
      { status: 500 }
    );
  }
}
