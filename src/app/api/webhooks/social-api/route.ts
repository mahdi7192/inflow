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
      req.headers.get("x-socialapi-signature") ||
      req.headers.get("X-SocialAPI-Signature");

    if (!verifySocialApiWebhookSignature(rawBody, signature)) {
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

    // 1. Handle `comment.received`
    if (eventType === "comment.received") {
      const result = await processIncomingComment({
        commentId: String(data.id || data.comment_id || ""),
        postId: String(data.post_id || data.media_id || ""),
        shortcode: data.shortcode ? String(data.shortcode) : undefined,
        socialAccountId: socialAccountId || undefined,
        accountUsername: data.account_username
          ? String(data.account_username)
          : undefined,
        commenterUsername: String(
          data.username || data.author_username || data.participant_name || "user"
        ),
        commenterUserId: String(data.user_id || data.author_id || ""),
        commentText: String(data.text || data.comment_text || ""),
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

    // 2. Handle `dm.received`
    if (eventType === "dm.received") {
      const result = await processIncomingDm({
        messageId: String(data.id || data.message_id || ""),
        conversationId: String(
          data.conversation_id || data.thread_id || data.id || ""
        ),
        socialAccountId: socialAccountId || undefined,
        accountUsername: data.account_username
          ? String(data.account_username)
          : undefined,
        senderUsername: String(
          data.sender_username || data.participant_name || data.username || "user"
        ),
        senderId: String(data.sender_id || data.participant_id || ""),
        incomingText: String(data.text || data.message || ""),
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
