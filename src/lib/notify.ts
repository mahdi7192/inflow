// Telegram handoff notification. Token: env -> app_settings -> hermes gateway .env (never logged).
import fs from "node:fs";
import { getDb } from "@/lib/db";

const DEFAULT_CHAT_ID = "104568415";

function resolveToken(): string {
  if (process.env.TELEGRAM_BOT_TOKEN) return process.env.TELEGRAM_BOT_TOKEN;
  try {
    const row = getDb().prepare("SELECT value FROM app_settings WHERE key = 'telegram_bot_token'").get() as { value?: string } | undefined;
    if (row?.value) return row.value;
  } catch { /* ignore */ }
  for (const f of [`${process.env.HOME || "/root"}/.hermes/.env`, "/root/.hermes/.env"]) {
    try {
      const m = fs.readFileSync(f, "utf8").match(/^TELEGRAM_BOT_TOKEN=(.+)$/m);
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    } catch { /* ignore */ }
  }
  return "";
}

export async function sendTelegramNotification(text: string): Promise<{ ok: boolean; reason?: string }> {
  const token = resolveToken();
  if (!token) return { ok: false, reason: "no_token" };
  const chatId = process.env.INFLOW_HANDOFF_TELEGRAM_CHAT_ID || DEFAULT_CHAT_ID;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 3500), disable_web_page_preview: true }),
      signal: ctrl.signal,
    });
    return res.ok ? { ok: true } : { ok: false, reason: `http_${res.status}` };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.name : "error" };
  } finally {
    clearTimeout(timer);
  }
}
