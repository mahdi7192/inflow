import {
  getDb,
  logBotActivity,
  type AccountRow,
  type PostRow,
  type DMAutomationRow,
  type CommentLogRow,
  type DMLogRow,
} from "@/lib/db";
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
  payload?: string;
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
        fallbackText: "پاسخ خدمتتان ارسال شد 🙏",
        mode: "comment",
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
        mode: "dm",
      });
    }

    if (dmText.trim()) {
      try {
        let sent = false;

        // Check if follow requirement is enabled for this post
        if (post.dm_require_follow === 1) {
          const accountUsername = account?.username || post.account_username;
          const dmRule = db
            .prepare("SELECT follow_prompt_text FROM dm_automations WHERE account_username = ?")
            .get(accountUsername) as { follow_prompt_text?: string } | undefined;

          const followPrompt =
            dmRule?.follow_prompt_text?.trim() ||
            `سلام @${cleanCommenter} عزیز! برای دریافت پاسخ و فایل کامل، لطفاً ابتدا پیج را فالو کنید و روی دکمه «فالو کردم» بزنید 👇`;

          // 1. Try sending Private Reply with "فالو کردم" button
          if (event.postId && event.commentId) {
            try {
              await client.sendPrivateReply({
                postId: event.postId,
                commentId: event.commentId,
                accountId: socialAccountId,
                text: followPrompt,
                buttons: [
                  { type: "postback", title: "فالو کردم", payload: "FOLLOW_CONFIRMED" },
                ],
              });
              dmStatus = "pending_follow";
              sent = true;
            } catch (privateReplyErr) {
              console.warn(
                `[Instagram Automation] Private reply with button failed, trying without buttons:`,
                privateReplyErr
              );
              try {
                await client.sendPrivateReply({
                  postId: event.postId,
                  commentId: event.commentId,
                  accountId: socialAccountId,
                  text: `${followPrompt}\n\n(پس از فالو کردن پیج، عبارت «فالو کردم» را در دایرکت بفرستید)`,
                });
                dmStatus = "pending_follow";
                sent = true;
              } catch (e2) {
                console.warn(`[Instagram Automation] Plain private reply also failed:`, e2);
              }
            }
          }

          // 2. Fallback to conversation thread if private reply didn't send
          if (!sent) {
            let conversationId = event.conversationId || "";
            if (!conversationId) {
              const convs = await client.listConversations(socialAccountId);
              const matchedConv = (convs.data || []).find(
                (c) =>
                  c.participant_name?.toLowerCase() === cleanCommenter ||
                  c.participant_username?.toLowerCase() === cleanCommenter ||
                  (event.commenterUserId && c.participant_id === event.commenterUserId)
              );
              if (matchedConv?.id) {
                conversationId = matchedConv.id;
              }
            }

            if (conversationId) {
              try {
                await client.sendConversationMessage({
                  conversationId,
                  accountId: socialAccountId,
                  text: followPrompt,
                  recipientId: event.commenterUserId || cleanCommenter,
                  buttons: [
                    { type: "postback", title: "فالو کردم", payload: "FOLLOW_CONFIRMED" },
                  ],
                  quickReplies: [
                    { title: "فالو کردم", payload: "FOLLOW_CONFIRMED" },
                  ],
                });
                dmStatus = "pending_follow";
                sent = true;
              } catch {
                await client.sendConversationMessage({
                  conversationId,
                  accountId: socialAccountId,
                  text: `${followPrompt}\n\n(پس از فالو کردن پیج، عبارت «فالو کردم» را در دایرکت بفرستید)`,
                  recipientId: event.commenterUserId || cleanCommenter,
                });
                dmStatus = "pending_follow";
                sent = true;
              }
            } else {
              dmStatus = "failed";
            }
          }

          if (dmStatus === "pending_follow") {
            logBotActivity(
              accountUsername,
              "dm_sent",
              `پیام درخواست فالو با دکمه «فالو کردم» برای @${cleanCommenter} ارسال شد (در انتظار فالو)`
            );
          }
        } else {
          // Regular direct message (no follow requirement)
          if (event.postId && event.commentId) {
            try {
              await client.sendPrivateReply({
                postId: event.postId,
                commentId: event.commentId,
                accountId: socialAccountId,
                text: dmText.trim(),
              });
              dmStatus = "sent";
              sent = true;
            } catch (privateReplyErr) {
              console.warn(
                `[Instagram Automation] Private reply failed, falling back to conversation:`,
                privateReplyErr
              );
            }
          }

          // 2. Fallback to existing conversation thread if private reply didn't send
          if (!sent) {
            let conversationId = event.conversationId || "";
            if (!conversationId) {
              const convs = await client.listConversations(socialAccountId);
              const matchedConv = (convs.data || []).find(
                (c) =>
                  c.participant_name?.toLowerCase() === cleanCommenter ||
                  c.participant_username?.toLowerCase() === cleanCommenter ||
                  (event.commenterUserId && c.participant_id === event.commenterUserId)
              );
              if (matchedConv?.id) {
                conversationId = matchedConv.id;
              }
            }

            if (conversationId) {
              await client.sendConversationMessage({
                conversationId,
                accountId: socialAccountId,
                text: dmText.trim(),
                recipientId: event.commenterUserId || cleanCommenter,
              });
              dmStatus = "sent";
            } else {
              dmStatus = "failed";
            }
          }
        }
      } catch (err: unknown) {
        dmStatus = "failed";
        console.error(`[Instagram Automation] DM send error:`, err);
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

  // 3.5 Check for Pending Follow Release (from Post Comment or prior DM)
  const isFollowConfirmation =
    event.payload === "FOLLOW_CONFIRMED" ||
    matchesKeywords(
      event.incomingText,
      "فالو کردم,فالو شد,فالو,انجام شد,FOLLOW_CONFIRMED,done,followed,follow"
    );

  const pendingComments = db.prepare(`
    SELECT * FROM comment_logs
    WHERE account_username = ?
      AND (LOWER(username) = ? OR (user_id != '' AND user_id = ?))
      AND dm_status = 'pending_follow'
    ORDER BY id ASC
  `).all(account.username, cleanSender, event.senderId || "") as CommentLogRow[];

  const pendingDms = db.prepare(`
    SELECT * FROM dm_logs
    WHERE account_username = ?
      AND (LOWER(sender_username) = ? OR (sender_id != '' AND sender_id = ?))
      AND reply_status = 'pending_follow'
      AND message_id != ?
    ORDER BY id ASC
  `).all(account.username, cleanSender, event.senderId || "", messageId) as DMLogRow[];

  if (pendingComments.length > 0 || pendingDms.length > 0) {
    if (isFollowConfirmation || pendingComments.length > 0 || pendingDms.length > 0) {
      const client = new SocialApiClient();
      const socialAccountId =
        account.social_account_id || event.socialAccountId || account.username;
      let conversationId = event.conversationId;

      if (!conversationId) {
        try {
          const convs = await client.listConversations(socialAccountId);
          const matchedConv = (convs.data || []).find(
            (c) =>
              c.participant_name?.toLowerCase() === cleanSender ||
              c.participant_username?.toLowerCase() === cleanSender ||
              (event.senderId && c.participant_id === event.senderId)
          );
          if (matchedConv?.id) {
            conversationId = matchedConv.id;
          }
        } catch (e) {
          console.warn(`[Instagram Automation] Failed to list conversations:`, e);
        }
      }

      let allSuccess = true;
      let sentCount = 0;

      // Release pending comment DMs
      for (const pc of pendingComments) {
        const textToSend = pc.dm_text?.trim();
        if (textToSend && conversationId) {
          try {
            await client.sendConversationMessage({
              conversationId,
              accountId: socialAccountId,
              text: textToSend,
              recipientId: event.senderId || cleanSender,
            });
            db.prepare(`
              UPDATE comment_logs
              SET dm_status = 'sent', processed_at = ?
              WHERE id = ?
            `).run(nowTimestamp(), pc.id);

            logBotActivity(
              account.username,
              "dm_sent",
              `تایید فالو توسط @${cleanSender} دریافت شد و پاسخ دایرکت پست ارسال شد ✅`
            );
            sentCount++;
          } catch (sendErr) {
            allSuccess = false;
            console.error(
              `[Instagram Automation] Failed to release pending comment DM:`,
              sendErr
            );
          }
        }
      }

      // Release pending direct DMs
      for (const pd of pendingDms) {
        const textToSend = pd.reply_text?.trim();
        if (textToSend && conversationId) {
          try {
            await client.sendConversationMessage({
              conversationId,
              accountId: socialAccountId,
              text: textToSend,
              recipientId: event.senderId || cleanSender,
            });
            db.prepare(`
              UPDATE dm_logs
              SET reply_status = 'sent', processed_at = ?
              WHERE id = ?
            `).run(nowTimestamp(), pd.id);

            logBotActivity(
              account.username,
              "dm_sent",
              `تایید فالو توسط @${cleanSender} دریافت شد و پاسخ معلق دایرکت ارسال شد ✅`
            );
            sentCount++;
          } catch (sendErr) {
            allSuccess = false;
            console.error(
              `[Instagram Automation] Failed to release pending DM:`,
              sendErr
            );
          }
        }
      }

      if (sentCount > 0) {
        db.prepare(`
          UPDATE dm_logs
          SET trigger_matched = 1,
              reply_status = @reply_status,
              reply_text = @reply_text,
              processed_at = @processed_at
        WHERE message_id = @message_id
      `).run({
        message_id: messageId,
        reply_status: allSuccess ? "sent" : "failed",
        reply_text: "تایید فالو دریافت شد و پاسخ معلق با موفقیت ارسال گردید.",
        processed_at: nowTimestamp(),
      });

        return {
          processed: true,
          reply_status: allSuccess ? "sent" : "failed",
        };
      }
    }
  }

  // 4. Check if standard DM automation is active
  const dmRule = db
    .prepare("SELECT * FROM dm_automations WHERE account_username = ?")
    .get(account.username) as DMAutomationRow | undefined;

  if (!dmRule || dmRule.enabled !== 1) {
    db.prepare(`
      UPDATE dm_logs
      SET trigger_matched = 0, reply_status = 'skipped', processed_at = ?
      WHERE message_id = ?
    `).run(nowTimestamp(), messageId);
    return { processed: true, reply_status: "skipped" };
  }

  // 5. Evaluate Trigger
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

  // 6. Generate Reply Text
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
      mode: "dm",
    });
  }

  let replyStatus: "sent" | "failed" | "skipped" | "pending_follow" = "skipped";
  let errorDetails: string | null = null;

  if (replyText.trim()) {
    const client = new SocialApiClient();
    const socialAccountId =
      account.social_account_id || event.socialAccountId || account.username;

    if (dmRule.require_follow === 1) {
      const followPrompt =
        dmRule.follow_prompt_text?.trim() ||
        "سلام! برای دریافت پاسخ و مشاوره کامل، لطفاً ابتدا پیج را فالو کنید و روی دکمه «فالو کردم» بزنید 👇";

      try {
        await client.sendConversationMessage({
          conversationId: event.conversationId,
          accountId: socialAccountId,
          text: followPrompt,
          recipientId: event.senderId || cleanSender,
          buttons: [
            { type: "postback", title: "فالو کردم", payload: "FOLLOW_CONFIRMED" },
          ],
          quickReplies: [
            { title: "فالو کردم", payload: "FOLLOW_CONFIRMED" },
          ],
        });
        replyStatus = "pending_follow";
        logBotActivity(
          account.username,
          "dm_sent",
          `پیام درخواست فالو با دکمه «فالو کردم» برای @${cleanSender} ارسال شد (در انتظار فالو)`
        );
      } catch (err: unknown) {
        try {
          await client.sendConversationMessage({
            conversationId: event.conversationId,
            accountId: socialAccountId,
            text: `${followPrompt}\n\n(پس از فالو کردن پیج، عبارت «فالو کردم» را در همین دایرکت ارسال کنید)`,
            recipientId: event.senderId || cleanSender,
          });
          replyStatus = "pending_follow";
        } catch (convErr) {
          replyStatus = "failed";
          errorDetails = (convErr as Error).message || "DM send failed";
        }
      }
    } else {
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
