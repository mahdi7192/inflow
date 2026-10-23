import {
  getDb,
  logBotActivity,
  type AccountRow,
  type ActionQueueRow,
} from "@/lib/db";
import {
  type IInstagramProvider,
  type InstagramButton,
  type InstagramQuickReply,
  InstagramProviderError,
} from "@/lib/instagram/provider";
import { getInstagramProvider } from "@/lib/instagram/social-api-provider";

export type OutboundActionType =
  | "COMMENT_REPLY"
  | "PRIVATE_REPLY"
  | "DM_SEND"
  | "FOLLOW_GATE_PROMPT"
  | "FOLLOW_RETRY_PROMPT";

export interface ActionQueueMetadata {
  buttons?: InstagramButton[];
  quickReplies?: InstagramQuickReply[];
  fallbackText?: string;
  commentLogId?: number;
  dmLogId?: number;
  finalCommentStatus?: "sent";
  finalDmStatus?: "sent" | "pending_follow";
  activityLogType?: string;
  activityLogTitle?: string;
  activityLogDescription?: string;
}

export interface EnqueueActionParams {
  dedupeKey: string;
  accountUsername: string;
  socialAccountId?: string;
  eventId: string;
  actionType: OutboundActionType;
  targetUsername: string;
  targetUserId?: string;
  targetPostShortcode?: string;
  targetMediaId?: string;
  targetCommentId?: string;
  targetConversationId?: string;
  payloadText: string;
  priority?: number;
  delaySeconds?: number;
  maxRetries?: number;
  metadata?: ActionQueueMetadata;
}

export interface QueueExecutionSummary {
  processed: number;
  sent: number;
  rescheduled: number;
  failed: number;
  throttled: number;
}

// Rate limit constants per Instagram account
const MAX_ACTIONS_PER_MINUTE_PER_ACCOUNT = 12;
const MIN_ACCOUNT_ACTION_GAP_MS = 1200;

const lastAccountSendAtMs = new Map<string, number>();
let isDrainingQueue = false;

