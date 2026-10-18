import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser, hasAccountAccess } from "@/lib/auth-guard";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 }
      );
    }

    const db = getDb();
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const accountUsername = String(
      body.account || body.account_username || ""
    ).trim();

    // Verify tenancy if target account specified
    if (accountUsername && !hasAccountAccess(user, accountUsername)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: You do not have access to this Instagram account",
        },
        { status: 403 }
      );
    }

    // If agent pushes an array of scraped posts during sync:
    if (Array.isArray(body.posts) && body.posts.length > 0) {
      const upsertPost = db.prepare(`
        INSERT INTO posts (
          account_username, shortcode, media_id, url, post_type, thumbnail_url, caption,
          synced_at, updated_at, sort_index
        ) VALUES (
          @account_username, @shortcode, @media_id, @url, @post_type, @thumbnail_url, @caption,
          @synced_at, @updated_at, @sort_index
        )
        ON CONFLICT(shortcode) DO UPDATE SET
          caption = COALESCE(NULLIF(excluded.caption, ''), posts.caption),
          thumbnail_url = COALESCE(NULLIF(excluded.thumbnail_url, ''), posts.thumbnail_url),
          synced_at = excluded.synced_at
      `);

      const tx = db.transaction((items: Record<string, unknown>[]) => {
        items.forEach((item, idx) => {
          const sc = String(item.shortcode || "").trim();
          if (!sc) return;
          const acc = String(item.account_username || accountUsername || "r9spoort1");
          upsertPost.run({
            account_username: acc,
            shortcode: sc,
            media_id: String(item.media_id || ""),
            url: String(item.url || `https://www.instagram.com/${acc}/p/${sc}/`),
            post_type: item.post_type === "post" ? "post" : "reel",
            thumbnail_url: String(
              item.thumbnail_url || "/media/thumbnails/DehQhnjoEcr.jpg"
            ),
            caption: String(item.caption || ""),
            synced_at: now,
            updated_at: now,
            sort_index: idx,
          });
        });
      });

      tx(body.posts as Record<string, unknown>[]);
    }

    if (accountUsername) {
      db.prepare(
        "UPDATE accounts SET last_heartbeat_at = ?, updated_at = ? WHERE username = ?"
      ).run(now, now, accountUsername);
    } else {
      db.prepare(
        "UPDATE accounts SET last_heartbeat_at = ?, updated_at = ?"
      ).run(now, now);
    }

    const countRow = accountUsername
      ? (db
          .prepare(
            "SELECT COUNT(*) as total FROM posts WHERE account_username = ?"
          )
          .get(accountUsername) as { total: number })
      : (db.prepare("SELECT COUNT(*) as total FROM posts").get() as {
          total: number;
        });

    return NextResponse.json({
      success: true,
      synced_at: now,
      stats: {
        total: countRow.total,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
