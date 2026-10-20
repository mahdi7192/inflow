import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { getSessionUser, hasAccountAccess } from "@/lib/auth-guard";
import { getDb } from "@/lib/db";
import type { AccountRow } from "@/lib/db";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { Button } from "@/components/ui/button";

interface AccountLayoutProps {
  children: React.ReactNode;
  params: Promise<{ account: string }>;
}

export default async function AccountLayout({
  children,
  params,
}: AccountLayoutProps) {
  const resolvedParams = await params;
  let rawParam = "";
  try {
    rawParam = decodeURIComponent(resolvedParams.account);
  } catch {
    rawParam = resolvedParams.account;
  }

  // Reserved paths that should never match an account route
  const reserved = ["login", "backoffice", "api", "media", "favicon.ico", "_next"];
  if (reserved.includes(rawParam.toLowerCase())) {
    notFound();
  }

  // Canonicalize bare /username to /@username
  if (!rawParam.startsWith("@")) {
    redirect(`/@${rawParam}/comments`);
  }

  const username = rawParam.slice(1).trim();
  if (!username) {
    redirect("/");
  }

  // 1. Verify authentication
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  // 2. Verify authorization for this specific account
  const isAuthorized = hasAccountAccess(user, username);
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 font-vazir" dir="rtl">
        <div className="max-w-md w-full bg-white border border-border p-6 rounded-2xl shadow-xs text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">دسترسی غیرمجاز به پیج</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            حساب کاربری شما اجازه دسترسی به پیج <span className="font-mono font-medium text-foreground">@{username}</span> را ندارد یا این پیج در سیستم ثبت نشده است.
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

  // 3. Verify account exists in database and fetch full profile
  const db = getDb();
  const profile = db
    .prepare("SELECT * FROM accounts WHERE username = ?")
    .get(username) as AccountRow | undefined;

  if (!profile) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 font-vazir" dir="rtl">
        <div className="max-w-md w-full bg-white border border-border p-6 rounded-2xl shadow-xs text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">پیج یافت نشد</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            پیجی با نام کاربری <span className="font-mono font-medium text-foreground">@{username}</span> در سامانه یافت نشد.
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

  // 4. Fetch accounts accessible by user (for account switcher in sidebar)
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

  return (
    <WorkspaceShell
      initialAccount={username}
      initialProfile={profile}
      initialAccounts={accounts}
      currentUser={user}
    >
      {children}
    </WorkspaceShell>
  );
}
