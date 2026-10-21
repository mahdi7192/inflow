import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import type { PostRow, AccountRow } from "@/lib/db";
import { InflowDashboard } from "@/components/inflow-dashboard";

interface CommentsPageProps {
  params: Promise<{ account: string }>;
}

export default async function CommentsPage({ params }: CommentsPageProps) {
  const resolvedParams = await params;
  let rawParam = "";
  try {
    rawParam = decodeURIComponent(resolvedParams.account);
  } catch {
    rawParam = resolvedParams.account;
  }

  // Canonicalize bare /username/comments to /@username/comments
  if (!rawParam.startsWith("@")) {
    redirect(`/@${rawParam}/comments`);
  }

  const username = rawParam.slice(1).trim();
  if (!username) {
    redirect("/");
  }

  // Fetch account profile & posts for this account
  const db = getDb();
  const profile = db
    .prepare("SELECT * FROM accounts WHERE username = ?")
    .get(username) as AccountRow | undefined;

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
        <div className="flex items-center justify-center p-12 font-vazir" dir="rtl">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span className="w-2 h-2 rounded-full bg-zinc-400 animate-pulse" />
            <span>بارگذاری کاتالوگ پست‌ها...</span>
          </div>
        </div>
      }
    >
      <InflowDashboard
        initialAccount={username}
        initialProfile={profile || null}
        initialPosts={posts}
        embeddedInShell={true}
      />
    </Suspense>
  );
}
