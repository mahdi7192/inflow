import {
  SocialApiClient,
  SocialApiError,
  verifySocialApiWebhookSignature,
} from "@/lib/social-api";
import {
  type IInstagramProvider,
  type InstagramAccount,
  type InstagramButton,
  type InstagramComment,
  type InstagramConversation,
  type InstagramMessage,
  type InstagramParticipantProfile,
  type InstagramPost,
  type InstagramQuickReply,
  type NormalizedInstagramEvent,
  InstagramProviderError,
} from "@/lib/instagram/provider";

function wrapError(err: unknown): never {
  if (err instanceof InstagramProviderError) {
    throw err;
  }
  if (err instanceof SocialApiError) {
    throw new InstagramProviderError(
      err.message,
      err.status,
      err.code,
      err.retryAfterSec
    );
  }
  throw new InstagramProviderError(
    (err as Error)?.message || "خطای ارتباط با سرویس اینستاگرام",
    500,
    "provider_error"
  );
}

function extractShortcodeFromUrl(url?: string): string {
  if (!url) return "";
  const match = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i);
  return match ? match[1] : "";
}

/**
 * Concrete implementation of `IInstagramProvider` backed by SocialAPI.ai (`SocialApiClient`).
 */
export class SocialApiInstagramProvider implements IInstagramProvider {
  public readonly providerName = "social-api.ai";
  private client: SocialApiClient;

  constructor(client?: SocialApiClient) {
    this.client = client || new SocialApiClient();
  }

  public hasCredentials(): boolean {
    return this.client.hasCredentials();
  }

  public async listAccounts(): Promise<InstagramAccount[]> {
    try {
      const res = await this.client.listAccounts("instagram");
      return (res.data || []).map((acc) => ({
        id: acc.id,
        username: (acc.username || acc.handle || acc.name || acc.id).replace(/^@/, ""),
        displayName: acc.display_name || acc.name || acc.username || acc.id,
        avatarUrl: acc.avatar_url || acc.profile_picture_url || "",
        bio: acc.bio || "",
        followersCount: acc.followers_count,
        status: acc.status || "active",
      }));
    } catch (err) {
      wrapError(err);
    }
  }

  public async listPosts(accountId: string): Promise<InstagramPost[]> {
    try {
      const [commentedRes, publishedRes] = await Promise.allSettled([
        this.client.listCommentedPosts(accountId),
        this.client.listAllPosts(accountId),
      ]);

      const rawPosts = [
        ...(commentedRes.status === "fulfilled" ? commentedRes.value.data || [] : []),
        ...(publishedRes.status === "fulfilled" ? publishedRes.value.data || [] : []),
      ];

      const seen = new Set<string>();
      const normalized: InstagramPost[] = [];

      for (const p of rawPosts) {
        const target = Array.isArray(p.targets)
          ? p.targets.find((t) => !t.platform || t.platform === "instagram") || p.targets[0]
          : undefined;
        const platformPostId = String(
          target?.platform_post_id || p.platform_id || p.post_id || p.id || ""
        );
        const url = String(target?.permalink || p.permalink || p.url || "");
        const shortcode =
          p.shortcode || p.code || extractShortcodeFromUrl(url) || platformPostId;
        if (!shortcode || seen.has(shortcode)) continue;
        seen.add(shortcode);

        const mediaType = String(p.media_type || p.type || "").toLowerCase();
        const postType: "reel" | "post" =
          mediaType.includes("reel") || mediaType.includes("video") || url.includes("/reel/")
            ? "reel"
            : "post";

        const mediaItem = target?.platform_media?.[0];
        const thumb =
          p.thumbnail_url ||
          p.thumbnail ||
          mediaItem?.thumbnail_url ||
          (mediaItem?.type !== "video" ? mediaItem?.url : "") ||
          p.media_url ||
          mediaItem?.url ||
          "";

        normalized.push({
          id: p.id || platformPostId,
          platformPostId: platformPostId || shortcode,
          shortcode,
          url: url || `https://www.instagram.com/p/${shortcode}/`,
          postType,
          thumbnailUrl: thumb,
          caption: p.content || p.caption || p.text || "",
          createdAt: p.created_at,
        });
      }

      return normalized;
    } catch (err) {
      wrapError(err);
    }
  }

