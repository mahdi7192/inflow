import { getDb, AccountRow, PostRow, updateAccountProfileFromAgent } from "../db";
import { McpAuthContext, canAccessAccount } from "./auth-guard";
import { McpToolCallResult } from "./types";

function nowTimestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function resultText(data: unknown, isError = false): McpToolCallResult {
  return {
    content: [
      {
        type: "text",
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
    isError,
  };
}

export async function executeMcpTool(
  toolName: string,
  args: Record<string, unknown> = {},
  auth: McpAuthContext
): Promise<McpToolCallResult> {
  const db = getDb();
  const now = nowTimestamp();

  switch (toolName) {
    // -------------------------------------------------------------
    // Tool: inflow_list_accounts
    // -------------------------------------------------------------
    case "inflow_list_accounts": {
      let accounts: AccountRow[] = [];
      if (auth.isSuperadmin) {
        accounts = db.prepare("SELECT * FROM accounts ORDER BY created_at DESC").all() as AccountRow[];
      } else if (auth.accountUsername) {
        accounts = db
          .prepare("SELECT * FROM accounts WHERE username = ?")
          .all(auth.accountUsername) as AccountRow[];
      } else {
        return resultText({ error: "No account assigned or authorized" }, true);
      }

      const formatted = accounts.map((acc) => {
        const activePostsCount = (
          db
            .prepare(
              "SELECT COUNT(*) as cnt FROM posts WHERE account_username = ? AND auto_reply = 1"
            )
            .get(acc.username) as { cnt: number }
        ).cnt;

        return {
          username: acc.username,
          display_name: acc.display_name,
          bio: acc.bio,
          followers_text: acc.followers_text,
          posts_count: acc.posts_count,
          status: acc.status,
          active_automations_count: activePostsCount,
          agent_interval_sec: acc.agent_interval_sec,
          last_heartbeat_at: acc.last_heartbeat_at,
        };
      });

      return resultText({ accounts: formatted });
    }

    // -------------------------------------------------------------
    // Tool: inflow_get_active_automations
    // -------------------------------------------------------------
    case "inflow_get_active_automations": {
      const accountUsername = String(args.account_username || "").trim();
      if (!accountUsername) {
        return resultText({ error: "Missing required argument: account_username" }, true);
      }

      if (!canAccessAccount(auth, accountUsername)) {
        return resultText(
          { error: `Forbidden: Unauthorized access to account '${accountUsername}'` },
          true
        );
      }

      // Refresh heartbeat
      db.prepare(
        "UPDATE accounts SET last_heartbeat_at = ?, updated_at = ? WHERE username = ?"
      ).run(now, now, accountUsername);

      const activePosts = db
        .prepare(
          "SELECT * FROM posts WHERE account_username = ? AND auto_reply = 1 ORDER BY COALESCE(posted_at, synced_at) DESC, id DESC"
        )
        .all(accountUsername) as PostRow[];

      const formattedPosts = activePosts.map((post) => {
        let keywords: string[] = [];
        if (post.trigger_keywords) {
          try {
            keywords = JSON.parse(post.trigger_keywords);
          } catch {
            keywords = post.trigger_keywords.split(",").map((s) => s.trim()).filter(Boolean);
          }
        }

        const processedCommentIds = (
          db
            .prepare(
              "SELECT comment_id FROM comment_logs WHERE shortcode = ? ORDER BY id DESC LIMIT 500"
            )
            .all(post.shortcode) as { comment_id: string }[]
        ).map((r) => r.comment_id);

        return {
          shortcode: post.shortcode,
          url: post.url,
          post_type: post.post_type,
          thumbnail_url: post.thumbnail_url,
          caption: post.caption,
          rules: {
            trigger_type: post.trigger_type,
            trigger_keywords: keywords,
            trigger_context: post.trigger_context,
            comment_action: {
              type: post.comment_action_type,
              text: post.comment_action_text,
            },
            dm_action: {
              type: post.dm_action_type,
              text: post.dm_action_text,
              require_follow: post.dm_require_follow === 1,
            },
          },
          processed_comment_ids: processedCommentIds,
        };
      });

      return resultText({
        account_username: accountUsername,
        active_count: formattedPosts.length,
        polled_at: now,
        active_posts: formattedPosts,
      });
    }

    // -------------------------------------------------------------
    // Tool: inflow_record_comment_interaction (Strict Idempotency Guard)
    // -------------------------------------------------------------
    case "inflow_record_comment_interaction": {
      const commentId = String(args.comment_id || "").trim();
      const accountUsername = String(args.account_username || "").trim();
      const shortcode = String(args.shortcode || "").trim();
      const username = String(args.username || "").trim();
      const commentText = String(args.comment_text || "").trim();

      if (!commentId || !accountUsername || !shortcode || !username) {
        return resultText(
          { error: "Missing required fields: comment_id, account_username, shortcode, username" },
          true
        );
      }

      if (!canAccessAccount(auth, accountUsername)) {
        return resultText(
          { error: `Forbidden: Unauthorized access to account '${accountUsername}'` },
          true
        );
      }

      // Check if comment_id already exists (Anti-shadowban Idempotency Lock)
      const existing = db
        .prepare("SELECT * FROM comment_logs WHERE comment_id = ?")
        .get(commentId);

      if (existing) {
        return resultText({
          success: true,
          comment_id: commentId,
          already_processed: true,
          message: "Comment has already been processed previously. Idempotency lock active.",
        });
      }

      const insertStmt = db.prepare(`
        INSERT INTO comment_logs (
          comment_id, account_username, shortcode, media_id, user_id, username,
          comment_text, trigger_matched, comment_reply_status, comment_reply_text,
          dm_status, dm_text, created_at, processed_at
        ) VALUES (
          @comment_id, @account_username, @shortcode, @media_id, @user_id, @username,
          @comment_text, @trigger_matched, @comment_reply_status, @comment_reply_text,
          @dm_status, @dm_text, @created_at, @processed_at
        )
      `);

      insertStmt.run({
        comment_id: commentId,
        account_username: accountUsername,
        shortcode,
        media_id: String(args.media_id || ""),
        user_id: String(args.user_id || ""),
        username,
        comment_text: commentText,
        trigger_matched: args.trigger_matched ? 1 : 0,
        comment_reply_status: String(args.comment_reply_status || "none"),
        comment_reply_text: String(args.comment_reply_text || ""),
        dm_status: String(args.dm_status || "none"),
        dm_text: String(args.dm_text || ""),
        created_at: now,
        processed_at: now,
      });

      return resultText({
        success: true,
        comment_id: commentId,
        already_processed: false,
        processed_at: now,
      });
    }

    // -------------------------------------------------------------
    // Tool: inflow_push_scraped_posts
    // -------------------------------------------------------------
    case "inflow_push_scraped_posts": {
      const accountUsername = String(args.account_username || "").trim();
      const rawPosts = args.posts;
      const jobId = args.job_id ? Number(args.job_id) : null;

      if (!accountUsername || !Array.isArray(rawPosts)) {
        return resultText(
          { error: "Missing required fields: account_username or posts array" },
          true
        );
      }

      if (!canAccessAccount(auth, accountUsername)) {
        return resultText(
          { error: `Forbidden: Unauthorized access to account '${accountUsername}'` },
          true
        );
      }

      // Lazy Profile Metadata Enrichment from Agent
      if (args.profile && typeof args.profile === "object") {
        const p = args.profile as Record<string, string | undefined>;
        updateAccountProfileFromAgent(accountUsername, {
          display_name: p.display_name,
          avatar_url: p.avatar_url,
          bio: p.bio,
          followers_text: p.followers_text,
        });
      }

      const upsertPost = db.prepare(`
        INSERT INTO posts (
          account_username, shortcode, media_id, url, post_type, thumbnail_url, caption,
          synced_at, updated_at, sort_index
        ) VALUES (
          @account_username, @shortcode, @media_id, @url, @post_type, @thumbnail_url, @caption,
          @synced_at, @updated_at, @sort_index
        )
        ON CONFLICT(shortcode) DO UPDATE SET
          caption = COALESCE(NULLIF(excluded.caption, ''), posts.caption),
          thumbnail_url = COALESCE(NULLIF(excluded.thumbnail_url, ''), posts.thumbnail_url),
          synced_at = excluded.synced_at,
          updated_at = excluded.updated_at
      `);

      let insertedCount = 0;
      const tx = db.transaction((items: Record<string, unknown>[]) => {
        items.forEach((item, idx) => {
          let sc = String(item.shortcode || "").trim();
          if (!sc) return;
          if (sc.includes("?")) sc = sc.split("?")[0];
          if (sc.includes("/")) sc = sc.split("/")[0];
          const cleanSc = sc.length > 11 ? sc.slice(0, 11) : sc;

          let mediaId = String(item.media_id || "").trim();
          if (!mediaId || !/^\d+$/.test(mediaId)) {
            const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
            let mId = BigInt(0);
            for (const char of cleanSc) {
              const cIdx = alphabet.indexOf(char);
              if (cIdx >= 0) {
                mId = mId * BigInt(64) + BigInt(cIdx);
              }
            }
            mediaId = mId.toString();
          }

          upsertPost.run({
            account_username: accountUsername,
            shortcode: cleanSc,
            media_id: mediaId,
            url: String(item.url || `https://www.instagram.com/${accountUsername}/p/${cleanSc}/`),
            post_type: item.post_type === "post" ? "post" : "reel",
            thumbnail_url: String(
              item.thumbnail_url || "/media/thumbnails/DehQhnjoEcr.jpg"
            ),
            caption: String(item.caption || ""),
            synced_at: now,
            updated_at: now,
            sort_index: idx,
          });
          insertedCount++;
        });
      });

      tx(rawPosts as Record<string, unknown>[]);

      // Update account heartbeat and posts count
      const totalPostsRow = db
        .prepare("SELECT COUNT(*) as count FROM posts WHERE account_username = ?")
        .get(accountUsername) as { count: number };

      db.prepare(
        "UPDATE accounts SET posts_count = ?, last_heartbeat_at = ?, updated_at = ? WHERE username = ?"
      ).run(totalPostsRow.count, now, now, accountUsername);

      // If associated with a job, update job status
      if (jobId) {
        db.prepare(`
          UPDATE agent_jobs
          SET status = 'completed',
              result_summary = ?,
              completed_at = ?
          WHERE id = ?
        `).run(
          JSON.stringify({ synced_count: insertedCount, total_posts: totalPostsRow.count }),
          now,
          jobId
        );
      }

      return resultText({
        success: true,
        account_username: accountUsername,
        synced_count: insertedCount,
        total_posts: totalPostsRow.count,
        synced_at: now,
      });
    }

    // -------------------------------------------------------------
    // Tool: inflow_update_post_rules
    // -------------------------------------------------------------
    case "inflow_update_post_rules": {
      const shortcode = String(args.shortcode || "").trim();
      if (!shortcode) {
        return resultText({ error: "Missing required argument: shortcode" }, true);
      }

      const existingPost = db
        .prepare("SELECT * FROM posts WHERE shortcode = ?")
        .get(shortcode) as PostRow | undefined;

      if (!existingPost) {
        return resultText({ error: `Post with shortcode '${shortcode}' not found` }, true);
      }

      if (!canAccessAccount(auth, existingPost.account_username)) {
        return resultText(
          { error: `Forbidden: Unauthorized access to post in account '${existingPost.account_username}'` },
          true
        );
      }

      const updates: string[] = [];
      const values: unknown[] = [];

      if (args.auto_reply !== undefined) {
        updates.push("auto_reply = ?");
        values.push(args.auto_reply ? 1 : 0);
      }
      if (args.trigger_type !== undefined) {
        updates.push("trigger_type = ?");
        values.push(String(args.trigger_type));
      }
      if (args.trigger_context !== undefined) {
        updates.push("trigger_context = ?");
        values.push(String(args.trigger_context));
      }
      if (args.trigger_keywords !== undefined) {
        updates.push("trigger_keywords = ?");
        values.push(
          Array.isArray(args.trigger_keywords)
            ? JSON.stringify(args.trigger_keywords)
            : String(args.trigger_keywords)
        );
      }
      if (args.comment_action_type !== undefined) {
        updates.push("comment_action_type = ?");
        values.push(String(args.comment_action_type));
      }
      if (args.comment_action_text !== undefined) {
        updates.push("comment_action_text = ?");
        values.push(String(args.comment_action_text));
      }
      if (args.dm_action_type !== undefined) {
        updates.push("dm_action_type = ?");
        values.push(String(args.dm_action_type));
      }
      if (args.dm_action_text !== undefined) {
        updates.push("dm_action_text = ?");
        values.push(String(args.dm_action_text));
      }
      if (args.dm_require_follow !== undefined) {
        updates.push("dm_require_follow = ?");
        values.push(args.dm_require_follow ? 1 : 0);
      }

      if (updates.length > 0) {
        updates.push("updated_at = ?");
        values.push(now);

        values.push(shortcode);
        db.prepare(
          `UPDATE posts SET ${updates.join(", ")} WHERE shortcode = ?`
        ).run(...values);
      }

      return resultText({
        success: true,
        shortcode,
        message: "Automation rules updated successfully",
      });
    }

    // -------------------------------------------------------------
    // Tool: inflow_get_pending_jobs
    // -------------------------------------------------------------
    case "inflow_get_pending_jobs": {
      const accountUsername = String(args.account_username || "").trim();
      if (!accountUsername) {
        return resultText({ error: "Missing required argument: account_username" }, true);
      }

      if (!canAccessAccount(auth, accountUsername)) {
        return resultText(
          { error: `Forbidden: Unauthorized access to account '${accountUsername}'` },
          true
        );
      }

      const pendingJobs = db
        .prepare(
          `SELECT * FROM agent_jobs 
           WHERE account_username = ? AND status IN ('pending', 'running')
           ORDER BY created_at ASC`
        )
        .all(accountUsername) as Record<string, unknown>[];

      return resultText({
        account_username: accountUsername,
        jobs: pendingJobs.map((j) => ({
          id: j.id,
          job_type: j.job_type,
          status: j.status,
          payload: typeof j.payload === "string" ? JSON.parse(j.payload || "{}") : j.payload,
          created_at: j.created_at,
        })),
      });
    }

    // -------------------------------------------------------------
    // Tool: inflow_complete_job
    // -------------------------------------------------------------
    case "inflow_complete_job": {
      const jobId = Number(args.job_id);
      const status = String(args.status || "").trim();

      if (!jobId || !status) {
        return resultText({ error: "Missing required fields: job_id, status" }, true);
      }

      const job = db
        .prepare("SELECT * FROM agent_jobs WHERE id = ?")
        .get(jobId) as Record<string, unknown> | undefined;

      if (!job) {
        return resultText({ error: `Job with ID ${jobId} not found` }, true);
      }

      if (!canAccessAccount(auth, String(job.account_username))) {
        return resultText({ error: "Forbidden: Unauthorized access to job" }, true);
      }

      db.prepare(`
        UPDATE agent_jobs
        SET status = ?,
            result_summary = ?,
            error_message = ?,
            completed_at = ?
        WHERE id = ?
      `).run(
        status === "completed" ? "completed" : "failed",
        args.result_summary ? JSON.stringify(args.result_summary) : null,
        args.error_message ? String(args.error_message) : null,
        now,
        jobId
      );

      // Refresh account heartbeat
      db.prepare(
        "UPDATE accounts SET last_heartbeat_at = ?, updated_at = ? WHERE username = ?"
      ).run(now, now, job.account_username);

      return resultText({
        success: true,
        job_id: jobId,
        status,
        completed_at: now,
      });
    }

    default:
      return resultText({ error: `Unknown tool: ${toolName}` }, true);
  }
}
