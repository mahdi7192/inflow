import { getDb, type AccountRow, type PostRow, type DMAutomationRow } from "@/lib/db";
import { SocialApiClient, SocialApiError } from "@/lib/social-api";
import { evaluateTriggerWithAi, generateContextualReplyWithAi } from "@/lib/ai-client";

export interface IncomingCommentEvent {
  commentId: string;
  postId?: string;
  shortcode?: string;
  accountUsername?: string;
  socialAccountId?: string;
  commenterUsername: string;
  commenterUserId?: string;
  commentText: string;
  conversationId?: string;
}

export interface IncomingDmEvent {
  messageId: string;
  conversationId: string;
  accountUsername?: string;
  socialAccountId?: string;
  senderUsername: string;
  senderId?: string;
  incomingText: string;
  isStoryReply?: boolean;
  storyId?: string | null;
  storyContent?: string | null;
}

function nowTimestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function matchesKeywords(text: string, csvKeywords: string): boolean {
  const cleanText = text.trim().toLowerCase();
  if (!cleanText) return false;
  const keywords = csvKeywords
    .split(/[,،\n]+/)
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
  if (keywords.length === 0) return true;
  return keywords.some((kw) => cleanText.includes(kw));
}

/**
 * Idempotent Comment Automation Processor
 * Evaluates post trigger rules, dispatches comment reply (`POST /v1/inbox/comments/{postId}`)
 * and direct message (`POST /v1/inbox/conversations/{id}/messages`) via SocialAPI.ai,
 * and records the immutable lock in `comment_logs`.
 */
