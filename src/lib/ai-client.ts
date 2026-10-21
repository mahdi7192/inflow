import { getDb, type AppSettingRow } from "@/lib/db";

export interface AiConfig {
  provider: "gemini" | "openai";
  apiKey: string;
  hasKey: boolean;
  model: string;
  baseUrl?: string;
}

export function getAiConfig(): AiConfig {
  const db = getDb();
  let provider = (process.env.AI_PROVIDER || "openai").toLowerCase() as "gemini" | "openai";
  let apiKey =
    process.env.AI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    "";
  let model = process.env.AI_MODEL || "";
  let baseUrl = process.env.AI_BASE_URL || "";

  try {
    const rows = db
      .prepare(
        "SELECT key, value FROM app_settings WHERE key IN ('ai_provider', 'ai_api_key', 'ai_model', 'ai_base_url')"
      )
      .all() as AppSettingRow[];

    for (const r of rows) {
      if (r.key === "ai_provider" && r.value) {
        provider = r.value.toLowerCase() as "gemini" | "openai";
      } else if (r.key === "ai_api_key" && r.value) {
        apiKey = r.value;
      } else if (r.key === "ai_model" && r.value) {
        model = r.value;
      } else if (r.key === "ai_base_url" && r.value) {
        baseUrl = r.value;
      }
    }
  } catch (err) {
    console.error("[AiClient] Error reading app_settings:", err);
  }

  // Default to local 9Router gateway if using openai provider without explicit url
  if (!baseUrl && provider === "openai") {
    baseUrl = "http://127.0.0.1:20128/v1";
  }

  if (!model) {
    model = provider === "gemini" ? "gemini-1.5-flash" : "ag/gemini-3.8-flash";
  }

  return {
    provider,
    apiKey,
    hasKey: Boolean(apiKey && apiKey.length > 5),
    model,
    baseUrl,
  };
}

export function saveAiConfig(params: {
  provider: "gemini" | "openai";
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}): void {
  const db = getDb();
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);

  const upsert = db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);

  db.transaction(() => {
    upsert.run("ai_provider", params.provider, now);
    if (params.apiKey !== undefined && params.apiKey.trim().length > 0) {
      upsert.run("ai_api_key", params.apiKey.trim(), now);
    }
    if (params.model !== undefined && params.model.trim().length > 0) {
      upsert.run("ai_model", params.model.trim(), now);
    }
    if (params.baseUrl !== undefined && params.baseUrl.trim().length > 0) {
      upsert.run("ai_base_url", params.baseUrl.trim(), now);
    }
  })();
}

