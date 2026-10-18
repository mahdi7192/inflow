import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import seedData from "./seed-data.json";

export interface AccountRow {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  followers_text: string | null;
  posts_count: number | null;
  status: "active" | "paused";
  agent_interval_sec: number;
  last_heartbeat_at: string | null;
  updated_at: string;
  created_at: string;
}

export interface PostRow {
  id: number;
  account_username: string;
  shortcode: string;
  media_id: string;
  url: string;
  post_type: "reel" | "post";
  thumbnail_url: string;
  caption: string;
  auto_reply: number; // 0 or 1
  trigger_type: "all" | "ai_context" | "keywords";
  trigger_context: string;
  trigger_keywords: string;
  comment_action_type: "none" | "direct" | "ai";
  comment_action_text: string;
  dm_action_type: "none" | "direct" | "ai";
  dm_action_text: string;
  dm_require_follow: number; // 0 or 1
  synced_at: string;
  updated_at: string;
  sort_index: number;
}

export interface CommentLogRow {
  id: number;
  comment_id: string;
  account_username: string;
  shortcode: string;
  media_id: string;
  user_id: string;
  username: string;
  comment_text: string;
  trigger_matched: number; // 0 or 1
  comment_reply_status: "none" | "sent" | "failed" | "skipped" | "locked";
  comment_reply_text: string;
  dm_status: "none" | "sent" | "pending_follow" | "failed" | "skipped";
  dm_text: string;
  created_at: string;
  processed_at: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "inflow.db");

declare global {
  // eslint-disable-next-line no-var
  var __inflowDb: Database.Database | undefined;
}

function nowTimestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

