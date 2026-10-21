import {
  getDb,
  getAppLanguage,
  type AppSettingRow,
  type DmHistoryExchange,
} from "@/lib/db";

export interface AiConfig {
  provider: "gemini" | "openai";
  apiKey: string;
  hasKey: boolean;
  model: string;
  baseUrl?: string;
}

export interface ChatTurnMessage {
  role: "user" | "assistant";
  content: string;
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
 * Direct LLM Completion Helper (10s timeout) with optional multi-turn chat history
 */
async function callLlmCompletion(
  systemPrompt: string,
  userPrompt: string,
  historyMessages: ChatTurnMessage[] = []
): Promise<string | null> {
  const config = getAiConfig();
  if (!config.hasKey) {
    console.warn("[AiClient] No AI API key configured.");
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    if (config.provider === "gemini") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
      const contents = [
        ...historyMessages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
        },
      ];

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 450,
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
      const messages = [
        { role: "system", content: systemPrompt },
        ...historyMessages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userPrompt },
      ];

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model || "ag/gemini-3.8-flash",
          messages,
          temperature: 0.4,
          max_tokens: 450,
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

export interface EvaluateTriggerParams {
  caption?: string;
  postCaption?: string;
  commentText?: string;
  incomingText?: string;
  triggerContext?: string;
  triggerCondition?: string;
  username?: string;
  userFullName?: string;
  appLanguage?: "fa" | "en" | "ar";
}

/**
 * Evaluate whether an incoming comment or DM matches an `ai_context` concept rule via 9Router/LLM.
 */
export async function evaluateTriggerWithAi(params: EvaluateTriggerParams): Promise<boolean> {
  const caption = params.postCaption ?? params.caption ?? "";
  const incomingText = (params.incomingText ?? params.commentText ?? "").trim();
  const triggerCondition = (params.triggerCondition ?? params.triggerContext ?? "").trim();

  if (!incomingText) return false;
  if (!triggerCondition) return true;

  const langLabel =
    params.appLanguage === "en"
      ? "English"
      : params.appLanguage === "ar"
      ? "Arabic"
      : "Persian (Farsi)";

  const sys = `You are a high-precision Instagram intent classifier for an automation engine (Panel language: ${langLabel}).
Determine whether the user's incoming message or comment semantically matches the admin's Trigger Concept / Condition.
Respond ONLY with 'YES' if it matches the concept, or 'NO' if it does not.`;

  const usr = [
    `Post Caption / Page Context: ${caption || "N/A"}`,
    params.userFullName || params.username
      ? `Sender Info: ${params.userFullName || ""} (@${(params.username || "").replace(/^@/, "")})`
      : "",
    `Admin Trigger Concept / Condition: ${triggerCondition}`,
    `Incoming User Trigger Text: "${incomingText}"`,
    "",
    "Does this incoming text match the trigger condition? Answer YES or NO:",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await callLlmCompletion(sys, usr);
  if (!result) {
    return incomingText.length > 0;
  }
  const normalized = result.trim().toUpperCase();
  if (normalized.startsWith("NO") || normalized === "خیر") return false;
  return normalized.includes("YES") || normalized.includes("بله");
}

export interface GenerateReplyParams {
  mode?: "comment" | "dm" | "comment_dm" | "dm_chat";
  accountUsername?: string;
  caption?: string;
  postCaption?: string;
  username: string;
  userFullName?: string;
  followerCount?: number;
  isFollowing?: boolean;
  appLanguage?: "fa" | "en" | "ar";
  incomingText: string;
  instructions: string;
  fallbackText?: string;
  conversationHistory?: DmHistoryExchange[];
}

function resolveUserAddressing(username?: string, userFullName?: string): {
  cleanUsername: string;
  cleanFullName: string;
  displayLabel: string;
  hasRealIdentity: boolean;
} {
  const rawUser = (username || "").replace(/^@/, "").trim();
  const isGenericUser =
    !rawUser ||
    rawUser.toLowerCase() === "user" ||
    rawUser.toLowerCase() === "instagram_user" ||
    rawUser.startsWith("ig_");

  const cleanUsername = isGenericUser ? "" : rawUser;
  const rawName = (userFullName || "").trim();
  const isGenericName =
    !rawName ||
    rawName.toLowerCase() === "user" ||
    rawName.toLowerCase() === "instagram_user" ||
    rawName.startsWith("ig_");
  const cleanFullName = isGenericName ? "" : rawName;

  if (cleanFullName && cleanUsername && cleanFullName.toLowerCase() !== cleanUsername.toLowerCase()) {
    return {
      cleanUsername,
      cleanFullName,
      displayLabel: `${cleanFullName} (@${cleanUsername})`,
      hasRealIdentity: true,
    };
  }
  if (cleanFullName) {
    return {
      cleanUsername,
      cleanFullName,
      displayLabel: cleanFullName,
      hasRealIdentity: true,
    };
  }
  if (cleanUsername) {
    return {
      cleanUsername,
      cleanFullName: "",
      displayLabel: `@${cleanUsername}`,
      hasRealIdentity: true,
    };
  }
  return {
    cleanUsername: "",
    cleanFullName: "",
    displayLabel: "کاربر گرامی",
    hasRealIdentity: false,
  };
}

function getLanguageDirective(lang: "fa" | "en" | "ar"): string {
  if (lang === "en") {
    return "زبان پنل برنامه: انگلیسی (English). مگر اینکه در دستورالعمل ادمین یا پیام کاربر صراحتاً زبان دیگری خواسته شده باشد، به زبان انگلیسی طبیعی پاسخ دهید.";
  }
  if (lang === "ar") {
    return "زبان پنل برنامه: عربی (العربية). مگر اینکه در دستورالعمل ادمین یا پیام کاربر صراحتاً زبان دیگری خواسته شده باشد، به زبان عربی طبیعی پاسخ دهید.";
  }
  return "زبان پنل برنامه: فارسی (fa). پاسخ را به زبان فارسی روان، طبیعی و محترمانه بنویسید (مگر اینکه در دستورالعمل ادمین زبان دیگری خواسته شده باشد).";
}

/**
 * Generate a contextual reply for a Comment, Comment-triggered Private Reply, or Direct Message Chat.
 * Injects:
 * 1. Admin's instructions from panel config (`instructions`)
 * 2. Triggered user's profile info (`userFullName`, `username`, `followerCount`, `isFollowing`)
 * 3. Active application language from panel (`appLanguage`)
 * 4. User's incoming trigger text (`incomingText`)
 * 5. Multi-turn Conversation History (`conversationHistory`) for DM AI chats so it never repeats greetings!
 */
export async function generateContextualReplyWithAi(params: GenerateReplyParams): Promise<string> {
  const caption = params.postCaption ?? params.caption ?? "";
  const appLang = params.appLanguage || getAppLanguage(params.accountUsername);
  const langDirective = getLanguageDirective(appLang);
  const identity = resolveUserAddressing(params.username, params.userFullName);

  const history = params.conversationHistory || [];
  const hasPriorHistory = history.length > 0;

  const resolvedMode: "comment" | "comment_dm" | "dm_chat" =
    params.mode === "comment"
      ? "comment"
      : params.mode === "comment_dm"
      ? "comment_dm"
      : params.mode === "dm_chat"
      ? "dm_chat"
      : hasPriorHistory
      ? "dm_chat"
      : "comment_dm";

  const userMetadataLines = [
    `- نام نمایشی کاربر: ${identity.cleanFullName || "نامشخص"}`,
    `- نام کاربری اینستاگرام: ${identity.cleanUsername ? `@${identity.cleanUsername}` : "نامشخص"}`,
    params.followerCount !== undefined ? `- تعداد دنبال‌کنندگان کاربر: ${params.followerCount}` : "",
    params.isFollowing !== undefined
      ? `- وضعیت فالو پیج: ${params.isFollowing ? "فالو کرده است" : "هنوز فالو نکرده است"}`
      : "",
    `- زبان انتخاب‌شده در پنل برنامه: ${appLang === "fa" ? "فارسی (fa)" : appLang === "en" ? "انگلیسی (en)" : "عربی (ar)"}`,
  ]
    .filter(Boolean)
    .join("\n");

  let sys: string;
  let usr: string;
  const chatHistoryMessages: ChatTurnMessage[] = [];

  if (resolvedMode === "comment") {
    sys = `شما ادمین حرفه‌ای و هوشمند پیج اینستاگرام ${params.accountUsername ? `@${params.accountUsername}` : ""} هستید.
وظیفه شما نوشتن یک پاسخ عمومی کوتاه، صمیمی و دقیق زیر کامنت کاربر در پست اینستاگرام است.
${langDirective}
قوانین الزامی:
۱. اطلاعات کاربر تریگرشده، متن کامنت ارسالی او و دستورالعمل ادمین در پنل را دقیقاً در نظر بگیرید.
${
  identity.hasRealIdentity
    ? `۲. نام مخاطب «${identity.cleanFullName || identity.cleanUsername}» است؛ در صورت تناسب می‌توانید از نامش به شکل طبیعی استفاده کنید (هرگز از عبارت مصنوعی @user استفاده نکنید).`
    : `۲. نام دقیق کاربر مشخص نیست؛ هرگز از عبارت @user استفاده نکنید.`
}
۳. پاسخ باید ۱ تا ۲ جمله کوتاه، طبیعی و کاملاً منطبق با دستورالعمل ادمین باشد.
۴. خروجی فقط و فقط متن نهایی پاسخ کامنت باشد؛ بدون هیچ توضیح اضافه و بدون گیومه.`;

    usr = `[اطلاعات پست]
کپشن پست: ${caption || "ندارد"}

[اطلاعات کاربر تریگر شده]
${userMetadataLines}

[متن تریگر ارسالی توسط کاربر (کامنت)]
"${params.incomingText}"

[دستورالعمل ادمین در کانفیگ پنل]
${params.instructions || "یک پاسخ کوتاه، صمیمی و محترمانه متناسب با کامنت کاربر بنویس."}

متن نهایی پاسخ کامنت:`;
  } else if (resolvedMode === "comment_dm") {
    sys = `شما دستیار هوشمند پیج اینستاگرام ${params.accountUsername ? `@${params.accountUsername}` : ""} هستید.
وظیفه شما ارسال یک پیام خصوصی (دایرکت) به کاربری است که زیر پست اینستاگرام کامنت گذاشته است.
${langDirective}
قوانین الزامی:
۱. دستورالعمل ادمین در کانفیگ پنل را با دقت کامل اجرا کنید.
${
  identity.cleanFullName
    ? `۲. نام کاربر «${identity.cleanFullName}»${identity.cleanUsername ? ` (یوزرنیم: @${identity.cleanUsername})` : ""} است؛ در ابتدای پیام با نام خودش («${identity.cleanFullName} عزیز») محترمانه و صمیمی خطابش قرار دهید.`
    : identity.cleanUsername
    ? `۲. نام کاربری مخاطب @${identity.cleanUsername} است؛ با لحنی صمیمی و محترمانه خطابش قرار دهید.`
    : `۲. در ابتدای پیام بدون استفاده از کلمه @user، سلام و احوال‌پرسی صمیمی داشته باشید.`
}
۳. به متن کامنت ارسالی کاربر و موضوع پست توجه کنید تا پیام کاملاً شخصی‌سازی‌شده و مرتبط باشد.
۴. خروجی فقط و فقط متن نهایی پیام دایرکت باشد؛ بدون توضیح اضافه و بدون گیومه.`;

    usr = `[اطلاعات پست اینستاگرام]
کپشن پست: ${caption || "ندارد"}

[اطلاعات کاربر تریگر شده]
${userMetadataLines}

[متن تریگر ارسالی توسط کاربر (کامنت زیر پست)]
"${params.incomingText}"

[دستورالعمل ادمین در کانفیگ پنل]
${params.instructions || "بر اساس کامنت کاربر و موضوع پست، راهنمایی کامل و محترمانه در دایرکت ارائه بده."}

متن نهایی پیام دایرکت:`;
  } else {
    for (const turn of history.slice(-8)) {
      if (turn.incomingText?.trim()) {
        chatHistoryMessages.push({
          role: "user",
          content: turn.incomingText.trim(),
        });
      }
      if (turn.replyText?.trim()) {
        chatHistoryMessages.push({
          role: "assistant",
          content: turn.replyText.trim(),
        });
      }
    }

    const historyTranscript =
      history.length > 0
        ? history
            .slice(-8)
            .map(
              (h, idx) =>
                `[${idx + 1}] کاربر: ${h.incomingText}\n    شما (ادمین): ${h.replyText}`
            )
            .join("\n")
        : "این اولین پیام کاربر در این گفتگو است (سابقه‌ای وجود ندارد).";

    const greetingRule = hasPriorHistory
      ? `۲. قانون حیاتی تداوم گفتگو (بسیار مهم): این پیام در ادامه یک گفتگوی قبلی است و شما در پیام‌های قبلی به کاربر سلام کرده‌اید. **اکیداً ممنوع است که دوباره سلام، وقت‌بخیر، روزبخیر یا احوال‌پرسی تکراری در شروع پیام بنویسید!** مستقیماً و طبیعی در ادامه مکالمه قبلی به پیام جدید کاربر پاسخ دهید.`
      : identity.cleanFullName
      ? `۲. این اولین پیام گفتگو است؛ نام کاربر «${identity.cleanFullName}» است و می‌توانید در شروع گفتگو با نام خودش صمیمانه سلام کنید (هرگز از @user استفاده نکنید).`
      : identity.cleanUsername
      ? `۲. این اولین پیام گفتگو است؛ نام کاربری مخاطب ${identity.cleanUsername} است و می‌توانید در شروع گفتگو صمیمانه سلام کنید (هرگز از @user استفاده نکنید).`
      : `۲. این اولین پیام گفتگو است؛ با لحنی صمیمی سلام کنید و هرگز از عبارت @user استفاده نکنید.`;

    sys = `شما دستیار هوشمند پاسخگویی دایرکت پیج اینستاگرام ${params.accountUsername ? `@${params.accountUsername}` : ""} هستید و در حال چت با کاربر در دایرکت می‌باشید.
${langDirective}
قوانین الزامی:
۱. دستورالعمل ادمین در کانفیگ پنل را به صورت کامل رعایت کنید.
${greetingRule}
۳. به کانتکست و تاریخچه پیام‌های قبلی گفتگو کاملاً توجه کنید تا پاسخ شما منسجم، هوشمندانه و در ادامه بحث قبلی باشد.
۴. هرگز از عبارت مصنوعی @user استفاده نکنید.
۵. خروجی فقط و فقط متن نهایی پاسخ شما به آخرین پیام کاربر باشد؛ بدون پیشوند، بدون توضیح اضافه و بدون گیومه.`;

    usr = `[زمینه پیج / استوری]
${caption || "گفتگوی مستقیم در دایرکت اینستاگرام"}

[اطلاعات کاربر تریگر شده]
${userMetadataLines}

[دستورالعمل ادمین در کانفیگ پنل]
${params.instructions || "به عنوان ادمین پیج با لحنی محترمانه، طبیعی و مفید پاسخ کاربر را بده."}

[تاریخچه گفتگوی قبلی با این کاربر]
${historyTranscript}

[آخرین پیام ارسالی کاربر که الان باید به آن پاسخ دهید]
"${params.incomingText}"

${
  hasPriorHistory
    ? "پاسخ مستقیم شما در ادامه گفتگو (بدون سلام و احوال‌پرسی مجدد):"
    : "پاسخ شما به کاربر:"
}`;
  }

  const generated = await callLlmCompletion(sys, usr, chatHistoryMessages);
  if (generated && generated.length > 0) {
    return generated
      .replace(/^["'«]+|["'»]+$/g, "")
      .replace(/@user\b/gi, identity.cleanFullName || identity.cleanUsername || "دوست")
      .trim();
  }

  return (
    params.fallbackText ||
    (resolvedMode === "comment"
      ? "ممنون از همراهی شما 🙏"
      : hasPriorHistory
      ? "در خدمتتان هستم، لطفاً بفرمایید 🙏"
      : "سلام! در خدمت شما هستیم 🙏")
  );
}

