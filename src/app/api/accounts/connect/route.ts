import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasAccountAccess } from "@/lib/auth-guard";
import { getDb, type AccountRow } from "@/lib/db";
import { SocialApiClient, SocialApiError } from "@/lib/social-api";

export async function GET(req: NextRequest) {
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
        error: "کلید SocialAPI.ai هنوز در بخش تنظیمات وارد نشده است.",
      });
    }

    const url = new URL(req.url);
    const targetUser = url.searchParams.get("username")?.trim().toLowerCase().replace(/^@/, "");

    const remote = await client.listAccounts("instagram");

    if (targetUser) {
      const matched = remote.data.find(
        (a) =>
          a.username?.toLowerCase() === targetUser ||
          a.handle?.toLowerCase().replace(/^@/, "") === targetUser
      );

      let matchedBrand = null;
      let authUrl = null;

      if (matched) {
        try {
          const brandsRes = await client.listBrands();
          matchedBrand = brandsRes.data.find((b) => b.name?.trim().toLowerCase() === targetUser) || null;
        } catch {
          // Ignore brand list error on check
        }
      } else {
        // Pre-generate brand and auth_url so front-end has a real <a> link ready immediately
        try {
          matchedBrand = await client.getOrCreateBrand(targetUser);
          const db = getDb();
          const now = new Date().toISOString().replace("T", " ").slice(0, 19);
          db.prepare(`
            UPDATE accounts SET social_brand_id = ?, updated_at = ? WHERE username = ?
          `).run(matchedBrand.id, now, targetUser);

          const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://inflow.ketabdar.dev";
          const redirectUrl = `${origin}/auth/callback?username=${encodeURIComponent(targetUser)}`;

          const connectRes = await client.connectAccount({
            platform: "instagram",
            brand_id: matchedBrand.id,
            redirect_uri: redirectUrl,
          });

          authUrl = connectRes.auth_url || connectRes.url || connectRes.authorization_url || null;
        } catch {
          // Fallback if pre-generation fails
        }
      }

      return NextResponse.json({
        success: true,
        connected: Boolean(matched),
        account: matched || null,
        brand: matchedBrand,
        auth_url: authUrl,
      });
    }

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
            : (err as Error).message || "خطا در دریافت اطلاعات SocialAPI",
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

    if (!usernameInput) {
      return NextResponse.json(
        { success: false, error: "نام کاربری پیج الزامی است." },
        { status: 400 }
      );
    }

    if (!hasAccountAccess(user, usernameInput) && user.role !== "superadmin") {
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
    if (!client.hasCredentials()) {
      return NextResponse.json(
        { success: false, error: "کلید ارتباطی SocialAPI در سیستم ثبت نشده است." },
        { status: 400 }
      );
    }

    const db = getDb();
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    // Action 1: Initiate OAuth / Auto Check
    // Checks if the page is already connected on SocialAPI.
    // If NOT: finds or creates a Brand in SocialAPI and generates the OAuth auth_url for that brand.
    if (action === "initiate" || action === "check_or_connect") {
      const remoteList = await client.listAccounts("instagram");
      const matchedRemote = remoteList.data.find(
        (a) =>
          a.username?.toLowerCase() === usernameInput ||
          a.handle?.toLowerCase().replace(/^@/, "") === usernameInput
      );

      // Case A: Page is ALREADY connected in SocialAPI
      if (matchedRemote) {
        db.prepare(`
          INSERT INTO accounts (
            username, social_account_id, social_brand_id, display_name, avatar_url, bio, followers_text,
            session_status, status, last_sync_at, updated_at, created_at
          ) VALUES (
            @username, @social_account_id, @social_brand_id, @display_name, @avatar_url, @bio, @followers_text,
            'active', 'active', @now, @now, @now
          )
          ON CONFLICT(username) DO UPDATE SET
            social_account_id = excluded.social_account_id,
            social_brand_id = COALESCE(excluded.social_brand_id, accounts.social_brand_id),
            display_name = COALESCE(NULLIF(excluded.display_name, ''), accounts.display_name),
            avatar_url = COALESCE(NULLIF(excluded.avatar_url, ''), accounts.avatar_url),
            bio = COALESCE(NULLIF(excluded.bio, ''), accounts.bio),
            followers_text = COALESCE(excluded.followers_text, accounts.followers_text),
            session_status = 'active',
            status = 'active',
            last_sync_at = excluded.last_sync_at,
            updated_at = excluded.updated_at
        `).run({
          username: usernameInput,
          social_account_id: matchedRemote.id,
          social_brand_id: matchedRemote.brand_id || null,
          display_name: matchedRemote.display_name || matchedRemote.name || usernameInput,
          avatar_url: matchedRemote.avatar_url || matchedRemote.profile_picture_url || "",
          bio: matchedRemote.bio || "",
          followers_text:
            typeof matchedRemote.followers_count === "number"
              ? String(matchedRemote.followers_count)
              : null,
          now,
        });

        db.prepare(`
          INSERT OR IGNORE INTO user_accounts (user_id, account_username, created_at)
          VALUES (?, ?, ?)
        `).run(user.id, usernameInput, now);

        const updatedAccount = db
          .prepare("SELECT * FROM accounts WHERE username = ?")
          .get(usernameInput) as AccountRow;

        return NextResponse.json({
          success: true,
          already_connected: true,
          message: `پیج @${usernameInput} در SocialAPI موجود بود و با موفقیت همگام و متصل شد.`,
          account: updatedAccount,
        });
      }

      // Case B: Page does NOT exist in SocialAPI yet -> Ensure Brand exists and generate connect URL
      const brand = await client.getOrCreateBrand(usernameInput);

      // Persist the brand_id in DB
      db.prepare(`
        UPDATE accounts SET social_brand_id = ?, updated_at = ? WHERE username = ?
      `).run(brand.id, now, usernameInput);

      const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://inflow.ketabdar.dev";
      const redirectUrl =
        body.redirect_url ||
        `${origin}/auth/callback?username=${encodeURIComponent(usernameInput)}`;

      const connectRes = await client.connectAccount({
        platform: "instagram",
        brand_id: brand.id,
        redirect_uri: redirectUrl,
      });

      const authUrl =
        connectRes.auth_url || connectRes.url || connectRes.authorization_url || "";

      return NextResponse.json({
        success: true,
        already_connected: false,
        auth_url: authUrl,
        brand_id: brand.id,
        brand_name: brand.name,
        message: `برند «${brand.name}» در SocialAPI پیکربندی شد. لطفاً جهت تکمیل اتصال وارد اینستاگرام شوید.`,
      });
    }

    // Action 2: Sync / Link a connected SocialAPI account (`GET /v1/accounts`)
    if (action === "sync") {
      const remoteList = await client.listAccounts("instagram");
      const targetSocialId = body.social_account_id
        ? String(body.social_account_id).trim()
        : "";

      // Strict match: Must match usernameInput
      const matchedRemote = remoteList.data.find(
        (a) =>
          (targetSocialId && a.id === targetSocialId && (a.username?.toLowerCase() === usernameInput || a.handle?.toLowerCase().replace(/^@/, "") === usernameInput)) ||
          (!targetSocialId && (a.username?.toLowerCase() === usernameInput || a.handle?.toLowerCase().replace(/^@/, "") === usernameInput))
      );

      if (!matchedRemote) {
        return NextResponse.json(
          {
            success: false,
            error: `پیج @${usernameInput} هنوز در SocialAPI متصل نشده است. لطفاً ابتدا روی دکمه ورود به اینستاگرام کلیک کرده و مجوز دسترسی را تایید نمایید.`,
          },
          { status: 404 }
        );
      }

      const socialAccountId = matchedRemote.id;
      const displayName =
        matchedRemote.display_name || matchedRemote.name || usernameInput;
      const avatarUrl =
        matchedRemote.avatar_url || matchedRemote.profile_picture_url || "";
      const bio = matchedRemote.bio || "";
      const followersText =
        typeof matchedRemote.followers_count === "number"
          ? String(matchedRemote.followers_count)
          : null;

      db.prepare(`
        INSERT INTO accounts (
          username, social_account_id, social_brand_id, display_name, avatar_url, bio, followers_text,
          session_status, status, last_sync_at, updated_at, created_at
        ) VALUES (
          @username, @social_account_id, @social_brand_id, @display_name, @avatar_url, @bio, @followers_text,
          'active', 'active', @now, @now, @now
        )
        ON CONFLICT(username) DO UPDATE SET
          social_account_id = excluded.social_account_id,
          social_brand_id = COALESCE(excluded.social_brand_id, accounts.social_brand_id),
          display_name = COALESCE(NULLIF(excluded.display_name, ''), accounts.display_name),
          avatar_url = COALESCE(NULLIF(excluded.avatar_url, ''), accounts.avatar_url),
          bio = COALESCE(NULLIF(excluded.bio, ''), accounts.bio),
          followers_text = COALESCE(excluded.followers_text, accounts.followers_text),
          session_status = 'active',
          status = 'active',
          last_sync_at = excluded.last_sync_at,
          updated_at = excluded.updated_at
      `).run({
        username: usernameInput,
        social_account_id: socialAccountId,
        social_brand_id: matchedRemote.brand_id || null,
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
      `).run(user.id, usernameInput, now);

      const updatedAccount = db
        .prepare("SELECT * FROM accounts WHERE username = ?")
        .get(usernameInput) as AccountRow;

      return NextResponse.json({
        success: true,
        message: `اکانت @${usernameInput} با موفقیت در اینفلو متصل و فعال شد.`,
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
            : (err as Error).message || "خطا در برقراری ارتباط با SocialAPI",
      },
      { status: 400 }
    );
  }
}
