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
import { pollActiveAccountsAndPosts } from "@/lib/instagram/aggregator";

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

      interface NormalizedSyncPost {
        shortcode: string;
        media_id: string;
        url: string;
        post_type: "post" | "reel";
        thumbnail_url: string;
        caption: string;
      }

      function extractShortcodeFromUrl(url?: string): string | null {
        if (!url) return null;
        const match = url.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/);
        return match ? match[1] : null;
      }

      const combinedMap = new Map<string, NormalizedSyncPost>();

      function mergePostData(p: SocialApiPost) {
        const permalink = p.permalink || p.url || p.targets?.[0]?.permalink || "";
        const extractedSc = extractShortcodeFromUrl(permalink);
        const platformId = p.platform_id || p.targets?.[0]?.platform_post_id;
        const nonUuidId = p.id && !p.id.includes("-") ? p.id : undefined;

        const shortcode =
          extractedSc ||
          (p.shortcode && !p.shortcode.includes("-") ? p.shortcode : undefined) ||
          (p.code && !p.code.includes("-") ? p.code : undefined) ||
          platformId ||
          nonUuidId ||
          p.id;

        if (!shortcode) return;

        const mediaId = String(platformId || nonUuidId || p.post_id || shortcode);

        const rawThumb =
          p.thumbnail ||
          p.thumbnail_url ||
          p.media_url ||
          p.targets?.[0]?.platform_media?.[0]?.url ||
          "";

        let thumbnailUrl = "";
        if (rawThumb) {
          if (rawThumb.startsWith("http://") || rawThumb.startsWith("https://")) {
            thumbnailUrl = `/api/media/proxy?url=${encodeURIComponent(rawThumb)}`;
          } else {
            thumbnailUrl = rawThumb;
          }
        }

        const rawCaption = String(p.caption || p.text || p.content || "").trim();
        const rawType = String(p.media_type || p.type || "").toLowerCase();
        const postType: "post" | "reel" =
          permalink.includes("/p/") || rawType.includes("post") || rawType.includes("image")
            ? "post"
            : "reel";

        const url =
          permalink ||
          `https://www.instagram.com/${targetAccount}/${postType === "reel" ? "reel" : "p"}/${shortcode}/`;

        // Key by mediaId or shortcode to deduplicate across /v1/posts and /v1/inbox/comments
        const dedupKey = mediaId || shortcode;
        const existing = combinedMap.get(dedupKey);

        if (!existing) {
          combinedMap.set(dedupKey, {
            shortcode,
            media_id: mediaId,
            url,
            post_type: postType,
            thumbnail_url: thumbnailUrl,
            caption: rawCaption,
          });
        } else {
          if (!existing.caption && rawCaption) existing.caption = rawCaption;
          if (!existing.thumbnail_url && thumbnailUrl) existing.thumbnail_url = thumbnailUrl;
          if (extractedSc && existing.shortcode !== extractedSc) {
            existing.shortcode = extractedSc;
          }
          if (permalink && !existing.url.includes("instagram.com/p/")) {
            existing.url = permalink;
          }
        }
      }

      if (publishedRes.status === "fulfilled" && Array.isArray(publishedRes.value.data)) {
        for (const p of publishedRes.value.data) {
          mergePostData(p);
        }
      }
      if (commentedRes.status === "fulfilled" && Array.isArray(commentedRes.value.data)) {
        for (const p of commentedRes.value.data) {
          mergePostData(p);
        }
      }

      const remotePosts = Array.from(combinedMap.values());

      // Clean up legacy malformed rows with UUID shortcodes
      db.prepare(`
        DELETE FROM posts
        WHERE account_username = ? AND length(shortcode) = 36 AND shortcode LIKE '%-%'
      `).run(targetAccount);

      // Clean up legacy rows where shortcode was saved as numeric platform media_id
      for (const p of remotePosts) {
        if (p.media_id && p.shortcode !== p.media_id) {
          db.prepare(`
            DELETE FROM posts
            WHERE account_username = ? AND shortcode = ?
          `).run(targetAccount, p.media_id);
        }
      }

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
      const tx = db.transaction((items: NormalizedSyncPost[]) => {
        items.forEach((m, idx) => {
          upsertPost.run({
            account_username: targetAccount,
            shortcode: m.shortcode,
            media_id: m.media_id,
            url: m.url,
            post_type: m.post_type,
            thumbnail_url: m.thumbnail_url,
            caption: m.caption,
            synced_at: now,
            updated_at: now,
            sort_index: idx,
          });
          insertedCount++;
        });
      });

      tx(remotePosts);

      // 2.3 Poll & process recent unprocessed comments/DMs and drain queue via Aggregator
      const pollSummary = await pollActiveAccountsAndPosts({
        accountUsername: targetAccount,
      });
      const processedCommentsCount = pollSummary.commentsIngested;

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
