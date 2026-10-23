import { NextRequest, NextResponse } from "next/server";
import { getDb, AccountRow, PostRow } from "@/lib/db";
import { getSessionUser, hasAccountAccess } from "@/lib/auth-guard";
import { SocialApiClient } from "@/lib/social-api";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 }
      );
    }

    const db = getDb();
    const { searchParams } = new URL(req.url);
    const accountParam = searchParams.get("account");
    const activeOnly = searchParams.get("active_only") === "1";

    let targetAccount = accountParam;

    if (!targetAccount) {
      return NextResponse.json({
        success: true,
        profile: null,
        posts: [],
      });
    }

    // Tenancy barrier: verify user has access to targetAccount
    if (!hasAccountAccess(user, targetAccount)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: You do not have access to this Instagram account",
        },
        { status: 403 }
      );
    }

    const profile =
      (db
        .prepare("SELECT * FROM accounts WHERE username = ?")
        .get(targetAccount) as AccountRow | undefined) || null;

    let query = `
      SELECT 
        p.*,
        (SELECT COUNT(*) FROM comment_logs l WHERE l.shortcode = p.shortcode) as logs_count,
        (SELECT COUNT(*) FROM comment_logs l WHERE l.shortcode = p.shortcode AND l.dm_status = 'sent') as dms_count,
        (SELECT COUNT(*) FROM comment_logs l WHERE l.shortcode = p.shortcode AND l.comment_reply_status = 'sent') as replies_count
      FROM posts p
      WHERE p.account_username = ?
    `;

    if (activeOnly) {
      query += " AND p.auto_reply = 1";
    }

    query += " ORDER BY COALESCE(p.posted_at, p.synced_at) DESC, p.id DESC";

    const posts = db.prepare(query).all(targetAccount) as (PostRow & {
      logs_count: number;
      dms_count: number;
      replies_count: number;
    })[];

    return NextResponse.json({
      success: true,
      profile,
      posts,
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

    const body = await req.json();
    const db = getDb();
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    const accountUsername = String(body.account_username || "")
      .trim()
      .replace(/^@/, "");

    if (!accountUsername) {
      return NextResponse.json(
        { success: false, error: "نام کاربری پیج الزامی است" },
        { status: 400 }
      );
    }

    // Tenancy barrier
    if (!hasAccountAccess(user, accountUsername)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: You do not have access to this Instagram account",
        },
        { status: 403 }
      );
    }

    // Optional: Publish / Schedule via SocialAPI.ai `POST /v1/posts` if `publish_to_instagram` is true
    let remotePostId = String(body.media_id || "");
    if (body.publish_to_instagram && Array.isArray(body.media_urls) && body.media_urls.length > 0) {
      const accountRow = db
        .prepare("SELECT * FROM accounts WHERE username = ?")
        .get(accountUsername) as AccountRow | undefined;
      const client = new SocialApiClient();
      const pubRes = await client.publishPost({
        account_id: accountRow?.social_account_id || accountUsername,
        targets: [{ platform: "instagram", account_id: accountRow?.social_account_id || undefined }],
        caption: String(body.caption || ""),
        media_urls: body.media_urls as string[],
        post_type: body.post_type === "post" ? "post" : "reel",
        scheduled_at: body.scheduled_at ? String(body.scheduled_at) : undefined,
      });
      if (pubRes.id) {
        remotePostId = pubRes.id;
      }
    }

    let shortcode = String(body.shortcode || remotePostId || "").trim();

    // Extract shortcode if full Instagram URL was provided
    if (body.url && !shortcode) {
      const match = String(body.url).match(/\/(p|reel|reels)\/([A-Za-z0-9_-]+)/);
      if (match) {
        shortcode = match[2];
      }
    }

    if (!shortcode) {
      return NextResponse.json(
        { success: false, error: "کد پست (Shortcode) یا لینک اینستاگرام الزامی است" },
        { status: 400 }
      );
    }

    const postType = body.post_type === "post" ? "post" : "reel";
    const postUrl =
      body.url ||
      `https://www.instagram.com/${accountUsername}/${postType === "reel" ? "reel" : "p"}/${shortcode}/`;

    db.prepare(`
      INSERT INTO posts (
        account_username, shortcode, media_id, url, post_type, thumbnail_url, caption,
        auto_reply, trigger_type, trigger_context, trigger_keywords,
        comment_action_type, comment_action_text,
        dm_action_type, dm_action_text, dm_require_follow,
        synced_at, updated_at, sort_index
      ) VALUES (
        @account_username, @shortcode, @media_id, @url, @post_type, @thumbnail_url, @caption,
        @auto_reply, @trigger_type, @trigger_context, @trigger_keywords,
        @comment_action_type, @comment_action_text,
        @dm_action_type, @dm_action_text, @dm_require_follow,
        @synced_at, @updated_at, @sort_index
      )
      ON CONFLICT(shortcode) DO UPDATE SET
        caption = COALESCE(NULLIF(excluded.caption, ''), posts.caption),
        thumbnail_url = COALESCE(NULLIF(excluded.thumbnail_url, ''), posts.thumbnail_url),
        post_type = COALESCE(excluded.post_type, posts.post_type),
        synced_at = excluded.synced_at,
        updated_at = excluded.updated_at
    `).run({
      account_username: accountUsername,
      shortcode,
      media_id: body.media_id || "",
      url: postUrl,
      post_type: postType,
      thumbnail_url: body.thumbnail_url || "/media/thumbnails/DehQhnjoEcr.jpg",
      caption: body.caption || "",
      auto_reply: body.auto_reply ? 1 : 0,
      trigger_type: body.trigger_type || "all",
      trigger_context: body.trigger_context || "",
      trigger_keywords: body.trigger_keywords || "",
      comment_action_type: body.comment_action_type || "none",
      comment_action_text: body.comment_action_text || "",
      dm_action_type: body.dm_action_type || "none",
      dm_action_text: body.dm_action_text || "",
      dm_require_follow: body.dm_require_follow ? 1 : 0,
      synced_at: now,
      updated_at: now,
      sort_index: 0,
    });

    const post = db
      .prepare("SELECT * FROM posts WHERE shortcode = ?")
      .get(shortcode);

    return NextResponse.json({ success: true, post });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
