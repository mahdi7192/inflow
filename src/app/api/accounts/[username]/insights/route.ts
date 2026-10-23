import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasAccountAccess } from "@/lib/auth-guard";
import { getDb, type AccountRow, type PostRow } from "@/lib/db";
import { SocialApiClient } from "@/lib/social-api";
import { syncStoriesFromApi } from "@/lib/stories";

interface RouteParams {
  params: Promise<{
    username: string;
  }>;
}

/**
 * GET /api/accounts/[username]/insights
 * Fetches (or serves cached) zero-credit SocialAPI account summary, active 24h stories,
 * per-post deep metrics (`views`, `reach`, `saves`, `shares`, `follows`, `skip_rate`),
 * and internal InFlow ROI funnel stats (`comments`, `dms_sent`, `dms_read`, `follow_gate_converted`).
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { username } = await params;
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");
    if (!hasAccountAccess(user, cleanUsername)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const forceRefresh = req.nextUrl.searchParams.get("refresh") === "1";
    const db = getDb();
    const account = db
      .prepare("SELECT * FROM accounts WHERE username = ?")
      .get(cleanUsername) as AccountRow | undefined;

    if (!account) {
      return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
    }

    const posts = db
      .prepare(
        "SELECT shortcode, media_id, post_type, auto_reply, playbook_id, cheat_sheet, target_url, target_button_text, metrics_json FROM posts WHERE account_username = ? ORDER BY COALESCE(posted_at, synced_at) DESC, id DESC LIMIT 24"
      )
      .all(cleanUsername) as PostRow[];

    let cachedInsights: {
      fetched_at?: number;
      summary?: Record<string, unknown> | null;
      stories?: Array<Record<string, unknown>>;
    } = {};

    if (account.insights_json) {
      try {
        cachedInsights = JSON.parse(account.insights_json);
      } catch {
        cachedInsights = {};
      }
    }

    const nowMs = Date.now();
    const isStale = !cachedInsights.fetched_at || nowMs - cachedInsights.fetched_at > 5 * 60 * 1000;

    let summary = cachedInsights.summary || null;
    let stories = Array.isArray(cachedInsights.stories) ? cachedInsights.stories : [];
    const postMetricsMap: Record<string, Record<string, unknown>> = {};

    // Populate existing cached post metrics first
    for (const p of posts) {
      if (p.metrics_json) {
        try {
          postMetricsMap[p.shortcode] = JSON.parse(p.metrics_json);
        } catch {
          // ignore invalid json
        }
      }
    }

    if ((forceRefresh || isStale) && account.social_account_id) {
      try {
        const client = new SocialApiClient();
        const [freshSummary, freshStories] = await Promise.all([
          client.getInstagramAccountSummary(account.social_account_id),
          client.listActiveInstagramStories(account.social_account_id),
        ]);

        if (freshSummary) summary = freshSummary;
        if (Array.isArray(freshStories)) stories = freshStories;
        if (Array.isArray(freshStories)) {
          syncStoriesFromApi(cleanUsername, freshStories as Array<Record<string, unknown>>);
        }

        db.prepare("UPDATE accounts SET insights_json = ? WHERE username = ?").run(
          JSON.stringify({
            fetched_at: nowMs,
            summary,
            stories,
          }),
          cleanUsername
        );

        // Fetch deep metrics for top 10 posts in parallel (0 credits)
        const postsToFetch = posts
          .filter((p) => p.media_id && (forceRefresh || !postMetricsMap[p.shortcode]))
          .slice(0, 10);

        await Promise.all(
          postsToFetch.map(async (p) => {
            const m = await client.getPostDeepMetrics(p.media_id);
            if (m && typeof m === "object") {
              const inner = (
                typeof m.metrics === "object" && m.metrics ? m.metrics : m
              ) as Record<string, unknown>;
              postMetricsMap[p.shortcode] = inner;
              db.prepare("UPDATE posts SET metrics_json = ? WHERE shortcode = ?").run(
                JSON.stringify(inner),
                p.shortcode
              );
            }
          })
        );
      } catch (e) {
        console.warn("[GET /api/accounts/[username]/insights] Live fetch fallback:", (e as Error).message);
      }
    }

    // Aggregate total views, reach, saves, shares, follows, and average skip_rate across posts
    let totalPostViews = 0;
    let totalPostReach = 0;
    let totalPostSaves = 0;
    let totalPostShares = 0;
    let totalPostFollows = 0;
    let skipRateSum = 0;
    let skipRateCount = 0;

    for (const shortcode of Object.keys(postMetricsMap)) {
      const m = postMetricsMap[shortcode] || {};
      totalPostViews += Number(m.views || m.plays || 0);
      totalPostReach += Number(m.reach || 0);
      totalPostSaves += Number(m.saves || m.saved || 0);
      totalPostShares += Number(m.shares || 0);
      totalPostFollows += Number(m.follows || 0);
      if (typeof m.skip_rate === "number" && m.skip_rate > 0) {
        skipRateSum += m.skip_rate;
        skipRateCount++;
      }
    }

    // Internal InFlow Funnel Stats from SQLite
    const commentStats = db
      .prepare(`
        SELECT
          COUNT(*) as total_comments,
          SUM(CASE WHEN comment_reply_status = 'sent' THEN 1 ELSE 0 END) as comment_replies_sent,
          SUM(CASE WHEN dm_status = 'sent' THEN 1 ELSE 0 END) as comment_dms_sent,
          SUM(CASE WHEN dm_status = 'pending_follow' THEN 1 ELSE 0 END) as pending_follow_count
        FROM comment_logs
        WHERE account_username = ?
      `)
      .get(cleanUsername) as {
      total_comments: number;
      comment_replies_sent: number;
      comment_dms_sent: number;
      pending_follow_count: number;
    };

    const dmStats = db
      .prepare(`
        SELECT
          COUNT(*) as total_dms,
          SUM(CASE WHEN reply_status = 'sent' THEN 1 ELSE 0 END) as dm_replies_sent,
          SUM(CASE WHEN read_at IS NOT NULL THEN 1 ELSE 0 END) as dms_read,
          SUM(CASE WHEN is_story_reply = 1 THEN 1 ELSE 0 END) as story_replies
        FROM dm_logs
        WHERE account_username = ?
      `)
      .get(cleanUsername) as {
      total_dms: number;
      dm_replies_sent: number;
      dms_read: number;
      story_replies: number;
    };

    const followConvertedRow = db
      .prepare(`
        SELECT COUNT(*) as cnt
        FROM bot_activity_logs
        WHERE account_username = ? AND title LIKE '%تایید فالو%'
      `)
      .get(cleanUsername) as { cnt: number };

    const summaryMetrics = (
      summary && typeof summary.metrics === "object" && summary.metrics
        ? summary.metrics
        : summary || {}
    ) as Record<string, unknown>;

    return NextResponse.json({
      success: true,
      account: {
        username: account.username,
        account_persona: account.account_persona || "business",
        brand_cheat_sheet: account.brand_cheat_sheet || "",
        website_url: account.website_url || "",
      },
      funnel: {
        views: Number(summaryMetrics.views || totalPostViews || 0),
        reach: Number(summaryMetrics.reach || totalPostReach || 0),
        saves: totalPostSaves,
        shares: totalPostShares,
        avg_skip_rate: skipRateCount > 0 ? Number((skipRateSum / skipRateCount).toFixed(1)) : null,
        total_comments: Number(commentStats?.total_comments || 0),
        comment_replies_sent: Number(commentStats?.comment_replies_sent || 0),
        total_dms_sent:
          Number(commentStats?.comment_dms_sent || 0) + Number(dmStats?.dm_replies_sent || 0),
        dms_read: Number(dmStats?.dms_read || 0),
        story_replies: Number(dmStats?.story_replies || 0),
        follows_gained: totalPostFollows + Number(followConvertedRow?.cnt || 0),
        pending_follow: Number(commentStats?.pending_follow_count || 0),
      },
      stories,
      post_metrics: postMetricsMap,
    });
  } catch (error) {
    console.error("GET /api/accounts/[username]/insights error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
