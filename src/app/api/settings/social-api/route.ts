import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth-guard";
import { getSocialApiConfig, saveSocialApiConfig } from "@/lib/db";
import { SocialApiClient, SocialApiError } from "@/lib/social-api";

export async function GET() {
  try {
    const auth = await requireSuperadmin();
    if (auth.errorResponse) return auth.errorResponse;

    const config = getSocialApiConfig();
    const maskedKey =
      config.hasKey && config.apiKey.length >= 10
        ? `${config.apiKey.slice(0, 9)}...${config.apiKey.slice(-4)}`
        : "";

    const maskedWebhookSecret =
      config.webhookSecret && config.webhookSecret.length >= 8
        ? `${config.webhookSecret.slice(0, 6)}...${config.webhookSecret.slice(-4)}`
        : "";

    return NextResponse.json({
      success: true,
      hasKey: config.hasKey,
      maskedKey,
      baseUrl: config.baseUrl,
      hasWebhookSecret: Boolean(config.webhookSecret),
      maskedWebhookSecret,
      webhookId: config.webhookId,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSuperadmin();
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const action = String(body.action || "save");
    const current = getSocialApiConfig();

    const apiKey = body.apiKey ? String(body.apiKey).trim() : current.apiKey;
    const baseUrl = body.baseUrl ? String(body.baseUrl).trim() : current.baseUrl;
    const webhookSecret =
      body.webhookSecret !== undefined
        ? String(body.webhookSecret).trim()
        : current.webhookSecret;

    if (action === "test") {
      const client = new SocialApiClient(apiKey, baseUrl);
      try {
        const res = await client.listAccounts("instagram");
        return NextResponse.json({
          success: true,
          message: `اتصال به SocialAPI.ai برقرار است (${res.count} اکانت اینستاگرام متصل یافت شد).`,
          accountsCount: res.count,
          accounts: res.data,
        });
      } catch (err: unknown) {
        const msg =
          err instanceof SocialApiError
            ? err.message
            : (err as Error).message || "خطا در تست اتصال به SocialAPI.ai";
        return NextResponse.json({ success: false, message: msg }, { status: 400 });
      }
    }

    if (action === "register_webhook") {
      const webhookUrl = String(body.webhookUrl || "").trim();
      if (!webhookUrl) {
        return NextResponse.json(
          { success: false, message: "آدرس URL وب‌هوک الزامی است." },
          { status: 400 }
        );
      }

      const client = new SocialApiClient(apiKey, baseUrl);
      try {
        const reg = await client.registerWebhook({
          url: webhookUrl,
          events: ["comment.received", "dm.received", "mention.received"],
        });

        saveSocialApiConfig({
          apiKey: body.apiKey ? apiKey : undefined,
          baseUrl,
          webhookId: reg.id || "",
          webhookSecret: reg.secret || webhookSecret,
        });

        return NextResponse.json({
          success: true,
          message: "وب‌هوک رسمی SocialAPI.ai با موفقیت ثبت و کلید امضا ذخیره شد.",
          webhookId: reg.id,
          hasWebhookSecret: Boolean(reg.secret || webhookSecret),
        });
      } catch (err: unknown) {
        return NextResponse.json(
          {
            success: false,
            message:
              err instanceof SocialApiError
                ? err.message
                : (err as Error).message || "خطا در ثبت وب‌هوک",
          },
          { status: 400 }
        );
      }
    }

    // Default: save
    saveSocialApiConfig({
      apiKey: body.apiKey ? apiKey : undefined,
      baseUrl,
      webhookSecret: body.webhookSecret !== undefined ? webhookSecret : undefined,
    });

    return NextResponse.json({
      success: true,
      message: "تنظیمات SocialAPI.ai با موفقیت ذخیره شد.",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
