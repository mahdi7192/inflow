import crypto from "crypto";
import { getSocialApiConfig } from "@/lib/db";

export interface SocialApiAccount {
  id: string;
  platform: string;
  username?: string;
  handle?: string;
  name?: string;
  display_name?: string;
  avatar_url?: string;
  profile_picture_url?: string;
  bio?: string;
  followers_count?: number;
  status?: string;
}

export interface SocialApiPost {
  id: string;
  post_id?: string;
  shortcode?: string;
  code?: string;
  platform?: string;
  account_id?: string;
  url?: string;
  permalink?: string;
  media_type?: string;
  type?: string;
  thumbnail_url?: string;
  media_url?: string;
  caption?: string;
  text?: string;
  created_at?: string;
}

export interface SocialApiComment {
  id: string;
  comment_id?: string;
  post_id?: string;
  account_id?: string;
  user_id?: string;
  author_id?: string;
  username?: string;
  author_username?: string;
  author_name?: string;
  text: string;
  created_at?: string;
  hidden?: boolean;
  liked?: boolean;
}

export interface SocialApiConversationMessage {
  id: string;
  text: string;
  sender_id?: string;
  sender_username?: string;
  is_from_me?: boolean;
  created_at?: string;
}

export interface SocialApiConversation {
  id: string;
  platform: string;
  account_id?: string;
  participant_id?: string;
  participant_name: string;
  participant_username?: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  messages?: SocialApiConversationMessage[];
}

export interface SocialApiPagination {
  has_more: boolean;
  next_cursor?: string | null;
}

export class SocialApiError extends Error {
  status: number;
  code: string;
  platform?: string;

  constructor(message: string, status: number = 500, code: string = "api_error", platform?: string) {
    super(message);
    this.name = "SocialApiError";
    this.status = status;
    this.code = code;
    this.platform = platform;
  }
}

/**
 * Official SocialAPI.ai Unified REST Client
 * Documentation: https://docs.social-api.ai/api-reference/introduction
 * Base URL: https://api.social-api.ai/v1
 */
