import {
  getDb,
  logBotActivity,
  type AccountRow,
  type PostRow,
  type DMAutomationRow,
  type CommentLogRow,
  type DMLogRow,
} from "@/lib/db";
import {
  type IInstagramProvider,
  type NormalizedInstagramEvent,
} from "@/lib/instagram/provider";
import { getInstagramProvider } from "@/lib/instagram/social-api-provider";
import {
  processIncomingComment,
  processIncomingDm,
} from "@/lib/instagram/automation-engine";
import {
  enqueueInstagramAction,
  processActionQueue,
  type QueueExecutionSummary,
} from "@/lib/instagram/action-executor";

export interface PollAggregatorSummary {
  accountsPolled: number;
  postsPolled: number;
  commentsIngested: number;
  dmsIngested: number;
  followAutoReleased: number;
  queueSummary: QueueExecutionSummary;
  details: Array<Record<string, unknown>>;
}

function nowTimestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function resolveAccountUsername(
  socialAccountId?: string,
  accountUsername?: string,
  shortcode?: string,
  postId?: string
): string {
  const db = getDb();
  if (accountUsername) {
    return accountUsername.replace(/^@/, "");
  }
  if (socialAccountId) {
    const acc = db
      .prepare("SELECT username FROM accounts WHERE social_account_id = ?")
      .get(socialAccountId) as { username: string } | undefined;
    if (acc?.username) return acc.username;
  }
  if (shortcode) {
    const post = db
      .prepare("SELECT account_username FROM posts WHERE shortcode = ?")
      .get(shortcode) as { account_username: string } | undefined;
    if (post?.account_username) return post.account_username;
  }
  if (postId) {
    const post = db
      .prepare("SELECT account_username FROM posts WHERE media_id = ? OR shortcode = ?")
      .get(postId, postId) as { account_username: string } | undefined;
    if (post?.account_username) return post.account_username;
  }
  return "unknown";
}

/**
 * Ingest a single normalized Instagram event (from Webhook, Polling, or Manual Sync),
 * record it in `incoming_events`, and route it to `AutomationEngine`.
 */
