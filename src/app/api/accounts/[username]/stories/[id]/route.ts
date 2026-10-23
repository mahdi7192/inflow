import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasAccountAccess } from "@/lib/auth-guard";
import { getDb, type StoryRow } from "@/lib/db";

interface RouteParams {
  params: Promise<{ username: string; id: string }>;
}

const ENUMS = {
  trigger_type: ["all", "keywords", "ai_context"],
  reply_mode: ["direct", "ai"],
  emoji_reaction_action: ["ignore", "like", "quick_reply"],
} as const;

const TEXT_FIELDS = ["trigger_keywords", "reply_text", "target_url", "target_button_text", "cheat_sheet"] as const;
const BOOL_FIELDS = ["auto_reply", "require_follow"] as const;

/** PATCH /api/accounts/[username]/stories/[id] — update per-story automation config. */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { username, id } = await params;
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");
    if (!hasAccountAccess(user, cleanUsername)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();
    const story = db
      .prepare("SELECT * FROM stories WHERE id = ? AND account_username = ?")
      .get(id, cleanUsername) as StoryRow | undefined;
    if (!story) return NextResponse.json({ success: false, error: "Story not found" }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const sets: string[] = [];
    const values: unknown[] = [];

    for (const key of BOOL_FIELDS) {
      if (key in body) {
        sets.push(`${key} = ?`);
        values.push(body[key] === true || body[key] === 1 ? 1 : 0);
      }
    }
    for (const key of Object.keys(ENUMS) as (keyof typeof ENUMS)[]) {
      if (key in body) {
        const v = String(body[key]);
        if (!(ENUMS[key] as readonly string[]).includes(v)) {
          return NextResponse.json({ success: false, error: `Invalid ${key}` }, { status: 400 });
        }
        sets.push(`${key} = ?`);
        values.push(v);
      }
    }
    for (const key of TEXT_FIELDS) {
      if (key in body) {
        const v = String(body[key] ?? "").slice(0, key === "target_button_text" ? 80 : 4000);
        if (key === "target_url" && v.trim() && !/^https?:\/\//i.test(v.trim())) {
          return NextResponse.json({ success: false, error: "Invalid target_url" }, { status: 400 });
        }
        sets.push(`${key} = ?`);
        values.push(v.trim());
      }
    }

    if (sets.length === 0) {
      return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 });
    }

    db.prepare(`UPDATE stories SET ${sets.join(", ")} WHERE id = ? AND account_username = ?`).run(
      ...values,
      id,
      cleanUsername
    );
    const updated = db.prepare("SELECT * FROM stories WHERE id = ?").get(id) as StoryRow;
    return NextResponse.json({ success: true, story: updated });
  } catch (err) {
    console.error("[stories PATCH]", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
