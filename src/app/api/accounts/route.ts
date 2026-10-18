import { NextRequest, NextResponse } from "next/server";
import { getDb, AccountRow } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const accounts = db
      .prepare(`
        SELECT 
          a.*,
          (SELECT COUNT(*) FROM posts p WHERE p.account_username = a.username) as total_posts,
          (SELECT COUNT(*) FROM posts p WHERE p.account_username = a.username AND p.auto_reply = 1) as active_posts,
          (SELECT COUNT(*) FROM comment_logs l WHERE l.account_username = a.username) as total_logs,
          (SELECT COUNT(*) FROM comment_logs l WHERE l.account_username = a.username AND l.dm_status = 'sent') as total_dms,
          (SELECT COUNT(*) FROM comment_logs l WHERE l.account_username = a.username AND l.comment_reply_status = 'sent') as total_replies
        FROM accounts a
        ORDER BY a.id ASC
      `)
      .all();

    return NextResponse.json({ success: true, accounts });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawUsername = String(body.username || "")
      .trim()
      .replace(/^@/, "")
      .toLowerCase();

    if (!rawUsername) {
      return NextResponse.json(
        { success: false, error: "نام کاربری پیج الزامی است" },
        { status: 400 }
      );
    }

    const db = getDb();
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    db.prepare(`
      INSERT INTO accounts (
        username, display_name, avatar_url, bio, followers_text,
        posts_count, status, agent_interval_sec, last_heartbeat_at, updated_at, created_at
      ) VALUES (
        @username, @display_name, @avatar_url, @bio, @followers_text,
        @posts_count, @status, @agent_interval_sec, @last_heartbeat_at, @updated_at, @created_at
      )
      ON CONFLICT(username) DO UPDATE SET
        display_name = COALESCE(NULLIF(excluded.display_name, ''), accounts.display_name),
        avatar_url = COALESCE(NULLIF(excluded.avatar_url, ''), accounts.avatar_url),
        bio = COALESCE(NULLIF(excluded.bio, ''), accounts.bio),
        followers_text = COALESCE(excluded.followers_text, accounts.followers_text),
        agent_interval_sec = COALESCE(excluded.agent_interval_sec, accounts.agent_interval_sec),
        updated_at = excluded.updated_at
    `).run({
      username: rawUsername,
      display_name: body.display_name || rawUsername,
      avatar_url: body.avatar_url || "/media/avatar.jpg",
      bio: body.bio || "",
      followers_text: body.followers_text || "0",
      posts_count: body.posts_count || 0,
      status: body.status || "active",
      agent_interval_sec: Number(body.agent_interval_sec) || 120,
      last_heartbeat_at: now,
      updated_at: now,
      created_at: now,
    });

    const account = db
      .prepare("SELECT * FROM accounts WHERE username = ?")
      .get(rawUsername) as AccountRow;

    return NextResponse.json({ success: true, account });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
