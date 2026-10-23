import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasAccountAccess } from "@/lib/auth-guard";
import { getDb, type AccountRow, type PostRow } from "@/lib/db";
import { SocialApiClient, SocialApiError } from "@/lib/social-api";

interface RouteParams {
  params: Promise<{
    shortcode: string;
  }>;
}

/**
 * Unified Post Comments & Moderation Route (`/v1/inbox/comments/{postId}`)
 * - `GET`: List comments on the post
 * - `POST`: Reply to a comment OR moderate (`hide`, `unhide`, `like`, `unlike`, `delete`)
 * - `DELETE`: Delete a comment
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { shortcode } = await params;
    const db = getDb();
    const post = db
      .prepare("SELECT * FROM posts WHERE shortcode = ?")
      .get(shortcode) as PostRow | undefined;

    if (!post) {
      return NextResponse.json(
        { success: false, error: "پست مورد نظر یافت نشد." },
        { status: 404 }
      );
    }

    if (!hasAccountAccess(user, post.account_username)) {
      return NextResponse.json(
        { success: false, error: "شما دسترسی مجاز به این پیج را ندارید." },
        { status: 403 }
      );
    }

    const account = db
      .prepare("SELECT * FROM accounts WHERE username = ?")
      .get(post.account_username) as AccountRow | undefined;

    const client = new SocialApiClient();
    const postId = post.media_id || post.shortcode;
    const socialAccountId = account?.social_account_id || post.account_username;
    const cursor = new URL(req.url).searchParams.get("cursor") || undefined;

    const remote = await client.listPostComments(postId, socialAccountId, cursor);
    const comments = Array.isArray(remote.data)
      ? [...remote.data].sort((a: { created_at?: string }, b: { created_at?: string }) => {
          const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tB - tA; // Newest first
        })
      : remote.data;

    return NextResponse.json({
      success: true,
      comments,
      pagination: remote.pagination,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        comments: [],
        error:
          err instanceof SocialApiError
            ? err.message
            : (err as Error).message || "خطا در دریافت کامنت‌ها",
      },
      { status: err instanceof SocialApiError ? err.status : 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { shortcode } = await params;
    const db = getDb();
    const post = db
      .prepare("SELECT * FROM posts WHERE shortcode = ?")
      .get(shortcode) as PostRow | undefined;

    if (!post) {
      return NextResponse.json(
        { success: false, error: "پست مورد نظر یافت نشد." },
        { status: 404 }
      );
    }

    if (!hasAccountAccess(user, post.account_username)) {
      return NextResponse.json(
        { success: false, error: "شما دسترسی مجاز به این پیج را ندارید." },
        { status: 403 }
      );
    }

    const account = db
      .prepare("SELECT * FROM accounts WHERE username = ?")
      .get(post.account_username) as AccountRow | undefined;

    const body = await req.json();
    const action = String(body.action || "reply");
    const commentId = String(body.comment_id || body.commentId || "").trim();
    const postId = post.media_id || post.shortcode;
    const socialAccountId = account?.social_account_id || post.account_username;

    const client = new SocialApiClient();

    if (
      action === "delete" ||
      action === "hide" ||
      action === "unhide" ||
      action === "like" ||
      action === "unlike"
    ) {
      if (!commentId) {
        return NextResponse.json(
          { success: false, error: "شناسه کامنت (comment_id) الزامی است." },
          { status: 400 }
        );
      }

      await client.moderateComment({
        postId,
        commentId,
        accountId: socialAccountId,
        action,
      });

      return NextResponse.json({
        success: true,
        action,
        comment_id: commentId,
      });
    }

    // Default: Reply to comment (`POST /v1/inbox/comments/{postId}`)
    const text = String(body.text || "").trim();
    if (!text) {
      return NextResponse.json(
        { success: false, error: "متن پاسخ کامنت الزامی است." },
        { status: 400 }
      );
    }

    const res = await client.replyToComment({
      postId,
      accountId: socialAccountId,
      commentId: commentId || undefined,
      text,
    });

    return NextResponse.json({
      success: true,
      reply: res,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof SocialApiError
            ? err.message
            : (err as Error).message || "خطا در عملیات کامنت",
      },
      { status: err instanceof SocialApiError ? err.status : 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { shortcode } = await params;
    const commentId = new URL(req.url).searchParams.get("comment_id") || "";
    if (!commentId) {
      return NextResponse.json(
        { success: false, error: "پارامتر comment_id الزامی است." },
        { status: 400 }
      );
    }

    const db = getDb();
    const post = db
      .prepare("SELECT * FROM posts WHERE shortcode = ?")
      .get(shortcode) as PostRow | undefined;

    if (!post || !hasAccountAccess(user, post.account_username)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const account = db
      .prepare("SELECT * FROM accounts WHERE username = ?")
      .get(post.account_username) as AccountRow | undefined;

    const client = new SocialApiClient();
    await client.moderateComment({
      postId: post.media_id || post.shortcode,
      commentId,
      accountId: account?.social_account_id || post.account_username,
      action: "delete",
    });

    return NextResponse.json({ success: true, deleted: commentId });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof SocialApiError
            ? err.message
            : (err as Error).message || "خطا در حذف کامنت",
      },
      { status: err instanceof SocialApiError ? err.status : 500 }
    );
  }
}
