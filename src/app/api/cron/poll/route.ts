import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { SocialApiClient } from "@/lib/social-api";
import { processIncomingComment, processIncomingDm } from "@/lib/instagram-automation";

export async function GET(req: NextRequest) {
  return handlePoll(req);
}

export async function POST(req: NextRequest) {
  return handlePoll(req);
}

async function handlePoll(req: NextRequest) {
  try {
    // 1. Authorization: Allow local requests or valid master token
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const masterToken = process.env.INFLOW_MASTER_MCP_TOKEN || "inflow_master_sec_admin";

    const host = req.headers.get("host") || "";
    const forwardedFor = req.headers.get("x-forwarded-for") || "";
    const isLocal =
      host.startsWith("127.0.0.1") ||
      host.startsWith("localhost") ||
      forwardedFor.startsWith("127.0.0.1") ||
      forwardedFor.startsWith("::1");

    if (!isLocal && token !== masterToken) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const db = getDb();
    const client = new SocialApiClient();
    if (!client.hasCredentials()) {
      return NextResponse.json(
        { success: false, error: "SocialAPI credentials missing" },
        { status: 400 }
      );
    }

    // 2. Query posts that have active automations and a connected SocialAPI account
    const activePosts = db
      .prepare(`
        SELECT p.id, p.shortcode, p.media_id, p.account_username, a.social_account_id
        FROM posts p
        JOIN accounts a ON p.account_username = a.username
        WHERE p.auto_reply = 1 
          AND a.social_account_id IS NOT NULL 
          AND a.social_account_id != ''
      `)
      .all() as Array<{
        id: number;
        shortcode: string;
        media_id: string;
        account_username: string;
        social_account_id: string;
      }>;

    if (activePosts.length === 0) {
      return NextResponse.json({
        success: true,
        active_posts: 0,
        processed_comments: 0,
        message: "No active monitored posts found.",
      });
    }

    let processedCount = 0;
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    for (const post of activePosts) {
      const postId = post.media_id || post.shortcode;
      if (!postId) continue;

      try {
        const commentsRes = await client.listPostComments(postId, post.social_account_id);
        const comments = Array.isArray(commentsRes.data) ? commentsRes.data : [];

        for (const cmt of comments) {
          const cmtId = String(cmt.id || cmt.comment_id || "").trim();
          if (!cmtId) continue;

          const res = await processIncomingComment({
            commentId: cmtId,
            postId,
            shortcode: post.shortcode,
            accountUsername: post.account_username,
            socialAccountId: post.social_account_id,
            commenterUsername:
              cmt.username || cmt.author_username || cmt.author_name || "user",
            commenterUserId: cmt.user_id || cmt.author_id || "",
            commentText: cmt.text || "",
          });

          if (res.processed && !res.already_processed) {
            processedCount++;
          }
        }

        // Update heartbeat for the account
        db.prepare(
          "UPDATE accounts SET last_sync_at = ?, last_heartbeat_at = ?, updated_at = ? WHERE username = ?"
        ).run(now, now, now, post.account_username);
      } catch (err: unknown) {
        console.error(`[Fallback Poll] Failed to check comments for post ${postId}:`, err);
      }
    }

    // 3. Check pending follow confirmations across conversations
    let processedFollowReleases = 0;
    const accountsWithPendingFollow = db
      .prepare(`
        SELECT DISTINCT a.username, a.social_account_id
        FROM accounts a
        LEFT JOIN comment_logs cl ON cl.account_username = a.username AND cl.dm_status = 'pending_follow'
        LEFT JOIN dm_logs dl ON dl.account_username = a.username AND dl.reply_status = 'pending_follow'
        WHERE a.social_account_id IS NOT NULL AND a.social_account_id != ''
          AND (cl.id IS NOT NULL OR dl.id IS NOT NULL)
      `)
      .all() as Array<{ username: string; social_account_id: string }>;

    for (const acc of accountsWithPendingFollow) {
      try {
        const convsRes = await client.listConversations(acc.social_account_id);
        const convs = convsRes.data || [];
        for (const conv of convs) {
          const participantName = (
            conv.participant_username ||
            conv.participant_name ||
            ""
          )
            .toLowerCase()
            .replace(/^@/, "");
          const participantId = conv.participant_id || "";
          const lastMsg = (conv.last_message || "").trim();

          const hasPendingComment = db
            .prepare(`
              SELECT id FROM comment_logs
              WHERE account_username = ?
                AND (LOWER(username) = ? OR (user_id != '' AND user_id = ?))
                AND dm_status = 'pending_follow'
              LIMIT 1
            `)
            .get(acc.username, participantName, participantId);

          const hasPendingDm = db
            .prepare(`
              SELECT id FROM dm_logs
              WHERE account_username = ?
                AND (LOWER(sender_username) = ? OR (sender_id != '' AND sender_id = ?))
                AND reply_status = 'pending_follow'
              LIMIT 1
            `)
            .get(acc.username, participantName, participantId);

          if (hasPendingComment || hasPendingDm) {
            const res = await processIncomingDm({
              messageId: `poll_follow_${conv.id}_${participantName}_${Date.now()}`,
              conversationId: conv.id,
              socialAccountId: acc.social_account_id,
              accountUsername: acc.username,
              senderUsername: participantName,
              senderId: participantId,
              incomingText: lastMsg || "فالو کردم",
              payload: lastMsg.includes("FOLLOW_CONFIRMED")
                ? "FOLLOW_CONFIRMED"
                : undefined,
            });

            if (res.processed && !res.already_processed) {
              processedFollowReleases++;
            }
          }
        }
      } catch (pollDmErr) {
        console.error(
          `[Fallback Poll] Failed to check conversations for @${acc.username}:`,
          pollDmErr
        );
      }
    }

    return NextResponse.json({
      success: true,
      active_posts: activePosts.length,
      processed_comments: processedCount,
      released_follow_gates: processedFollowReleases,
      polled_at: now,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
