// Spec 023: agentic DM loop. JSON-action protocol (provider-agnostic), max 4 tool steps.
import { getDb, logBotActivity } from "@/lib/db";
import { getAiConfig, type ChatTurnMessage } from "@/lib/ai-client";
import { buildAttributedUrl } from "@/lib/playbooks";
import { searchSite, isInternalPageUrl } from "@/lib/crawler/search";
import { sendTelegramNotification } from "@/lib/notify";
import { DM_GOALS, DM_TONES, normalizeGoal, normalizeTone, parseSecondaryGoals } from "@/lib/dm-goals";

export const MAX_AGENT_STEPS = 4;

export interface AgentParams {
  accountUsername: string;
  accountPersona?: string | null;
  accountBio?: string | null;
  brandCheatSheet?: string | null;
  websiteUrl?: string | null;
  senderUsername: string;
  senderFullName?: string;
  senderId?: string;
  isFollowing?: boolean;
  incomingText: string;
  history: ChatTurnMessage[];
  contextCaption: string;
  tone?: string | null;
  toneSample?: string | null;
  primaryGoal?: string | null;
  secondaryGoals?: string | null;
  extraInstructions?: string | null;
  hasSiteData?: boolean;
  isTest?: boolean;
  /** Test hook: replaces the LLM call. Receives messages, returns raw model text. */
  llm?: (messages: Array<{ role: string; content: string }>) => Promise<string | null>;
}

export interface AgentResult {
  replyText: string;
  link?: { url: string; title: string };
  handedOff: boolean;
  steps: Array<{ tool: string; args: unknown; result?: unknown; ok: boolean }>;
}

type Json = Record<string, unknown>;

function nowTs() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

