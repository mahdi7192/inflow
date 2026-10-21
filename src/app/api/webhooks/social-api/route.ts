import { NextRequest, NextResponse } from "next/server";
import { verifySocialApiWebhookSignature } from "@/lib/social-api";
import {
  processIncomingComment,
  processIncomingDm,
} from "@/lib/instagram-automation";
import { logBotActivity, getDb, type AccountRow } from "@/lib/db";

/**
 * SocialAPI.ai Signed Webhook Receiver
 * Events: `comment.received`, `dm.received`, `mention.received`
 * Signature Header: `X-SocialAPI-Signature`
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get("x-socialapi-signature-v2") ||
      req.headers.get("x-socialapi-signature") ||
      req.headers.get("X-SocialAPI-Signature");
    const timestamp =
      req.headers.get("x-socialapi-timestamp") ||
      req.headers.get("X-SocialAPI-Timestamp");

    if (!verifySocialApiWebhookSignature(rawBody, signature, timestamp)) {
      return NextResponse.json(
        { success: false, error: "Invalid X-SocialAPI-Signature" },
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody || "{}") as Record<string, unknown>;
    const eventType = String(payload.event || payload.type || "");
    const socialAccountId = String(
      payload.account_id ||
        (payload.data as Record<string, unknown>)?.account_id ||
        ""
    );
    const data = (payload.data as Record<string, unknown>) || payload;
    const rawPayload = (payload.raw_payload as Record<string, unknown>) || {};
    const rawValue = (rawPayload.value as Record<string, unknown>) || {};
    const rawFrom = (rawValue.from as Record<string, unknown>) || {};
    const rawMedia = (rawValue.media as Record<string, unknown>) || {};
    const author = (data.author as Record<string, unknown>) || {};
    const content = (data.content as Record<string, unknown>) || {};

    // 1. Handle `comment.received`
    if (eventType === "comment.received") {
      const commentId = String(data.id || rawValue.id || data.comment_id || "");
      const postId = String(
        data.platform_post_id ||
          rawMedia.id ||
          data.post_id ||
          data.media_id ||
          ""
      );
      const commenterUsername = String(
        author.name ||
          rawFrom.username ||
          data.username ||
          data.author_username ||
          data.participant_name ||
          "user"
      );
      const commenterUserId = String(
        author.id ||
          rawFrom.id ||
          data.user_id ||
          data.author_id ||
          ""
      );
      const commentText = String(
        content.text ||
          rawValue.text ||
          data.text ||
          data.comment_text ||
          ""
      );

      const result = await processIncomingComment({
        commentId,
        postId,
        shortcode: data.shortcode ? String(data.shortcode) : undefined,
        socialAccountId: socialAccountId || undefined,
        accountUsername: data.account_username
          ? String(data.account_username)
          : undefined,
        commenterUsername,
        commenterUserId,
        commentText,
        conversationId: data.conversation_id
          ? String(data.conversation_id)
          : undefined,
      });

      return NextResponse.json({
        received: true,
        event: eventType,
        ...result,
      });
    }

    // 2. Handle `dm.received` and `dm.postback` (buttons / quick replies)
    if (eventType === "dm.received" || eventType === "dm.postback") {
      const sender = (data.sender as Record<string, unknown>) || {};
      const payloadStr = String(
        (content.metadata as Record<string, unknown>)?.payload ||
        content.payload ||
        data.payload ||
        ""
      );
      const textStr = String(content.text || data.text || data.message || "");
      const incomingText = payloadStr || textStr;

      const result = await processIncomingDm({
        messageId: String(data.id || data.message_id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
        conversationId: String(
          data.conversation_id || data.thread_id || data.id || ""
        ),
        socialAccountId: socialAccountId || undefined,
        accountUsername: data.account_username
          ? String(data.account_username)
          : undefined,
        senderUsername: String(
          sender.name ||
            data.sender_username ||
            data.participant_name ||
            data.username ||
            "user"
        ),
        senderId: String(sender.id || data.sender_id || data.participant_id || ""),
        incomingText,
        payload: payloadStr || undefined,
        isStoryReply: Boolean(data.is_story_reply),
        storyId: data.story_id ? String(data.story_id) : null,
        storyContent: data.story_content ? String(data.story_content) : null,
      });

      return NextResponse.json({
        received: true,
        event: eventType,
        ...result,
      });
    }

    // 3. Handle `mention.received`
    if (eventType === "mention.received") {
      const db = getDb();
      const acc = socialAccountId
        ? (db
            .prepare("SELECT * FROM accounts WHERE social_account_id = ?")
            .get(socialAccountId) as AccountRow | undefined)
        : undefined;

      if (acc) {
        logBotActivity(
          acc.username,
          "trigger_match",
          `منشن جدید از @${String(data.username || "user")}`,
          String(data.text || "منشن در پست یا استوری"),
          data
        );
      }

      return NextResponse.json({
        received: true,
        event: eventType,
        processed: true,
      });
    }

    return NextResponse.json({
      received: true,
      event: eventType,
      processed: false,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message || "Webhook processing error" },
      { status: 500 }
    );
  }
}