function nowSqlTimestamp(offsetSeconds: number = 0): string {
  const d = new Date(Date.now() + offsetSeconds * 1000);
  return d.toISOString().replace("T", " ").slice(0, 19);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Enqueue an outbound Instagram action into SQLite `action_queue`.
 * Guaranteed idempotent via `dedupe_key`.
 */
export function enqueueInstagramAction(params: EnqueueActionParams): {
  queued: boolean;
  id?: number;
  duplicate?: boolean;
} {
  const db = getDb();
  const scheduledAt = nowSqlTimestamp(params.delaySeconds || 0);
  const now = nowSqlTimestamp(0);

  if (params.dedupeKey) {
    const existing = db
      .prepare("SELECT id, status FROM action_queue WHERE dedupe_key = ?")
      .get(params.dedupeKey) as { id: number; status: string } | undefined;

    if (existing) {
      if (existing.status === "failed") {
        // Re-activate failed action if re-triggered explicitly
        db.prepare(`
          UPDATE action_queue
          SET status = 'pending',
              retry_count = 0,
              scheduled_at = ?,
              payload_text = ?,
              metadata_json = ?,
              error_message = NULL,
              updated_at = ?
          WHERE id = ?
        `).run(
          scheduledAt,
          params.payloadText,
          params.metadata ? JSON.stringify(params.metadata) : null,
          now,
          existing.id
        );
        return { queued: true, id: existing.id, duplicate: false };
      }
      return { queued: false, id: existing.id, duplicate: true };
    }
  }

  try {
    const info = db
      .prepare(`
        INSERT INTO action_queue (
          dedupe_key,
          account_username,
          social_account_id,
          event_id,
          action_type,
          target_username,
          target_user_id,
          target_post_shortcode,
          target_media_id,
          target_comment_id,
          target_conversation_id,
          payload_text,
          metadata_json,
          priority,
          scheduled_at,
          status,
          retry_count,
          max_retries,
          created_at,
          updated_at
        ) VALUES (
          @dedupe_key,
          @account_username,
          @social_account_id,
          @event_id,
          @action_type,
          @target_username,
          @target_user_id,
          @target_post_shortcode,
          @target_media_id,
          @target_comment_id,
          @target_conversation_id,
          @payload_text,
          @metadata_json,
          @priority,
          @scheduled_at,
          'pending',
          0,
          @max_retries,
          @now,
          @now
        )
      `)
      .run({
        dedupe_key: params.dedupeKey || null,
        account_username: params.accountUsername,
        social_account_id: params.socialAccountId || null,
        event_id: params.eventId,
        action_type: params.actionType,
        target_username: params.targetUsername.replace(/^@/, ""),
        target_user_id: params.targetUserId || null,
        target_post_shortcode: params.targetPostShortcode || null,
        target_media_id: params.targetMediaId || null,
        target_comment_id: params.targetCommentId || null,
        target_conversation_id: params.targetConversationId || null,
        payload_text: params.payloadText,
        metadata_json: params.metadata ? JSON.stringify(params.metadata) : null,
        priority: params.priority ?? 1,
        scheduled_at: scheduledAt,
        max_retries: params.maxRetries ?? 3,
        now,
      });

    return { queued: true, id: Number(info.lastInsertRowid) };
  } catch {
    return { queued: false, duplicate: true };
  }
}

async function resolveConversationId(
  provider: IInstagramProvider,
  socialAccountId: string,
  targetUserId?: string | null,
  targetUsername?: string | null
): Promise<string | null> {
  try {
    const cleanTarget = (targetUsername || "").replace(/^@/, "").toLowerCase();
    const convs = await provider.listConversations(socialAccountId);
    const match = (convs.data || []).find(
      (c) =>
        (targetUserId && c.participantId === targetUserId) ||
        (cleanTarget &&
          cleanTarget !== "user" &&
          cleanTarget !== "instagram_user" &&
          (c.participantUsername.toLowerCase() === cleanTarget ||
            (c.participantFullName || "").toLowerCase() === cleanTarget))
    );
    return match?.id || null;
  } catch {
    return null;
  }
}

function updateLinkedLogsOnSuccess(
  row: ActionQueueRow,
  meta: ActionQueueMetadata
): void {
  const db = getDb();
  const now = nowSqlTimestamp(0);

  if (row.action_type === "COMMENT_REPLY") {
    if (meta.commentLogId) {
      db.prepare(`
        UPDATE comment_logs
        SET comment_reply_status = 'sent', processed_at = ?
        WHERE id = ?
      `).run(now, meta.commentLogId);
    } else if (row.target_comment_id) {
      db.prepare(`
        UPDATE comment_logs
        SET comment_reply_status = 'sent', processed_at = ?
        WHERE comment_id = ?
      `).run(now, row.target_comment_id);
    }
  } else if (row.action_type === "PRIVATE_REPLY") {
    const status = meta.finalDmStatus || "sent";
    if (meta.commentLogId) {
      db.prepare(`
        UPDATE comment_logs
        SET dm_status = ?, processed_at = ?
        WHERE id = ?
      `).run(status, now, meta.commentLogId);

      try {
        const cLog = db.prepare("SELECT * FROM comment_logs WHERE id = ?").get(meta.commentLogId) as any;
        const msgId = `cmt_dm_${meta.commentLogId}`;
        const incomingText = cLog?.shortcode
          ? `[کامنت روی پست ${cLog.shortcode}: ${cLog.comment_text || ''}]`
          : `[کامنت روی پست: ${cLog?.comment_text || ''}]`;
        db.prepare(`
          INSERT INTO dm_logs (
            message_id, thread_id, account_username, sender_username, sender_full_name, sender_id,
            incoming_text, trigger_matched, reply_status, reply_text, processed_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
          ON CONFLICT(message_id) DO UPDATE SET
            reply_status = excluded.reply_status,
            reply_text = excluded.reply_text,
            processed_at = excluded.processed_at
        `).run(
          msgId,
          row.target_conversation_id || "",
          row.account_username,
          row.target_username,
          cLog?.author_full_name || "",
          row.target_user_id || "",
          incomingText,
          status,
          row.payload_text,
          now,
          now
        );
      } catch (logErr) {
        console.error("[action-executor] Error recording comment DM to dm_logs:", logErr);
      }
    } else if (row.target_comment_id) {
      db.prepare(`
        UPDATE comment_logs
        SET dm_status = ?, processed_at = ?
        WHERE comment_id = ?
      `).run(status, now, row.target_comment_id);
    }
  } else if (row.action_type === "FOLLOW_GATE_PROMPT") {
    if (meta.commentLogId) {
      db.prepare(`
        UPDATE comment_logs
        SET dm_status = 'pending_follow', processed_at = ?
        WHERE id = ?
      `).run(now, meta.commentLogId);

      try {
        const cLog = db.prepare("SELECT * FROM comment_logs WHERE id = ?").get(meta.commentLogId) as any;
        const msgId = `cmt_gate_${meta.commentLogId}`;
        const incomingText = cLog?.shortcode
          ? `[کامنت روی پست ${cLog.shortcode}: ${cLog.comment_text || ''}]`
          : `[کامنت روی پست: ${cLog?.comment_text || ''}]`;
        db.prepare(`
          INSERT INTO dm_logs (
            message_id, thread_id, account_username, sender_username, sender_full_name, sender_id,
            incoming_text, trigger_matched, reply_status, reply_text, processed_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'sent', ?, ?, ?)
          ON CONFLICT(message_id) DO UPDATE SET
            reply_status = excluded.reply_status,
            reply_text = excluded.reply_text,
            processed_at = excluded.processed_at
        `).run(
          msgId,
          row.target_conversation_id || "",
          row.account_username,
          row.target_username,
          cLog?.author_full_name || "",
          row.target_user_id || "",
          incomingText,
          row.payload_text,
          now,
          now
        );
      } catch (logErr) {
        console.error("[action-executor] Error recording comment gate to dm_logs:", logErr);
      }
    }
    if (meta.dmLogId) {
      db.prepare(`
        UPDATE dm_logs
        SET reply_status = 'pending_follow', processed_at = ?
        WHERE id = ?
      `).run(now, meta.dmLogId);
    }
  } else if (row.action_type === "DM_SEND") {
    if (meta.commentLogId) {
      db.prepare(`
        UPDATE comment_logs
        SET dm_status = 'sent', processed_at = ?
        WHERE id = ?
      `).run(now, meta.commentLogId);

      try {
        const cLog = db.prepare("SELECT * FROM comment_logs WHERE id = ?").get(meta.commentLogId) as any;
        const msgId = `cmt_dm_${meta.commentLogId}`;
        const incomingText = cLog?.shortcode
          ? `[کامنت روی پست ${cLog.shortcode}: ${cLog.comment_text || ''}]`
          : `[کامنت روی پست: ${cLog?.comment_text || ''}]`;
        db.prepare(`
          INSERT INTO dm_logs (
            message_id, thread_id, account_username, sender_username, sender_full_name, sender_id,
            incoming_text, trigger_matched, reply_status, reply_text, processed_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'sent', ?, ?, ?)
          ON CONFLICT(message_id) DO UPDATE SET
            reply_status = excluded.reply_status,
            reply_text = excluded.reply_text,
            processed_at = excluded.processed_at
        `).run(
          msgId,
          row.target_conversation_id || "",
          row.account_username,
          row.target_username,
          cLog?.author_full_name || "",
          row.target_user_id || "",
          incomingText,
          row.payload_text,
          now,
          now
        );
      } catch (logErr) {
        console.error("[action-executor] Error recording released DM to dm_logs:", logErr);
      }
    }
    if (meta.dmLogId) {
      db.prepare(`
        UPDATE dm_logs
        SET reply_status = 'sent', processed_at = ?
        WHERE id = ?
      `).run(now, meta.dmLogId);
    }
  }

  if (meta.activityLogTitle) {
    logBotActivity(
      row.account_username,
      meta.activityLogType || (row.action_type === "COMMENT_REPLY" ? "reply_sent" : "dm_sent"),
      meta.activityLogTitle,
      meta.activityLogDescription || row.payload_text.slice(0, 140),
      {
        action_id: row.id,
        action_type: row.action_type,
        target_username: row.target_username,
      }
    );
  }
}

function updateLinkedLogsOnPermanentFailure(
  row: ActionQueueRow,
  meta: ActionQueueMetadata,
  errorMessage: string
): void {
  const db = getDb();
  const now = nowSqlTimestamp(0);

  if (row.action_type === "COMMENT_REPLY") {
    if (meta.commentLogId) {
      db.prepare(`
        UPDATE comment_logs
        SET comment_reply_status = 'failed', processed_at = ?
        WHERE id = ?
      `).run(now, meta.commentLogId);
    }
  } else if (
    row.action_type === "PRIVATE_REPLY" ||
    (row.action_type === "DM_SEND" && meta.commentLogId)
  ) {
    if (meta.commentLogId) {
      db.prepare(`
        UPDATE comment_logs
        SET dm_status = 'failed', processed_at = ?
        WHERE id = ?
      `).run(now, meta.commentLogId);
    }
  }

  if (meta.dmLogId && row.action_type === "DM_SEND") {
    db.prepare(`
      UPDATE dm_logs
      SET reply_status = 'failed', error_details = ?, processed_at = ?
      WHERE id = ?
    `).run(errorMessage, now, meta.dmLogId);
  }

  logBotActivity(
    row.account_username,
    row.action_type === "COMMENT_REPLY" ? "reply_failed" : "dm_failed",
    `خطا در اجرای اکشن ${row.action_type} برای @${row.target_username}: ${errorMessage}`,
    row.payload_text.slice(0, 120),
    {
      action_id: row.id,
      action_type: row.action_type,
      error: errorMessage,
    }
  );
}

function clampTextForButtonTemplate(text: string, maxLen = 640): string {
  if (!text) return "";
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3).trim() + "...";
}