export async function ingestNormalizedEvent(
  event: NormalizedInstagramEvent,
  options?: {
    provider?: IInstagramProvider;
    skipImmediateDrain?: boolean;
  }
): Promise<{
  processed: boolean;
  already_processed?: boolean;
  event_type: string;
  [key: string]: unknown;
}> {
  const db = getDb();
  const provider = options?.provider || getInstagramProvider();
  const accountUsername = resolveAccountUsername(
    event.socialAccountId,
    event.accountUsername,
    event.shortcode,
    event.postId
  );

  const eventTimestamp = event.createdAt
    ? Math.floor(new Date(event.createdAt).getTime() / 1000) || Math.floor(Date.now() / 1000)
    : Math.floor(Date.now() / 1000);

  // Record in `incoming_events` (idempotent by `event_id`)
  try {
    db.prepare(`
      INSERT INTO incoming_events (
        account_username,
        event_type,
        post_shortcode,
        post_media_id,
        event_id,
        conversation_id,
        author_username,
        author_full_name,
        author_id,
        event_text,
        payload_json,
        source,
        event_timestamp,
        status,
        created_at
      ) VALUES (
        @account_username,
        @event_type,
        @post_shortcode,
        @post_media_id,
        @event_id,
        @conversation_id,
        @author_username,
        @author_full_name,
        @author_id,
        @event_text,
        @payload_json,
        @source,
        @event_timestamp,
        'pending',
        @now
      )
    `).run({
      account_username: accountUsername,
      event_type: event.eventType,
      post_shortcode: event.shortcode || null,
      post_media_id: event.postId || null,
      event_id: event.eventUid,
      conversation_id: event.conversationId || null,
      author_username: event.authorUsername || "instagram_user",
      author_full_name: event.authorFullName || "",
      author_id: event.authorId || "",
      event_text: event.text || event.postbackPayload || "",
      payload_json: event.rawPayload ? JSON.stringify(event.rawPayload) : null,
      source: event.source,
      event_timestamp: eventTimestamp,
      now: nowTimestamp(),
    });
  } catch {
    // Event already recorded in `incoming_events`; check if already processed
    const existing = db
      .prepare("SELECT status FROM incoming_events WHERE event_id = ?")
      .get(event.eventUid) as { status: string } | undefined;
    if (existing?.status === "processed" || existing?.status === "skipped") {
      return {
        processed: true,
        already_processed: true,
        event_type: event.eventType,
      };
    }
  }

  if (event.eventType === "comment") {
    const res = await processIncomingComment(
      {
        commentId: event.commentId || event.eventUid.replace(/^cmt:/, ""),
        postId: event.postId,
        shortcode: event.shortcode,
        socialAccountId: event.socialAccountId,
        accountUsername: accountUsername !== "unknown" ? accountUsername : event.accountUsername,
        commenterUsername: event.authorUsername,
        commenterFullName: event.authorFullName,
        commenterUserId: event.authorId,
        commentText: event.text,
        conversationId: event.conversationId,
        commentCreatedAt: event.createdAt,
        skipImmediateDrain: options?.skipImmediateDrain,
      },
      provider
    );

    db.prepare(`
      UPDATE incoming_events
      SET status = ?, processed_at = ?
      WHERE event_id = ?
    `).run(res.processed ? "processed" : "skipped", nowTimestamp(), event.eventUid);

    return {
      event_type: "comment.received",
      ...res,
    };
  }

  if (event.eventType === "dm" || event.eventType === "postback") {
    const res = await processIncomingDm(
      {
        messageId: event.messageId || event.eventUid.replace(/^dm:/, ""),
        conversationId: event.conversationId || "",
        socialAccountId: event.socialAccountId,
        accountUsername: accountUsername !== "unknown" ? accountUsername : event.accountUsername,
        senderUsername: event.authorUsername,
        senderFullName: event.authorFullName,
        senderId: event.authorId,
        incomingText: event.text || event.postbackTitle || event.postbackPayload || "",
        payload: event.postbackPayload,
        isStoryReply: event.isStoryReply,
        storyId: event.storyId,
        storyContent: event.storyContent,
        messageCreatedAt: event.createdAt,
        skipImmediateDrain: options?.skipImmediateDrain,
      },
      provider
    );

    db.prepare(`
      UPDATE incoming_events
      SET status = ?, processed_at = ?
      WHERE event_id = ?
    `).run(res.processed ? "processed" : "skipped", nowTimestamp(), event.eventUid);

    return {
      event_type: event.eventType === "postback" ? "dm.postback" : "dm.received",
      ...res,
    };
  }

  if (event.eventType === "mention") {
    if (accountUsername && accountUsername !== "unknown") {
      logBotActivity(
        accountUsername,
        "trigger_match",
        `منشن جدید از @${event.authorUsername}`,
        event.text || "منشن در پست یا استوری",
        event.rawPayload
      );
    }
    db.prepare(`
      UPDATE incoming_events
      SET status = 'processed', processed_at = ?
      WHERE event_id = ?
    `).run(nowTimestamp(), event.eventUid);

    return {
      processed: true,
      event_type: "mention.received",
    };
  }

  return {
    processed: false,
    event_type: event.eventType,
  };
}

/**
 * Ingest a raw Webhook request through the Provider Abstraction Layer.
 */
export async function ingestWebhookPayload(
  rawBody: string,
  headers: {
    signature: string | null;
    timestamp?: string | null;
  },
  customProvider?: IInstagramProvider
): Promise<{
  authorized: boolean;
  received: boolean;
  event?: string;
  processed?: boolean;
  [key: string]: unknown;
}> {
  const provider = customProvider || getInstagramProvider();

  if (
    !provider.verifyWebhookSignature(
      rawBody,
      headers.signature,
      headers.timestamp
    )
  ) {
    return {
      authorized: false,
      received: false,
    };
  }

  const normalized = provider.parseWebhookEvent(rawBody);
  if (!normalized) {
    return {
      authorized: true,
      received: true,
      processed: false,
    };
  }

  const result = await ingestNormalizedEvent(normalized, {
    provider,
    skipImmediateDrain: false,
  });

  return {
    authorized: true,
    received: true,
    event: String(result.event_type || normalized.eventType),
    ...result,
  };
}

/**
 * Periodic Database/API Poller Aggregator (`pollActiveAccountsAndPosts`):
 * 1. Polls comments on posts with `auto_reply = 1`
 * 2. Polls real incoming DM messages on accounts with active DM automation or `pending_follow` items
 * 3. Checks live follow verification for `pending_follow` items when user followed without sending a new message
 * 4. Executes due actions in `action_queue` via `processActionQueue()`
 */
