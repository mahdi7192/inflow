import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import type { PostRow } from "@/lib/db";
import { InflowDashboard } from "@/components/inflow-dashboard";

interface CommentDetailPageProps {
  params: Promise<{ account: string; shortcode: string }>;
}

export default async function CommentDetailPage({ params }: CommentDetailPageProps) {
  const resolvedParams = await params;
  let rawAccount = "";
  const shortcode = resolvedParams.shortcode;
  try {
    rawAccount = decodeURIComponent(resolvedParams.account);
  } catch {
    rawAccount = resolvedParams.account;
  }

  // Canonicalize bare /username/comments/shortcode to /@username/comments/shortcode
  if (!rawAccount.startsWith("@")) {
    redirect(`/@${rawAccount}/comments/${shortcode}`);
  }

  const username = rawAccount.slice(1).trim();
  if (!username) {
    redirect("/");
  }

  const db = getDb();
  // Verify post exists
  const targetPost = db
    .prepare("SELECT * FROM posts WHERE account_username = ? AND shortcode = ?")
    .get(username, shortcode) as PostRow | undefined;

  if (!targetPost) {
    redirect(`/@${username}/comments`);
  }

  // Fetch all posts for catalog context
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
            <span>بارگذاری تنظیمات پست...</span>
          </div>
        </div>
      }
    >
      <InflowDashboard
        initialAccount={username}
        initialPosts={posts}
        initialSelectedShortcode={shortcode}
        embeddedInShell={true}
      />
    </Suspense>
  );
}