async function executeSingleAction(
  provider: IInstagramProvider,
  row: ActionQueueRow,
  meta: ActionQueueMetadata
): Promise<void> {
  const db = getDb();
  const account = db
    .prepare("SELECT * FROM accounts WHERE username = ?")
    .get(row.account_username) as AccountRow | undefined;

  if (account?.status === "paused") {
    console.warn(
      `[ActionExecutor] Dropping action #${row.id} because account @${row.account_username} is paused.`
    );
    return;
  }

  const socialAccountId =
    row.social_account_id || account?.social_account_id || row.account_username;

  if (row.action_type === "COMMENT_REPLY") {
    const postId = row.target_media_id || row.target_post_shortcode || "";
    if (!postId) {
      throw new Error("شناسه پست (postId) برای ارسال ریپلای کامنت مشخص نیست.");
    }
    await provider.replyToComment({
      accountId: socialAccountId,
      postId,
      commentId: row.target_comment_id || undefined,
      text: row.payload_text,
    });
    return;
  }

  if (
    row.action_type === "PRIVATE_REPLY" ||
    (row.action_type === "FOLLOW_GATE_PROMPT" && row.target_comment_id)
  ) {
    const postId = row.target_media_id || row.target_post_shortcode || "";
    const commentId = row.target_comment_id || "";
    const fallbackText = meta.fallbackText || row.payload_text;

    const sanitizedButtons = meta.buttons
      ?.filter((b) => b && (b.type === "postback" ? Boolean(b.payload) : Boolean(b.url && /^https?:\/\//i.test(b.url))))
      .map((b) => ({
        ...b,
        title: (b.title || "").slice(0, 20),
      }));

    const sanitizedQuickReplies = meta.quickReplies
      ?.filter((q) => q && Boolean(q.title))
      .map((q) => ({
        ...q,
        title: (q.title || "").slice(0, 20),
      }));

    const hasButtons = Boolean(sanitizedButtons && sanitizedButtons.length > 0);
    const privateReplyText = hasButtons
      ? clampTextForButtonTemplate(row.payload_text, 640)
      : row.payload_text;

    if (postId && commentId) {
      try {
        await provider.sendPrivateReply({
          accountId: socialAccountId,
          postId,
          commentId,
          text: privateReplyText,
          buttons: hasButtons ? sanitizedButtons : undefined,
        });
        return;
      } catch (firstErr: any) {
        console.warn(
          `[action-executor] sendPrivateReply with buttons failed for comment ${commentId}:`,
          firstErr?.message || firstErr
        );
        // If button template failed on Private Reply, retry plain Private Reply first
        if (hasButtons) {
          try {
            await provider.sendPrivateReply({
              accountId: socialAccountId,
              postId,
              commentId,
              text: fallbackText,
            });
            return;
          } catch (retryErr: any) {
            console.warn(
              `[action-executor] Plain sendPrivateReply retry failed for comment ${commentId}:`,
              retryErr?.message || retryErr
            );
            // Fall through to conversation fallback
          }
        }

        // Fallback to direct conversation message if user has an open conversation
        const convId =
          row.target_conversation_id ||
          (await resolveConversationId(
            provider,
            socialAccountId,
            row.target_user_id,
            row.target_username
          ));

        if (!convId) {
          throw firstErr;
        }

        const dmTextToSend = hasButtons
          ? clampTextForButtonTemplate(row.payload_text, 640)
          : row.payload_text;

        try {
          await provider.sendDirectMessage({
            accountId: socialAccountId,
            conversationId: convId,
            recipientId: row.target_user_id || row.target_username,
            text: dmTextToSend,
            buttons: hasButtons ? sanitizedButtons : undefined,
            quickReplies: sanitizedQuickReplies && sanitizedQuickReplies.length > 0 ? sanitizedQuickReplies : undefined,
          });
          return;
        } catch {
          await provider.sendDirectMessage({
            accountId: socialAccountId,
            conversationId: convId,
            recipientId: row.target_user_id || row.target_username,
            text: fallbackText,
          });
          return;
        }
      }
    }
  }

  // DM_SEND, FOLLOW_GATE_PROMPT (DM), FOLLOW_RETRY_PROMPT
  let conversationId = row.target_conversation_id || "";
  if (!conversationId) {
    conversationId =
      (await resolveConversationId(
        provider,
        socialAccountId,
        row.target_user_id,
        row.target_username
      )) || "";
  }

  if (!conversationId) {
    throw new Error(
      `مکالمه فعالی برای کاربر @${row.target_username} جهت ارسال پیام دایرکت یافت نشد.`
    );
  }

  const fallbackText = meta.fallbackText || row.payload_text;

  const sanitizedButtons = meta.buttons
    ?.filter((b) => b && (b.type === "postback" ? Boolean(b.payload) : Boolean(b.url && /^https?:\/\//i.test(b.url))))
    .map((b) => ({
      ...b,
      title: (b.title || "").slice(0, 20),
    }));

  const sanitizedQuickReplies = meta.quickReplies
    ?.filter((q) => q && Boolean(q.title))
    .map((q) => ({
      ...q,
      title: (q.title || "").slice(0, 20),
    }));

  if (sanitizedButtons && sanitizedButtons.length > 0) {
    try {
      await provider.sendDirectMessage({
        accountId: socialAccountId,
        conversationId,
        recipientId: row.target_user_id || row.target_username,
        text: clampTextForButtonTemplate(row.payload_text, 640),
        buttons: sanitizedButtons,
      });
      return;
    } catch (btnErr: any) {
      console.warn(
        `[action-executor] sendDirectMessage with buttons failed for conversation ${conversationId}:`,
        btnErr?.message || btnErr
      );
      if (sanitizedQuickReplies && sanitizedQuickReplies.length > 0) {
        try {
          await provider.sendDirectMessage({
            accountId: socialAccountId,
            conversationId,
            recipientId: row.target_user_id || row.target_username,
            text: row.payload_text,
            quickReplies: sanitizedQuickReplies,
          });
          return;
        } catch {
          // Fall through to plain text
        }
      }
      await provider.sendDirectMessage({
        accountId: socialAccountId,
        conversationId,
        recipientId: row.target_user_id || row.target_username,
        text: fallbackText,
      });
      return;
    }
  }

  if (sanitizedQuickReplies && sanitizedQuickReplies.length > 0) {
    try {
      await provider.sendDirectMessage({
        accountId: socialAccountId,
        conversationId,
        recipientId: row.target_user_id || row.target_username,
        text: row.payload_text,
        quickReplies: sanitizedQuickReplies,
      });
      return;
    } catch {
      await provider.sendDirectMessage({
        accountId: socialAccountId,
        conversationId,
        recipientId: row.target_user_id || row.target_username,
        text: fallbackText,
      });
      return;
    }
  }

  await provider.sendDirectMessage({
    accountId: socialAccountId,
    conversationId,
    recipientId: row.target_user_id || row.target_username,
    text: row.payload_text,
  });
}

function isRetryableError(err: unknown): { retryable: boolean; delaySec: number } {
  if (err instanceof InstagramProviderError) {
    if (err.status === 429) {
      return {
        retryable: true,
        delaySec: err.retryAfterSec || 45,
      };
    }
    if (err.status >= 500 || err.code === "timeout" || err.code === "network_error") {
      return {
        retryable: true,
        delaySec: 30,
      };
    }
  }
  const msg = ((err as Error)?.message || "").toLowerCase();
  if (msg.includes("rate limit") || msg.includes("too many") || msg.includes("timeout")) {
    return { retryable: true, delaySec: 45 };
  }
  return { retryable: false, delaySec: 0 };
}

/**
 * Process due pending actions in `action_queue` with per-account rate limiting and backoff.
 */
export async function processActionQueue(options?: {
  accountUsername?: string;
  maxActions?: number;
  provider?: IInstagramProvider;
}): Promise<QueueExecutionSummary> {
  const summary: QueueExecutionSummary = {
    processed: 0,
    sent: 0,
    rescheduled: 0,
    failed: 0,
    throttled: 0,
  };

  if (isDrainingQueue) {
    return summary;
  }

  isDrainingQueue = true;
  try {
    const db = getDb();
    const provider = options?.provider || getInstagramProvider();
    const maxActions = Math.min(Math.max(options?.maxActions || 15, 1), 50);
    const now = nowSqlTimestamp(0);

    // Recover any stale 'processing' actions older than 5 minutes
    const staleCutoff = nowSqlTimestamp(-300);
    db.prepare(`
      UPDATE action_queue
      SET status = 'pending', updated_at = ?
      WHERE status = 'processing' AND updated_at < ?
    `).run(now, staleCutoff);

    const rows = (
      options?.accountUsername
        ? db
            .prepare(`
              SELECT * FROM action_queue
              WHERE status = 'pending'
                AND account_username = ?
                AND scheduled_at <= ?
              ORDER BY priority ASC, scheduled_at ASC, id ASC
              LIMIT ?
            `)
            .all(options.accountUsername, now, maxActions)
        : db
            .prepare(`
              SELECT * FROM action_queue
              WHERE status = 'pending'
                AND scheduled_at <= ?
              ORDER BY priority ASC, scheduled_at ASC, id ASC
              LIMIT ?
            `)
            .all(now, maxActions)
    ) as ActionQueueRow[];

    for (const row of rows) {
      // Check per-account 60s rate limit window
      const oneMinuteAgo = nowSqlTimestamp(-60);
      const recentCountRow = db
        .prepare(`
          SELECT COUNT(*) as cnt
          FROM action_queue
          WHERE account_username = ?
            AND status = 'sent'
            AND executed_at >= ?
        `)
        .get(row.account_username, oneMinuteAgo) as { cnt: number };

      if ((recentCountRow?.cnt || 0) >= MAX_ACTIONS_PER_MINUTE_PER_ACCOUNT) {
        // Defer by 15s to respect per-account rate limit
        const deferredAt = nowSqlTimestamp(15);
        db.prepare(`
          UPDATE action_queue
          SET scheduled_at = ?, updated_at = ?
          WHERE id = ? AND status = 'pending'
        `).run(deferredAt, nowSqlTimestamp(0), row.id);
        summary.throttled++;
        continue;
      }

      // Claim atomic lock on this queue item
      const claim = db
        .prepare(`
          UPDATE action_queue
          SET status = 'processing', updated_at = ?
          WHERE id = ? AND status = 'pending'
        `)
        .run(nowSqlTimestamp(0), row.id);

      if (claim.changes === 0) {
        continue;
      }

      // Enforce minimum pacing gap between consecutive sends on the same account
      const prevSendMs = lastAccountSendAtMs.get(row.account_username) || 0;
      const elapsedMs = Date.now() - prevSendMs;
      if (elapsedMs < MIN_ACCOUNT_ACTION_GAP_MS) {
        await sleep(MIN_ACCOUNT_ACTION_GAP_MS - elapsedMs);
      }

      summary.processed++;

      let meta: ActionQueueMetadata = {};
      if (row.metadata_json) {
        try {
          meta = JSON.parse(row.metadata_json) as ActionQueueMetadata;
        } catch {
          meta = {};
        }
      }

      try {
        await executeSingleAction(provider, row, meta);
        lastAccountSendAtMs.set(row.account_username, Date.now());

        const doneNow = nowSqlTimestamp(0);
        db.prepare(`
          UPDATE action_queue
          SET status = 'sent',
              executed_at = ?,
              updated_at = ?,
              error_message = NULL
          WHERE id = ?
        `).run(doneNow, doneNow, row.id);

        updateLinkedLogsOnSuccess(row, meta);
        summary.sent++;
      } catch (err: unknown) {
        const errMsg = (err as Error)?.message || "خطای نامشخص در اجرای اکشن";
        const { retryable, delaySec } = isRetryableError(err);
        const nextRetryCount = (row.retry_count || 0) + 1;

        if (retryable && nextRetryCount < (row.max_retries || 3)) {
          const backoffSec =
            delaySec > 0 ? delaySec : Math.min(300, 30 * Math.pow(2, row.retry_count || 0));
          const nextSchedule = nowSqlTimestamp(backoffSec);
          db.prepare(`
            UPDATE action_queue
            SET status = 'pending',
                retry_count = ?,
                scheduled_at = ?,
                error_message = ?,
                updated_at = ?
            WHERE id = ?
          `).run(nextRetryCount, nextSchedule, errMsg, nowSqlTimestamp(0), row.id);
          summary.rescheduled++;
        } else {
          db.prepare(`
            UPDATE action_queue
            SET status = 'failed',
                retry_count = ?,
                error_message = ?,
                updated_at = ?
            WHERE id = ?
          `).run(nextRetryCount, errMsg, nowSqlTimestamp(0), row.id);

          updateLinkedLogsOnPermanentFailure(row, meta, errMsg);
          summary.failed++;
        }
      }
    }

    return summary;
  } finally {
    isDrainingQueue = false;
  }
}
