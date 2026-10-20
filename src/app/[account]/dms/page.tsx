import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import type { DMAutomationRow, DMLogRow } from "@/lib/db";
import { DmAutomationView } from "@/components/dms/dm-automation-view";

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

  // Canonicalize bare /username/dms to /@username/dms
  if (!rawParam.startsWith("@")) {
    redirect(`/@${rawParam}/dms`);
  }

  const username = rawParam.slice(1).trim();
  if (!username) {
    redirect("/");
  }

  const db = getDb();
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
    .prepare(
      "SELECT * FROM dm_logs WHERE account_username = ? ORDER BY processed_at DESC LIMIT 50"
    )
    .all(username) as DMLogRow[];

  return (
    <DmAutomationView
      account={username}
      initialAutomation={automation}
      initialLogs={logs}
      embeddedInShell={true}
    />
  );
}
