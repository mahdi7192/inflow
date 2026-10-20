import { notFound, redirect } from "next/navigation";
import { getSessionUser, hasAccountAccess } from "@/lib/auth-guard";
import { getDb } from "@/lib/db";
import type { AccountRow, DMAutomationRow, DMLogRow } from "@/lib/db";
import { DmAutomationView } from "@/components/dms/dm-automation-view";
import Link from "next/link";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DmPageProps {
  params: Promise<{ account: string }>;
}

export default async function DmPage({ params }: DmPageProps) {
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

  // Canonicalize bare /username/dms to /@username/dms
  if (!rawParam.startsWith("@")) {
    redirect(`/@${rawParam}/dms`);
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

  // Verify account exists in database and fetch full profile
  const db = getDb();
  const profile = db
    .prepare("SELECT * FROM accounts WHERE username = ?")
    .get(username) as AccountRow | undefined;

  if (!profile) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 font-vazir">
        <div className="max-w-md w-full bg-white border border-border p-6 rounded-2xl shadow-xs text-center">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">پیج یافت نشد</h2>
          <p className="text-xs text-muted-foreground leading-relaxed mb-6">
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

  // Fetch or initialize DM Automation row
  let automation = db
    .prepare("SELECT * FROM dm_automations WHERE account_username = ?")
    .get(username) as DMAutomationRow | undefined;

  if (!automation) {
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    db.prepare(`
      INSERT INTO dm_automations (
        account_username, enabled, trigger_type, trigger_context, trigger_keywords,
        reply_mode, direct_reply_text, ai_prompt_instructions, web_context_urls,
        mcp_servers_config, require_follow, follow_prompt_text, story_handling_mode,
        updated_at, created_at
      ) VALUES (?, 0, 'all', '', '', 'direct', '', '', '[]', '[]', 0, 'سلام! برای دریافت پاسخ و مشاوره کامل، لطفاً ابتدا پیج را فالو کنید 🙏', 'auto', ?, ?)
    `).run(username, now, now);

    automation = db
      .prepare("SELECT * FROM dm_automations WHERE account_username = ?")
      .get(username) as DMAutomationRow;
  }

  // Fetch recent 50 DM interaction logs
  const logs = db
    .prepare("SELECT * FROM dm_logs WHERE account_username = ? ORDER BY processed_at DESC LIMIT 50")
    .all(username) as DMLogRow[];

  return (
    <DmAutomationView
      currentUser={user}
      account={username}
      profile={profile}
      accounts={accounts}
      initialAutomation={automation}
      initialLogs={logs}
    />
  );
}
