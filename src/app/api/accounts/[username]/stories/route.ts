import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasAccountAccess } from "@/lib/auth-guard";
import { getDb, type AccountRow, type StoryRow } from "@/lib/db";
import { SocialApiClient } from "@/lib/social-api";
import { normalizeStoryDefaultMode, syncStoriesFromApi } from "@/lib/stories";

interface RouteParams {
  params: Promise<{ username: string }>;
}

/**
 * GET /api/accounts/[username]/stories
 * Syncs active 24h stories (0 credits) into the `stories` table (rows kept after expiry),
 * and returns them with the account-level story default mode.
 * `?refresh=1` forces a SocialAPI sync; otherwise sync runs only when last sync is older than 5 minutes.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { username } = await params;
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");
    if (!hasAccountAccess(user, cleanUsername)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();
    const account = db
      .prepare("SELECT * FROM accounts WHERE username = ?")
      .get(cleanUsername) as AccountRow | undefined;
    if (!account) return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });

    const forceRefresh = req.nextUrl.searchParams.get("refresh") === "1";
    const last = db
      .prepare("SELECT MAX(synced_at) AS t FROM stories WHERE account_username = ?")
      .get(cleanUsername) as { t: string | null };
    const lastMs = last?.t ? new Date(last.t.replace(" ", "T") + "Z").getTime() : 0;
    const stale = !lastMs || Date.now() - lastMs > 5 * 60 * 1000;

    let syncError: string | null = null;
    if ((forceRefresh || stale) && account.social_account_id) {
      try {
        const fresh = await new SocialApiClient().listActiveInstagramStories(account.social_account_id);
        if (Array.isArray(fresh)) syncStoriesFromApi(cleanUsername, fresh as Array<Record<string, unknown>>);
      } catch (err) {
        syncError = err instanceof Error ? err.message : "sync failed";
      }
    }

    const rows = db
      .prepare(
        "SELECT * FROM stories WHERE account_username = ? ORDER BY COALESCE(created_at, synced_at) DESC, id DESC LIMIT 60"
      )
      .all(cleanUsername) as StoryRow[];
    const dm = db
      .prepare("SELECT story_handling_mode FROM dm_automations WHERE account_username = ?")
      .get(cleanUsername) as { story_handling_mode: string } | undefined;

    const now = Date.now();
    const stories = rows.map((s) => ({
      ...s,
      is_active: s.expires_at ? new Date(s.expires_at).getTime() > now : false,
    }));

    return NextResponse.json({
      success: true,
      stories,
      story_default_mode: normalizeStoryDefaultMode(dm?.story_handling_mode),
      sync_error: syncError,
    });
  } catch (err) {
    console.error("[stories GET]", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