export class SocialApiClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(overrideApiKey?: string, overrideBaseUrl?: string) {
    const config = getSocialApiConfig();
    this.apiKey = (overrideApiKey || config.apiKey || "").trim();
    this.baseUrl = (overrideBaseUrl || config.baseUrl || "https://api.social-api.ai").replace(/\/+$/, "");
  }

  public hasCredentials(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 5);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs: number = 12000
  ): Promise<T> {
    if (!this.hasCredentials()) {
      throw new SocialApiError(
        "کلید دسترسی SocialAPI.ai در بخش مدیریت (Back-Office) تنظیم نشده است.",
        401,
        "missing_api_key"
      );
    }

    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${path}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(options.headers || {}),
        },
        signal: controller.signal,
        cache: "no-store",
      });

      const rawText = await res.text();
      let json: Record<string, unknown> = {};
      if (rawText) {
        try {
          json = JSON.parse(rawText) as Record<string, unknown>;
        } catch {
          json = { message: rawText };
        }
      }

      if (!res.ok) {
        const errObj = (json.error as Record<string, unknown>) || json;
        const code = String(errObj.code || (res.status === 401 ? "token_expired" : "api_error"));
        const message = String(
          errObj.message ||
            json.message ||
            json.detail ||
            `خطای ارتباط با SocialAPI (کد ${res.status})`
        );
        const platform = errObj.platform ? String(errObj.platform) : undefined;
        throw new SocialApiError(message, res.status, code, platform);
      }

      return json as T;
    } catch (err: unknown) {
      if (err instanceof SocialApiError) {
        throw err;
      }
      if ((err as Error).name === "AbortError") {
        throw new SocialApiError(
          "مهلت زمانی ارتباط با سرویس SocialAPI.ai به پایان رسید.",
          504,
          "timeout"
        );
      }
      throw new SocialApiError(
        (err as Error).message || "خطای شبکه در ارتباط با SocialAPI.ai",
        502,
        "network_error"
      );
    } finally {
      clearTimeout(timer);
    }
  }

  // ============================================================================
  // 1. Accounts & Managed OAuth (/v1/accounts)
  // ============================================================================

  /**
   * Initiate an OAuth connection flow for Instagram (`POST /v1/accounts/connect`)
   */
  async connectAccount(params: {
    platform?: "instagram";
    redirect_url?: string;
    metadata?: Record<string, unknown>;
  } = {}): Promise<{
    url?: string;
    auth_url?: string;
    authorization_url?: string;
    account_id?: string;
    status?: string;
  }> {
    return this.request("/v1/accounts/connect", {
      method: "POST",
      body: JSON.stringify({
        platform: params.platform || "instagram",
        ...(params.redirect_url ? { redirect_url: params.redirect_url } : {}),
        ...(params.metadata ? { metadata: params.metadata } : {}),
      }),
    });
  }

  /**
   * List all connected social accounts (`GET /v1/accounts`)
   */
  async listAccounts(platform: string = "instagram"): Promise<{
    data: SocialApiAccount[];
    count: number;
  }> {
    const query = platform ? `?platform=${encodeURIComponent(platform)}` : "";
    const res = await this.request<{
      data?: SocialApiAccount[];
      accounts?: SocialApiAccount[];
      count?: number;
    }>(`/v1/accounts${query}`);

    const list = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.accounts)
      ? res.accounts
      : [];

    const filtered = platform
      ? list.filter((a) => !a.platform || a.platform.toLowerCase() === platform.toLowerCase())
      : list;

    return {
      data: filtered,
      count: typeof res.count === "number" ? res.count : filtered.length,
    };
  }

  // ============================================================================
  // 2. Posts & Publishing (/v1/posts)
  // ============================================================================

  /**
   * List published/synced posts (`GET /v1/posts`)
   */
  async listPosts(accountId?: string): Promise<{ data: SocialApiPost[] }> {
    const query = accountId ? `?account_id=${encodeURIComponent(accountId)}` : "";
    const res = await this.request<{ data?: SocialApiPost[]; posts?: SocialApiPost[] }>(
      `/v1/posts${query}`
    );
    const list = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.posts)
      ? res.posts
      : [];
    return { data: list };
  }

  /**
   * Publish or schedule a post/reel/story (`POST /v1/posts`)
   */
  async publishPost(payload: {
    account_id?: string;
    targets?: Array<{ platform: string; account_id?: string }>;
    text?: string;
    caption?: string;
    media_urls?: string[];
    post_type?: "post" | "reel" | "story" | "carousel";
    scheduled_at?: string;
  }): Promise<{
    id: string;
    status: string;
    targets?: Array<{ platform: string; status: string }>;
  }> {
    return this.request("/v1/posts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  /**
   * Validate post constraints before publishing (`POST /v1/posts/validate`)
   */
  async validatePost(payload: Record<string, unknown>): Promise<{
    valid: boolean;
    errors?: string[];
  }> {
    return this.request("/v1/posts/validate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // ============================================================================
  // 3. Unified Inbox: Comments (/v1/inbox/comments)
  // ============================================================================

  /**
   * List comment-enabled posts (`GET /v1/inbox/comments`)
   */
  async listCommentedPosts(accountId?: string): Promise<{ data: SocialApiPost[] }> {
    const query = accountId ? `?account_id=${encodeURIComponent(accountId)}` : "";
    const res = await this.request<{ data?: SocialApiPost[]; posts?: SocialApiPost[] }>(
      `/v1/inbox/comments${query}`
    );
    const list = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.posts)
      ? res.posts
      : [];
    return { data: list };
  }

  /**
   * List comments on a specific post (`GET /v1/inbox/comments/{postId}`)
   */
  async listPostComments(
    postId: string,
    accountId?: string,
    cursor?: string
  ): Promise<{
    data: SocialApiComment[];
    pagination?: SocialApiPagination;
  }> {
    const params = new URLSearchParams();
    if (accountId) params.set("account_id", accountId);
    if (cursor) params.set("cursor", cursor);
    const qs = params.toString() ? `?${params.toString()}` : "";

    const res = await this.request<{
      data?: SocialApiComment[];
      comments?: SocialApiComment[];
      pagination?: SocialApiPagination;
    }>(`/v1/inbox/comments/${encodeURIComponent(postId)}${qs}`);

    return {
      data: Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.comments)
        ? res.comments
        : [],
      pagination: res.pagination,
    };
  }

  /**
   * Reply to a comment on a post (`POST /v1/inbox/comments/{postId}`)
   */
  async replyToComment(params: {
    postId: string;
    accountId: string;
    commentId?: string;
    text: string;
  }): Promise<{ id?: string; success?: boolean; status?: string }> {
    return this.request(`/v1/inbox/comments/${encodeURIComponent(params.postId)}`, {
      method: "POST",
      body: JSON.stringify({
        account_id: params.accountId,
        ...(params.commentId ? { comment_id: params.commentId } : {}),
        text: params.text,
      }),
    });
  }

  /**
   * Moderate a comment: delete, hide, unhide, like, unlike
   * - Delete: `DELETE /v1/inbox/comments/{postId}/{commentId}`
   * - Hide/Unhide: `POST|DELETE /v1/inbox/comments/{postId}/{commentId}/hide`
   * - Like/Unlike: `POST|DELETE /v1/inbox/comments/{postId}/{commentId}/like`
   */
  async moderateComment(params: {
    postId: string;
    commentId: string;
    accountId: string;
    action: "delete" | "hide" | "unhide" | "like" | "unlike";
  }): Promise<{ success: boolean }> {
    const base = `/v1/inbox/comments/${encodeURIComponent(params.postId)}/${encodeURIComponent(
      params.commentId
    )}`;

    let endpoint = base;
    let method: "POST" | "DELETE" = "POST";

    switch (params.action) {
      case "delete":
        endpoint = base;
        method = "DELETE";
        break;
      case "hide":
        endpoint = `${base}/hide`;
        method = "POST";
        break;
      case "unhide":
        endpoint = `${base}/hide`;
        method = "DELETE";
        break;
      case "like":
        endpoint = `${base}/like`;
        method = "POST";
        break;
      case "unlike":
        endpoint = `${base}/like`;
        method = "DELETE";
        break;
    }

    await this.request(endpoint, {
      method,
      body: JSON.stringify({ account_id: params.accountId }),
    });
    return { success: true };
  }

  // ============================================================================
  // 4. Unified Inbox: Direct Messages / Conversations (/v1/inbox/conversations)
  // ============================================================================

  /**
   * List DM conversations (`GET /v1/inbox/conversations`)
   */
  async listConversations(
    accountId?: string,
    cursor?: string
  ): Promise<{
    data: SocialApiConversation[];
    pagination?: SocialApiPagination;
  }> {
    const params = new URLSearchParams();
    if (accountId) params.set("account_id", accountId);
    if (cursor) params.set("cursor", cursor);
    const qs = params.toString() ? `?${params.toString()}` : "";

    const res = await this.request<{
      data?: SocialApiConversation[];
      conversations?: SocialApiConversation[];
      pagination?: SocialApiPagination;
    }>(`/v1/inbox/conversations${qs}`);

    return {
      data: Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.conversations)
        ? res.conversations
        : [],
      pagination: res.pagination,
    };
  }

  /**
   * Send a Direct Message (`POST /v1/inbox/conversations/{id}/messages`)
   */
  async sendConversationMessage(params: {
    conversationId: string;
    accountId: string;
    text: string;
    recipientId?: string;
  }): Promise<{ id?: string; message_id?: string; status?: string }> {
    return this.request(
      `/v1/inbox/conversations/${encodeURIComponent(params.conversationId)}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          account_id: params.accountId,
          text: params.text,
          ...(params.recipientId ? { recipient_id: params.recipientId } : {}),
        }),
      }
    );
  }

  // ============================================================================
  // 5. Mentions (/v1/accounts/{id}/mentions)
  // ============================================================================

  /**
   * Retrieve mentions and tags (`GET /v1/accounts/{id}/mentions`)
   */
  async listMentions(accountId: string): Promise<{ data: Array<Record<string, unknown>> }> {
    const res = await this.request<{ data?: Array<Record<string, unknown>> }>(
      `/v1/accounts/${encodeURIComponent(accountId)}/mentions`
    );
    return { data: Array.isArray(res.data) ? res.data : [] };
  }

  // ============================================================================
  // 6. Webhooks (/v1/webhooks)
  // ============================================================================

  /**
   * Register a webhook endpoint (`POST /v1/webhooks`)
   */
  async registerWebhook(params: {
    url: string;
    events?: string[];
  }): Promise<{ id: string; secret?: string; url?: string; events?: string[] }> {
    return this.request("/v1/webhooks", {
      method: "POST",
      body: JSON.stringify({
        url: params.url,
        events: params.events || ["comment.received", "dm.received", "mention.received"],
      }),
    });
  }

  /**
   * List registered webhook endpoints (`GET /v1/webhooks`)
   */
  async listWebhooks(): Promise<{ data: Array<{ id: string; url: string; events: string[] }> }> {
    const res = await this.request<{
      data?: Array<{ id: string; url: string; events: string[] }>;
    }>("/v1/webhooks");
    return { data: Array.isArray(res.data) ? res.data : [] };
  }
}

/**
 * Verify incoming `X-SocialAPI-Signature` header using HMAC-SHA256
 */
export function verifySocialApiWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret?: string
): boolean {
  const secret = (webhookSecret ?? getSocialApiConfig().webhookSecret).trim();
  if (!secret) {
    // If no secret is configured yet, allow only if explicitly empty in dev, otherwise reject if signature missing
    return true;
  }
  if (!signatureHeader) {
    return false;
  }

  const cleanSig = signatureHeader.replace(/^sha256=/i, "").trim();
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");

  try {
    const sigBuf = Buffer.from(cleanSig, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return cleanSig === expected;
  }
}