export async function processIncomingComment(event: IncomingCommentEvent): Promise<{
  processed: boolean;
  already_processed?: boolean;
  trigger_matched?: boolean;
  comment_reply_status?: string;
  dm_status?: string;
}> {
  const db = getDb();
  const commentId = String(event.commentId || "").trim();
  if (!commentId) {
    return { processed: false };
  }

  // 1. Strict Idempotency Check (`comment_logs.comment_id` UNIQUE)
  const existing = db
    .prepare("SELECT id FROM comment_logs WHERE comment_id = ?")
    .get(commentId);
  if (existing) {
    return { processed: true, already_processed: true };
  }

  // 2. Resolve Account & Monitored Post
  let account: AccountRow | undefined;
  if (event.accountUsername) {
    account = db
      .prepare("SELECT * FROM accounts WHERE username = ?")
      .get(event.accountUsername.toLowerCase().replace(/^@/, "")) as AccountRow | undefined;
  } else if (event.socialAccountId) {
    account = db
      .prepare("SELECT * FROM accounts WHERE social_account_id = ?")
      .get(event.socialAccountId) as AccountRow | undefined;
  }

  let post: PostRow | undefined;
  if (event.shortcode) {
    post = db
      .prepare("SELECT * FROM posts WHERE shortcode = ?")
      .get(event.shortcode) as PostRow | undefined;
  }
  if (!post && event.postId) {
    post = db
      .prepare("SELECT * FROM posts WHERE media_id = ? OR shortcode = ?")
      .get(event.postId, event.postId) as PostRow | undefined;
  }

  if (!post) {
    return { processed: false };
  }

  if (!account) {
    account = db
      .prepare("SELECT * FROM accounts WHERE username = ?")
      .get(post.account_username) as AccountRow | undefined;
  }

  // Skip self-comments from the page owner
  const cleanCommenter = event.commenterUsername.trim().toLowerCase().replace(/^@/, "");
  if (account && cleanCommenter === account.username.toLowerCase()) {
    return { processed: false };
  }

  // Only process if post has `auto_reply = 1` and account is active
  if (post.auto_reply !== 1 || (account && account.status === "paused")) {
    return { processed: false };
  }

  const now = nowTimestamp();

  // 3. Acquire Idempotency Lock immediately before network calls
  try {
    db.prepare(`
      INSERT INTO comment_logs (
        comment_id, account_username, shortcode, media_id, user_id, username,
        comment_text, trigger_matched, comment_reply_status, comment_reply_text,
        dm_status, dm_text, created_at, processed_at
      ) VALUES (
        @comment_id, @account_username, @shortcode, @media_id, @user_id, @username,
        @comment_text, 0, 'locked', '', 'none', '', @now, @now
      )
    `).run({
      comment_id: commentId,
      account_username: post.account_username,
      shortcode: post.shortcode,
      media_id: post.media_id || event.postId || post.shortcode,
      user_id: event.commenterUserId || "",
      username: cleanCommenter || "user",
      comment_text: event.commentText || "",
      now,
    });
  } catch {
    // Unique constraint hit concurrently
    return { processed: true, already_processed: true };
  }

  // 4. Evaluate Trigger (`all`, `keywords`, `ai_context`)
  let matched = false;
  if (post.trigger_type === "all") {
    matched = true;
  } else if (post.trigger_type === "keywords") {
    matched = matchesKeywords(event.commentText, post.trigger_keywords);
  } else if (post.trigger_type === "ai_context") {
    matched = await evaluateTriggerWithAi({
      caption: post.caption,
      commentText: event.commentText,
      triggerContext: post.trigger_context || "سوال درباره قیمت، خرید یا مشخصات محصول",
    });
  }

  if (!matched) {
    db.prepare(`
      UPDATE comment_logs
      SET trigger_matched = 0,
          comment_reply_status = 'skipped',
          dm_status = 'skipped',
          processed_at = ?
      WHERE comment_id = ?
    `).run(nowTimestamp(), commentId);

    return {
      processed: true,
      trigger_matched: false,
      comment_reply_status: "skipped",
      dm_status: "skipped",
    };
  }

  const client = new SocialApiClient();
  const socialAccountId =
    account?.social_account_id || event.socialAccountId || post.account_username;
  const targetPostId = post.media_id || event.postId || post.shortcode;

  let commentReplyStatus: "none" | "sent" | "failed" | "skipped" = "none";
  let commentReplyText = "";

  // 5. Execute Public Comment Reply (`POST /v1/inbox/comments/{postId}`)
  if (post.comment_action_type !== "none") {
    if (post.comment_action_type === "direct") {
      commentReplyText =
        post.comment_action_text || "پاسخ در دایرکت خدمتتان ارسال شد 📩";
    } else if (post.comment_action_type === "ai") {
      commentReplyText = await generateContextualReplyWithAi({
        caption: post.caption,
        username: cleanCommenter,
        incomingText: event.commentText,
        instructions:
          post.comment_action_text || "پاسخ کوتاه و محترمانه زیر کامنت بده",
        fallbackText: "پاسخ کامل در دایرکت خدمتتان ارسال شد 📩",
      });
    }

    if (commentReplyText.trim()) {
      try {
        await client.replyToComment({
          postId: targetPostId,
          accountId: socialAccountId,
          commentId,
          text: commentReplyText.trim(),
        });
        commentReplyStatus = "sent";
      } catch (err: unknown) {
        commentReplyStatus = "failed";
        if (err instanceof SocialApiError && err.status === 401 && account) {
          db.prepare(
            "UPDATE accounts SET session_status = 'reauth_required', updated_at = ? WHERE username = ?"
          ).run(nowTimestamp(), account.username);
        }
      }
    }
  }

  // 6. Execute Direct Message Action (`POST /v1/inbox/conversations/{id}/messages`)
  let dmStatus: "none" | "sent" | "pending_follow" | "failed" | "skipped" = "none";
  let dmText = "";

  if (post.dm_action_type !== "none") {
    if (post.dm_action_type === "direct") {
      dmText = post.dm_action_text || "";
    } else if (post.dm_action_type === "ai") {
      dmText = await generateContextualReplyWithAi({
        caption: post.caption,
        username: cleanCommenter,
        incomingText: event.commentText,
        instructions:
          post.dm_action_text || "پاسخ کامل و محترمانه در دایرکت ارسال کن",
        fallbackText: post.dm_action_text || "سلام! در خدمت شما هستیم 🙏",
      });
    }

    if (dmText.trim()) {
      try {
        // Resolve conversation ID if not provided directly
        let conversationId = event.conversationId || "";
        if (!conversationId) {
          const convs = await client.listConversations(socialAccountId);
          const matchedConv = convs.data.find(
            (c) =>
              c.participant_name?.toLowerCase() === cleanCommenter ||
              c.participant_username?.toLowerCase() === cleanCommenter ||
              (event.commenterUserId && c.participant_id === event.commenterUserId)
          );
          conversationId = matchedConv?.id || event.commenterUserId || cleanCommenter;
        }

        await client.sendConversationMessage({
          conversationId,
          accountId: socialAccountId,
          text: dmText.trim(),
          recipientId: event.commenterUserId || cleanCommenter,
        });
        dmStatus = "sent";
      } catch (err: unknown) {
        dmStatus = "failed";
        if (err instanceof SocialApiError && err.status === 401 && account) {
          db.prepare(
            "UPDATE accounts SET session_status = 'reauth_required', updated_at = ? WHERE username = ?"
          ).run(nowTimestamp(), account.username);
        }
      }
    }
  }

  // 7. Finalize Log Record
  db.prepare(`
    UPDATE comment_logs
    SET trigger_matched = 1,
        comment_reply_status = @comment_reply_status,
        comment_reply_text = @comment_reply_text,
        dm_status = @dm_status,
        dm_text = @dm_text,
        processed_at = @processed_at
    WHERE comment_id = @comment_id
  `).run({
    comment_id: commentId,
    comment_reply_status: commentReplyStatus,
    comment_reply_text: commentReplyText,
    dm_status: dmStatus,
    dm_text: dmText,
    processed_at: nowTimestamp(),
  });

  if (account) {
    db.prepare(
      "UPDATE accounts SET last_heartbeat_at = ?, updated_at = ? WHERE username = ?"
    ).run(nowTimestamp(), nowTimestamp(), account.username);
  }

  return {
    processed: true,
    trigger_matched: true,
    comment_reply_status: commentReplyStatus,
    dm_status: dmStatus,
  };
}