  public async listPostComments(
    accountId: string,
    postId: string,
    cursor?: string
  ): Promise<{ data: InstagramComment[]; nextCursor?: string | null }> {
    try {
      const res = await this.client.listPostComments(postId, accountId, cursor);
      const data: InstagramComment[] = (res.data || []).map((c) => {
        const raw = c as unknown as Record<string, unknown>;
        const caps = (raw.capabilities as Record<string, unknown>) || {};
        const authorUsername = String(
          c.author_username || c.username || c.author_name || ""
        ).replace(/^@/, "");
        const authorFullName = String(c.author_name || authorUsername || "");
        return {
          id: String(c.id || c.comment_id || raw.platform_id || ""),
          platformId: raw.platform_id ? String(raw.platform_id) : undefined,
          postId,
          authorId: String(c.author_id || c.user_id || ""),
          authorUsername: authorUsername || "instagram_user",
          authorFullName,
          text: String(c.text || ""),
          isOwner: Boolean(raw.is_owner),
          createdAt: c.created_at,
          canReply: caps.can_reply !== undefined ? Boolean(caps.can_reply) : true,
          canPrivateReply:
            caps.can_private_reply !== undefined ? Boolean(caps.can_private_reply) : true,
        };
      });
      return {
        data,
        nextCursor: res.pagination?.next_cursor || null,
      };
    } catch (err) {
      wrapError(err);
    }
  }

  public async replyToComment(params: {
    accountId: string;
    postId: string;
    commentId?: string;
    text: string;
  }): Promise<{ id?: string; success: boolean }> {
    try {
      const res = await this.client.replyToComment(params);
      return {
        id: res.id,
        success: true,
      };
    } catch (err) {
      wrapError(err);
    }
  }

  public async sendPrivateReply(params: {
    accountId: string;
    postId: string;
    commentId: string;
    text: string;
    buttons?: InstagramButton[];
  }): Promise<{ success: boolean }> {
    try {
      await this.client.sendPrivateReply({
        accountId: params.accountId,
        postId: params.postId,
        commentId: params.commentId,
        text: params.text,
        buttons: params.buttons,
      });
      return { success: true };
    } catch (err) {
      wrapError(err);
    }
  }

  public async moderateComment(params: {
    accountId: string;
    postId: string;
    commentId: string;
    action: "delete" | "hide" | "unhide" | "like" | "unlike";
  }): Promise<{ success: boolean }> {
    try {
      return await this.client.moderateComment(params);
    } catch (err) {
      wrapError(err);
    }
  }

  public async listConversations(
    accountId: string,
    cursor?: string
  ): Promise<{ data: InstagramConversation[]; nextCursor?: string | null }> {
    try {
      const res = await this.client.listConversations(accountId, cursor);
      const data: InstagramConversation[] = (res.data || []).map((c) => {
        const username = String(
          c.participant_username || c.participant_name || c.participant_id || ""
        ).replace(/^@/, "");
        return {
          id: c.id,
          accountId: c.account_id || accountId,
          participantId: String(c.participant_id || ""),
          participantUsername: username,
          participantFullName: c.participant_name || username,
          lastMessage: String(c.last_message || ""),
          lastMessageAt: String(c.last_message_at || ""),
          unreadCount: Number(c.unread_count || 0),
        };
      });
      return {
        data,
        nextCursor: res.pagination?.next_cursor || null,
      };
    } catch (err) {
      wrapError(err);
    }
  }

  public async listConversationMessages(
    accountId: string,
    conversationId: string,
    cursor?: string
  ): Promise<{ data: InstagramMessage[]; nextCursor?: string | null }> {
    try {
      const res = await this.client.listConversationMessages(
        conversationId,
        accountId,
        cursor
      );
      const data: InstagramMessage[] = (res.data || []).map((m) => {
        const direction: "incoming" | "outgoing" =
          m.direction === "incoming" || m.direction === "outgoing"
            ? m.direction
            : m.is_from_me
            ? "outgoing"
            : "incoming";
        return {
          id: String(m.platform_id || m.id || ""),
          conversationId: String(m.conversation_id || conversationId),
          platformId: m.id ? String(m.id) : m.platform_id,
          direction,
          senderId: String(m.sender_id || ""),
          senderUsername: m.sender_username
            ? String(m.sender_username).replace(/^@/, "")
            : undefined,
          senderFullName: m.sender_name || undefined,
          text: String(m.text || ""),
          attachmentType: m.attachment_type || null,
          createdAt: m.created_at,
        };
      });
      return {
        data,
        nextCursor: res.pagination?.next_cursor || null,
      };
    } catch (err) {
      wrapError(err);
    }
  }

