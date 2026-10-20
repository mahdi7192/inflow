import { notFound, redirect } from "next/navigation";
import { getSessionUser, hasAccountAccess } from "@/lib/auth-guard";
import { getDb } from "@/lib/db";
import type { AccountRow, DMLogRow } from "@/lib/db";
import { DmLogsPageView } from "@/components/dms/dm-logs-page-view";
import Link from "next/link";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DmLogsPageProps {
  params: Promise<{ account: string }>;
}

export default async function DmLogsPage({ params }: DmLogsPageProps) {
  const resolvedParams = await params;
  let rawParam = "";
  try {
    rawParam = decodeURIComponent(resolvedParams.account);
  } catch {
    rawParam = resolvedParams.account;
  }

  // Reserved paths
  const reserved = ["login", "backoffice", "api", "media", "favicon.ico", "_next"];
  if (reserved.includes(rawParam.toLowerCase())) {
    notFound();
  }

  // Canonicalize bare /username/dms/logs to /@username/dms/logs
  if (!rawParam.startsWith("@")) {
    redirect(`/@${rawParam}/dms/logs`);
  }

  const username = rawParam.slice(1).trim();
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
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 font-vazir">
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

  // Verify account exists in database and fetch full profile
  const db = getDb();
  const profile = db
    .prepare("SELECT * FROM accounts WHERE username = ?")
    .get(username) as AccountRow | undefined;

  if (!profile) {
    notFound();
  }

  // Fetch accounts accessible by user (for account switcher in sidebar)
  let accounts: AccountRow[] = [];
  if (user.role === "superadmin") {
    accounts = db
      .prepare(`SELECT * FROM accounts ORDER BY created_at DESC`)
      .all() as AccountRow[];
  } else {
    accounts = db
      .prepare(`
        SELECT a.* FROM accounts a 
        JOIN user_accounts ua ON a.username = ua.account_username 
        WHERE ua.user_id = ? 
        ORDER BY a.created_at DESC
      `)
      .all(user.id) as AccountRow[];
  }

  // Fetch recent 100 DM interaction logs
  const logs = db
    .prepare("SELECT * FROM dm_logs WHERE account_username = ? ORDER BY processed_at DESC LIMIT 100")
    .all(username) as DMLogRow[];

  return (
    <DmLogsPageView
      currentUser={user}
      account={username}
      profile={profile}
      accounts={accounts}
      initialLogs={logs}
    />
  );
}
