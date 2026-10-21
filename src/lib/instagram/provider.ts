/**
 * Provider-Agnostic Instagram Gateway Abstraction Layer (`IInstagramProvider`)
 *
 * All business logic (Event Aggregator, Automation Engine, Action Executor, Inbox APIs)
 * communicates with Instagram exclusively through this contract.
 * Replacing or adding an underlying transport (SocialAPI, Graph API, etc.)
 * requires only implementing `IInstagramProvider`.
 */

export interface InstagramAccount {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  followersCount?: number;
  status?: string;
}

export interface InstagramPost {
  id: string;
  platformPostId: string;
  shortcode: string;
  url: string;
  postType: "reel" | "post";
  thumbnailUrl: string;
  caption: string;
  createdAt?: string;
}

export interface InstagramComment {
  id: string;
  platformId?: string;
  postId?: string;
  authorId: string;
  authorUsername: string;
  authorFullName?: string;
  text: string;
  isOwner?: boolean;
  createdAt?: string;
  canReply?: boolean;
  canPrivateReply?: boolean;
}

export interface InstagramConversation {
  id: string;
  accountId?: string;
  participantId: string;
  participantUsername: string;
  participantFullName?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface InstagramMessage {
  id: string;
  conversationId: string;
  platformId?: string;
  direction: "incoming" | "outgoing";
  senderId: string;
  senderUsername?: string;
  senderFullName?: string;
  text: string;
  attachmentType?: string | null;
  createdAt?: string;
}

export interface InstagramParticipantProfile {
  id: string;
  username: string;
  name: string;
  profilePic?: string;
  followerCount?: number;
  isUserFollowBusiness: boolean;
  isBusinessFollowUser: boolean;
  isVerifiedUser: boolean;
}

export interface InstagramButton {
  type: "postback" | "url";
  title: string;
  payload?: string;
  url?: string;
}

export interface InstagramQuickReply {
  title: string;
  payload?: string;
}

export interface NormalizedInstagramEvent {
  eventUid: string; // e.g. "cmt:<id>" or "dm:<id>"
  eventType: "comment" | "dm" | "postback" | "mention";
  source: "webhook" | "polling" | "sync";
  socialAccountId?: string;
  accountUsername?: string;
  postId?: string;
  shortcode?: string;
  commentId?: string;
  messageId?: string;
  conversationId?: string;
  authorId: string;
  authorUsername: string;
  authorFullName?: string;
  text: string;
  postbackPayload?: string;
  postbackTitle?: string;
  isStoryReply?: boolean;
  storyId?: string | null;
  storyContent?: string | null;
  createdAt?: string;
  rawPayload?: Record<string, unknown>;
}

export class InstagramProviderError extends Error {
  status: number;
  code: string;
  retryAfterSec?: number;

  constructor(
    message: string,
    status: number = 500,
    code: string = "provider_error",
    retryAfterSec?: number
  ) {
    super(message);
    this.name = "InstagramProviderError";
    this.status = status;
    this.code = code;
    this.retryAfterSec = retryAfterSec;
  }
}

export interface IInstagramProvider {
  readonly providerName: string;

  hasCredentials(): boolean;

  listAccounts(): Promise<InstagramAccount[]>;

  listPosts(accountId: string): Promise<InstagramPost[]>;

  listPostComments(
    accountId: string,
    postId: string,
    cursor?: string
  ): Promise<{ data: InstagramComment[]; nextCursor?: string | null }>;

  replyToComment(params: {
    accountId: string;
    postId: string;
    commentId?: string;
    text: string;
  }): Promise<{ id?: string; success: boolean }>;

  sendPrivateReply(params: {
    accountId: string;
    postId: string;
    commentId: string;
    text: string;
    buttons?: InstagramButton[];
  }): Promise<{ success: boolean }>;

  moderateComment(params: {
    accountId: string;
    postId: string;
    commentId: string;
    action: "delete" | "hide" | "unhide" | "like" | "unlike";
  }): Promise<{ success: boolean }>;

  listConversations(
    accountId: string,
    cursor?: string
  ): Promise<{ data: InstagramConversation[]; nextCursor?: string | null }>;

  listConversationMessages(
    accountId: string,
    conversationId: string,
    cursor?: string
  ): Promise<{ data: InstagramMessage[]; nextCursor?: string | null }>;

  sendDirectMessage(params: {
    accountId: string;
    conversationId: string;
    recipientId?: string;
    text: string;
    buttons?: InstagramButton[];
    quickReplies?: InstagramQuickReply[];
  }): Promise<{ id?: string; success: boolean }>;

  /**
   * Fetch live Instagram messaging participant profile, including:
   * - `name` (user's full display name)
   * - `username` (Instagram handle)
   * - `isUserFollowBusiness` (true iff user currently follows the business page)
   *
   * Returns `null` if Instagram withholds profile (e.g., 403 before first DM interaction).
   */
  getParticipantProfile(
    accountId: string,
    participantId: string
  ): Promise<InstagramParticipantProfile | null>;

  /**
   * Convenience helper that checks live follow status via `getParticipantProfile`.
   */
  checkFollowStatus(
    accountId: string,
    participantId: string
  ): Promise<{
    verified: boolean;
    profile: InstagramParticipantProfile | null;
    reason: "following" | "not_following" | "profile_unavailable";
  }>;

  verifyWebhookSignature(
    rawBody: string,
    signatureHeader: string | null,
    timestampHeader?: string | null
  ): boolean;

  parseWebhookEvent(rawBody: string): NormalizedInstagramEvent | null;
}