  public async sendDirectMessage(params: {
    accountId: string;
    conversationId: string;
    recipientId?: string;
    text: string;
    buttons?: InstagramButton[];
    quickReplies?: InstagramQuickReply[];
  }): Promise<{ id?: string; success: boolean }> {
    try {
      const res = await this.client.sendConversationMessage({
        conversationId: params.conversationId,
        accountId: params.accountId,
        recipientId: params.recipientId,
        text: params.text,
        buttons: params.buttons,
        quickReplies: params.quickReplies,
      });
      return {
        id: res.id || res.message_id,
        success: true,
      };
    } catch (err) {
      wrapError(err);
    }
  }

  public async getParticipantProfile(
    accountId: string,
    participantId: string
  ): Promise<InstagramParticipantProfile | null> {
    const profile = await this.client.getParticipantProfile(accountId, participantId);
    if (!profile) return null;
    const username = String(profile.username || "").replace(/^@/, "");
    return {
      id: String(profile.id || participantId),
      username,
      name: String(profile.name || username || ""),
      profilePic: profile.profile_pic,
      followerCount: profile.follower_count,
      isUserFollowBusiness: Boolean(profile.is_user_follow_business),
      isBusinessFollowUser: Boolean(profile.is_business_follow_user),
      isVerifiedUser: Boolean(profile.is_verified_user),
    };
  }

  public async checkFollowStatus(
    accountId: string,
    participantId: string
  ): Promise<{
    verified: boolean;
    profile: InstagramParticipantProfile | null;
    reason: "following" | "not_following" | "profile_unavailable";
  }> {
    const profile = await this.getParticipantProfile(accountId, participantId);
    if (!profile) {
      return {
        verified: false,
        profile: null,
        reason: "profile_unavailable",
      };
    }
    return {
      verified: profile.isUserFollowBusiness,
      profile,
      reason: profile.isUserFollowBusiness ? "following" : "not_following",
    };
  }

  public verifyWebhookSignature(
    rawBody: string,
    signatureHeader: string | null,
    timestampHeader?: string | null
  ): boolean {
    return verifySocialApiWebhookSignature(rawBody, signatureHeader, timestampHeader);
  }

