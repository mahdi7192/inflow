import { NextResponse } from "next/server";
import { getDb, CapturedLeadRow } from "@/lib/db";

function normalizeUsername(raw: string): string {
  return decodeURIComponent(raw || "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
}

function nowTimestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function extractNormalizedIranPhone(rawText: string): string {
  const normalizedDigits = (rawText || "")
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
  const candidate = normalizedDigits
    .replace(/[\s\-_().]/g, "")
    .match(/(?:\+98|0098|98|0)?(9\d{9})/);
  return candidate ? `0${candidate[1]}` : "";
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username: rawUsername } = await context.params;
    const username = normalizeUsername(rawUsername);
    const db = getDb();

    // 1. Backfill any phone numbers from recent dm_logs so historical leads show up immediately
    const recentLogs = db
      .prepare(
        `SELECT sender_username, sender_full_name, sender_id, incoming_text, created_at
         FROM dm_logs
         WHERE account_username = ? AND incoming_text != ''
         ORDER BY id DESC LIMIT 150`
      )
      .all(username) as {
      sender_username: string;
      sender_full_name: string;
      sender_id: string;
      incoming_text: string;
      created_at: string;
    }[];

    for (const log of recentLogs) {
      const phone = extractNormalizedIranPhone(log.incoming_text);
      if (!phone || !log.sender_username) continue;
      const origin = db
        .prepare(
          `SELECT shortcode FROM comment_logs
           WHERE account_username = ? AND LOWER(username) = ?
           ORDER BY id DESC LIMIT 1`
        )
        .get(username, log.sender_username.toLowerCase()) as
        | { shortcode: string }
        | undefined;

      db.prepare(
        `INSERT INTO captured_leads (
          account_username, sender_username, sender_full_name, sender_id,
          phone_number, source_shortcode, intent_summary, last_message,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'شماره تماس استخراج‌شده از دایرکت', ?, 'new', ?, ?)
        ON CONFLICT(account_username, sender_username) DO UPDATE SET
          phone_number = CASE
            WHEN excluded.phone_number != '' AND excluded.phone_number NOT LIKE '%بدون شماره%'
              THEN excluded.phone_number
            WHEN captured_leads.phone_number != '' AND captured_leads.phone_number NOT LIKE '%بدون شماره%'
              THEN captured_leads.phone_number
            ELSE excluded.phone_number
          END,
          sender_full_name = CASE WHEN excluded.sender_full_name != '' THEN excluded.sender_full_name ELSE captured_leads.sender_full_name END,
          source_shortcode = CASE WHEN excluded.source_shortcode != '' THEN excluded.source_shortcode ELSE captured_leads.source_shortcode END,
          last_message = excluded.last_message,
          updated_at = excluded.updated_at`
      ).run(
        username,
        log.sender_username,
        log.sender_full_name || "",
        log.sender_id || "",
        phone,
        origin?.shortcode || "",
        log.incoming_text.slice(0, 300),
        log.created_at || nowTimestamp(),
        log.created_at || nowTimestamp()
      );
    }

    const leads = db
      .prepare(
        `SELECT * FROM captured_leads
         WHERE account_username = ?
         ORDER BY updated_at DESC, id DESC
         LIMIT 100`
      )
      .all(username) as CapturedLeadRow[];

    // 2. Build active conversation threads summary with Human Takeover (bot_paused) state & Read Receipts
    const rawThreads = db
      .prepare(
        `SELECT
           d.sender_username,
           MAX(d.sender_full_name) as sender_full_name,
           MAX(d.sender_id) as sender_id,
           MAX(d.thread_id) as thread_id,
           COUNT(d.id) as messages_count,
           MAX(d.id) as latest_id
         FROM dm_logs d
         WHERE d.account_username = ? AND d.sender_username != ''
         GROUP BY LOWER(d.sender_username)
         ORDER BY latest_id DESC
         LIMIT 30`
      )
      .all(username) as {
      sender_username: string;
      sender_full_name: string;
      sender_id: string;
      thread_id: string;
      messages_count: number;
      latest_id: number;
    }[];

    const pausedRows = db
      .prepare(
        `SELECT LOWER(sender_username) as u, bot_paused
         FROM dm_thread_states
         WHERE account_username = ?`
      )
      .all(username) as { u: string; bot_paused: number }[];
    const pausedMap = new Map<string, boolean>();
    for (const r of pausedRows) {
      pausedMap.set(r.u, r.bot_paused === 1);
    }

    const threads = rawThreads.map((t) => {
      const latestLog = db
        .prepare(
          `SELECT incoming_text, reply_text, reply_status, is_story_reply, read_at, created_at
           FROM dm_logs WHERE id = ?`
        )
        .get(t.latest_id) as
        | {
            incoming_text: string;
            reply_text: string;
            reply_status: string;
            is_story_reply: number;
            read_at: string | null;
            created_at: string;
          }
        | undefined;

      const origin = db
        .prepare(
          `SELECT shortcode FROM comment_logs
           WHERE account_username = ? AND LOWER(username) = ?
           ORDER BY id DESC LIMIT 1`
        )
        .get(username, t.sender_username.toLowerCase()) as
        | { shortcode: string }
        | undefined;

      return {
        sender_username: t.sender_username,
        sender_full_name: t.sender_full_name,
        sender_id: t.sender_id,
        thread_id: t.thread_id,
        messages_count: t.messages_count,
        last_incoming: latestLog?.incoming_text || "",
        last_reply: latestLog?.reply_text || "",
        reply_status: latestLog?.reply_status || "skipped",
        is_story_reply: latestLog?.is_story_reply === 1,
        read_at: latestLog?.read_at || null,
        created_at: latestLog?.created_at || "",
        source_shortcode: origin?.shortcode || "",
        bot_paused: pausedMap.get(t.sender_username.toLowerCase()) || false,
      };
    });

    const accountRow = db
      .prepare(
        `SELECT account_persona, brand_cheat_sheet, website_url
         FROM accounts WHERE LOWER(username) = ?`
      )
      .get(username) as
      | {
          account_persona?: string;
          brand_cheat_sheet?: string;
          website_url?: string;
        }
      | undefined;

    return NextResponse.json({
      leads,
      threads,
      account_context: {
        account_persona: accountRow?.account_persona || "business",
        brand_cheat_sheet: accountRow?.brand_cheat_sheet || "",
        website_url: accountRow?.website_url || "",
      },
    });
  } catch (err) {
    console.error("[GET /api/accounts/[username]/leads] Error:", err);
    return NextResponse.json(
      { error: "Failed to load leads and threads" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username: rawUsername } = await context.params;
    const username = normalizeUsername(rawUsername);
    const body = await req.json();
    const db = getDb();

    if (body.action === "toggle_bot_pause") {
      const senderUsername = String(body.sender_username || "")
        .trim()
        .replace(/^@/, "");
      const botPaused = body.bot_paused ? 1 : 0;
      if (!senderUsername) {
        return NextResponse.json(
          { error: "sender_username is required" },
          { status: 400 }
        );
      }

      db.prepare(
        `INSERT INTO dm_thread_states (
          account_username, sender_username, sender_id, thread_id, bot_paused, paused_by, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'admin', ?)
        ON CONFLICT(account_username, sender_username) DO UPDATE SET
          bot_paused = excluded.bot_paused,
          updated_at = excluded.updated_at`
      ).run(
        username,
        senderUsername.toLowerCase(),
        String(body.sender_id || ""),
        String(body.thread_id || ""),
        botPaused,
        nowTimestamp()
      );

      return NextResponse.json({
        success: true,
        sender_username: senderUsername,
        bot_paused: Boolean(botPaused),
      });
    }

    if (body.action === "update_lead_status") {
      const leadId = Number(body.lead_id);
      const status = ["new", "contacted", "converted"].includes(body.status)
        ? body.status
        : "new";
      db.prepare(
        `UPDATE captured_leads SET status = ?, updated_at = ? WHERE id = ? AND account_username = ?`
      ).run(status, nowTimestamp(), leadId, username);
      return NextResponse.json({ success: true, lead_id: leadId, status });
    }

    if (body.action === "delete_lead") {
      const leadId = Number(body.lead_id);
      db.prepare(
        `DELETE FROM captured_leads WHERE id = ? AND account_username = ?`
      ).run(leadId, username);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[POST /api/accounts/[username]/leads] Error:", err);
    return NextResponse.json(
      { error: "Failed to execute action" },
      { status: 500 }
    );
  }
}
