import {
  getDb,
  getAppLanguage,
  getRecentDmConversationHistory,
  logBotActivity,
  type AccountRow,
  type PostRow,
  type DMAutomationRow,
  type CommentLogRow,
  type DMLogRow,
} from "@/lib/db";
import {
  evaluateTriggerWithAi,
  generateContextualReplyWithAi,
} from "@/lib/ai-client";
import {
  type IInstagramProvider,
  type InstagramButton,
  type InstagramQuickReply,
} from "@/lib/instagram/provider";
import { getInstagramProvider } from "@/lib/instagram/social-api-provider";
import {
  enqueueInstagramAction,
  processActionQueue,
} from "@/lib/instagram/action-executor";
import {
  buildAugmentedPostContext,
  buildAttributedUrl,
  getPlaybookById,
} from "@/lib/playbooks";
import { SocialApiClient } from "@/lib/social-api";

export interface IncomingCommentEvent {
  commentId: string;
  postId?: string;
  shortcode?: string;
  socialAccountId?: string;
  accountUsername?: string;
  commenterUsername: string;
  commenterFullName?: string;
  commenterUserId?: string;
  commentText: string;
  conversationId?: string;
  commentCreatedAt?: string;
  skipImmediateDrain?: boolean;
}

export interface IncomingDmEvent {
  messageId: string;
  conversationId: string;
  socialAccountId?: string;
  accountUsername?: string;
  senderUsername: string;
  senderFullName?: string;
  senderId?: string;
  incomingText: string;
  payload?: string;
  isStoryReply?: boolean;
  storyId?: string | null;
  storyContent?: string | null;
  messageCreatedAt?: string;
  skipImmediateDrain?: boolean;
}

function nowTimestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

/**
 * Normalize Persian/Arabic characters, digits, ZWNJ (half-space), and punctuation
 * for reliable script-based keyword matching.
 */