/**
 * Idempotent Direct Message Automation Processor (`dm.received` webhook)
 */
export async function processIncomingDm(event: IncomingDmEvent): Promise<{
  processed: boolean;
  already_processed?: boolean;
  reply_status?: string;
}> {
  const db = getDb();
  const messageId = String(event.messageId || "").trim();
  if (!messageId) {
    return { processed: false };
  }

  // 1. Idempotency Check (`dm_logs.message_id` UNIQUE)
  const existing = db
    .prepare("SELECT id FROM dm_logs WHERE message_id = ?")
    .get(messageId);
  if (existing) {
    return { processed: true, already_processed: true };
  }

  // 2. Resolve Account & DM Automation Config
  let account: AccountRow | undefined;
  if (event.accountUsername) {
    account = db
      .prepare("SELECT * FROM accounts WHERE username = ?")
      .get(event.accountUsername.toLowerCase().replace(/^@/, "")) as AccountRow | undefined;
  } else if (event.socialAccountId) {
    account = db
      .prepare("SELECT * FROM accounts WHERE social_account_id = ?")
      .get(event.socialAccountId) as AccountRow | undefined;
  }

  if (!account || account.status === "paused") {
    return { processed: false };
  }

  const cleanSender = event.senderUsername.trim().toLowerCase().replace(/^@/, "");
  if (cleanSender === account.username.toLowerCase()) {
    return { processed: false };
  }

  const dmRule = db
    .prepare("SELECT * FROM dm_automations WHERE account_username = ?")
    .get(account.username) as DMAutomationRow | undefined;

  if (!dmRule || dmRule.enabled !== 1) {
    return { processed: false };
  }

  const now = nowTimestamp();

  // 3. Acquire Idempotency Lock
  try {
    db.prepare(`
      INSERT INTO dm_logs (
        message_id, thread_id, account_username, sender_username, sender_id,
        incoming_text, is_story_reply, story_id, story_content,
        trigger_matched, reply_status, reply_text, processed_at, created_at
      ) VALUES (
        @message_id, @thread_id, @account_username, @sender_username, @sender_id,
        @incoming_text, @is_story_reply, @story_id, @story_content,
        0, 'locked', '', @now, @now
      )
    `).run({
      message_id: messageId,
      thread_id: event.conversationId,
      account_username: account.username,
      sender_username: cleanSender || "user",
      sender_id: event.senderId || "",
      incoming_text: event.incomingText || "",
      is_story_reply: event.isStoryReply ? 1 : 0,
      story_id: event.storyId || null,
      story_content: event.storyContent || null,
      now,
    });
  } catch {
    return { processed: true, already_processed: true };
  }

  // 4. Evaluate Trigger
  let matched = false;
  if (dmRule.trigger_type === "all") {
    matched = true;
  } else if (dmRule.trigger_type === "keywords") {
    matched = matchesKeywords(event.incomingText, dmRule.trigger_keywords);
  } else if (dmRule.trigger_type === "ai_context") {
    matched = await evaluateTriggerWithAi({
      caption: account.bio || "",
      commentText: event.incomingText,
      triggerContext: dmRule.trigger_context || "پیام مشتری در دایرکت",
    });
  }

  if (!matched) {
    db.prepare(`
      UPDATE dm_logs
      SET trigger_matched = 0, reply_status = 'skipped', processed_at = ?
      WHERE message_id = ?
    `).run(nowTimestamp(), messageId);
    return { processed: true, reply_status: "skipped" };
  }

  // 5. Generate Reply Text
  let replyText = "";
  if (dmRule.reply_mode === "direct") {
    replyText = dmRule.direct_reply_text || "";
  } else {
    replyText = await generateContextualReplyWithAi({
      caption: account.bio || "",
      username: cleanSender,
      incomingText: event.incomingText,
      instructions: dmRule.ai_prompt_instructions || "پاسخ مودبانه و دقیق به پیام مشتری بده",
      fallbackText: dmRule.direct_reply_text || "سلام! پیام شما دریافت شد، در خدمتتان هستیم 🙏",
    });
  }

  let replyStatus: "sent" | "failed" | "skipped" = "skipped";
  let errorDetails: string | null = null;

  if (replyText.trim()) {
    const client = new SocialApiClient();
    const socialAccountId =
      account.social_account_id || event.socialAccountId || account.username;

    try {
      await client.sendConversationMessage({
        conversationId: event.conversationId,
        accountId: socialAccountId,
        text: replyText.trim(),
        recipientId: event.senderId || cleanSender,
      });
      replyStatus = "sent";
    } catch (err: unknown) {
      replyStatus = "failed";
      errorDetails = (err as Error).message || "SocialAPI DM send failed";
      if (err instanceof SocialApiError && err.status === 401) {
        db.prepare(
          "UPDATE accounts SET session_status = 'reauth_required', updated_at = ? WHERE username = ?"
        ).run(nowTimestamp(), account.username);
      }
    }
  }

  db.prepare(`
    UPDATE dm_logs
    SET trigger_matched = 1,
        reply_status = @reply_status,
        reply_text = @reply_text,
        error_details = @error_details,
        processed_at = @processed_at
    WHERE message_id = @message_id
  `).run({
    message_id: messageId,
    reply_status: replyStatus,
    reply_text: replyText,
    error_details: errorDetails,
    processed_at: nowTimestamp(),
  });

  return {
    processed: true,
    reply_status: replyStatus,
  };
}