export async function testAiConnection(params: {
  provider: "gemini" | "openai";
  apiKey: string;
  model?: string;
  baseUrl?: string;
}): Promise<{ success: boolean; message: string }> {
  const { provider, apiKey, model, baseUrl } = params;
  const timeoutMs = 6000;

  if (!apiKey || apiKey.trim().length < 8) {
    return { success: false, message: "کلید API نامعتبر است (طول کلید بسیار کوتاه است)." };
  }

  const selectedModel =
    model || (provider === "gemini" ? "gemini-1.5-flash" : "ag/gemini-3.8-flash");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (provider === "gemini") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Ping test. Respond with OK." }] }],
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return {
          success: false,
          message: errData.error?.message || `خطای Gemini API (کد ${res.status})`,
        };
      }
      return { success: true, message: "اتصال به Gemini با موفقیت برقرار شد." };
    } else {
      const base = (baseUrl || process.env.AI_BASE_URL || "http://127.0.0.1:20128/v1").replace(/\/+$/, "");
      const url = `${base}/chat/completions`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: "user", content: "Ping test. Respond with OK." }],
          max_tokens: 5,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return {
          success: false,
          message: errData.error?.message || `خطای OpenAI API (کد ${res.status})`,
        };
      }
      return { success: true, message: "اتصال به مدل هوش مصنوعی با موفقیت برقرار شد." };
    }
  } catch (err: unknown) {
    if ((err as Error).name === "AbortError") {
      return { success: false, message: "مهلت زمانی اتصال به هوش مصنوعی (۶ ثانیه) پایان یافت." };
    }
    return { success: false, message: (err as Error).message || "خطا در اتصال به API" };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Direct LLM Completion Helper (8s hard timeout)
 */
async function callLlmCompletion(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const config = getAiConfig();
  if (!config.hasKey) {
    console.warn("[AiClient] No AI API key configured.");
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    if (config.provider === "gemini") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 350,
          },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        console.error(`[AiClient] Gemini returned HTTP ${res.status}`);
        return null;
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return typeof text === "string" ? text.trim() : null;
    } else {
      const base = (config.baseUrl || "http://127.0.0.1:20128/v1").replace(/\/+$/, "");
      const url = `${base}/chat/completions`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model || "ag/gemini-3.8-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.4,
          max_tokens: 350,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        console.error(`[AiClient] LLM API returned HTTP ${res.status}: ${errBody.slice(0, 150)}`);
        return null;
      }
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      return typeof text === "string" ? text.trim() : null;
    }
  } catch (err: unknown) {
    console.error("[AiClient] LLM call error:", (err as Error).message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Evaluate whether an incoming comment or DM matches an `ai_context` rule
 */
export async function evaluateTriggerWithAi(params: {
  caption: string;
  commentText: string;
  triggerContext: string;
}): Promise<boolean> {
  const sys =
    "You are an Instagram intent classifier. Respond ONLY with 'YES' if the user message matches the trigger condition, or 'NO' if it does not.";
  const usr = `Post Caption: ${params.caption || "N/A"}\nTrigger Condition: ${params.triggerContext}\nIncoming User Text: ${params.commentText}\n\nDoes this message match the trigger condition? Answer YES or NO:`;

  const result = await callLlmCompletion(sys, usr);
  if (!result) {
    // Fallback if AI key not configured or timed out: match non-empty text
    return params.commentText.trim().length > 0;
  }
  return result.toUpperCase().includes("YES");
}

export interface GenerateReplyParams {
  caption: string;
  username: string;
  incomingText: string;
  instructions: string;
  fallbackText: string;
  mode?: "comment" | "dm";
}

/**
 * Generate a contextual Persian/multilingual reply for a comment or DM using AI instructions.
 * Carefully injects commenter username, incoming comment text, post caption, and admin instructions.
 */
export async function generateContextualReplyWithAi(params: GenerateReplyParams): Promise<string> {
  const isDm = params.mode === "dm";
  const userHandle = params.username ? `@${params.username.replace(/^@/, "")}` : "کاربر";

  let sys: string;
  let usr: string;

  if (isDm) {
    sys = `شما دستیار هوشمند و رسمی پیج اینستاگرام هستید.
وظیفه شما این است که یک پیام خصوصی در دایرکت به کاربری که زیر پست اینستاگرام کامنت گذاشته، ارسال کنید.
قوانین الزامی:
۱. نام کاربری مخاطب در اینستاگرام ${userHandle} است؛ در شروع پیام با سلام محترمانه و لحن دوستانه و طبیعی به زبان فارسی خطابش قرار دهید.
۲. با توجه به متنی که کاربر در کامنت گذاشته و موضوع پست، دقیقاً به سوال یا نیاز او پاسخ بدهید یا راهنمایی لازم را ارائه کنید.
۳. دستورالعمل ادمین پیج را کاملاً در پیام لحاظ کنید.
۴. پیام باید روان، خوانا، بدون زیاده‌گویی و کاملاً آماده ارسال باشد.
۵. خروجی فقط و فقط متن نهایی پیام دایرکت باشد؛ بدون هیچ توضیح اضافی، بدون پیشوند و بدون گیومه.`;

    usr = `[مشخصات پست اینستاگرام]
کپشن و موضوع پست: ${params.caption || "ندارد"}

[مشخصات کاربر و کامنت دریافتی]
نام کاربری مخاطب: ${userHandle}
متن کامنتی که کاربر در پست گذاشته بود: "${params.incomingText}"

[دستورالعمل ادمین برای متن دایرکت]
${params.instructions || "سلام کن و بر اساس کامنت کاربر، راهنمایی کامل و صمیمی در دایرکت ارائه بده."}

متن پیام دایرکت:`;
  } else {
    sys = `شما ادمین حرفه‌ای و صمیمی یک پیج اینستاگرام هستید.
وظیفه شما ثبت یک پاسخ عمومی کوتاه، جذاب و محترمانه زیر کامنت کاربر در پست اینستاگرام است.
قوانین الزامی:
۱. نام کاربری مخاطب ${userHandle} است. می‌توانید او را منشن کنید یا با لحنی صمیمی پاسخش را بدهید.
۲. پاسخ شما باید ۱ تا ۲ جمله کوتاه، فارسی، پرانرژی و متناسب با متن کامنت کاربر باشد.
۳. دستورالعمل ادمین پیج را دقیقاً رعایت کنید.
۴. خروجی فقط و فقط متن نهایی پاسخ کامنت باشد؛ بدون هیچ توضیح اضافی، بدون پیشوند و بدون گیومه.`;

    usr = `[مشخصات پست اینستاگرام]
کپشن و موضوع پست: ${params.caption || "ندارد"}

[مشخصات کاربر و کامنت دریافتی]
نام کاربری مخاطب: ${userHandle}
متن کامنت کاربر: "${params.incomingText}"

[دستورالعمل ادمین برای پاسخ کامنت]
${params.instructions || "یک پاسخ کوتاه، محترمانه و پرانرژی بنویس و از همراهی او تشکر کن."}

متن پاسخ کامنت:`;
  }

  const generated = await callLlmCompletion(sys, usr);
  if (generated && generated.length > 0) {
    return generated.replace(/^["'«]+|["'»]+$/g, "").trim();
  }

  return params.fallbackText || (isDm ? "سلام! در خدمت شما هستیم 🙏" : "پاسخ خدمتتان ارسال شد 🙏");
}

