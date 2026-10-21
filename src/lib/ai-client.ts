import { getDb, type AppSettingRow } from "@/lib/db";

export interface AiConfig {
  provider: "gemini" | "openai";
  apiKey: string;
  hasKey: boolean;
  model: string;
}

export function getAiConfig(): AiConfig {
  const db = getDb();
  let provider = (process.env.AI_PROVIDER || "gemini").toLowerCase() as "gemini" | "openai";
  let apiKey =
    process.env.AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    "";
  let model = process.env.AI_MODEL || "";

  try {
    const rows = db
      .prepare(
        "SELECT key, value FROM app_settings WHERE key IN ('ai_provider', 'ai_api_key', 'ai_model')"
      )
      .all() as AppSettingRow[];

    for (const r of rows) {
      if (r.key === "ai_provider" && r.value) {
        provider = r.value.toLowerCase() as "gemini" | "openai";
      } else if (r.key === "ai_api_key" && r.value) {
        apiKey = r.value;
      } else if (r.key === "ai_model" && r.value) {
        model = r.value;
      }
    }
  } catch (err) {
    console.error("[AiClient] Error reading app_settings:", err);
  }

  if (!model) {
    model = provider === "gemini" ? "gemini-1.5-flash" : "gpt-4o-mini";
  }

  return {
    provider,
    apiKey,
    hasKey: Boolean(apiKey && apiKey.length > 5),
    model,
  };
}

export function saveAiConfig(params: {
  provider: "gemini" | "openai";
  apiKey?: string;
  model?: string;
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
  })();
}

export async function testAiConnection(params: {
  provider: "gemini" | "openai";
  apiKey: string;
  model?: string;
}): Promise<{ success: boolean; message: string }> {
  const { provider, apiKey, model } = params;
  const timeoutMs = 4500;

  if (!apiKey || apiKey.trim().length < 8) {
    return { success: false, message: "کلید API نامعتبر است (طول کلید بسیار کوتاه است)." };
  }

  const selectedModel =
    model || (provider === "gemini" ? "gemini-1.5-flash" : "gpt-4o-mini");

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
      const url = "https://api.openai.com/v1/chat/completions";
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
      return { success: true, message: "اتصال به OpenAI با موفقیت برقرار شد." };
    }
  } catch (err: unknown) {
    if ((err as Error).name === "AbortError") {
      return { success: false, message: "مهلت زمانی اتصال به هوش مصنوعی (۴.۵ ثانیه) پایان یافت." };
    }
    return { success: false, message: (err as Error).message || "خطا در اتصال به API" };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Direct LLM Completion Helper (4.5s hard timeout)
 */
async function callLlmCompletion(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const config = getAiConfig();
  if (!config.hasKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

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
            temperature: 0.3,
            maxOutputTokens: 250,
          },
        }),
        signal: controller.signal,
      });

      if (!res.ok) return null;
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return typeof text === "string" ? text.trim() : null;
    } else {
      const url = "https://api.openai.com/v1/chat/completions";
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 250,
        }),
        signal: controller.signal,
      });

      if (!res.ok) return null;
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      return typeof text === "string" ? text.trim() : null;
    }
  } catch {
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

/**
 * Generate a contextual Persian/multilingual reply for a comment or DM using AI instructions
 */
export async function generateContextualReplyWithAi(params: {
  caption: string;
  username: string;
  incomingText: string;
  instructions: string;
  fallbackText: string;
}): Promise<string> {
  const sys =
    "You are a polite, helpful Instagram page assistant. Write a concise, natural, and direct response following the operator instructions. Output ONLY the final reply message without quotes.";
  const usr = `Post Context: ${params.caption || "N/A"}\nCustomer (@${params.username}) wrote: "${params.incomingText}"\nOperator Instructions: ${params.instructions}\n\nReply:`;

  const generated = await callLlmCompletion(sys, usr);
  return generated || params.fallbackText || "پاسخ خدمتتان ارسال شد 🙏";
}

