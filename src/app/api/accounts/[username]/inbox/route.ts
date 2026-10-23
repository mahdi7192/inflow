import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasAccountAccess } from "@/lib/auth-guard";
import { getDb, type AccountRow, type DMLogRow } from "@/lib/db";
import { SocialApiClient, SocialApiError } from "@/lib/social-api";

interface RouteParams {
  params: Promise<{
    username: string;
  }>;
}

/**
 * Unified Direct Message Conversations Route
 * - `GET`: Lists conversations via `GET /v1/inbox/conversations` (merged with local `dm_logs` history)
 * - `POST`: Sends a message via `POST /v1/inbox/conversations/{id}/messages`
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." },
        { status: 401 }
      );
    }

    const { username } = await params;
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");

    if (!hasAccountAccess(user, cleanUsername)) {
      return NextResponse.json(
        { success: false, error: "شما دسترسی مجاز به این حساب را ندارید." },
        { status: 403 }
      );
    }

    const db = getDb();
    const account = db
      .prepare("SELECT * FROM accounts WHERE username = ?")
      .get(cleanUsername) as AccountRow | undefined;

    const socialAccountId = account?.social_account_id || cleanUsername;
    const client = new SocialApiClient();

    try {
      const remote = await client.listConversations(socialAccountId);

      // Map normalized SocialAPI conversations into UI ThreadItem format
      const threads = remote.data.map((conv) => {
        const participantUsername =
          conv.participant_username || conv.participant_name || "user";

        const remoteMessages = Array.isArray(conv.messages)
          ? conv.messages.map((m) => ({
              id: m.id,
              text: m.text,
              user_id: m.sender_id || (m.is_from_me ? "me" : participantUsername),
              is_me: Boolean(m.is_from_me),
            }))
          : [
              {
                id: `${conv.id}-last`,
                text: conv.last_message || "",
                user_id: participantUsername,
                is_me: false,
              },
            ];

        return {
          id: conv.id,
          title: conv.participant_name || participantUsername,
          users: [
            {
              pk: conv.participant_id || participantUsername,
              username: participantUsername,
              full_name: conv.participant_name || participantUsername,
            },
          ],
          last_message: conv.last_message || "",
          last_message_at: conv.last_message_at || "",
          unread_count: conv.unread_count || 0,
          messages: remoteMessages,
        };
      });

      return NextResponse.json({
        success: true,
        threads,
        pagination: remote.pagination,
      });
    } catch (err: unknown) {
      if (err instanceof SocialApiError && err.status === 401 && account) {
        db.prepare(
          "UPDATE accounts SET session_status = 'reauth_required', updated_at = datetime('now') WHERE username = ?"
        ).run(cleanUsername);
      }

      // Fallback to local `dm_logs` threads if SocialAPI key is not yet configured
      const localLogs = db
        .prepare(
          "SELECT * FROM dm_logs WHERE account_username = ? ORDER BY processed_at DESC LIMIT 50"
        )
        .all(cleanUsername) as DMLogRow[];

      const threadMap = new Map<
        string,
        {
          id: string;
          title: string;
          users: Array<{ pk: string; username: string; full_name?: string }>;
          last_message: string;
          messages: Array<{ id: string; text: string; user_id: string; is_me: boolean }>;
        }
      >();

      for (const l of localLogs) {
        const tid = l.thread_id || l.sender_username;
        if (!threadMap.has(tid)) {
          threadMap.set(tid, {
            id: tid,
            title: l.sender_username,
            users: [
              {
                pk: l.sender_id || l.sender_username,
                username: l.sender_username,
                full_name: l.sender_username,
              },
            ],
            last_message: l.reply_text || l.incoming_text,
            messages: [],
          });
        }
        const entry = threadMap.get(tid)!;
        if (l.incoming_text) {
          entry.messages.unshift({
            id: `${l.message_id}-in`,
            text: l.incoming_text,
            user_id: l.sender_username,
            is_me: false,
          });
        }
        if (l.reply_text && l.reply_status === "sent") {
          entry.messages.push({
            id: `${l.message_id}-out`,
            text: l.reply_text,
            user_id: "me",
            is_me: true,
          });
        }
      }

      return NextResponse.json(
        {
          success: threadMap.size > 0,
          threads: Array.from(threadMap.values()),
          error:
            err instanceof SocialApiError
              ? err.message
              : "خطا در ارتباط با سرویس SocialAPI.ai",
          need_login: err instanceof SocialApiError && err.status === 401,
        },
        { status: threadMap.size > 0 ? 200 : err instanceof SocialApiError ? err.status : 500 }
      );
    }
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message || "خطای سرور" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "لطفاً ابتدا وارد حساب کاربری خود شوید." },
        { status: 401 }
      );
    }

    const { username } = await params;
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");

    if (!hasAccountAccess(user, cleanUsername)) {
      return NextResponse.json(
        { success: false, error: "شما دسترسی مجاز به این حساب را ندارید." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const conversationId = String(body.conversation_id || body.thread_id || body.target || "").trim();
    const target = String(body.target || "").trim();
    const text = String(body.text || "").trim();

    if (!conversationId || !text) {
      return NextResponse.json(
        { success: false, error: "شناسه گفتگو و متن پیام الزامی است." },
        { status: 400 }
      );
    }

    const db = getDb();
    const account = db
      .prepare("SELECT * FROM accounts WHERE username = ?")
      .get(cleanUsername) as AccountRow | undefined;

    const socialAccountId = account?.social_account_id || cleanUsername;
    const client = new SocialApiClient();

    const res = await client.sendConversationMessage({
      conversationId,
      accountId: socialAccountId,
      text,
      recipientId: target || undefined,
    });

    const messageId = res.id || res.message_id || `manual_${Date.now()}`;
    const now = new Date().toISOString();

    // 1. Record manual message into dm_logs so conversation history and AI context stay intact
    try {
      db.prepare(`
        INSERT INTO dm_logs (
          message_id, thread_id, account_username, sender_username, sender_full_name, sender_id,
          incoming_text, trigger_matched, reply_status, reply_text, processed_at, created_at
        ) VALUES (?, ?, ?, ?, '', ?, '[پاسخ دستی ادمین]', 0, 'sent', ?, ?, ?)
        ON CONFLICT(message_id) DO UPDATE SET
          reply_text = excluded.reply_text,
          processed_at = excluded.processed_at
      `).run(
        messageId,
        conversationId,
        cleanUsername,
        target || "user",
        target || "",
        text,
        now,
        now
      );
    } catch (logErr) {
      console.error("[inbox] Failed to log manual message to dm_logs:", logErr);
    }

    // 2. Pause bot for this thread so it doesn't interrupt the admin's manual conversation
    try {
      db.prepare(`
        INSERT INTO dm_thread_states (account_username, sender_username, thread_id, bot_paused, paused_reason, updated_at)
        VALUES (?, ?, ?, 1, 'admin_manual_reply', ?)
        ON CONFLICT(account_username, sender_username) DO UPDATE SET
          bot_paused = 1,
          paused_reason = 'admin_manual_reply',
          thread_id = CASE WHEN excluded.thread_id != '' THEN excluded.thread_id ELSE dm_thread_states.thread_id END,
          updated_at = excluded.updated_at
      `).run(cleanUsername, target || "user", conversationId, now);
    } catch (pauseErr) {
      console.error("[inbox] Failed to pause bot thread on manual reply:", pauseErr);
    }

    return NextResponse.json({
      success: true,
      message_id: messageId,
      status: res.status || "sent",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof SocialApiError
            ? err.message
            : (err as Error).message || "خطا در ارسال پیام دایرکت",
      },
      { status: err instanceof SocialApiError ? err.status : 500 }
    );
  }
}
