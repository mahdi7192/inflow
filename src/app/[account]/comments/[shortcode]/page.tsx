import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getSessionUser, hasAccountAccess } from "@/lib/auth-guard";
import { getDb } from "@/lib/db";
import type { AccountRow, PostRow } from "@/lib/db";
import { InflowDashboard } from "@/components/inflow-dashboard";
import Link from "next/link";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CommentDetailPageProps {
  params: Promise<{ account: string; shortcode: string }>;
}

export default async function CommentDetailPage({ params }: CommentDetailPageProps) {
  const resolvedParams = await params;
  let rawAccount = "";
  let shortcode = resolvedParams.shortcode;
  try {
    rawAccount = decodeURIComponent(resolvedParams.account);
  } catch {
    rawAccount = resolvedParams.account;
  }

  // Reserved paths
  const reserved = ["login", "backoffice", "api", "media", "favicon.ico", "_next"];
  if (reserved.includes(rawAccount.toLowerCase())) {
    notFound();
  }

  // Canonicalize bare /username/comments/shortcode to /@username/comments/shortcode
  if (!rawAccount.startsWith("@")) {
    redirect(`/@${rawAccount}/comments/${shortcode}`);
  }

  const username = rawAccount.slice(1).trim();
  if (!username) {
    redirect("/");
  }

  // Verify authentication
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  // Verify authorization for this specific account
  const isAuthorized = hasAccountAccess(user, username);
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 font-vazir" dir="rtl">
        <div className="max-w-md w-full bg-white border border-border p-6 rounded-2xl shadow-xs text-center">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">دسترسی غیرمجاز به پیج</h2>
          <p className="text-xs text-muted-foreground leading-relaxed mb-6">
            حساب کاربری شما اجازه دسترسی به پیج <span className="font-mono font-medium text-foreground">@{username}</span> را ندارد.
          </p>
          <Link href="/">
            <Button variant="default" className="text-xs gap-2">
              <ArrowRight className="w-3.5 h-3.5" />
              <span>بازگشت به مرکز انتخاب پیج‌ها</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Verify account exists
  const db = getDb();
  const profile = db
    .prepare("SELECT * FROM accounts WHERE username = ?")
    .get(username) as AccountRow | undefined;

  if (!profile) {
    redirect("/");
  }

  // Verify post exists
  const targetPost = db
    .prepare("SELECT * FROM posts WHERE account_username = ? AND shortcode = ?")
    .get(username, shortcode) as PostRow | undefined;

  if (!targetPost) {
    // Graceful fallback to comments catalog
    redirect(`/@${username}/comments`);
  }

  // Fetch accounts accessible by user (for the account switcher in sidebar)
  let accounts: AccountRow[] = [];
  if (user.role === "superadmin") {
    accounts = db
      .prepare(`
        SELECT 
          a.*,
          (SELECT COUNT(*) FROM posts p WHERE p.account_username = a.username) as total_posts,
          (SELECT COUNT(*) FROM posts p WHERE p.account_username = a.username AND p.auto_reply = 1) as active_posts,
          (SELECT COUNT(*) FROM comment_logs l WHERE l.account_username = a.username) as total_logs,
          (SELECT COUNT(*) FROM comment_logs l WHERE l.account_username = a.username AND l.dm_status = 'sent') as total_dms,
          (SELECT COUNT(*) FROM comment_logs l WHERE l.account_username = a.username AND l.comment_reply_status = 'sent') as total_replies
        FROM accounts a
        ORDER BY a.created_at DESC
      `)
      .all() as AccountRow[];
  } else {
    accounts = db
      .prepare(`
        SELECT 
          a.*,
          (SELECT COUNT(*) FROM posts p WHERE p.account_username = a.username) as total_posts,
          (SELECT COUNT(*) FROM posts p WHERE p.account_username = a.username AND p.auto_reply = 1) as active_posts,
          (SELECT COUNT(*) FROM comment_logs l WHERE l.account_username = a.username) as total_logs,
          (SELECT COUNT(*) FROM comment_logs l WHERE l.account_username = a.username AND l.dm_status = 'sent') as total_dms,
          (SELECT COUNT(*) FROM comment_logs l WHERE l.account_username = a.username AND l.comment_reply_status = 'sent') as total_replies
        FROM accounts a
        JOIN user_accounts ua ON a.username = ua.account_username
        WHERE ua.user_id = ?
        ORDER BY a.created_at DESC
      `)
      .all(user.id) as AccountRow[];
  }

  // Fetch posts for this account
  const posts = db
    .prepare(`
      SELECT 
        p.*,
        (SELECT COUNT(*) FROM comment_logs l WHERE l.shortcode = p.shortcode) as logs_count,
        (SELECT COUNT(*) FROM comment_logs l WHERE l.shortcode = p.shortcode AND l.dm_status = 'sent') as dms_count,
        (SELECT COUNT(*) FROM comment_logs l WHERE l.shortcode = p.shortcode AND l.comment_reply_status = 'sent') as replies_count
      FROM posts p
      WHERE p.account_username = ?
      ORDER BY p.sort_index ASC, p.id DESC
    `)
    .all(username) as PostRow[];

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-50/50 font-vazir" dir="rtl">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span className="w-2 h-2 rounded-full bg-zinc-400 animate-pulse" />
            <span>بارگذاری جزئیات پست {shortcode}...</span>
          </div>
        </div>
      }
    >
      <InflowDashboard
        currentUser={user}
        initialAccount={username}
        initialProfile={profile}
        initialPosts={posts}
        initialAccounts={accounts}
        initialSelectedShortcode={shortcode}
      />
    </Suspense>
  );
}