  public parseWebhookEvent(rawBody: string): NormalizedInstagramEvent | null {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody || "{}") as Record<string, unknown>;
    } catch {
      return null;
    }

    const eventTypeRaw = String(payload.event || payload.type || "");
    const data = (payload.data as Record<string, unknown>) || payload;
    const socialAccountId = String(
      payload.account_id || data.account_id || ""
    ).trim();

    const rawPayload = (payload.raw_payload as Record<string, unknown>) || {};
    const rawValue = (rawPayload.value as Record<string, unknown>) || {};
    const rawFrom = (rawValue.from as Record<string, unknown>) || {};
    const rawMedia = (rawValue.media as Record<string, unknown>) || {};
    const rawSender = (rawPayload.sender as Record<string, unknown>) || {};
    const rawPostback = (rawPayload.postback as Record<string, unknown>) || {};
    const rawMessage = (rawPayload.message as Record<string, unknown>) || {};
    const rawQuickReply = (rawMessage.quick_reply as Record<string, unknown>) || {};

    const author = (data.author as Record<string, unknown>) || {};
    const sender = (data.sender as Record<string, unknown>) || {};
    const content = (data.content as Record<string, unknown>) || {};
    const dataMetadata = (data.metadata as Record<string, unknown>) || {};
    const contentMetadata = (content.metadata as Record<string, unknown>) || {};

    if (eventTypeRaw === "comment.received" || eventTypeRaw === "comment.created") {
      const commentId = String(
        data.id || rawValue.id || data.comment_id || data.platform_id || ""
      ).trim();
      const postId = String(
        data.platform_post_id ||
          rawMedia.id ||
          data.post_id ||
          data.media_id ||
          ""
      ).trim();

      const authorId = String(
        author.id || rawFrom.id || data.user_id || data.author_id || ""
      ).trim();
      const authorNameField = String(author.name || data.author_name || "").trim();
      const authorUsername = String(
        rawFrom.username ||
          author.username ||
          data.username ||
          data.author_username ||
          authorNameField ||
          data.participant_name ||
          ""
      )
        .replace(/^@/, "")
        .trim();

      const text = String(
        content.text || rawValue.text || data.text || data.comment_text || ""
      ).trim();

      if (!commentId) return null;

      return {
        eventUid: `cmt:${commentId}`,
        eventType: "comment",
        source: "webhook",
        socialAccountId: socialAccountId || undefined,
        accountUsername: data.account_username ? String(data.account_username) : undefined,
        postId: postId || undefined,
        shortcode: data.shortcode ? String(data.shortcode) : undefined,
        commentId,
        conversationId: data.conversation_id ? String(data.conversation_id) : undefined,
        authorId,
        authorUsername: authorUsername || (authorId ? `ig_${authorId}` : "instagram_user"),
        authorFullName: authorNameField || authorUsername,
        text,
        createdAt: data.received_at
          ? String(data.received_at)
          : data.created_at
          ? String(data.created_at)
          : undefined,
        rawPayload: payload,
      };
    }

    if (eventTypeRaw === "dm.received" || eventTypeRaw === "dm.postback") {
      // Canonicalize on platform_id (shared across Webhook & REST polling) when available
      const messageId = String(
        data.platform_id ||
          rawMessage.mid ||
          data.id ||
          data.message_id ||
          `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      ).trim();

      const conversationId = String(
        data.conversation_id || data.thread_id || ""
      ).trim();

      // Fix: SocialAPI places sender inside `data.author` (`author.id`, `author.name`) and `raw_payload.sender.id`
      const authorId = String(
        author.id ||
          sender.id ||
          rawSender.id ||
          data.sender_id ||
          data.participant_id ||
          ""
      ).trim();

      const authorNameRaw = String(
        author.name ||
          sender.name ||
          data.sender_username ||
          data.participant_name ||
          data.username ||
          ""
      ).trim();

      const authorUsername = String(
        author.username ||
          sender.username ||
          data.sender_username ||
          data.participant_username ||
          authorNameRaw ||
          ""
      )
        .replace(/^@/, "")
        .trim();

      // Fix: SocialAPI places postback payload inside `data.metadata.payload` and `data.metadata.title`
      const postbackPayload = String(
        dataMetadata.payload ||
          contentMetadata.payload ||
          rawPostback.payload ||
          rawQuickReply.payload ||
          content.payload ||
          data.payload ||
          ""
      ).trim();

      const postbackTitle = String(
        dataMetadata.title ||
          contentMetadata.title ||
          rawPostback.title ||
          ""
      ).trim();

      const textStr = String(
        content.text ||
          rawMessage.text ||
          data.text ||
          data.message ||
          postbackTitle ||
          postbackPayload ||
          ""
      ).trim();

      return {
        eventUid: `dm:${messageId}`,
        eventType: eventTypeRaw === "dm.postback" ? "postback" : "dm",
        source: "webhook",
        socialAccountId: socialAccountId || undefined,
        accountUsername: data.account_username ? String(data.account_username) : undefined,
        messageId,
        conversationId: conversationId || undefined,
        authorId,
        authorUsername: authorUsername || (authorId ? `ig_${authorId}` : "instagram_user"),
        authorFullName: authorNameRaw || authorUsername,
        text: textStr,
        postbackPayload: postbackPayload || undefined,
        postbackTitle: postbackTitle || undefined,
        isStoryReply: Boolean(data.is_story_reply || dataMetadata.is_story_reply),
        storyId: data.story_id ? String(data.story_id) : null,
        storyContent: data.story_content ? String(data.story_content) : null,
        createdAt: data.received_at
          ? String(data.received_at)
          : data.created_at
          ? String(data.created_at)
          : undefined,
        rawPayload: payload,
      };
    }

    if (eventTypeRaw === "mention.received" || eventTypeRaw === "story.mention") {
      const mentionId = String(
        data.id || `mention_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      );
      const authorId = String(author.id || sender.id || data.user_id || "").trim();
      const authorUsername = String(
        author.username || author.name || data.username || "instagram_user"
      )
        .replace(/^@/, "")
        .trim();
      return {
        eventUid: `mnt:${mentionId}`,
        eventType: "mention",
        source: "webhook",
        socialAccountId: socialAccountId || undefined,
        authorId,
        authorUsername,
        authorFullName: String(author.name || authorUsername),
        text: String(content.text || data.text || "منشن در پست یا استوری"),
        rawPayload: payload,
      };
    }

    return null;
  }
}

let defaultProviderInstance: IInstagramProvider | null = null;

export function getInstagramProvider(): IInstagramProvider {
  if (!defaultProviderInstance) {
    defaultProviderInstance = new SocialApiInstagramProvider();
  }
  return defaultProviderInstance;
}

export function createInstagramProvider(): IInstagramProvider {
  return new SocialApiInstagramProvider();
}