export function buildSystemPrompt(p: AgentParams): string {
  const tone = DM_TONES.find((t) => t.id === normalizeTone(p.tone)) || DM_TONES[0];
  const primary = DM_GOALS.find((g) => g.id === normalizeGoal(p.primaryGoal, p.accountPersona))!;
  const secondary = parseSecondaryGoals(p.secondaryGoals, primary.id)
    .map((id) => DM_GOALS.find((g) => g.id === id)!)
    .filter(Boolean);
  return [
    `تو دستیار هوشمند دایرکت اینستاگرام پیج @${p.accountUsername} هستی و با مشتری چت می‌کنی.`,
    `لحن: ${tone.prompt}${p.toneSample?.trim() ? `\nنمونه لحن مطلوب صاحب پیج: «${p.toneSample.trim().slice(0, 400)}»` : ""}`,
    `هدف اصلی: ${primary.label} — ${primary.description}. ${primary.success}`,
    secondary.length ? `اهداف فرعی: ${secondary.map((g) => `${g.label} (${g.success})`).join(" | ")}` : "",
    `قوانین سخت:
- هرگز قیمت، محصول، مشخصات یا لینکی را که از ابزارها یا اطلاعات پایین نگرفته‌ای از خودت نساز. اگر نمی‌دانی، با search_site جستجو کن؛ اگر پیدا نشد صادقانه بگو و پیشنهاد ارتباط با ادمین بده (handoff_to_human).
- هیچ لینک خارجی نده و آدرس URL را داخل متن پیام ننویس. برای ارسال لینک فقط از ابزار send_link استفاده کن (دکمه جداگانه ساخته می‌شود).
- پاسخ فارسی، کوتاه (حداکثر ۴۰۰ نویسه)، مفید و بدون تکرار گفته‌های قبلی.
- اطلاعات مشتری (نام، شماره، آدرس، نیاز) را هر وقت گفت با save_customer_info ذخیره کن؛ هر بار فقط همان چیزی که گفته را بفرست.
- وقتی شرط موفقیت هدف محقق شد، مؤدبانه جمع‌بندی و تشکر کن و سؤال تازه نپرس.
- اگر مشتری ناراضی/شاکی است، درخواست انسان کرده، یا از پسِ درخواست برنیامدی: handoff_to_human.`,
    `ابزارها (هر مرحله دقیقاً یک JSON):
1) search_site {"query": "..."} → صفحات مرتبط سایت با عنوان، خلاصه و آدرس
2) get_post_info {"shortcode": "اختیاری"} → کپشن/قیمت/لینک پست‌های پیج
3) save_customer_info {"name","phone","address","need","stage"} → فقط فیلدهای شناخته‌شده
4) send_link {"url": "آدرس دقیق از نتیجه search_site"} → ارسال دکمه لینک (فقط صفحات سایت خود پیج)
5) handoff_to_human {"reason": "..."} → توقف ربات و اطلاع به ادمین`,
    `فرمت خروجی: فقط یک JSON بدون هیچ متن دیگر:
{"action":"tool","tool":"<name>","args":{...}}  یا  {"action":"reply","text":"<پیام نهایی به مشتری>"}
حداکثر ${MAX_AGENT_STEPS} بار ابزار صدا بزن؛ سپس حتماً reply بده.`,
    p.hasSiteData ? "" : "توجه: هنوز صفحه‌ای از سایت ذخیره نشده؛ search_site ممکن است نتیجه ندهد.",
    p.brandCheatSheet?.trim() ? `[اطلاعات تکمیلی برند]:\n${p.brandCheatSheet.trim().slice(0, 2500)}` : "",
    p.extraInstructions?.trim() ? `[دستورالعمل اضافه صاحب پیج]:\n${p.extraInstructions.trim().slice(0, 1500)}` : "",
    `[زمینه گفتگو]\nنام مشتری: ${p.senderFullName || p.senderUsername}\n${p.isFollowing ? "این کاربر پیج را فالو کرده." : ""}\n${p.contextCaption ? p.contextCaption.slice(0, 5000) : ""}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function extractJson(raw: string): Json | null {
  let t = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const s = t.indexOf("{");
  const e = t.lastIndexOf("}");
  if (s < 0 || e <= s) return null;
  t = t.slice(s, e + 1);
  try {
    const o = JSON.parse(t);
    return o && typeof o === "object" ? (o as Json) : null;
  } catch {
    return null;
  }
}

async function callModel(messages: Array<{ role: string; content: string }>, override?: AgentParams["llm"]): Promise<string | null> {
  if (override) return override(messages);
  const cfg = getAiConfig();
  if (!cfg.hasKey || cfg.provider === "gemini") return null; // gemini path uses the legacy single-call fallback
  const base = (cfg.baseUrl || "http://127.0.0.1:20128/v1").replace(/\/+$/, "");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({ model: cfg.model || "ag/gemini-3.8-flash", messages, temperature: 0.3, max_tokens: 700, stream: false }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      const lines = text.split("\n").filter((l) => l.startsWith("data: "));
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.slice(6));
          if (parsed?.choices?.[0]?.message?.content) {
            data = parsed;
            break;
          }
        } catch { /* continue */ }
      }
    }
    const c = data?.choices?.[0]?.message?.content;
    return typeof c === "string" ? c : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------- tools ----------------

function toolSearchSite(p: AgentParams, args: Json) {
  const hits = searchSite(p.accountUsername, String(args.query || ""), 3);
  if (!hits.length) return { results: [], note: "چیزی پیدا نشد؛ چیزی از خودت نساز." };
  return { results: hits };
}

function toolGetPostInfo(p: AgentParams, args: Json) {
  const db = getDb();
  const sc = String(args.shortcode || "").trim();
  const rows = (sc
    ? db.prepare("SELECT shortcode, caption, cheat_sheet, target_url FROM posts WHERE account_username = ? AND shortcode = ?").all(p.accountUsername, sc)
    : db
        .prepare(
          `SELECT shortcode, caption, cheat_sheet, target_url FROM posts WHERE account_username = ? AND (cheat_sheet != '' OR target_url != '')
           ORDER BY COALESCE(posted_at, synced_at) DESC LIMIT 5`
        )
        .all(p.accountUsername)) as Array<{ shortcode: string; caption: string; cheat_sheet: string; target_url: string }>;
  return {
    posts: rows.map((r) => ({
      shortcode: r.shortcode,
      caption: (r.caption || "").slice(0, 300),
      details: (r.cheat_sheet || "").slice(0, 500),
      has_link: Boolean(r.target_url),
    })),
  };
}

function toolSaveCustomerInfo(p: AgentParams, args: Json) {
  const db = getDb();
  const clean: Record<string, string> = {};
  for (const k of ["name", "phone", "address", "need", "stage"]) {
    const v = args[k];
    if (typeof v === "string" && v.trim()) clean[k] = v.trim().slice(0, 400);
  }
  if (!Object.keys(clean).length) return { saved: false, note: "هیچ فیلدی ارسال نشد" };
  if (clean.phone) {
    const digits = clean.phone
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
    const m = digits.match(/(?:\+98|0098|98|0)?(9\d{9})/);
    clean.phone = m ? `0${m[1]}` : digits.replace(/[^\d+]/g, "");
  }
  if (p.isTest) {
    const missing = ["phone", "address"].filter((k) => !clean[k]);
    return {
      saved: true,
      current: clean,
      still_missing: missing,
      note: "حالت تستی: اطلاعات استخراج شد اما در لیدهای واقعی ذخیره نشد.",
    };
  }

  const sender = p.senderUsername.toLowerCase();
  const prevRow = db
    .prepare("SELECT customer_info FROM dm_thread_states WHERE account_username = ? AND sender_username = ?")
    .get(p.accountUsername, sender) as { customer_info?: string } | undefined;
  let prev: Record<string, string> = {};
  try { prev = JSON.parse(prevRow?.customer_info || "{}"); } catch { /* ignore */ }
  const merged = { ...prev, ...clean };
  db.prepare(
    `INSERT INTO dm_thread_states (account_username, sender_username, bot_paused, customer_info, updated_at)
     VALUES (?, ?, 0, ?, ?)
     ON CONFLICT(account_username, sender_username) DO UPDATE SET customer_info = excluded.customer_info, updated_at = excluded.updated_at`
  ).run(p.accountUsername, sender, JSON.stringify(merged), nowTs());

  // Mirror into captured_leads (shared lead inbox).
  const summary = [merged.need, merged.address ? `آدرس: ${merged.address}` : "", merged.stage ? `مرحله: ${merged.stage}` : ""].filter(Boolean).join(" | ").slice(0, 400);
  db.prepare(
    `INSERT INTO captured_leads (account_username, sender_username, sender_full_name, sender_id, phone_number, intent_summary, last_message, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)
     ON CONFLICT(account_username, sender_username) DO UPDATE SET
       sender_full_name = CASE WHEN excluded.sender_full_name != '' THEN excluded.sender_full_name ELSE captured_leads.sender_full_name END,
       phone_number = CASE WHEN excluded.phone_number != '' THEN excluded.phone_number ELSE captured_leads.phone_number END,
       intent_summary = CASE WHEN excluded.intent_summary != '' THEN excluded.intent_summary ELSE captured_leads.intent_summary END,
       last_message = excluded.last_message, updated_at = excluded.updated_at`
  ).run(
    p.accountUsername, sender, merged.name || p.senderFullName || "", p.senderId || "",
    merged.phone || "", summary, p.incomingText.slice(0, 300), nowTs(), nowTs()
  );
  const missing = ["phone", "address"].filter((k) => !merged[k]);
  return { saved: true, current: merged, still_missing: missing };
}

function toolHandoff(p: AgentParams, args: Json) {
  const reason = String(args.reason || "درخواست مشتری").slice(0, 300);
  if (p.isTest) {
    return {
      paused: true,
      reason,
      note: "حالت تستی: درخواست ارجاع شبیه‌سازی شد (اعلان تلگرام ارسال نشد).",
    };
  }
  getDb()
    .prepare(
      `INSERT INTO dm_thread_states (account_username, sender_username, bot_paused, paused_by, paused_reason, updated_at)
       VALUES (?, ?, 1, 'agent', ?, ?)
       ON CONFLICT(account_username, sender_username) DO UPDATE SET bot_paused = 1, paused_by = 'agent', paused_reason = excluded.paused_reason, updated_at = excluded.updated_at`
    )
    .run(p.accountUsername, p.senderUsername.toLowerCase(), reason, nowTs());
  try {
    logBotActivity(p.accountUsername, "dm_handoff", `ارجاع به ادمین: @${p.senderUsername}`, reason, { sender: p.senderUsername });
  } catch { /* ignore */ }
  // Fire-and-forget Telegram notification.
  void sendTelegramNotification(
    `🙋 ارجاع دایرکت به انسان\nپیج: @${p.accountUsername}\nمشتری: @${p.senderUsername}\nدلیل: ${reason}\nآخرین پیام: ${p.incomingText.slice(0, 300)}`
  ).then((r) => {
    if (!r.ok) {
      try { logBotActivity(p.accountUsername, "dm_handoff_notify_failed", "اعلان تلگرام ارسال نشد", r.reason || "", {}); } catch { /* ignore */ }
    }
  });
  return { paused: true };
}

// ---------------- loop ----------------

export async function runDmAgent(p: AgentParams): Promise<AgentResult | null> {
  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: buildSystemPrompt(p) },
    ...(p.history || []).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: p.incomingText },
  ];
  const steps: AgentResult["steps"] = [];
  let link: AgentResult["link"];
  let handedOff = false;

  for (let i = 0; i <= MAX_AGENT_STEPS; i++) {
    const raw = await callModel(messages, p.llm);
    if (!raw) return null;
    const obj = extractJson(raw);
    if (!obj) {
      // Non-JSON → treat as plain reply if it looks like prose.
      const plain = raw.trim();
      if (plain && !plain.startsWith("{") && plain.length < 900) return finalize(plain, link, handedOff, steps);
      return null;
    }
    if (obj.action === "reply" || (typeof obj.text === "string" && obj.action !== "tool")) {
      const text = String(obj.text || "").trim();
      if (!text) return null;
      return finalize(text, link, handedOff, steps);
    }
    if (obj.action !== "tool" || typeof obj.tool !== "string") return null;
    if (i >= MAX_AGENT_STEPS) {
      messages.push({ role: "assistant", content: raw });
      messages.push({ role: "user", content: '[سیستم] سقف مراحل ابزار تمام شد. همین حالا فقط {"action":"reply","text":"..."} بده.' });
      continue;
    }
    const args = (obj.args && typeof obj.args === "object" ? obj.args : {}) as Json;
    let result: unknown;
    let ok = true;
    try {
      switch (obj.tool) {
        case "search_site": result = toolSearchSite(p, args); break;
        case "get_post_info": result = toolGetPostInfo(p, args); break;
        case "save_customer_info": result = toolSaveCustomerInfo(p, args); break;
        case "send_link": {
          const internal = isInternalPageUrl(p.accountUsername, String(args.url || ""));
          if (!internal) {
            ok = false;
            result = { error: "این آدرس جزو صفحات سایت نیست؛ فقط آدرس‌های برگشتی search_site مجاز است." };
          } else {
            const attributed = buildAttributedUrl(internal, { username: p.senderUsername }) || internal;
            link = { url: attributed, title: "مشاهده در سایت 🔗" };
            result = { sent: true, note: "دکمه لینک همراه پیام ارسال می‌شود؛ URL را در متن ننویس." };
          }
          break;
        }
        case "handoff_to_human": result = toolHandoff(p, args); handedOff = true; break;
        default: ok = false; result = { error: `ابزار ناشناخته: ${obj.tool}` };
      }
    } catch (e) {
      ok = false;
      result = { error: e instanceof Error ? e.message : "tool_error" };
    }
    steps.push({ tool: obj.tool, args, result, ok });
    messages.push({ role: "assistant", content: raw });
    messages.push({ role: "user", content: `[نتیجه ابزار ${obj.tool}] ${JSON.stringify(result).slice(0, 3500)}` });
  }
  return null;
}

function finalize(text: string, link: AgentResult["link"], handedOff: boolean, steps: AgentResult["steps"]): AgentResult {
  let t = text.replace(/\s+/g, " ").trim();
  // Never leave raw URLs in the body (links go through the button only).
  t = t.replace(/https?:\/\/\S+/gi, "").replace(/\bwww\.\S+/gi, "").replace(/\s{2,}/g, " ").trim();
  const limit = link ? 600 : 900;
  if (t.length > limit) t = `${t.slice(0, limit - 3).trim()}...`;
  return { replyText: t || "چشم، بررسی می‌کنم 🙏", link, handedOff, steps };
}