export function getDb(): Database.Database {
  if (global.__inflowDb) {
    return global.__inflowDb;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  initSchema(db);
  seedIfEmpty(db);

  global.__inflowDb = db;
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      bio TEXT NOT NULL DEFAULT '',
      followers_text TEXT,
      posts_count INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      agent_interval_sec INTEGER NOT NULL DEFAULT 120,
      last_heartbeat_at TEXT,
      updated_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_username TEXT NOT NULL,
      shortcode TEXT UNIQUE NOT NULL,
      media_id TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL DEFAULT '',
      post_type TEXT NOT NULL DEFAULT 'reel',
      thumbnail_url TEXT NOT NULL DEFAULT '',
      caption TEXT NOT NULL DEFAULT '',
      auto_reply INTEGER NOT NULL DEFAULT 0,
      trigger_type TEXT NOT NULL DEFAULT 'all',
      trigger_context TEXT NOT NULL DEFAULT '',
      trigger_keywords TEXT NOT NULL DEFAULT '',
      comment_action_type TEXT NOT NULL DEFAULT 'none',
      comment_action_text TEXT NOT NULL DEFAULT '',
      dm_action_type TEXT NOT NULL DEFAULT 'none',
      dm_action_text TEXT NOT NULL DEFAULT '',
      dm_require_follow INTEGER NOT NULL DEFAULT 0,
      synced_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sort_index INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_posts_account ON posts(account_username);
    CREATE INDEX IF NOT EXISTS idx_posts_auto_reply ON posts(auto_reply);

    CREATE TABLE IF NOT EXISTS comment_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      comment_id TEXT UNIQUE NOT NULL,
      account_username TEXT NOT NULL,
      shortcode TEXT NOT NULL,
      media_id TEXT NOT NULL DEFAULT '',
      user_id TEXT NOT NULL DEFAULT '',
      username TEXT NOT NULL,
      comment_text TEXT NOT NULL DEFAULT '',
      trigger_matched INTEGER NOT NULL DEFAULT 0,
      comment_reply_status TEXT NOT NULL DEFAULT 'none',
      comment_reply_text TEXT NOT NULL DEFAULT '',
      dm_status TEXT NOT NULL DEFAULT 'none',
      dm_text TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      processed_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_logs_shortcode ON comment_logs(shortcode);
    CREATE INDEX IF NOT EXISTS idx_logs_account ON comment_logs(account_username);
  `);
}

function seedIfEmpty(db: Database.Database) {
  const countRow = db
    .prepare("SELECT COUNT(*) as count FROM accounts")
    .get() as { count: number };

  if (countRow.count > 0) return;

  const now = nowTimestamp();

  const insertAccount = db.prepare(`
    INSERT OR IGNORE INTO accounts (
      username, display_name, avatar_url, bio, followers_text,
      posts_count, status, agent_interval_sec, last_heartbeat_at, updated_at, created_at
    ) VALUES (
      @username, @display_name, @avatar_url, @bio, @followers_text,
      @posts_count, @status, @agent_interval_sec, @last_heartbeat_at, @updated_at, @created_at
    )
  `);

  const insertPost = db.prepare(`
    INSERT OR IGNORE INTO posts (
      account_username, shortcode, media_id, url, post_type, thumbnail_url, caption,
      auto_reply, trigger_type, trigger_context, trigger_keywords,
      comment_action_type, comment_action_text,
      dm_action_type, dm_action_text, dm_require_follow,
      synced_at, updated_at, sort_index
    ) VALUES (
      @account_username, @shortcode, @media_id, @url, @post_type, @thumbnail_url, @caption,
      @auto_reply, @trigger_type, @trigger_context, @trigger_keywords,
      @comment_action_type, @comment_action_text,
      @dm_action_type, @dm_action_text, @dm_require_follow,
      @synced_at, @updated_at, @sort_index
    )
  `);

  const insertLog = db.prepare(`
    INSERT OR IGNORE INTO comment_logs (
      comment_id, account_username, shortcode, media_id, user_id, username,
      comment_text, trigger_matched, comment_reply_status, comment_reply_text,
      dm_status, dm_text, created_at, processed_at
    ) VALUES (
      @comment_id, @account_username, @shortcode, @media_id, @user_id, @username,
      @comment_text, @trigger_matched, @comment_reply_status, @comment_reply_text,
      @dm_status, @dm_text, @created_at, @processed_at
    )
  `);

  const seedTx = db.transaction(() => {
    for (const acc of seedData.accounts) {
      insertAccount.run({
        username: acc.username,
        display_name: acc.display_name,
        avatar_url: acc.avatar_url,
        bio: acc.bio || "",
        followers_text: acc.followers_text || null,
        posts_count: acc.posts_count || 0,
        status: acc.status || "active",
        agent_interval_sec: acc.agent_interval_sec || 120,
        last_heartbeat_at: now,
        updated_at: acc.updated_at || now,
        created_at: now,
      });
    }

    for (const p of seedData.posts) {
      insertPost.run({
        account_username: p.account_username || "r9spoort1",
        shortcode: p.shortcode,
        media_id: "",
        url: p.url || `https://www.instagram.com/${p.account_username}/p/${p.shortcode}/`,
        post_type: p.post_type || "reel",
        thumbnail_url: p.thumbnail_url || "",
        caption: p.caption || "",
        auto_reply: p.auto_reply ? 1 : 0,
        trigger_type: p.trigger_type || "all",
        trigger_context: p.trigger_context || "",
        trigger_keywords: p.trigger_keywords || "",
        comment_action_type: p.comment_action_type || "none",
        comment_action_text: p.comment_action_text || "",
        dm_action_type: p.dm_action_type || "none",
        dm_action_text: p.dm_action_text || "",
        dm_require_follow: p.dm_require_follow ? 1 : 0,
        synced_at: p.synced_at || now,
        updated_at: p.updated_at || now,
        sort_index: typeof p.sort_index === "number" ? p.sort_index : 0,
      });
    }

    for (const log of seedData.logs) {
      insertLog.run({
        comment_id: log.comment_id,
        account_username: log.account_username,
        shortcode: log.shortcode,
        media_id: log.media_id || "",
        user_id: log.user_id || "",
        username: log.username,
        comment_text: log.comment_text || "",
        trigger_matched: log.trigger_matched ? 1 : 0,
        comment_reply_status: log.comment_reply_status || "none",
        comment_reply_text: log.comment_reply_text || "",
        dm_status: log.dm_status || "none",
        dm_text: log.dm_text || "",
        created_at: log.created_at || now,
        processed_at: log.processed_at || now,
      });
    }
  });

  seedTx();
}
