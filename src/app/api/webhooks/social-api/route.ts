import { NextRequest, NextResponse } from "next/server";
import { ingestWebhookPayload } from "@/lib/instagram/aggregator";

/**
 * Instagram Webhook Receiver (via `InstagramEventAggregator` & `IInstagramProvider`)
 * Supports `comment.received`, `dm.received`, `dm.postback`, `mention.received`
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

    const result = await ingestWebhookPayload(rawBody, {
      signature,
      timestamp,
    });

    if (!result.authorized) {
      return NextResponse.json(
        { success: false, error: "Invalid X-SocialAPI-Signature" },
        { status: 401 }
      );
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: (err as Error).message || "Webhook processing error",
      },
      { status: 500 }
    );
  }
}
