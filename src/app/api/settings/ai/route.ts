import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-guard";
import { getAiConfig, saveAiConfig, testAiConnection } from "@/lib/ai-client";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "superadmin") {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const config = getAiConfig();
  // Return masked key for security
  const maskedKey = config.apiKey
    ? config.apiKey.slice(0, 4) + "..." + config.apiKey.slice(-4)
    : "";

  return NextResponse.json({
    success: true,
    provider: config.provider,
    model: config.model,
    hasKey: config.hasKey,
    maskedKey,
  });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "superadmin") {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action, provider, apiKey, model } = body;

    if (action === "test") {
      const activeKey =
        apiKey && apiKey.trim().length > 0 ? apiKey : getAiConfig().apiKey;
      const result = await testAiConnection({
        provider: provider || "gemini",
        apiKey: activeKey,
        model,
      });
      return NextResponse.json(result);
    }

    if (action === "save") {
      if (!provider || !["gemini", "openai"].includes(provider)) {
        return NextResponse.json(
          { success: false, error: "سرویس‌دهنده هوش مصنوعی نامعتبر است" },
          { status: 400 }
        );
      }

      saveAiConfig({
        provider,
        apiKey: apiKey?.trim() || undefined,
        model: model?.trim() || undefined,
      });

      return NextResponse.json({
        success: true,
        message: "تنظیمات هوش مصنوعی با موفقیت ذخیره شد",
      });
    }

    return NextResponse.json({ success: false, error: "عملیات نامعتبر" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message || "خطا در پردازش درخواست" },
      { status: 500 }
    );
  }
}
