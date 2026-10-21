import { NextRequest, NextResponse } from "next/server";
import {
  getDb,
  updateAccountProfileFromAgent,
  type AccountRow,
  type PostRow,
} from "@/lib/db";
import { getSessionUser, hasAccountAccess } from "@/lib/auth-guard";
import { authenticateMcpRequest } from "@/lib/mcp/auth-guard";
import { SocialApiClient, SocialApiError, type SocialApiPost } from "@/lib/social-api";
import { processIncomingComment } from "@/lib/instagram-automation";

export async function POST(req: NextRequest) {
  try {
    const authUser = await getSessionUser();
    let botAccount = "";

    if (!authUser) {
      const mcpAuth = await authenticateMcpRequest(req);
      if (mcpAuth.authenticated) {
        botAccount = mcpAuth.accountUsername || "";
      } else {
        return NextResponse.json(
          { success: false, error: "Unauthenticated" },
          { status: 401 }
        );
      }
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
      body.account || body.account_username || botAccount || ""
    )
      .trim()
      .toLowerCase()
      .replace(/^@/, "");

    if (authUser && accountUsername && !hasAccountAccess(authUser, accountUsername)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: You do not have access to this Instagram account",
        },
        { status: 403 }
      );
    }

    if (body.profile && typeof body.profile === "object" && accountUsername) {
      const p = body.profile as Record<string, string | undefined>;
      updateAccountProfileFromAgent(accountUsername, {
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        bio: p.bio,
        followers_text: p.followers_text,
      });
    }

    // Case 1: Bulk upsert of provided posts array
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
          media_id = COALESCE(NULLIF(excluded.media_id, ''), posts.media_id),
          caption = COALESCE(NULLIF(excluded.caption, ''), posts.caption),
          thumbnail_url = COALESCE(NULLIF(excluded.thumbnail_url, ''), posts.thumbnail_url),
          synced_at = excluded.synced_at,
          updated_at = excluded.updated_at
      `);

      let insertedCount = 0;
      const tx = db.transaction((items: Record<string, unknown>[]) => {
        items.forEach((item, idx) => {
          const sc = String(item.shortcode || item.id || "").trim();
          if (!sc) return;
          const acc = String(item.account_username || accountUsername || "r9spoort1");
          upsertPost.run({
            account_username: acc,
            shortcode: sc,
            media_id: String(item.media_id || item.id || sc),
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
          insertedCount++;
        });
      });

      tx(body.posts as Record<string, unknown>[]);

      if (accountUsername) {
        db.prepare(
          "UPDATE accounts SET last_heartbeat_at = ?, last_sync_at = ?, updated_at = ? WHERE username = ?"
        ).run(now, now, now, accountUsername);
      }

      const countRow = (
        accountUsername
          ? db
              .prepare("SELECT COUNT(*) as total FROM posts WHERE account_username = ?")
              .get(accountUsername)
          : db.prepare("SELECT COUNT(*) as total FROM posts").get()
      ) as { total: number };

      return NextResponse.json({
        success: true,
        synced_at: now,
        synced_count: insertedCount,
        stats: { total: countRow.total },
      });
    }

    // Case 2: On-demand Sync via SocialAPI.ai (`/v1/accounts`, `/v1/posts`, `/v1/inbox/comments`)
    const targetAccount = accountUsername || "r9spoort1";
    const accountRow = db
      .prepare("SELECT * FROM accounts WHERE username = ?")
      .get(targetAccount) as AccountRow | undefined;

    const client = new SocialApiClient();
    if (!client.hasCredentials()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "کلید دسترسی SocialAPI.ai تنظیم نشده است. لطفاً از بخش مدیریت (Back-Office) کلید `sapi_key_...` را وارد نمایید.",
          session_required: false,
        },
        { status: 400 }
      );
    }

    try {
      // 2.1 Refresh account profile and resolve `social_account_id` via `GET /v1/accounts`
      let socialAccountId = accountRow?.social_account_id || "";
      const remoteAccounts = await client.listAccounts("instagram");
      const matchedAccount =
        remoteAccounts.data.find((a) => socialAccountId && a.id === socialAccountId) ||
        remoteAccounts.data.find(
          (a) =>
            a.username?.toLowerCase() === targetAccount ||
            a.handle?.toLowerCase().replace(/^@/, "") === targetAccount
        );

      if (matchedAccount) {
        socialAccountId = matchedAccount.id;
        db.prepare(`
          UPDATE accounts
          SET social_account_id = @social_account_id,
              display_name = COALESCE(NULLIF(@display_name, ''), display_name),
              avatar_url = COALESCE(NULLIF(@avatar_url, ''), avatar_url),
              bio = COALESCE(NULLIF(@bio, ''), bio),
              session_status = 'active',
              last_sync_at = @now,
              updated_at = @now
          WHERE username = @username
        `).run({
          social_account_id: socialAccountId,
          display_name: matchedAccount.display_name || matchedAccount.name || "",
          avatar_url:
            matchedAccount.avatar_url || matchedAccount.profile_picture_url || "",
          bio: matchedAccount.bio || "",
          now,
          username: targetAccount,
        });
      } else if (!socialAccountId) {
        return NextResponse.json(
          {
            success: false,
            error:
              "اکانت اینستاگرام هنوز از طریق SocialAPI (OAuth) متصل نشده است. لطفاً ابتدا اکانت را متصل کنید.",
            session_required: true,
          },
          { status: 401 }
        );
      }

      // 2.2 Fetch posts from `/v1/posts` and `/v1/inbox/comments`
      const [publishedRes, commentedRes] = await Promise.allSettled([
        client.listPosts(socialAccountId),
        client.listCommentedPosts(socialAccountId),
      ]);

      const combinedMap = new Map<string, SocialApiPost>();
      if (publishedRes.status === "fulfilled") {
        for (const p of publishedRes.value.data) {
          const key = String(p.shortcode || p.code || p.post_id || p.id || "");
          if (key) combinedMap.set(key, p);
        }
      }
      if (commentedRes.status === "fulfilled") {
        for (const p of commentedRes.value.data) {
          const key = String(p.shortcode || p.code || p.post_id || p.id || "");
          if (key && !combinedMap.has(key)) combinedMap.set(key, p);
        }
      }

      const remotePosts = Array.from(combinedMap.values());

      const upsertPost = db.prepare(`
        INSERT INTO posts (
          account_username, shortcode, media_id, url, post_type, thumbnail_url, caption,
          synced_at, updated_at, sort_index
        ) VALUES (
          @account_username, @shortcode, @media_id, @url, @post_type, @thumbnail_url, @caption,
          @synced_at, @updated_at, @sort_index
        )
        ON CONFLICT(shortcode) DO UPDATE SET
          media_id = COALESCE(NULLIF(excluded.media_id, ''), posts.media_id),
          caption = COALESCE(NULLIF(excluded.caption, ''), posts.caption),
          thumbnail_url = COALESCE(NULLIF(excluded.thumbnail_url, ''), posts.thumbnail_url),
          synced_at = excluded.synced_at,
          updated_at = excluded.updated_at
      `);

      let insertedCount = 0;
      const tx = db.transaction((items: SocialApiPost[]) => {
        items.forEach((m, idx) => {
          const sc = String(m.shortcode || m.code || m.post_id || m.id || "").trim();
          if (!sc) return;
          const mediaId = String(m.post_id || m.id || sc);
          const rawType = String(m.media_type || m.type || "reel").toLowerCase();
          const postType = rawType.includes("post") || rawType.includes("image") ? "post" : "reel";

          upsertPost.run({
            account_username: targetAccount,
            shortcode: sc,
            media_id: mediaId,
            url:
              m.url ||
              m.permalink ||
              `https://www.instagram.com/${targetAccount}/${postType === "reel" ? "reel" : "p"}/${sc}/`,
            post_type: postType,
            thumbnail_url: String(m.thumbnail_url || m.media_url || ""),
            caption: String(m.caption || m.text || ""),
            synced_at: now,
            updated_at: now,
            sort_index: idx,
          });
          insertedCount++;
        });
      });

      tx(remotePosts);

      // 2.3 Poll & process recent unprocessed comments on active posts (`auto_reply = 1`)
      const activePosts = db
        .prepare("SELECT * FROM posts WHERE account_username = ? AND auto_reply = 1")
        .all(targetAccount) as PostRow[];

      let processedCommentsCount = 0;
      for (const activePost of activePosts) {
        const postId = activePost.media_id || activePost.shortcode;
        try {
          const commentsRes = await client.listPostComments(postId, socialAccountId);
          for (const cmt of commentsRes.data) {
            const cmtId = String(cmt.id || cmt.comment_id || "");
            if (!cmtId) continue;
            const res = await processIncomingComment({
              commentId: cmtId,
              postId,
              shortcode: activePost.shortcode,
              accountUsername: targetAccount,
              socialAccountId,
              commenterUsername:
                cmt.username || cmt.author_username || cmt.author_name || "user",
              commenterUserId: cmt.user_id || cmt.author_id || "",
              commentText: cmt.text || "",
            });
            if (res.processed && !res.already_processed) {
              processedCommentsCount++;
            }
          }
        } catch {
          // Continue syncing remaining active posts
        }
      }

      db.prepare(
        "UPDATE accounts SET last_sync_at = ?, last_heartbeat_at = ?, updated_at = ? WHERE username = ?"
      ).run(now, now, now, targetAccount);

      const countRow = db
        .prepare("SELECT COUNT(*) as total FROM posts WHERE account_username = ?")
        .get(targetAccount) as { total: number };

      return NextResponse.json({
        success: true,
        synced_at: now,
        synced_count: insertedCount,
        processed_comments_count: processedCommentsCount,
        stats: { total: countRow.total },
        message: `همگام‌سازی از طریق SocialAPI.ai انجام شد (${insertedCount} پست همگام شد، ${processedCommentsCount} کامنت جدید پردازش شد).`,
      });
    } catch (err: unknown) {
      const isAuthErr = err instanceof SocialApiError && err.status === 401;
      if (isAuthErr) {
        db.prepare(
          "UPDATE accounts SET session_status = 'reauth_required', updated_at = ? WHERE username = ?"
        ).run(now, targetAccount);
      }

      return NextResponse.json(
        {
          success: false,
          error:
            err instanceof SocialApiError
              ? err.message
              : (err as Error).message || "خطا در همگام‌سازی با SocialAPI.ai",
          session_required: isAuthErr,
        },
        { status: err instanceof SocialApiError ? err.status : 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
