/**
 * Spec 021 — Per-story automation helpers.
 * Stories live in the `stories` table (kept after expiry so logs can show which story was replied to).
 * Story replies are NEVER evaluated by the generic DM rules (`dm_automations` trigger/reply rules).
 */
import { getDb, type StoryRow } from "@/lib/db";

export type StoryDefaultMode = "auto" | "configured_only" | "ignore";

export function normalizeStoryDefaultMode(value: unknown): StoryDefaultMode {
  return value === "configured_only" || value === "ignore" ? value : "auto";
}

function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

function toIso(v: unknown): string | null {
  const raw = str(v).trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Upsert stories coming from SocialAPI. Config columns are never touched on conflict.
 * Rows that are no longer returned are kept (expired).
 */
export function syncStoriesFromApi(
  accountUsername: string,
  apiStories: Array<Record<string, unknown>>
): number {
  if (!Array.isArray(apiStories) || apiStories.length === 0) return 0;
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO stories (
      id, account_username, media_type, media_url, thumbnail_url, permalink, caption,
      created_at, expires_at, synced_at
    ) VALUES (
      @id, @account_username, @media_type, @media_url, @thumbnail_url, @permalink, @caption,
      @created_at, @expires_at, datetime('now')
    )
    ON CONFLICT(id) DO UPDATE SET
      media_type = excluded.media_type,
      media_url = CASE WHEN excluded.media_url != '' THEN excluded.media_url ELSE stories.media_url END,
      thumbnail_url = CASE WHEN excluded.thumbnail_url != '' THEN excluded.thumbnail_url ELSE stories.thumbnail_url END,
      permalink = CASE WHEN excluded.permalink != '' THEN excluded.permalink ELSE stories.permalink END,
      caption = excluded.caption,
      created_at = COALESCE(stories.created_at, excluded.created_at),
      expires_at = COALESCE(stories.expires_at, excluded.expires_at),
      synced_at = datetime('now')
  `);
  let count = 0;
  const tx = db.transaction(() => {
    for (const st of apiStories) {
      const id = str(st.id || st.story_id || st.media_id).trim();
      if (!id) continue;
      const created = toIso(st.timestamp || st.created_at || st.posted_at);
      const explicitExpiry = toIso(st.expires_at || st.expiry);
      const expires =
        explicitExpiry ||
        (created ? new Date(new Date(created).getTime() + 24 * 3600 * 1000).toISOString() : null);
      const mediaUrl = str(st.media_url);
      stmt.run({
        id,
        account_username: accountUsername,
        media_type: str(st.media_type),
        media_url: mediaUrl,
        thumbnail_url: str(st.thumbnail_url || (str(st.media_type).toUpperCase() === "VIDEO" ? "" : mediaUrl)),
        permalink: str(st.permalink),
        caption: str(st.caption),
        created_at: created,
        expires_at: expires,
      });
      count++;
    }
  });
  tx();
  return count;
}

/** Look up a story by webhook story_id (matches the row id or the numeric id inside the permalink). */
export function findStoryById(accountUsername: string, storyId?: string | null): StoryRow | undefined {
  const sid = (storyId || "").trim();
  if (!sid) return undefined;
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM stories
       WHERE account_username = ?
         AND (id = ? OR permalink LIKE '%/' || ? OR permalink LIKE '%/' || ? || '/%' OR permalink LIKE '%/' || ? || '?%')
       ORDER BY (id = ?) DESC LIMIT 1`
    )
    .get(accountUsername, sid, sid, sid, sid, sid) as StoryRow | undefined;
}

/** True when the story has its own automation config (explicitly enabled by the user). */
export function storyHasConfig(story?: StoryRow | null): boolean {
  return Boolean(story && story.auto_reply === 1);
}

/**
 * Pure-emoji / reaction / empty story replies must never reach the LLM.
 */
export function isEmojiOnlyText(text?: string | null): boolean {
  const t = (text || "").trim();
  if (!t) return true;
  if (/^(reacted|react)\b.*\bstory\b/i.test(t)) return true;
  const stripped = t.replace(
    /[\p{Extended_Pictographic}\u200d\ufe0f\u20e3\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}\s]/gu,
    ""
  );
  return stripped.length === 0;
}

export function storyTimeLeftMs(story: Pick<StoryRow, "expires_at">, now = Date.now()): number {
  if (!story.expires_at) return 0;
  const ms = new Date(story.expires_at).getTime() - now;
  return Number.isNaN(ms) ? 0 : Math.max(0, ms);
}
