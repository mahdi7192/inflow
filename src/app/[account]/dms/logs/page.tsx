import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import type { DMLogRow } from "@/lib/db";
import { DmLogsPageView } from "@/components/dms/dm-logs-page-view";

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

  // Canonicalize bare /username/dms/logs to /@username/dms/logs
  if (!rawParam.startsWith("@")) {
    redirect(`/@${rawParam}/dms/logs`);
  }

  const username = rawParam.slice(1).trim();
  if (!username) {
    redirect("/");
  }

  const db = getDb();
  // Fetch recent 100 DM interaction logs
  const logs = db
    .prepare(
      "SELECT * FROM dm_logs WHERE account_username = ? ORDER BY processed_at DESC LIMIT 100"
    )
    .all(username) as DMLogRow[];

  return (
    <DmLogsPageView
      account={username}
      initialLogs={logs}
      embeddedInShell={true}
    />
  );
}