export async function pollActiveAccountsAndPosts(options?: {
  accountUsername?: string;
  provider?: IInstagramProvider;
}): Promise<PollAggregatorSummary> {
  const db = getDb();
  const provider = options?.provider || getInstagramProvider();
  const summary: PollAggregatorSummary = {
    accountsPolled: 0,
    postsPolled: 0,
    commentsIngested: 0,
    dmsIngested: 0,
    followAutoReleased: 0,
    queueSummary: {
      processed: 0,
      sent: 0,
      rescheduled: 0,
      failed: 0,
      throttled: 0,
    },
    details: [],
  };

  if (!provider.hasCredentials()) {
    return summary;
  }

  // 1. Poll active monitored posts (`auto_reply = 1`)
  const activePosts = (
    options?.accountUsername
      ? db
          .prepare(`
            SELECT p.*, a.social_account_id
            FROM posts p
            JOIN accounts a ON a.username = p.account_username
            WHERE p.auto_reply = 1
              AND p.account_username = ?
              AND a.social_account_id IS NOT NULL
              AND a.social_account_id != ''
          `)
          .all(options.accountUsername)
      : db
          .prepare(`
            SELECT p.*, a.social_account_id
            FROM posts p
            JOIN accounts a ON a.username = p.account_username
            WHERE p.auto_reply = 1
              AND a.social_account_id IS NOT NULL
              AND a.social_account_id != ''
          `)
          .all()
  ) as Array<PostRow & { social_account_id: string }>;

  for (const post of activePosts) {
    summary.postsPolled++;
    const postId = post.media_id || post.shortcode;
    if (!postId) continue;

    try {
      const commentsRes = await provider.listPostComments(
        post.social_account_id,
        postId
      );
      const comments = commentsRes.data || [];

      for (const c of comments.slice(0, 20)) {
        if (!c.id || c.isOwner) continue;
        if (
          c.authorUsername.toLowerCase() === post.account_username.toLowerCase()
        ) {
          continue;
        }

        const existing = db
          .prepare(
            "SELECT id FROM comment_logs WHERE comment_id = ? OR comment_id = ?"
          )
          .get(c.id, c.platformId || c.id);
        if (existing) continue;

        const res = await ingestNormalizedEvent(
          {
            eventUid: `cmt:${c.id}`,
            eventType: "comment",
            source: "polling",
            socialAccountId: post.social_account_id,
            accountUsername: post.account_username,
            postId,
            shortcode: post.shortcode,
            commentId: c.id,
            authorId: c.authorId,
            authorUsername: c.authorUsername,
            authorFullName: c.authorFullName,
            text: c.text,
            createdAt: c.createdAt,
          },
          { provider, skipImmediateDrain: true }
        );

        if (res.processed && !res.already_processed) {
          summary.commentsIngested++;
          summary.details.push({
            type: "comment",
            shortcode: post.shortcode,
            commentId: c.id,
            user: c.authorUsername,
            result: res,
          });
        }
      }
    } catch (err) {
      summary.details.push({
        type: "post_poll_error",
        shortcode: post.shortcode,
        error: (err as Error).message,
      });
    }
  }

  // 2. Poll conversations for active accounts (DM automation enabled OR has pending_follow items)
  const connectedAccounts = (
    options?.accountUsername
      ? db
          .prepare(`
            SELECT * FROM accounts
            WHERE username = ?
              AND social_account_id IS NOT NULL
              AND social_account_id != ''
          `)
          .all(options.accountUsername)
      : db
          .prepare(`
            SELECT * FROM accounts
            WHERE social_account_id IS NOT NULL
              AND social_account_id != ''
          `)
          .all()
  ) as AccountRow[];

  for (const acc of connectedAccounts) {
    if (!acc.social_account_id) continue;

    const dmRule = db
      .prepare("SELECT * FROM dm_automations WHERE account_username = ?")
      .get(acc.username) as DMAutomationRow | undefined;

    const pendingComments = db
      .prepare(`
        SELECT * FROM comment_logs
        WHERE account_username = ? AND dm_status = 'pending_follow'
      `)
      .all(acc.username) as CommentLogRow[];

    const pendingDms = db
      .prepare(`
        SELECT * FROM dm_logs
        WHERE account_username = ? AND reply_status = 'pending_follow'
      `)
      .all(acc.username) as DMLogRow[];

    const dmEnabled = dmRule?.enabled === 1;
    const hasPendingFollow =
      pendingComments.length > 0 || pendingDms.length > 0;

    if (!dmEnabled && !hasPendingFollow) {
      continue;
    }

    summary.accountsPolled++;

    try {
      const convsRes = await provider.listConversations(acc.social_account_id);
      const conversations = (convsRes.data || []).slice(0, 12);

      for (const conv of conversations) {
        const participantId = conv.participantId;
        const participantUsername = conv.participantUsername;

        // Check if this participant has pending_follow items
        const userPendingComments = pendingComments.filter(
          (pc) =>
            (participantId && pc.user_id === participantId) ||
            (participantUsername &&
              pc.username.toLowerCase() === participantUsername.toLowerCase())
        );
        const userPendingDms = pendingDms.filter(
          (pd) =>
            pd.thread_id === conv.id ||
            (participantId && pd.sender_id === participantId) ||
            (participantUsername &&
              pd.sender_username.toLowerCase() ===
                participantUsername.toLowerCase())
        );

        const userHasPending =
          userPendingComments.length > 0 || userPendingDms.length > 0;

        // Poll recent messages in this conversation if DM automation is enabled OR user has pending_follow
        if (dmEnabled || userHasPending) {
          try {
            const msgsRes = await provider.listConversationMessages(
              acc.social_account_id,
              conv.id
            );
            // Process chronological order (oldest to newest among the latest 6 messages)
            const recentIncoming = (msgsRes.data || [])
              .slice(0, 6)
              .filter((m) => m.direction === "incoming" && m.id)
              .reverse();

            for (const msg of recentIncoming) {
              const alreadyLogged = db
                .prepare(
                  "SELECT id FROM dm_logs WHERE message_id = ? OR message_id = ?"
                )
                .get(msg.id, msg.platformId || msg.id);
              if (alreadyLogged) continue;

              // Also guard against legacy webhook rows that stored sapi_dm_* ID for the same message within 15m
              if (msg.createdAt) {
                const msgEpoch = new Date(msg.createdAt).getTime();
                if (!Number.isNaN(msgEpoch)) {
                  const recentSameText = db
                    .prepare(`
                      SELECT created_at FROM dm_logs
                      WHERE account_username = ?
                        AND thread_id = ?
                        AND incoming_text = ?
                      ORDER BY id DESC LIMIT 1
                    `)
                    .get(acc.username, conv.id, msg.text) as
                    | { created_at: string }
                    | undefined;
                  if (recentSameText?.created_at) {
                    const loggedIso = recentSameText.created_at.includes("T")
                      ? recentSameText.created_at
                      : recentSameText.created_at.replace(" ", "T") + "Z";
                    const loggedEpoch = new Date(loggedIso).getTime();
                    if (
                      !Number.isNaN(loggedEpoch) &&
                      Math.abs(loggedEpoch - msgEpoch) < 15 * 60 * 1000
                    ) {
                      continue;
                    }
                  }
                }
              }

              // Only process messages newer than DM activation (or newer than pending_follow creation)
              if (msg.createdAt) {
                const msgMs = new Date(msg.createdAt).getTime();
                const latestPendingCreatedAt = [
                  ...userPendingComments.map((c) => c.created_at),
                  ...userPendingDms.map((d) => d.created_at),
                ]
                  .filter(Boolean)
                  .sort()[0];

                const cutoffIso = userHasPending && latestPendingCreatedAt
                  ? latestPendingCreatedAt
                  : dmRule?.activated_at || null;

                if (cutoffIso) {
                  const cutoffMs = new Date(
                    cutoffIso.includes("T")
                      ? cutoffIso
                      : cutoffIso.replace(" ", "T") + "Z"
                  ).getTime();
                  if (!Number.isNaN(msgMs) && !Number.isNaN(cutoffMs)) {
                    if (msgMs < cutoffMs - 5000) {
                      continue;
                    }
                  }
                }
              }

              const dmRes = await ingestNormalizedEvent(
                {
                  eventUid: `dm:${msg.id}`,
                  eventType: "dm",
                  source: "polling",
                  socialAccountId: acc.social_account_id,
                  accountUsername: acc.username,
                  messageId: msg.id,
                  conversationId: conv.id,
                  authorId: msg.senderId || participantId,
                  authorUsername: msg.senderUsername || participantUsername,
                  authorFullName: msg.senderFullName || conv.participantFullName,
                  text: msg.text,
                  createdAt: msg.createdAt,
                },
                { provider, skipImmediateDrain: true }
              );

              if (dmRes.processed && !dmRes.already_processed) {
                summary.dmsIngested++;
                summary.details.push({
                  type: "dm",
                  conversationId: conv.id,
                  messageId: msg.id,
                  user: participantUsername,
                  result: dmRes,
                });
              }
            }
          } catch {
            // Ignore single conversation messages error
          }
        }

        // Also: if user STILL has pending_follow items in DB (e.g. they followed the page without clicking a button),
        // verify their live follow status via `provider.checkFollowStatus`!
        if (userHasPending && participantId) {
          const stillPendingComments = db
            .prepare(`
              SELECT * FROM comment_logs
              WHERE account_username = ?
                AND dm_status = 'pending_follow'
                AND (user_id = ? OR LOWER(username) = ?)
            `)
            .all(
              acc.username,
              participantId,
              participantUsername.toLowerCase()
            ) as CommentLogRow[];

          const stillPendingDms = db
            .prepare(`
              SELECT * FROM dm_logs
              WHERE account_username = ?
                AND reply_status = 'pending_follow'
                AND (thread_id = ? OR sender_id = ? OR LOWER(sender_username) = ?)
            `)
            .all(
              acc.username,
              conv.id,
              participantId,
              participantUsername.toLowerCase()
            ) as DMLogRow[];

          if (stillPendingComments.length > 0 || stillPendingDms.length > 0) {
            const followCheck = await provider.checkFollowStatus(
              acc.social_account_id,
              participantId
            );

            // ONLY release if live Instagram API confirms `isUserFollowBusiness === true`!
            if (followCheck.verified) {
              for (const pc of stillPendingComments) {
                if (!pc.dm_text?.trim()) continue;
                db.prepare(
                  "UPDATE comment_logs SET dm_status = 'queued', processed_at = ? WHERE id = ?"
                ).run(nowTimestamp(), pc.id);

                enqueueInstagramAction({
                  dedupeKey: `release_cmt_dm:${pc.comment_id}`,
                  accountUsername: acc.username,
                  socialAccountId: acc.social_account_id,
                  eventId: `poll_follow_verified:${pc.comment_id}`,
                  actionType: "DM_SEND",
                  targetUsername:
                    followCheck.profile?.username || participantUsername,
                  targetUserId: participantId,
                  targetPostShortcode: pc.shortcode,
                  targetMediaId: pc.media_id,
                  targetCommentId: pc.comment_id,
                  targetConversationId: conv.id,
                  payloadText: pc.dm_text.trim(),
                  priority: 1,
                  metadata: {
                    commentLogId: pc.id,
                    finalDmStatus: "sent",
                    activityLogType: "dm_sent",
                    activityLogTitle: `فالو کاربر @${
                      followCheck.profile?.username || participantUsername
                    } در بررسی زنده تایید شد و دایرکت پست ${pc.shortcode} ارسال شد ✅`,
                    activityLogDescription: pc.dm_text.trim(),
                  },
                });
                summary.followAutoReleased++;
              }

              for (const pd of stillPendingDms) {
                if (!pd.reply_text?.trim()) continue;
                db.prepare(
                  "UPDATE dm_logs SET reply_status = 'queued', processed_at = ? WHERE id = ?"
                ).run(nowTimestamp(), pd.id);

                enqueueInstagramAction({
                  dedupeKey: `release_dm:${pd.message_id}`,
                  accountUsername: acc.username,
                  socialAccountId: acc.social_account_id,
                  eventId: `poll_follow_verified:${pd.message_id}`,
                  actionType: "DM_SEND",
                  targetUsername:
                    followCheck.profile?.username || participantUsername,
                  targetUserId: participantId,
                  targetConversationId: conv.id,
                  payloadText: pd.reply_text.trim(),
                  priority: 1,
                  metadata: {
                    dmLogId: pd.id,
                    finalDmStatus: "sent",
                    activityLogType: "dm_sent",
                    activityLogTitle: `فالو کاربر @${
                      followCheck.profile?.username || participantUsername
                    } در بررسی زنده تایید شد و پاسخ دایرکت ارسال شد ✅`,
                    activityLogDescription: pd.reply_text.trim(),
                  },
                });
                summary.followAutoReleased++;
              }
            }
          }
        }
      }
    } catch (err) {
      summary.details.push({
        type: "account_poll_error",
        account: acc.username,
        error: (err as Error).message,
      });
    }
  }

  // 3. Drain due actions in `action_queue` via `ActionExecutor`
  summary.queueSummary = await processActionQueue({
    accountUsername: options?.accountUsername,
    maxActions: 20,
    provider,
  });

  return summary;
}