export function normalizeTextForMatch(input: string): string {
  if (!input) return "";
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

  let out = input
    .replace(/[يئ]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ة/g, "ه")
    .replace(/[أإآ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/\u200c/g, " ") // Convert ZWNJ to space
    .replace(/[\u064B-\u065F\u0670]/g, ""); // Strip Arabic diacritics

  for (let i = 0; i < 10; i++) {
    out = out
      .replace(new RegExp(persianDigits[i], "g"), String(i))
      .replace(new RegExp(arabicDigits[i], "g"), String(i));
  }

  return out
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Script-based keyword matcher supporting comma, Persian comma (`،`), semicolon, and newline delimiters.
 */
export function matchesKeywords(text: string, keywordsRaw: string): boolean {
  if (!keywordsRaw || !keywordsRaw.trim()) return true;
  const keywords = keywordsRaw
    .split(/[,،;\n|]+/)
    .map((k) => normalizeTextForMatch(k))
    .filter(Boolean);

  if (keywords.length === 0) return true;
  const normalizedText = normalizeTextForMatch(text);
  const compactText = normalizedText.replace(/\s+/g, "");

  return keywords.some((kw) => {
    const compactKw = kw.replace(/\s+/g, "");
    return (
      normalizedText.includes(kw) ||
      (compactKw.length >= 2 && compactText.includes(compactKw))
    );
  });
}

/**
 * Detect whether an incoming DM / postback is a Follow Confirmation attempt.
 */
export function isFollowConfirmationSignal(
  incomingText: string,
  payload?: string
): boolean {
  if (payload && payload.toUpperCase().startsWith("FOLLOW_CONFIRMED")) {
    return true;
  }
  const norm = normalizeTextForMatch(incomingText);
  if (!norm) return false;
  if (norm.startsWith("follow_confirmed")) return true;

  const exactConfirmPhrases = new Set([
    "فالو کردم",
    "فالو شد",
    "فالوتون کردم",
    "فالو کردم ✨",
    "انجام شد",
    "فالو",
    "followed",
    "i followed",
    "done",
    "تابعت",
    "تابعت الصفحة",
  ]);

  if (exactConfirmPhrases.has(norm)) {
    return true;
  }

  // Short message (< 30 chars) containing explicit follow confirmation phrase
  if (
    norm.length <= 30 &&
    (norm.includes("فالو کردم") ||
      norm.includes("فالو شد") ||
      norm.includes("i followed") ||
      norm.includes("follow_confirmed"))
  ) {
    return true;
  }

  return false;
}

/**
 * Interpolate `{name}`, `{username}`, and `@user` placeholders in static (`direct`) text templates.
 */
function interpolateStaticText(
  template: string,
  identity: { username: string; fullName: string }
): string {
  if (!template) return "";
  const cleanUser = (identity.username || "").replace(/^@/, "").trim();
  const isGeneric =
    !cleanUser ||
    cleanUser.toLowerCase() === "user" ||
    cleanUser.toLowerCase() === "instagram_user" ||
    cleanUser.startsWith("ig_");

  const safeUsername = isGeneric ? "" : cleanUser;
  const safeName =
    identity.fullName &&
    identity.fullName.toLowerCase() !== "user" &&
    identity.fullName.toLowerCase() !== "instagram_user"
      ? identity.fullName.trim()
      : safeUsername || "دوست گرامی";

  return template
    .replace(/\{name\}/gi, safeName)
    .replace(/\{full_name\}/gi, safeName)
    .replace(/\{username\}/gi, safeUsername ? `@${safeUsername}` : safeName)
    .replace(/@user\b/gi, safeUsername ? `@${safeUsername}` : safeName)
    .trim();
}

function getLocalizedFollowTexts(
  lang: "fa" | "en" | "ar",
  accountUsername: string,
  customPrompt?: string
): {
  gatePrompt: string;
  retryPrompt: string;
  buttonTitle: string;
  fallbackSuffix: string;
} {
  if (lang === "en") {
    const buttonTitle = "I Followed ✨";
    const gatePrompt =
      customPrompt?.trim() ||
      `Hi! To receive the full reply and details, please follow @${accountUsername} first and tap "${buttonTitle}" below 🙏`;
    const retryPrompt = `We checked your follow status on Instagram, and it looks like you haven't followed @${accountUsername} yet 🙏\n\nPlease follow @${accountUsername} first, then tap "${buttonTitle}" below to unlock your message.`;
    const fallbackSuffix = `\n\n✅ After following, reply "${buttonTitle}" so we can send your message automatically.`;
    return { gatePrompt, retryPrompt, buttonTitle, fallbackSuffix };
  }
  if (lang === "ar") {
    const buttonTitle = "تابعت الصفحة ✨";
    const gatePrompt =
      customPrompt?.trim() ||
      `مرحباً! للحصول على الرد الكامل، يرجى متابعة حساب @${accountUsername} أولاً ثم الضغط على زر «${buttonTitle}» 🙏`;
    const retryPrompt = `لم يتم تسجيل متابعتك لصفحة @${accountUsername} في إنستغرام بعد 🙏\n\nيرجى متابعة الصفحة أولاً ثم الضغط مجدداً على زر «${buttonTitle}».`;
    const fallbackSuffix = `\n\n✅ بعد المتابعة، أرسل عبارة «${buttonTitle}» ليصلك الرد تلقائياً.`;
    return { gatePrompt, retryPrompt, buttonTitle, fallbackSuffix };
  }
  const buttonTitle = "فالو کردم ✨";
  const gatePrompt =
    customPrompt?.trim() ||
    `سلام! لطفاً برای دریافت پاسخ و محتوای کامل، ابتدا پیج @${accountUsername} را فالو کنید و سپس روی دکمه زیر بزنید 🙏`;
  const retryPrompt = `هنوز فالوی شما در اینستاگرام برای پیج @${accountUsername} ثبت نشده است 🙏\n\nلطفاً ابتدا صفحه @${accountUsername} را فالو کنید و سپس مجدداً روی دکمه «${buttonTitle}» بزنید تا پیام برایتان ارسال شود.`;
  const fallbackSuffix = `\n\n✅ پس از فالو کردن پیج، عبارت «فالو کردم» را در همین دایرکت ارسال کنید تا پاسخ به صورت خودکار برایتان ارسال شود.`;
  return { gatePrompt, retryPrompt, buttonTitle, fallbackSuffix };
}

interface EnrichedIdentity {
  userId: string;
  username: string;
  fullName: string;
  followerCount?: number;
  isFollowing: boolean;
  profileFetched: boolean;
  conversationId?: string;
}

/**
 * Enrich participant identity (`username`, `fullName`, `isFollowing`) via `IInstagramProvider`.
 * If `userId` is missing or `username === "user"`, attempts to resolve from conversation metadata first.
 */
async function enrichParticipantIdentity(
  provider: IInstagramProvider,
  socialAccountId: string,
  rawUserId?: string,
  rawUsername?: string,
  rawFullName?: string,
  conversationId?: string
): Promise<EnrichedIdentity> {
  let userId = (rawUserId || "").trim();
  let username = (rawUsername || "").replace(/^@/, "").trim();
  let fullName = (rawFullName || "").trim();
  let resolvedConvId = (conversationId || "").trim();

  const isGenericUsername = (u: string) =>
    !u || u.toLowerCase() === "user" || u.toLowerCase() === "instagram_user" || u.startsWith("ig_");

  // If userId or real username is missing and we have a conversationId, inspect conversations list
  if ((!userId || isGenericUsername(username)) && socialAccountId) {
    try {
      const convs = await provider.listConversations(socialAccountId);
      const matched = (convs.data || []).find(
        (c) =>
          (resolvedConvId && c.id === resolvedConvId) ||
          (userId && c.participantId === userId) ||
          (!isGenericUsername(username) &&
            c.participantUsername.toLowerCase() === username.toLowerCase())
      );
      if (matched) {
        if (!resolvedConvId) resolvedConvId = matched.id;
        if (!userId && matched.participantId) userId = matched.participantId;
        if (isGenericUsername(username) && matched.participantUsername) {
          username = matched.participantUsername.replace(/^@/, "");
        }
        if (!fullName && matched.participantFullName) {
          fullName = matched.participantFullName;
        }
      }
    } catch {
      // Ignore conversation lookup error
    }
  }

  // Fetch live participant profile from Instagram provider
  if (socialAccountId && userId) {
    const profile = await provider.getParticipantProfile(socialAccountId, userId);
    if (profile) {
      const resolvedUser =
        profile.username && !isGenericUsername(profile.username)
          ? profile.username
          : !isGenericUsername(username)
          ? username
          : `ig_${userId}`;
      const resolvedName =
        profile.name && !isGenericUsername(profile.name)
          ? profile.name
          : fullName && !isGenericUsername(fullName)
          ? fullName
          : resolvedUser;

      return {
        userId: profile.id || userId,
        username: resolvedUser,
        fullName: resolvedName,
        followerCount: profile.followerCount,
        isFollowing: Boolean(profile.isUserFollowBusiness),
        profileFetched: true,
        conversationId: resolvedConvId || undefined,
      };
    }
  }

  const finalUsername = !isGenericUsername(username)
    ? username
    : userId
    ? `ig_${userId}`
    : "instagram_user";
  const finalFullName =
    fullName && !isGenericUsername(fullName) ? fullName : !isGenericUsername(username) ? username : "";

  return {
    userId,
    username: finalUsername,
    fullName: finalFullName,
    isFollowing: false,
    profileFetched: false,
    conversationId: resolvedConvId || undefined,
  };
}

/**
 * Module 1: Process Incoming Comment Event -> Evaluates Triggers & Enqueues Actions
 */
export async function processIncomingComment(
  event: IncomingCommentEvent,
  customProvider?: IInstagramProvider
): Promise<{
  processed: boolean;
  already_processed?: boolean;
  trigger_matched?: boolean;
  comment_reply_status?: string;
  dm_status?: string;
}> {
  const db = getDb();
  const provider = customProvider || getInstagramProvider();
  const commentId = String(event.commentId || "").trim();
  if (!commentId) {
    return { processed: false };
  }

  // 1. Resolve Post & Account
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

  let account: AccountRow | undefined;
  if (post) {
    account = db
      .prepare("SELECT * FROM accounts WHERE username = ?")
      .get(post.account_username) as AccountRow | undefined;
  } else if (event.socialAccountId) {
    account = db
      .prepare("SELECT * FROM accounts WHERE social_account_id = ?")
      .get(event.socialAccountId) as AccountRow | undefined;
  } else if (event.accountUsername) {
    account = db
      .prepare("SELECT * FROM accounts WHERE username = ?")
      .get(event.accountUsername.replace(/^@/, "")) as AccountRow | undefined;
  }

  if (!post || !account) {
    return { processed: false };
  }

  if (post.auto_reply !== 1) {
    return { processed: false };
  }

  // 2. Skip comments posted before automation was enabled on this post
  if (event.commentCreatedAt && post.automation_enabled_at) {
    const commentTimeMs = new Date(event.commentCreatedAt).getTime();
    const enabledTimeMs = new Date(
      post.automation_enabled_at.includes("T")
        ? post.automation_enabled_at
        : post.automation_enabled_at.replace(" ", "T") + "Z"
    ).getTime();
    if (!Number.isNaN(commentTimeMs) && !Number.isNaN(enabledTimeMs)) {
      if (commentTimeMs < enabledTimeMs - 5000) {
        return { processed: false };
      }
    }
  }

  const initialCleanUser = (event.commenterUsername || "")
    .replace(/^@/, "")
    .trim();
  if (initialCleanUser.toLowerCase() === account.username.toLowerCase()) {
    return { processed: false };
  }

  const now = nowTimestamp();

  // 3. Acquire Idempotency Lock in `comment_logs`
  let commentLogId: number;
  try {
    const insertRes = db
      .prepare(`
        INSERT INTO comment_logs (
          comment_id, account_username, shortcode, media_id,
          user_id, username, author_full_name, comment_text,
          trigger_matched, comment_reply_status, comment_reply_text,
          dm_status, dm_text, created_at, processed_at
        ) VALUES (
          @comment_id, @account_username, @shortcode, @media_id,
          @user_id, @username, @author_full_name, @comment_text,
          0, 'locked', '', 'none', '', @now, @now
        )
      `)
      .run({
        comment_id: commentId,
        account_username: account.username,
        shortcode: post.shortcode,
        media_id: post.media_id || event.postId || "",
        user_id: event.commenterUserId || "",
        username: initialCleanUser || "instagram_user",
        author_full_name: event.commenterFullName || "",
        comment_text: event.commentText || "",
        now,
      });
    commentLogId = Number(insertRes.lastInsertRowid);
  } catch {
    return { processed: true, already_processed: true };
  }

  const socialAccountId =
    account.social_account_id || event.socialAccountId || account.username;

  // 4. Enrich Participant Profile (Real Name, Username & Live Follow Status)
  const identity = await enrichParticipantIdentity(
    provider,
    socialAccountId,
    event.commenterUserId,
    initialCleanUser,
    event.commenterFullName,
    event.conversationId
  );

  if (identity.username.toLowerCase() === account.username.toLowerCase()) {
    db.prepare("DELETE FROM comment_logs WHERE id = ?").run(commentLogId);
    return { processed: false };
  }

  // Persist enriched username & full name on comment_logs
  db.prepare(`
    UPDATE comment_logs
    SET user_id = ?, username = ?, author_full_name = ?
    WHERE id = ?
  `).run(identity.userId, identity.username, identity.fullName, commentLogId);

  const appLanguage = post.app_language || getAppLanguage(account.username);
  const playbook = getPlaybookById(post.playbook_id);
  const augmentedPostContext = buildAugmentedPostContext({
    caption: post.caption,
    cheatSheet: post.cheat_sheet,
    targetUrl: post.target_url,
    brandCheatSheet: account.brand_cheat_sheet,
    websiteUrl: account.website_url,
    accountPersona: account.account_persona,
    recipientUsername: identity.username,
    shortcode: post.shortcode,
  });

  // 4.5. Smart Competitor & Spam Comment Shield (Spec 018 — 0 credit hide via SocialAPI)
  if (post.smart_moderation === 1 && socialAccountId) {
    const lowerComment = (event.commentText || "").toLowerCase();
    const isSpamOrCompetitorPoach =
      /(پیج ما|پیجمون|ارزون‌تر|ارزان تر|ارزونتر|فروش ویژه در پیج|تلگرام\s*@|http:\/\/|https:\/\/|www\.)/i.test(
        lowerComment
      );
    if (isSpamOrCompetitorPoach) {
      try {
        const client = new SocialApiClient();
        await client.moderateComment({
          postId: post.media_id || event.postId || post.shortcode,
          commentId,
          accountId: socialAccountId,
          action: "hide",
        });
        logBotActivity(
          account.username,
          "reply_sent",
          `🛡️ سپر هوشمند: کامنت تبلیغاتی/اسپم @${identity.username} روی پست ${post.shortcode} مخفی شد`,
          event.commentText
        );
      } catch {
        // non-blocking
      }
      db.prepare(`
        UPDATE comment_logs
        SET trigger_matched = 0,
            comment_reply_status = 'skipped',
            dm_status = 'skipped',
            processed_at = ?
        WHERE id = ?
      `).run(nowTimestamp(), commentLogId);
      return {
        processed: true,
        trigger_matched: false,
        comment_reply_status: "skipped",
        dm_status: "skipped",
      };
    }
  }

  // 5. Evaluate Trigger (`all` | `keywords` | `ai_context`)
  let matched = false;
  if (post.trigger_type === "all") {
    matched = true;
  } else if (post.trigger_type === "keywords") {
    matched = matchesKeywords(event.commentText, post.trigger_keywords);
  } else if (post.trigger_type === "ai_context") {
    matched = await evaluateTriggerWithAi({
      postCaption: augmentedPostContext,
      commentText: event.commentText,
      triggerCondition: post.trigger_context || playbook?.defaults.trigger_context || "",
      username: identity.username,
      userFullName: identity.fullName,
      appLanguage,
    });
  }

  if (!matched) {
    db.prepare(`
      UPDATE comment_logs
      SET trigger_matched = 0,
          comment_reply_status = 'skipped',
          dm_status = 'skipped',
          processed_at = ?
      WHERE id = ?
    `).run(nowTimestamp(), commentLogId);
    return {
      processed: true,
      trigger_matched: false,
      comment_reply_status: "skipped",
      dm_status: "skipped",
    };
  }

  logBotActivity(
    account.username,
    "trigger_match",
    `کامنت جدید از @${identity.username} روی پست ${post.shortcode} منطبق شد`,
    event.commentText
  );

  let commentReplyStatus: string = "none";
  let commentReplyText = "";
  let dmStatus: string = "none";
  let dmText = "";

  const targetPostId = post.media_id || event.postId || post.shortcode;

  // 6. Enqueue Public Comment Reply Action (`direct` | `ai`)
  if (post.comment_action_type !== "none") {
    if (post.comment_action_type === "direct") {
      commentReplyText = interpolateStaticText(post.comment_action_text, {
        username: identity.username,
        fullName: identity.fullName,
      });
    } else if (post.comment_action_type === "ai") {
      commentReplyText = await generateContextualReplyWithAi({
        mode: "comment",
        accountUsername: account.username,
        accountPersona: account.account_persona,
        postCaption: augmentedPostContext,
        username: identity.username,
        userFullName: identity.fullName,
        followerCount: identity.followerCount,
        isFollowing: identity.isFollowing,
        appLanguage,
        incomingText: event.commentText,
        instructions:
          post.comment_action_text || playbook?.defaults.comment_action_text || "",
        fallbackText: "ممنون از همراهی شما 🙏",
      });
    }

    if (commentReplyText) {
      commentReplyStatus = "queued";
      enqueueInstagramAction({
        dedupeKey: `cmt_reply:${commentId}`,
        accountUsername: account.username,
        socialAccountId,
        eventId: `cmt:${commentId}`,
        actionType: "COMMENT_REPLY",
        targetUsername: identity.username,
        targetUserId: identity.userId,
        targetPostShortcode: post.shortcode,
        targetMediaId: targetPostId,
        targetCommentId: commentId,
        payloadText: commentReplyText,
        priority: 1,
        metadata: {
          commentLogId,
          finalCommentStatus: "sent",
          activityLogType: "reply_sent",
          activityLogTitle: `پاسخ کامنت برای @${identity.username} ارسال شد`,
          activityLogDescription: commentReplyText,
        },
      });
    }
  }

  // 7. Enqueue Private Reply / DM Action (`direct` | `ai`) + Follow Gate
  if (post.dm_action_type !== "none") {
    const attributedTargetUrl = buildAttributedUrl(post.target_url, {
      username: identity.username,
      shortcode: post.shortcode,
      playbookId: post.playbook_id,
    });

    if (post.dm_action_type === "direct") {
      dmText = interpolateStaticText(post.dm_action_text, {
        username: identity.username,
        fullName: identity.fullName,
      });
      if (attributedTargetUrl && !dmText.includes("http")) {
        dmText = `${dmText}\n\n🔗 ${attributedTargetUrl}`.trim();
      }
    } else if (post.dm_action_type === "ai") {
      dmText = await generateContextualReplyWithAi({
        mode: "comment_dm",
        accountUsername: account.username,
        accountPersona: account.account_persona,
        postCaption: augmentedPostContext,
        username: identity.username,
        userFullName: identity.fullName,
        followerCount: identity.followerCount,
        isFollowing: identity.isFollowing,
        appLanguage,
        incomingText: event.commentText,
        instructions:
          post.dm_action_text || playbook?.defaults.dm_action_text || "",
        fallbackText: "سلام! اطلاعات درخواستی خدمت شما ارسال شد 🙏",
      });
      if (attributedTargetUrl && !dmText.includes("http")) {
        dmText = `${dmText}\n\n🔗 ${attributedTargetUrl}`.trim();
      }
    }

    if (dmText) {
      // Check if Follow Gate is required AND user is not yet verified as following
      const requiresFollowGate =
        post.dm_require_follow === 1 && !identity.isFollowing;

      if (requiresFollowGate) {
        dmStatus = "pending_follow";
        const followTexts = getLocalizedFollowTexts(appLanguage, account.username);
        const followButtons: InstagramButton[] = [
          {
            type: "postback",
            title: followTexts.buttonTitle,
            payload: `FOLLOW_CONFIRMED_CMT_${post.shortcode}`,
          },
        ];

        enqueueInstagramAction({
          dedupeKey: `cmt_follow_gate:${commentId}`,
          accountUsername: account.username,
          socialAccountId,
          eventId: `cmt:${commentId}`,
          actionType: "FOLLOW_GATE_PROMPT",
          targetUsername: identity.username,
          targetUserId: identity.userId,
          targetPostShortcode: post.shortcode,
          targetMediaId: targetPostId,
          targetCommentId: commentId,
          targetConversationId: identity.conversationId,
          payloadText: followTexts.gatePrompt,
          priority: 1,
          metadata: {
            buttons: followButtons,
            fallbackText: `${followTexts.gatePrompt}${followTexts.fallbackSuffix}`,
            commentLogId,
            finalDmStatus: "pending_follow",
            activityLogType: "dm_sent",
            activityLogTitle: `پیام شرط فالو (همراه دکمه) برای @${identity.username} ارسال شد`,
            activityLogDescription: followTexts.gatePrompt,
          },
        });
      } else {
        dmStatus = "queued";
        enqueueInstagramAction({
          dedupeKey: `cmt_dm:${commentId}`,
          accountUsername: account.username,
          socialAccountId,
          eventId: `cmt:${commentId}`,
          actionType: "PRIVATE_REPLY",
          targetUsername: identity.username,
          targetUserId: identity.userId,
          targetPostShortcode: post.shortcode,
          targetMediaId: targetPostId,
          targetCommentId: commentId,
          targetConversationId: identity.conversationId,
          payloadText: dmText,
          priority: 1,
          metadata: {
            commentLogId,
            finalDmStatus: "sent",
            activityLogType: "dm_sent",
            activityLogTitle: `پاسخ دایرکت پست به @${identity.username} ارسال شد`,
            activityLogDescription: dmText,
          },
        });
      }
    }
  }

  // 8. Save Comment Log state
  db.prepare(`
    UPDATE comment_logs
    SET trigger_matched = 1,
        comment_reply_status = @comment_reply_status,
        comment_reply_text = @comment_reply_text,
        dm_status = @dm_status,
        dm_text = @dm_text,
        processed_at = @processed_at
    WHERE id = @id
  `).run({
    id: commentLogId,
    comment_reply_status: commentReplyStatus,
    comment_reply_text: commentReplyText,
    dm_status: dmStatus,
    dm_text: dmText,
    processed_at: nowTimestamp(),
  });

  // Drain due actions immediately unless caller requested batching
  if (!event.skipImmediateDrain) {
    await processActionQueue({
      accountUsername: account.username,
      maxActions: 5,
      provider,
    });
  }

  const refreshed = db
    .prepare("SELECT comment_reply_status, dm_status FROM comment_logs WHERE id = ?")
    .get(commentLogId) as
    | { comment_reply_status: string; dm_status: string }
    | undefined;

  return {
    processed: true,
    trigger_matched: true,
    comment_reply_status: refreshed?.comment_reply_status || commentReplyStatus,
    dm_status: refreshed?.dm_status || dmStatus,
  };
}

/**
 * Module 2: Process Incoming Direct Message / Postback Event
 * Coordinates:
 * - Live Follow Verification (`is_user_follow_business`)
 * - Cross-Module `pending_follow` State Machine (Comment + DM coexistence)
 * - DM Triggers (`all` | `keywords` | `ai_context` + active AI conversation continuation)
 * - DM Actions (`direct` | `ai` with Multi-Turn Conversation Memory)
 */
export async function processIncomingDm(
  event: IncomingDmEvent,
  customProvider?: IInstagramProvider
): Promise<{
  processed: boolean;
  already_processed?: boolean;
  trigger_matched?: boolean;
  reply_status?: string;
}> {
  const db = getDb();
  const provider = customProvider || getInstagramProvider();
  const messageId = String(event.messageId || "").trim();
  if (!messageId) {
    return { processed: false };
  }

  // 1. Resolve Account
  let account: AccountRow | undefined;
  if (event.socialAccountId) {
    account = db
      .prepare("SELECT * FROM accounts WHERE social_account_id = ?")
      .get(event.socialAccountId) as AccountRow | undefined;
  }
  if (!account && event.accountUsername) {
    account = db
      .prepare("SELECT * FROM accounts WHERE username = ?")
      .get(event.accountUsername.replace(/^@/, "")) as AccountRow | undefined;
  }

  if (!account) {
    return { processed: false };
  }

  const socialAccountId =
    account.social_account_id || event.socialAccountId || account.username;

  // 2. Enrich Sender Identity & Live Follow Status (`GET /v1/platforms/instagram/accounts/{id}/participants/{participantId}/profile`)
  const identity = await enrichParticipantIdentity(
    provider,
    socialAccountId,
    event.senderId,
    event.senderUsername,
    event.senderFullName,
    event.conversationId
  );

  // Ignore outgoing/self messages
  if (identity.username.toLowerCase() === account.username.toLowerCase()) {
    return { processed: false };
  }

  const conversationId = identity.conversationId || event.conversationId || "";
  const now = nowTimestamp();

  // 3. Acquire Idempotency Lock in `dm_logs`
  let dmLogId: number;
  try {
    const info = db
      .prepare(`
        INSERT INTO dm_logs (
          message_id, thread_id, account_username, sender_username, sender_full_name, sender_id,
          incoming_text, is_story_reply, story_id, story_content,
          trigger_matched, reply_status, reply_text, processed_at, created_at
        ) VALUES (
          @message_id, @thread_id, @account_username, @sender_username, @sender_full_name, @sender_id,
          @incoming_text, @is_story_reply, @story_id, @story_content,
          0, 'locked', '', @now, @now
        )
      `)
      .run({
        message_id: messageId,
        thread_id: conversationId,
        account_username: account.username,
        sender_username: identity.username,
        sender_full_name: identity.fullName,
        sender_id: identity.userId,
        incoming_text: event.incomingText || event.payload || "",
        is_story_reply: event.isStoryReply ? 1 : 0,
        story_id: event.storyId || null,
        story_content: event.storyContent || null,
        now,
      });
    dmLogId = Number(info.lastInsertRowid);
  } catch {
    return { processed: true, already_processed: true };
  }

  // Backfill any earlier logs in the same conversation that had `sender_username = 'user'`
  if (
    identity.username &&
    identity.username !== "user" &&
    identity.username !== "instagram_user" &&
    conversationId
  ) {
    db.prepare(`
      UPDATE dm_logs
      SET sender_username = ?, sender_full_name = ?, sender_id = CASE WHEN sender_id = '' THEN ? ELSE sender_id END
      WHERE account_username = ?
        AND thread_id = ?
        AND sender_username IN ('user', 'instagram_user')
    `).run(
      identity.username,
      identity.fullName,
      identity.userId,
      account.username,
      conversationId
    );
  }

  const dmRule = db
    .prepare("SELECT * FROM dm_automations WHERE account_username = ?")
    .get(account.username) as DMAutomationRow | undefined;

  const appLanguage =
    dmRule?.app_language || getAppLanguage(account.username);

  // 4. Cross-Module `pending_follow` State Machine (Comment + DM Coexistence)
  const isFollowClaim = isFollowConfirmationSignal(
    event.incomingText,
    event.payload
  );

  const pendingComments = db
    .prepare(`
      SELECT * FROM comment_logs
      WHERE account_username = @account_username
        AND dm_status = 'pending_follow'
        AND (
          (@user_id != '' AND user_id = @user_id)
          OR (@username != '' AND @username NOT IN ('user', 'instagram_user') AND LOWER(username) = @username)
        )
      ORDER BY id ASC
    `)
    .all({
      account_username: account.username,
      user_id: identity.userId,
      username: identity.username.toLowerCase(),
    }) as CommentLogRow[];

  const pendingDms = db
    .prepare(`
      SELECT * FROM dm_logs
      WHERE account_username = @account_username
        AND reply_status = 'pending_follow'
        AND message_id != @message_id
        AND (
          (@thread_id != '' AND thread_id = @thread_id)
          OR (@user_id != '' AND sender_id = @user_id)
          OR (@username != '' AND @username NOT IN ('user', 'instagram_user') AND LOWER(sender_username) = @username)
        )
      ORDER BY id ASC
    `)
    .all({
      account_username: account.username,
      message_id: messageId,
      thread_id: conversationId,
      user_id: identity.userId,
      username: identity.username.toLowerCase(),
    }) as DMLogRow[];

  const hasPendingItems = pendingComments.length > 0 || pendingDms.length > 0;

  if (hasPendingItems || isFollowClaim) {
    if (identity.isFollowing && hasPendingItems) {
      // CASE 1: LIVE INSTAGRAM API VERIFIED `is_user_follow_business === true`!
      // Release all pending Comment DMs and pending Direct DMs via Action Queue.
      let releasedCount = 0;

      for (const pc of pendingComments) {
        const textToSend = pc.dm_text?.trim();
        if (textToSend) {
          db.prepare("UPDATE comment_logs SET dm_status = 'queued', processed_at = ? WHERE id = ?").run(
            nowTimestamp(),
            pc.id
          );
          enqueueInstagramAction({
            dedupeKey: `release_cmt_dm:${pc.comment_id}`,
            accountUsername: account.username,
            socialAccountId,
            eventId: `dm:${messageId}`,
            actionType: "DM_SEND",
            targetUsername: identity.username,
            targetUserId: identity.userId,
            targetPostShortcode: pc.shortcode,
            targetMediaId: pc.media_id,
            targetCommentId: pc.comment_id,
            targetConversationId: conversationId,
            payloadText: textToSend,
            priority: 1,
            metadata: {
              commentLogId: pc.id,
              finalDmStatus: "sent",
              activityLogType: "dm_sent",
              activityLogTitle: `تایید فالو @${identity.username} در اینستاگرام احراز شد و دایرکت پست ${pc.shortcode} ارسال شد ✅`,
              activityLogDescription: textToSend,
            },
          });
          releasedCount++;
        }
      }

      for (const pd of pendingDms) {
        const textToSend = pd.reply_text?.trim();
        if (textToSend) {
          db.prepare("UPDATE dm_logs SET reply_status = 'queued', processed_at = ? WHERE id = ?").run(
            nowTimestamp(),
            pd.id
          );
          enqueueInstagramAction({
            dedupeKey: `release_dm:${pd.message_id}`,
            accountUsername: account.username,
            socialAccountId,
            eventId: `dm:${messageId}`,
            actionType: "DM_SEND",
            targetUsername: identity.username,
            targetUserId: identity.userId,
            targetConversationId: conversationId || pd.thread_id,
            payloadText: textToSend,
            priority: 1,
            metadata: {
              dmLogId: pd.id,
              finalDmStatus: "sent",
              activityLogType: "dm_sent",
              activityLogTitle: `تایید فالو @${identity.username} احراز شد و پاسخ معلق دایرکت ارسال شد ✅`,
              activityLogDescription: textToSend,
            },
          });
          releasedCount++;
        }
      }

      // If this incoming message was a follow-confirmation click/phrase OR we just released a pending DM,
      // consume this event so it does NOT also trigger a duplicate DM chat response!
      if (isFollowClaim || pendingDms.length > 0) {
        db.prepare(`
          UPDATE dm_logs
          SET trigger_matched = 1,
              reply_status = 'sent',
              reply_text = ?,
              processed_at = ?
          WHERE id = ?
        `).run(
          `[تایید فالو احراز شد — ${releasedCount} پیام معلق آزاد شد]`,
          nowTimestamp(),
          dmLogId
        );

        if (!event.skipImmediateDrain) {
          await processActionQueue({
            accountUsername: account.username,
            maxActions: 5,
            provider,
          });
        }

        return {
          processed: true,
          trigger_matched: true,
          reply_status: "sent",
        };
      }
      // Otherwise (user followed the page AND sent a brand-new real DM question while only having a pending comment):
      // their comment reward is now queued for release, and we continue below to answer their new DM question!
    } else if (!identity.isFollowing && isFollowClaim) {
      // CASE 2: User clicked "فالو کردم" or typed "فالو کردم" WITHOUT following (`isFollowing === false`)!
      // Strictly reject release, keep `pending_follow` items locked, consume the button click, and send a retry prompt!
      const followTexts = getLocalizedFollowTexts(appLanguage, account.username);
      const retryButtons: InstagramButton[] = [
        {
          type: "postback",
          title: followTexts.buttonTitle,
          payload: "FOLLOW_CONFIRMED",
        },
      ];
      const retryQuickReplies: InstagramQuickReply[] = [
        {
          title: followTexts.buttonTitle,
          payload: "FOLLOW_CONFIRMED",
        },
      ];

      db.prepare(`
        UPDATE dm_logs
        SET trigger_matched = 1,
            reply_status = 'skipped',
            reply_text = '[عدم تایید فالو در بررسی زنده اینستاگرام — ارسال پیام یادآوری مجدد]',
            processed_at = ?
        WHERE id = ?
      `).run(nowTimestamp(), dmLogId);

      if (hasPendingItems || (dmRule && dmRule.enabled === 1 && dmRule.require_follow === 1)) {
        enqueueInstagramAction({
          dedupeKey: `follow_retry:${messageId}`,
          accountUsername: account.username,
          socialAccountId,
          eventId: `dm:${messageId}`,
          actionType: "FOLLOW_RETRY_PROMPT",
          targetUsername: identity.username,
          targetUserId: identity.userId,
          targetConversationId: conversationId,
          payloadText: followTexts.retryPrompt,
          priority: 1,
          metadata: {
            buttons: retryButtons,
            quickReplies: retryQuickReplies,
            fallbackText: `${followTexts.retryPrompt}${followTexts.fallbackSuffix}`,
            activityLogType: "dm_sent",
            activityLogTitle: `کاربر @${identity.username} بدون فالو کردن دکمه را زد — پیام یادآوری مجدد ارسال شد ⚠️`,
            activityLogDescription: followTexts.retryPrompt,
          },
        });

        if (!event.skipImmediateDrain) {
          await processActionQueue({
            accountUsername: account.username,
            maxActions: 5,
            provider,
          });
        }
      }

      return {
        processed: true,
        trigger_matched: false,
        reply_status: "pending_follow",
      };
    }
    // CASE 3: `!identity.isFollowing && !isFollowClaim && hasPendingItems`
    // User is in `pending_follow` (e.g. from a Comment) and sent a normal DM question (not a follow claim).
    // Pending comment rewards stay locked in `pending_follow`, and we proceed to evaluate the DM module below!
  }

  // 4.8. Spec 018 Step 2 & 3: Cross-Channel Origin Lookup, Lead Capture & Human Takeover Check
  const recentCommentOrigin = db
    .prepare(`
      SELECT c.shortcode, c.comment_text, c.dm_text, p.caption, p.cheat_sheet, p.target_url, p.auto_reply, p.dm_action_type, p.dm_action_text
      FROM comment_logs c
      LEFT JOIN posts p ON p.shortcode = c.shortcode
      WHERE c.account_username = ?
        AND (c.user_id = ? OR LOWER(c.username) = ?)
      ORDER BY c.id DESC
      LIMIT 1
    `)
    .get(
      account.username,
      identity.userId || "__none__",
      identity.username.toLowerCase()
    ) as
    | {
        shortcode: string;
        comment_text: string;
        dm_text: string;
        caption?: string;
        cheat_sheet?: string;
        target_url?: string;
        auto_reply?: number;
        dm_action_type?: string;
        dm_action_text?: string;
      }
    | undefined;

  // Auto-extract Iranian phone number & buying intent into captured_leads
  try {
    const normalizedDigits = (event.incomingText || "")
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
    const phoneCandidate = normalizedDigits
      .replace(/[\s\-_().]/g, "")
      .match(/(?:\+98|0098|98|0)?(9\d{9})/);
    const extractedPhone = phoneCandidate ? `0${phoneCandidate[1]}` : "";
    const hasOrderIntent =
      Boolean(extractedPhone) ||
      /(سفارش|خرید|شماره|تماس|کارت به کارت|بیعانه|ارسال|موجوده|قیمت|چنده|آدرس|ادرس)/i.test(
        normalizedDigits
      );

    if (extractedPhone || (hasOrderIntent && recentCommentOrigin?.shortcode)) {
      const leadPhoneKey = extractedPhone || "بدون شماره (درخواست خرید)";
      const intentLabel = extractedPhone
        ? "شماره تماس ثبت‌شده در دایرکت"
        : "مشتری علاقه‌مند از پست";
      db.prepare(`
        INSERT INTO captured_leads (
          account_username, sender_username, sender_full_name, sender_id,
          phone_number, source_shortcode, intent_summary, last_message,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)
        ON CONFLICT(account_username, sender_username, phone_number) DO UPDATE SET
          sender_full_name = CASE WHEN excluded.sender_full_name != '' THEN excluded.sender_full_name ELSE captured_leads.sender_full_name END,
          source_shortcode = CASE WHEN excluded.source_shortcode != '' THEN excluded.source_shortcode ELSE captured_leads.source_shortcode END,
          last_message = excluded.last_message,
          updated_at = excluded.updated_at
      `).run(
        account.username,
        identity.username,
        identity.fullName || "",
        identity.userId || "",
        leadPhoneKey,
        recentCommentOrigin?.shortcode || "",
        intentLabel,
        (event.incomingText || "").slice(0, 300),
        nowTimestamp(),
        nowTimestamp()
      );
    }
  } catch (leadErr) {
    console.warn("[automation-engine] Lead extraction warning:", leadErr);
  }

  // Check Human Takeover (Bot Pause per User)
  const threadState = db
    .prepare(
      "SELECT bot_paused FROM dm_thread_states WHERE account_username = ? AND LOWER(sender_username) = ?"
    )
    .get(account.username, identity.username.toLowerCase()) as
    | { bot_paused: number }
    | undefined;

  if (threadState?.bot_paused === 1) {
    db.prepare(`
      UPDATE dm_logs
      SET trigger_matched = 0,
          reply_status = 'skipped',
          reply_text = '[⏸️ ربات برای این کاربر متوقف است — مکالمه در اختیار ادمین انسانی]',
          processed_at = ?
      WHERE id = ?
    `).run(nowTimestamp(), dmLogId);
    return {
      processed: true,
      trigger_matched: false,
      reply_status: "skipped",
    };
  }

  const isPostContinuation = Boolean(
    recentCommentOrigin &&
      recentCommentOrigin.auto_reply === 1 &&
      recentCommentOrigin.dm_action_type === "ai"
  );
  const globalDmEnabled = Boolean(dmRule && dmRule.enabled === 1);

  // 5. Standard DM Automation Module Evaluation (or Seamless Post-to-DM Continuation)
  if (!globalDmEnabled && !isPostContinuation) {
    db.prepare(`
      UPDATE dm_logs
      SET trigger_matched = 0, reply_status = 'skipped', processed_at = ?
      WHERE id = ?
    `).run(nowTimestamp(), dmLogId);
    return {
      processed: true,
      trigger_matched: false,
      reply_status: "skipped",
    };
  }

  // Skip messages created before DM automation was activated (only when relying purely on global DM rule)
  if (globalDmEnabled && !isPostContinuation && event.messageCreatedAt && dmRule?.activated_at) {
    const msgTimeMs = new Date(event.messageCreatedAt).getTime();
    const actTimeMs = new Date(
      dmRule.activated_at.includes("T")
        ? dmRule.activated_at
        : dmRule.activated_at.replace(" ", "T") + "Z"
    ).getTime();
    if (!Number.isNaN(msgTimeMs) && !Number.isNaN(actTimeMs)) {
      if (msgTimeMs < actTimeMs - 5000) {
        db.prepare(`
          UPDATE dm_logs
          SET trigger_matched = 0, reply_status = 'skipped', processed_at = ?
          WHERE id = ?
        `).run(nowTimestamp(), dmLogId);
        return {
          processed: true,
          trigger_matched: false,
          reply_status: "skipped",
        };
      }
    }
  }

  if (event.isStoryReply && dmRule?.story_handling_mode === "ignore") {
    db.prepare(`
      UPDATE dm_logs
      SET trigger_matched = 0, reply_status = 'skipped', processed_at = ?
      WHERE id = ?
    `).run(nowTimestamp(), dmLogId);
    return {
      processed: true,
      trigger_matched: false,
      reply_status: "skipped",
    };
  }

  // 6. Fetch Multi-Turn Conversation History for this DM thread/user
  const conversationHistory = getRecentDmConversationHistory({
    accountUsername: account.username,
    threadId: conversationId,
    senderId: identity.userId,
    senderUsername: identity.username,
    excludeMessageId: messageId,
    limit: 8,
  });

  // 7. Evaluate DM Trigger (`all` | `keywords` | `ai_context` + Active AI Conversation Continuation)
  let matched = false;
  if (isPostContinuation) {
    matched = true;
  } else if (dmRule?.trigger_type === "all") {
    matched = true;
  } else if (dmRule?.trigger_type === "keywords") {
    matched = matchesKeywords(event.incomingText, dmRule.trigger_keywords);
  } else if (dmRule?.trigger_type === "ai_context") {
    matched = await evaluateTriggerWithAi({
      postCaption: event.storyContent || account.bio || "Instagram Direct Message",
      commentText: event.incomingText,
      triggerCondition: dmRule.trigger_context,
      username: identity.username,
      userFullName: identity.fullName,
      appLanguage,
    });
  }

  // If this user is already in an active AI conversation in this thread, continue the conversation naturally!
  if (!matched && (dmRule?.reply_mode === "ai" || isPostContinuation) && conversationHistory.length > 0) {
    matched = true;
  }

  if (!matched) {
    db.prepare(`
      UPDATE dm_logs
      SET trigger_matched = 0, reply_status = 'skipped', processed_at = ?
      WHERE id = ?
    `).run(nowTimestamp(), dmLogId);
    return {
      processed: true,
      trigger_matched: false,
      reply_status: "skipped",
    };
  }

  // 8. Generate DM Reply (`direct` | `ai` with Conversation History, User Name & Panel Language)
  let replyText = "";
  const effectiveReplyMode = isPostContinuation ? "ai" : dmRule?.reply_mode || "ai";
  if (effectiveReplyMode === "direct" && dmRule) {
    replyText =
      interpolateStaticText(dmRule.direct_reply_text, {
        username: identity.username,
        fullName: identity.fullName,
      }) || "سلام! پیام شما دریافت شد 🙏";
  } else {
    // Spec 018: Cross-Channel Comment-to-DM Context Bridge + Supplemental Cheat Sheets
    const catalogCheatSheets = db
      .prepare(`
        SELECT shortcode, caption, cheat_sheet, target_url
        FROM posts
        WHERE account_username = ?
          AND (cheat_sheet != '' OR target_url != '' OR auto_reply = 1)
        ORDER BY sort_index ASC, id ASC
        LIMIT 8
      `)
      .all(account.username) as Array<{
      shortcode: string;
      caption: string;
      cheat_sheet?: string;
      target_url?: string;
    }>;

    const dmContextParts: string[] = [];
    if (event.isStoryReply) {
      dmContextParts.push(`ریپلای استوری: ${event.storyContent || "استوری اینستاگرام"}`);
    }
    if (account.bio) {
      dmContextParts.push(`[بیوگرافی پیج]: ${account.bio}`);
    }
    if (account.brand_cheat_sheet?.trim()) {
      dmContextParts.push(
        `[تقلب‌نامه و اطلاعات کلی پیج/برند]:\n${account.brand_cheat_sheet.trim()}`
      );
    }
    if (account.website_url?.trim()) {
      dmContextParts.push(`[سایت/لینک اصلی پیج]: ${account.website_url.trim()}`);
    }

    if (recentCommentOrigin) {
      const originLink = buildAttributedUrl(recentCommentOrigin.target_url, {
        username: identity.username,
        shortcode: recentCommentOrigin.shortcode,
      });
      dmContextParts.push(
        `[پستی که این کاربر اخیراً زیر آن کامنت گذاشته (${recentCommentOrigin.shortcode})]:\n` +
          `- کامنت قبلی کاربر: "${recentCommentOrigin.comment_text}"\n` +
          (recentCommentOrigin.dm_text
            ? `- پیام دایرکتی که روی آن پست برایش فرستادیم: "${recentCommentOrigin.dm_text}"\n`
            : "") +
          (recentCommentOrigin.caption
            ? `- کپشن پست: ${recentCommentOrigin.caption.slice(0, 400)}\n`
            : "") +
          (recentCommentOrigin.cheat_sheet
            ? `- 🔥 تقلب‌نامه و اطلاعات تکمیلی این پست (قیمت/سایز/جزئیات): ${recentCommentOrigin.cheat_sheet}\n`
            : "") +
          (originLink ? `- 🔗 لینک مستقیم این پست: ${originLink}` : "")
      );
    }

    if (catalogCheatSheets.length > 0) {
      const catalogLines = catalogCheatSheets
        .map((item, idx) => {
          const link = buildAttributedUrl(item.target_url, {
            username: identity.username,
            shortcode: item.shortcode,
          });
          return (
            `${idx + 1}. پست ${item.shortcode}: ${(item.caption || "").slice(0, 140)}` +
            (item.cheat_sheet ? ` | اطلاعات تکمیلی/قیمت: ${item.cheat_sheet}` : "") +
            (link ? ` | لینک: ${link}` : "")
          );
        })
        .join("\n");
      dmContextParts.push(`[فهرست پست‌ها و تقلب‌نامه‌های فعال پیج]:\n${catalogLines}`);
    }

    const contextCaption =
      dmContextParts.join("\n\n") || "گفتگوی مستقیم دایرکت اینستاگرام";

    replyText = await generateContextualReplyWithAi({
      mode: "dm_chat",
      accountUsername: account.username,
      accountPersona: account.account_persona,
      postCaption: contextCaption,
      username: identity.username,
      userFullName: identity.fullName,
      followerCount: identity.followerCount,
      isFollowing: identity.isFollowing,
      appLanguage,
      incomingText: event.incomingText,
      instructions:
        [recentCommentOrigin?.dm_action_text, dmRule?.ai_prompt_instructions]
          .filter(Boolean)
          .join("\n") || "با لحن محترمانه و صمیمی بر اساس تقلب‌نامه پست و پیج پاسخ بده.",
      conversationHistory,
      fallbackText:
        dmRule?.direct_reply_text?.trim() || "سلام! چطور می‌توانم کمکتان کنم؟ 🙏",
    });
  }

  // 9. Check DM Follow Gate (`dmRule?.require_follow === 1` AND `!identity.isFollowing`)
  if (dmRule?.require_follow === 1 && !identity.isFollowing) {
    const followTexts = getLocalizedFollowTexts(
      appLanguage,
      account.username,
      dmRule?.follow_prompt_text
    );
    const followButtons: InstagramButton[] = [
      {
        type: "postback",
        title: followTexts.buttonTitle,
        payload: "FOLLOW_CONFIRMED",
      },
    ];
    const followQuickReplies: InstagramQuickReply[] = [
      {
        title: followTexts.buttonTitle,
        payload: "FOLLOW_CONFIRMED",
      },
    ];

    db.prepare(`
      UPDATE dm_logs
      SET trigger_matched = 1,
          reply_status = 'pending_follow',
          reply_text = ?,
          processed_at = ?
      WHERE id = ?
    `).run(replyText, nowTimestamp(), dmLogId);

    enqueueInstagramAction({
      dedupeKey: `dm_follow_gate:${messageId}`,
      accountUsername: account.username,
      socialAccountId,
      eventId: `dm:${messageId}`,
      actionType: "FOLLOW_GATE_PROMPT",
      targetUsername: identity.username,
      targetUserId: identity.userId,
      targetConversationId: conversationId,
      payloadText: followTexts.gatePrompt,
      priority: 1,
      metadata: {
        buttons: followButtons,
        quickReplies: followQuickReplies,
        fallbackText: `${followTexts.gatePrompt}${followTexts.fallbackSuffix}`,
        dmLogId,
        finalDmStatus: "pending_follow",
        activityLogType: "dm_sent",
        activityLogTitle: `پیام شرط فالو دایرکت برای @${identity.username} ارسال شد`,
        activityLogDescription: followTexts.gatePrompt,
      },
    });

    if (!event.skipImmediateDrain) {
      await processActionQueue({
        accountUsername: account.username,
        maxActions: 5,
        provider,
      });
    }

    return {
      processed: true,
      trigger_matched: true,
      reply_status: "pending_follow",
    };
  }

  // 10. Enqueue Standard DM Reply (`DM_SEND`)
  db.prepare(`
    UPDATE dm_logs
    SET trigger_matched = 1,
        reply_status = 'queued',
        reply_text = ?,
        processed_at = ?
    WHERE id = ?
  `).run(replyText, nowTimestamp(), dmLogId);

  enqueueInstagramAction({
    dedupeKey: `dm_reply:${messageId}`,
    accountUsername: account.username,
    socialAccountId,
    eventId: `dm:${messageId}`,
    actionType: "DM_SEND",
    targetUsername: identity.username,
    targetUserId: identity.userId,
    targetConversationId: conversationId,
    payloadText: replyText,
    priority: 1,
    metadata: {
      dmLogId,
      finalDmStatus: "sent",
      activityLogType: "dm_sent",
      activityLogTitle: `پاسخ دایرکت هوشمند به @${identity.username} ارسال شد`,
      activityLogDescription: replyText,
    },
  });

  if (!event.skipImmediateDrain) {
    await processActionQueue({
      accountUsername: account.username,
      maxActions: 5,
      provider,
    });
  }

  const refreshedDm = db
    .prepare("SELECT reply_status FROM dm_logs WHERE id = ?")
    .get(dmLogId) as { reply_status: string } | undefined;

  return {
    processed: true,
    trigger_matched: true,
    reply_status: refreshedDm?.reply_status || "queued",
  };
}
