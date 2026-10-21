import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasAccountAccess } from "@/lib/auth-guard";
import { getDb, type AccountRow } from "@/lib/db";
import { SocialApiClient, SocialApiError } from "@/lib/social-api";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const client = new SocialApiClient();
    if (!client.hasCredentials()) {
      return NextResponse.json({
        success: false,
        needsBackofficeKey: true,
        accounts: [],
        error: "کلید SocialAPI.ai هنوز توسط مدیر سیستم در بخش Back-Office تنظیم نشده است.",
      });
    }

    const remote = await client.listAccounts("instagram");
    return NextResponse.json({
      success: true,
      accounts: remote.data,
      count: remote.count,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        accounts: [],
        error:
          err instanceof SocialApiError
            ? err.message
            : (err as Error).message || "خطا در دریافت لیست اکانت‌های SocialAPI",
      },
      { status: 400 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const action = String(body.action || "initiate");
    const usernameInput = String(body.username || "")
      .trim()
      .toLowerCase()
      .replace(/^@/, "");

    if (usernameInput && !hasAccountAccess(user, usernameInput) && user.role !== "superadmin") {
      // Allow if account doesn't exist yet or user owns it
      const db = getDb();
      const exists = db
        .prepare("SELECT username FROM accounts WHERE username = ?")
        .get(usernameInput);
      if (exists) {
        return NextResponse.json(
          { success: false, error: "شما دسترسی مجاز به این اکانت اینستاگرام را ندارید." },
          { status: 403 }
        );
      }
    }

    const client = new SocialApiClient();

    // Action 1: Initiate OAuth Flow via POST /v1/accounts/connect
    if (action === "initiate") {
      const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const redirectUrl =
        body.redirect_url ||
        (usernameInput ? `${origin}/@${usernameInput}/comments` : `${origin}/`);

      const connectRes = await client.connectAccount({
        platform: "instagram",
        redirect_url: redirectUrl,
      });

      const authUrl =
        connectRes.url || connectRes.auth_url || connectRes.authorization_url || "";

      return NextResponse.json({
        success: true,
        auth_url: authUrl,
        account_id: connectRes.account_id || null,
        status: connectRes.status || "pending",
      });
    }

    // Action 2: Sync / Link a connected SocialAPI account (`GET /v1/accounts`)
    if (action === "sync") {
      const remoteList = await client.listAccounts("instagram");
      const targetSocialId = body.social_account_id
        ? String(body.social_account_id).trim()
        : "";

      const matchedRemote =
        remoteList.data.find((a) => targetSocialId && a.id === targetSocialId) ||
        remoteList.data.find(
          (a) =>
            usernameInput &&
            (a.username?.toLowerCase() === usernameInput ||
              a.handle?.toLowerCase().replace(/^@/, "") === usernameInput)
        ) ||
        (remoteList.data.length === 1 ? remoteList.data[0] : undefined);

      if (!matchedRemote && !targetSocialId) {
        return NextResponse.json(
          {
            success: false,
            accounts: remoteList.data,
            error:
              remoteList.data.length === 0
                ? "هیچ اکانت اینستاگرام متصلی در فضای کاری SocialAPI.ai یافت نشد. ابتدا دکمه «اتصال از طریق OAuth» را بزنید."
                : "اکانت متناظر یافت نشد. لطفاً اکانت موردنظر را از لیست انتخاب نمایید.",
          },
          { status: 404 }
        );
      }

      const resolvedUsername = (
        usernameInput ||
        matchedRemote?.username ||
        matchedRemote?.handle ||
        ""
      )
        .trim()
        .toLowerCase()
        .replace(/^@/, "");

      if (!resolvedUsername) {
        return NextResponse.json(
          { success: false, error: "نام کاربری اینستاگرام مشخص نیست." },
          { status: 400 }
        );
      }

      const socialAccountId = matchedRemote?.id || targetSocialId;
      const displayName =
        matchedRemote?.display_name || matchedRemote?.name || resolvedUsername;
      const avatarUrl =
        matchedRemote?.avatar_url || matchedRemote?.profile_picture_url || "";
      const bio = matchedRemote?.bio || "";
      const followersText =
        typeof matchedRemote?.followers_count === "number"
          ? String(matchedRemote.followers_count)
          : null;

      const db = getDb();
      const now = new Date().toISOString().replace("T", " ").slice(0, 19);

      db.prepare(`
        INSERT INTO accounts (
          username, social_account_id, display_name, avatar_url, bio, followers_text,
          session_status, status, last_sync_at, updated_at, created_at
        ) VALUES (
          @username, @social_account_id, @display_name, @avatar_url, @bio, @followers_text,
          'active', 'active', @now, @now, @now
        )
        ON CONFLICT(username) DO UPDATE SET
          social_account_id = excluded.social_account_id,
          display_name = COALESCE(NULLIF(excluded.display_name, ''), accounts.display_name),
          avatar_url = COALESCE(NULLIF(excluded.avatar_url, ''), accounts.avatar_url),
          bio = COALESCE(NULLIF(excluded.bio, ''), accounts.bio),
          followers_text = COALESCE(excluded.followers_text, accounts.followers_text),
          session_status = 'active',
          status = 'active',
          last_sync_at = excluded.last_sync_at,
          updated_at = excluded.updated_at
      `).run({
        username: resolvedUsername,
        social_account_id: socialAccountId,
        display_name: displayName,
        avatar_url: avatarUrl,
        bio,
        followers_text: followersText,
        now,
      });

      // Ensure tenancy assignment
      db.prepare(`
        INSERT OR IGNORE INTO user_accounts (user_id, account_username, created_at)
        VALUES (?, ?, ?)
      `).run(user.id, resolvedUsername, now);

      const updatedAccount = db
        .prepare("SELECT * FROM accounts WHERE username = ?")
        .get(resolvedUsername) as AccountRow;

      return NextResponse.json({
        success: true,
        message: `اکانت @${resolvedUsername} با موفقیت از طریق SocialAPI.ai متصل و فعال شد.`,
        account: updatedAccount,
      });
    }

    return NextResponse.json(
      { success: false, error: "عملیات نامعتبر است." },
      { status: 400 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof SocialApiError
            ? err.message
            : (err as Error).message || "خطا در اتصال اکانت با SocialAPI.ai",
      },
      { status: 400 }
    );
  }
}
