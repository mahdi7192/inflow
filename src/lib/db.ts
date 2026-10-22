import crypto from "crypto";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { hashPassword } from "./auth";

export type BotStatus =
  | "unprovisioned"
  | "provisioning"
  | "login_required"
  | "live"
  | "checkpoint_required"
  | "paused"
  | "error";

export type SessionStatus =
  | "unauthenticated"
  | "active"
  | "reauth_required"
  | "paused"
  | "error";

export interface AccountSessionRow {
  id: number;
  account_username: string;
  encrypted_session_data: string;
  encryption_iv: string;
  encryption_tag: string;
  is_valid: number;
  last_validated_at: string | null;
  updated_at: string;
  created_at: string;
}

export interface AppSettingRow {
  key: string;
  value: string;
  updated_at: string;
}

export interface AccountRow {
  id: number;
  username: string;
  social_account_id?: string | null;
  display_name: string;
  avatar_url: string;
  bio: string;
  followers_text: string | null;
  posts_count: number | null;
  status: "active" | "paused";
  agent_interval_sec: number;
  last_heartbeat_at: string | null;
  session_status?: SessionStatus;
  proxy_url?: string | null;
  last_sync_at?: string | null;
  bot_profile_name?: string | null;
  bot_status?: BotStatus;
  bot_vnc_active?: number;
  bot_vnc_token?: string | null;
  bot_vnc_expires_at?: string | null;
  bot_last_error?: string | null;
  account_persona?: "business" | "creator";
  brand_cheat_sheet?: string;
  website_url?: string;
  insights_json?: string | null;
  updated_at: string;
  created_at: string;
}

export interface BotLifecycleLogRow {
  id: number;
  account_username: string;
  from_status: string | null;
  to_status: string;
  message: string;
  actor: string;
  created_at: string;
}

export interface AccountBotBindingRow {
  id: number;
  account_username: string;
  bot_profile_id: string;
  api_token: string;
  webhook_url: string | null;
  last_heartbeat_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackofficeAccountItem {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  followers_text: string | null;
  posts_count: number;
  status: "active" | "paused";
  session_status?: string | null;
  created_at: string;
  updated_at: string;
  assigned_user: {
    id: number;
    username: string;
    display_name: string;
  } | null;
  bot_binding: {
    bot_profile_id: string;
    api_token: string;
    last_heartbeat_at: string | null;
    created_at: string;
    updated_at: string;
  } | null;
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
  playbook_id?: string;
  cheat_sheet?: string;
  target_url?: string;
  smart_moderation?: number; // 0 or 1
  metrics_json?: string | null;
  app_language?: "fa" | "en" | "ar";
  automation_enabled_at?: string | null;
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
  author_full_name?: string;
  comment_text: string;
  trigger_matched: number; // 0 or 1
  comment_reply_status: "none" | "queued" | "sent" | "failed" | "skipped" | "locked";
  comment_reply_text: string;
  dm_status: "none" | "queued" | "sent" | "pending_follow" | "failed" | "skipped";
  dm_text: string;
  created_at: string;
  processed_at: string;
}

export interface DMAutomationRow {
  id: number;
  account_username: string;
  enabled: number; // 0 or 1
  trigger_type: "all" | "keywords" | "ai_context";
  trigger_context: string;
  trigger_keywords: string;
  reply_mode: "direct" | "ai";
  direct_reply_text: string;
  ai_prompt_instructions: string;
  web_context_urls: string; // JSON array string
  mcp_servers_config: string; // JSON array string
  require_follow: number; // 0 or 1
  follow_prompt_text: string;
  story_handling_mode: string;
  app_language?: "fa" | "en" | "ar";
  activated_at: string | null;
  updated_at: string;
  created_at: string;
}

export interface DMLogRow {
  id: number;
  message_id: string;
  thread_id: string;
  account_username: string;
  sender_username: string;
  sender_full_name?: string;
  sender_id: string;
  incoming_text: string;
  is_story_reply: number; // 0 or 1
  story_id: string | null;
  story_content: string | null;
  trigger_matched: number; // 0 or 1
  reply_status: "none" | "queued" | "sent" | "pending_follow" | "skipped" | "failed" | "locked";
  reply_text: string;
  tools_invoked: string | null; // JSON array string
  error_details: string | null;
  read_at?: string | null;
  processed_at: string;
  created_at: string;
}

export interface IncomingEventRow {
  id: number;
  account_username: string;
  event_type: "comment" | "dm" | "postback" | "mention";
  post_shortcode: string | null;
  post_media_id: string | null;
  event_id: string;
  conversation_id: string | null;
  author_username: string;
  author_full_name: string;
  author_id: string;
  event_text: string;
  payload_json: string | null;
  source: "webhook" | "polling" | "sync";
  event_timestamp: number;
  status: "pending" | "processed" | "skipped" | "failed";
  processed_at: string | null;
  created_at: string;
}

export interface ActionQueueRow {
  id: number;
  dedupe_key: string | null;
  account_username: string;
  social_account_id: string | null;
  event_id: string;
  action_type:
    | "COMMENT_REPLY"
    | "PRIVATE_REPLY"
    | "DM_SEND"
    | "FOLLOW_GATE_PROMPT"
    | "FOLLOW_RETRY_PROMPT";
  target_username: string;
  target_user_id: string | null;
  target_post_shortcode: string | null;
  target_media_id: string | null;
  target_comment_id: string | null;
  target_conversation_id: string | null;
  payload_text: string;
  metadata_json: string | null;
  priority: number;
  scheduled_at: string;
  status: "pending" | "processing" | "sent" | "failed";
  retry_count: number;
  max_retries: number;
  error_message: string | null;
  executed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DMThreadStateRow {
  id: number;
  account_username: string;
  sender_username: string;
  sender_id: string;
  thread_id: string;
  bot_paused: number; // 0 or 1 (Human Takeover)
  paused_by: string;
  updated_at: string;
}

export interface CapturedLeadRow {
  id: number;
  account_username: string;
  sender_username: string;
  sender_full_name: string;
  sender_id: string;
  phone_number: string;
  source_shortcode: string;
  intent_summary: string;
  last_message: string;
  status: "new" | "contacted" | "converted";
  created_at: string;
  updated_at: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "inflow.db");

declare global {
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
  migrateSchema(db);
  // Disabled auto-seeding of mock data
  // seedIfEmpty(db);
  seedUsersIfEmpty(db);
  cleanupStaleAgentJobs(db);

  global.__inflowDb = db;
  return db;
}

function migrateSchema(db: Database.Database) {
  const accountCols = (db.prepare("PRAGMA table_info(accounts)").all() as { name: string }[]).map(c => c.name);
  if (!accountCols.includes("social_account_id")) {
    db.exec("ALTER TABLE accounts ADD COLUMN social_account_id TEXT DEFAULT NULL");
  }
  if (!accountCols.includes("session_status")) {
    db.exec("ALTER TABLE accounts ADD COLUMN session_status TEXT NOT NULL DEFAULT 'unauthenticated'");
  }
  if (!accountCols.includes("proxy_url")) {
    db.exec("ALTER TABLE accounts ADD COLUMN proxy_url TEXT DEFAULT NULL");
  }
  if (!accountCols.includes("last_sync_at")) {
    db.exec("ALTER TABLE accounts ADD COLUMN last_sync_at TEXT DEFAULT NULL");
  }
  if (!accountCols.includes("bot_profile_name")) {
    db.exec("ALTER TABLE accounts ADD COLUMN bot_profile_name TEXT DEFAULT NULL");
  }
  if (!accountCols.includes("bot_status")) {
    db.exec("ALTER TABLE accounts ADD COLUMN bot_status TEXT NOT NULL DEFAULT 'unprovisioned'");
  }
  if (!accountCols.includes("bot_vnc_active")) {
    db.exec("ALTER TABLE accounts ADD COLUMN bot_vnc_active INTEGER NOT NULL DEFAULT 0");
  }
  if (!accountCols.includes("bot_vnc_token")) {
    db.exec("ALTER TABLE accounts ADD COLUMN bot_vnc_token TEXT DEFAULT NULL");
  }
  if (!accountCols.includes("bot_vnc_expires_at")) {
    db.exec("ALTER TABLE accounts ADD COLUMN bot_vnc_expires_at TEXT DEFAULT NULL");
  }
  if (!accountCols.includes("bot_last_error")) {
    db.exec("ALTER TABLE accounts ADD COLUMN bot_last_error TEXT DEFAULT NULL");
  }

  // Drop legacy private-protocol cookie vault table
  try {
    db.exec("DROP TABLE IF EXISTS account_sessions;");
  } catch {
    // ignore
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_accounts_bot_status ON accounts(bot_status);

    CREATE TABLE IF NOT EXISTS bot_lifecycle_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_username TEXT NOT NULL REFERENCES accounts(username) ON DELETE CASCADE,
      from_status TEXT,
      to_status TEXT NOT NULL,
      message TEXT NOT NULL,
      actor TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_bot_logs_account ON bot_lifecycle_logs(account_username, created_at DESC);

    CREATE TABLE IF NOT EXISTS bot_activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_username TEXT NOT NULL,
      event_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_bot_activity_logs_acc ON bot_activity_logs(account_username, created_at DESC);

    CREATE TABLE IF NOT EXISTS dm_automations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_username TEXT UNIQUE NOT NULL REFERENCES accounts(username) ON DELETE CASCADE,
      enabled INTEGER NOT NULL DEFAULT 0,
      trigger_type TEXT NOT NULL DEFAULT 'all',
      trigger_context TEXT NOT NULL DEFAULT '',
      trigger_keywords TEXT NOT NULL DEFAULT '',
      reply_mode TEXT NOT NULL DEFAULT 'direct',
      direct_reply_text TEXT NOT NULL DEFAULT '',
      ai_prompt_instructions TEXT NOT NULL DEFAULT '',
      web_context_urls TEXT NOT NULL DEFAULT '[]',
      mcp_servers_config TEXT NOT NULL DEFAULT '[]',
      require_follow INTEGER NOT NULL DEFAULT 0,
      follow_prompt_text TEXT NOT NULL DEFAULT 'سلام! برای دریافت پاسخ و مشاوره کامل، لطفاً ابتدا پیج را فالو کنید 🙏',
      story_handling_mode TEXT NOT NULL DEFAULT 'auto',
      crawl_depth INTEGER NOT NULL DEFAULT 2,
      crawl_max_pages INTEGER NOT NULL DEFAULT 40,
      crawl_spa_enabled INTEGER NOT NULL DEFAULT 1,
      crawl_last_status TEXT NOT NULL DEFAULT 'idle',
      crawl_last_at TEXT DEFAULT NULL,
      crawl_pages_count INTEGER NOT NULL DEFAULT 0,
      activated_at TEXT DEFAULT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_dm_automations_account ON dm_automations(account_username);

    CREATE TABLE IF NOT EXISTS dm_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT UNIQUE NOT NULL,
      thread_id TEXT NOT NULL,
      account_username TEXT NOT NULL REFERENCES accounts(username) ON DELETE CASCADE,
      sender_username TEXT NOT NULL,
      sender_id TEXT NOT NULL DEFAULT '',
      incoming_text TEXT NOT NULL DEFAULT '',
      is_story_reply INTEGER NOT NULL DEFAULT 0,
      story_id TEXT DEFAULT NULL,
      story_content TEXT DEFAULT NULL,
      trigger_matched INTEGER NOT NULL DEFAULT 1,
      reply_status TEXT NOT NULL DEFAULT 'sent',
      reply_text TEXT NOT NULL DEFAULT '',
      tools_invoked TEXT DEFAULT NULL,
      error_details TEXT DEFAULT NULL,
      processed_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_dm_logs_message_id ON dm_logs(message_id);
    CREATE INDEX IF NOT EXISTS idx_dm_logs_account_thread ON dm_logs(account_username, thread_id);
    CREATE INDEX IF NOT EXISTS idx_dm_logs_sender ON dm_logs(sender_username, reply_status);
    CREATE INDEX IF NOT EXISTS idx_dm_logs_processed_at ON dm_logs(processed_at DESC);
  `);

  const dmCols = (db.prepare("PRAGMA table_info(dm_automations)").all() as { name: string }[]).map(c => c.name);
  if (!dmCols.includes("activated_at")) {
    db.exec("ALTER TABLE dm_automations ADD COLUMN activated_at TEXT DEFAULT NULL");
  }
  if (!dmCols.includes("app_language")) {
    db.exec("ALTER TABLE dm_automations ADD COLUMN app_language TEXT NOT NULL DEFAULT 'fa'");
  }

  const postCols = (db.prepare("PRAGMA table_info(posts)").all() as { name: string }[]).map(c => c.name);
  if (!postCols.includes("automation_enabled_at")) {
    db.exec("ALTER TABLE posts ADD COLUMN automation_enabled_at TEXT DEFAULT NULL");
  }
  if (!postCols.includes("app_language")) {
    db.exec("ALTER TABLE posts ADD COLUMN app_language TEXT NOT NULL DEFAULT 'fa'");
  }
  if (!postCols.includes("playbook_id")) {
    db.exec("ALTER TABLE posts ADD COLUMN playbook_id TEXT NOT NULL DEFAULT 'custom'");
  }
  if (!postCols.includes("cheat_sheet")) {
    db.exec("ALTER TABLE posts ADD COLUMN cheat_sheet TEXT NOT NULL DEFAULT ''");
  }
  if (!postCols.includes("target_url")) {
    db.exec("ALTER TABLE posts ADD COLUMN target_url TEXT NOT NULL DEFAULT ''");
  }
  if (!postCols.includes("smart_moderation")) {
    db.exec("ALTER TABLE posts ADD COLUMN smart_moderation INTEGER NOT NULL DEFAULT 0");
  }
  if (!postCols.includes("metrics_json")) {
    db.exec("ALTER TABLE posts ADD COLUMN metrics_json TEXT DEFAULT NULL");
  }

  const accountSpec018Cols = (db.prepare("PRAGMA table_info(accounts)").all() as { name: string }[]).map(c => c.name);
  if (!accountSpec018Cols.includes("account_persona")) {
    db.exec("ALTER TABLE accounts ADD COLUMN account_persona TEXT NOT NULL DEFAULT 'business'");
  }
  if (!accountSpec018Cols.includes("brand_cheat_sheet")) {
    db.exec("ALTER TABLE accounts ADD COLUMN brand_cheat_sheet TEXT NOT NULL DEFAULT ''");
  }
  if (!accountSpec018Cols.includes("website_url")) {
    db.exec("ALTER TABLE accounts ADD COLUMN website_url TEXT NOT NULL DEFAULT ''");
  }
  if (!accountSpec018Cols.includes("insights_json")) {
    db.exec("ALTER TABLE accounts ADD COLUMN insights_json TEXT DEFAULT NULL");
  }

  const commentLogCols = (db.prepare("PRAGMA table_info(comment_logs)").all() as { name: string }[]).map(c => c.name);
  if (!commentLogCols.includes("author_full_name")) {
    db.exec("ALTER TABLE comment_logs ADD COLUMN author_full_name TEXT NOT NULL DEFAULT ''");
  }

  const dmLogCols = (db.prepare("PRAGMA table_info(dm_logs)").all() as { name: string }[]).map(c => c.name);
  if (!dmLogCols.includes("sender_full_name")) {
    db.exec("ALTER TABLE dm_logs ADD COLUMN sender_full_name TEXT NOT NULL DEFAULT ''");
  }
  if (!dmLogCols.includes("read_at")) {
    db.exec("ALTER TABLE dm_logs ADD COLUMN read_at TEXT DEFAULT NULL");
  }

  // Ensure incoming_events & action_queue tables and columns exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS incoming_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_username TEXT NOT NULL,
      event_type TEXT NOT NULL DEFAULT 'comment',
      post_shortcode TEXT,
      post_media_id TEXT,
      event_id TEXT UNIQUE NOT NULL,
      conversation_id TEXT DEFAULT NULL,
      author_username TEXT NOT NULL,
      author_full_name TEXT NOT NULL DEFAULT '',
      author_id TEXT NOT NULL DEFAULT '',
      event_text TEXT NOT NULL DEFAULT '',
      payload_json TEXT DEFAULT NULL,
      source TEXT NOT NULL DEFAULT 'webhook',
      event_timestamp INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      processed_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_incoming_events_event_id ON incoming_events(event_id);
    CREATE INDEX IF NOT EXISTS idx_incoming_events_account_status ON incoming_events(account_username, status);

    CREATE TABLE IF NOT EXISTS action_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dedupe_key TEXT DEFAULT NULL,
      account_username TEXT NOT NULL,
      social_account_id TEXT DEFAULT NULL,
      event_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      target_username TEXT NOT NULL,
      target_user_id TEXT DEFAULT NULL,
      target_post_shortcode TEXT,
      target_media_id TEXT,
      target_comment_id TEXT,
      target_conversation_id TEXT DEFAULT NULL,
      payload_text TEXT NOT NULL,
      metadata_json TEXT DEFAULT NULL,
      priority INTEGER NOT NULL DEFAULT 1,
      scheduled_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 3,
      error_message TEXT,
      executed_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_action_queue_status_sched ON action_queue(status, scheduled_at, priority, id);
    CREATE INDEX IF NOT EXISTS idx_action_queue_account_status ON action_queue(account_username, status, updated_at);
  `);

  const incCols = (db.prepare("PRAGMA table_info(incoming_events)").all() as { name: string }[]).map(c => c.name);
  if (!incCols.includes("conversation_id")) {
    db.exec("ALTER TABLE incoming_events ADD COLUMN conversation_id TEXT DEFAULT NULL");
  }
  if (!incCols.includes("author_full_name")) {
    db.exec("ALTER TABLE incoming_events ADD COLUMN author_full_name TEXT NOT NULL DEFAULT ''");
  }
  if (!incCols.includes("payload_json")) {
    db.exec("ALTER TABLE incoming_events ADD COLUMN payload_json TEXT DEFAULT NULL");
  }
  if (!incCols.includes("source")) {
    db.exec("ALTER TABLE incoming_events ADD COLUMN source TEXT NOT NULL DEFAULT 'webhook'");
  }
  if (!incCols.includes("processed_at")) {
    db.exec("ALTER TABLE incoming_events ADD COLUMN processed_at TEXT DEFAULT NULL");
  }

  const aqCols = (db.prepare("PRAGMA table_info(action_queue)").all() as { name: string }[]).map(c => c.name);
  if (!aqCols.includes("dedupe_key")) {
    db.exec("ALTER TABLE action_queue ADD COLUMN dedupe_key TEXT DEFAULT NULL");
  }
  if (!aqCols.includes("social_account_id")) {
    db.exec("ALTER TABLE action_queue ADD COLUMN social_account_id TEXT DEFAULT NULL");
  }
  if (!aqCols.includes("target_user_id")) {
    db.exec("ALTER TABLE action_queue ADD COLUMN target_user_id TEXT DEFAULT NULL");
  }
  if (!aqCols.includes("target_conversation_id")) {
    db.exec("ALTER TABLE action_queue ADD COLUMN target_conversation_id TEXT DEFAULT NULL");
  }
  if (!aqCols.includes("metadata_json")) {
    db.exec("ALTER TABLE action_queue ADD COLUMN metadata_json TEXT DEFAULT NULL");
  }
  if (!aqCols.includes("executed_at")) {
    db.exec("ALTER TABLE action_queue ADD COLUMN executed_at TEXT DEFAULT NULL");
  }

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_action_queue_dedupe_key
    ON action_queue(dedupe_key)
    WHERE dedupe_key IS NOT NULL;

    CREATE TABLE IF NOT EXISTS dm_thread_states (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_username TEXT NOT NULL,
      sender_username TEXT NOT NULL,
      sender_id TEXT NOT NULL DEFAULT '',
      thread_id TEXT NOT NULL DEFAULT '',
      bot_paused INTEGER NOT NULL DEFAULT 0,
      paused_by TEXT NOT NULL DEFAULT 'admin',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(account_username, sender_username)
    );
    CREATE INDEX IF NOT EXISTS idx_dm_thread_states_acc_user ON dm_thread_states(account_username, sender_username);

    CREATE TABLE IF NOT EXISTS captured_leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_username TEXT NOT NULL,
      sender_username TEXT NOT NULL,
      sender_full_name TEXT NOT NULL DEFAULT '',
      sender_id TEXT NOT NULL DEFAULT '',
      phone_number TEXT NOT NULL DEFAULT '',
      source_shortcode TEXT NOT NULL DEFAULT '',
      intent_summary TEXT NOT NULL DEFAULT '',
      last_message TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(account_username, sender_username, phone_number)
    );
    CREATE INDEX IF NOT EXISTS idx_captured_leads_account ON captured_leads(account_username, updated_at DESC);
  `);

  // Drop deprecated dm_knowledge_pages table if exists
  try {
    db.exec("DROP TABLE IF EXISTS dm_knowledge_pages;");
  } catch {
    // ignore
  }
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      social_account_id TEXT DEFAULT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      bio TEXT NOT NULL DEFAULT '',
      followers_text TEXT,
      posts_count INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      agent_interval_sec INTEGER NOT NULL DEFAULT 120,
      last_heartbeat_at TEXT,
      bot_profile_name TEXT DEFAULT NULL,
      bot_status TEXT NOT NULL DEFAULT 'unprovisioned',
      bot_vnc_active INTEGER NOT NULL DEFAULT 0,
      bot_vnc_token TEXT DEFAULT NULL,
      bot_vnc_expires_at TEXT DEFAULT NULL,
      bot_last_error TEXT DEFAULT NULL,
      session_status TEXT NOT NULL DEFAULT 'unauthenticated',
      proxy_url TEXT DEFAULT NULL,
      last_sync_at TEXT DEFAULT NULL,
      updated_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
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

    CREATE TABLE IF NOT EXISTS dm_automations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_username TEXT UNIQUE NOT NULL REFERENCES accounts(username) ON DELETE CASCADE,
      enabled INTEGER NOT NULL DEFAULT 0,
      trigger_type TEXT NOT NULL DEFAULT 'all',
      trigger_context TEXT NOT NULL DEFAULT '',
      trigger_keywords TEXT NOT NULL DEFAULT '',
      reply_mode TEXT NOT NULL DEFAULT 'direct',
      direct_reply_text TEXT NOT NULL DEFAULT '',
      ai_prompt_instructions TEXT NOT NULL DEFAULT '',
      web_context_urls TEXT NOT NULL DEFAULT '[]',
      mcp_servers_config TEXT NOT NULL DEFAULT '[]',
      require_follow INTEGER NOT NULL DEFAULT 0,
      follow_prompt_text TEXT NOT NULL DEFAULT 'سلام! برای دریافت پاسخ و مشاوره کامل، لطفاً ابتدا پیج را فالو کنید 🙏',
      story_handling_mode TEXT NOT NULL DEFAULT 'auto',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_dm_automations_account ON dm_automations(account_username);

    CREATE TABLE IF NOT EXISTS dm_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT UNIQUE NOT NULL,
      thread_id TEXT NOT NULL,
      account_username TEXT NOT NULL REFERENCES accounts(username) ON DELETE CASCADE,
      sender_username TEXT NOT NULL,
      sender_id TEXT NOT NULL DEFAULT '',
      incoming_text TEXT NOT NULL DEFAULT '',
      is_story_reply INTEGER NOT NULL DEFAULT 0,
      story_id TEXT DEFAULT NULL,
      story_content TEXT DEFAULT NULL,
      trigger_matched INTEGER NOT NULL DEFAULT 1,
      reply_status TEXT NOT NULL DEFAULT 'sent',
      reply_text TEXT NOT NULL DEFAULT '',
      tools_invoked TEXT DEFAULT NULL,
      error_details TEXT DEFAULT NULL,
      processed_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_dm_logs_message_id ON dm_logs(message_id);
    CREATE INDEX IF NOT EXISTS idx_dm_logs_account_thread ON dm_logs(account_username, thread_id);
    CREATE INDEX IF NOT EXISTS idx_dm_logs_sender ON dm_logs(sender_username, reply_status);
    CREATE INDEX IF NOT EXISTS idx_dm_logs_processed_at ON dm_logs(processed_at DESC);

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      display_name TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'tenant' CHECK(role IN ('superadmin', 'tenant')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended')),
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_token TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at);

    CREATE TABLE IF NOT EXISTS user_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_username TEXT UNIQUE NOT NULL REFERENCES accounts(username) ON DELETE CASCADE,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_user_accounts_user_id ON user_accounts(user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_accounts_account ON user_accounts(account_username);

    CREATE TABLE IF NOT EXISTS agent_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_username TEXT NOT NULL,
      job_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      payload TEXT DEFAULT '{}',
      result_summary TEXT DEFAULT NULL,
      error_message TEXT DEFAULT NULL,
      created_at TEXT NOT NULL,
      started_at TEXT DEFAULT NULL,
      completed_at TEXT DEFAULT NULL,
      FOREIGN KEY (account_username) REFERENCES accounts(username) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_agent_jobs_account_status 
      ON agent_jobs (account_username, status);
    CREATE INDEX IF NOT EXISTS idx_agent_jobs_created 
      ON agent_jobs (created_at DESC);

    CREATE TABLE IF NOT EXISTS account_bot_bindings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_username TEXT UNIQUE NOT NULL,
      bot_profile_id TEXT NOT NULL,
      api_token TEXT UNIQUE NOT NULL,
      webhook_url TEXT DEFAULT NULL,
      last_heartbeat_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (account_username) REFERENCES accounts(username) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_account_bot_token 
      ON account_bot_bindings (api_token);
  `);
}

function getSeedData() {
  const seedPath = path.join(process.cwd(), "src", "lib", "seed-data.json");
  if (fs.existsSync(seedPath)) {
    try {
      return JSON.parse(fs.readFileSync(seedPath, "utf-8"));
    } catch {
      return { accounts: [], posts: [], logs: [] };
    }
  }
  return { accounts: [], posts: [], logs: [] };
}

function seedIfEmpty(db: Database.Database) {
  const countRow = db
    .prepare("SELECT COUNT(*) as count FROM accounts")
    .get() as { count: number };

  if (countRow.count > 0) return;

  const seedData = getSeedData();
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

function seedUsersIfEmpty(db: Database.Database) {
  const userCountRow = db
    .prepare("SELECT COUNT(*) as count FROM users")
    .get() as { count: number };

  if (userCountRow.count > 0) return;

  const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || "Admin@inFlow2026!";
  const passwordHash = hashPassword(initialPassword);
  const now = nowTimestamp();

  const insertUser = db.prepare(`
    INSERT INTO users (username, display_name, password_hash, role, status, created_at, updated_at)
    VALUES (?, ?, ?, 'superadmin', 'active', ?, ?)
  `);
  const info = insertUser.run("admin", "Platform Administrator", passwordHash, now, now);
  const adminId = Number(info.lastInsertRowid);

  // Assign existing seed accounts to admin so demo works out of the box
  const accounts = db.prepare("SELECT username FROM accounts").all() as { username: string }[];
  const assignStmt = db.prepare(`
    INSERT OR IGNORE INTO user_accounts (user_id, account_username, created_at)
    VALUES (?, ?, ?)
  `);

  for (const acc of accounts) {
    assignStmt.run(adminId, acc.username, now);
  }
}

function seedBotBindingsIfEmpty(db: Database.Database) {
  const bindingCount = db
    .prepare("SELECT COUNT(*) as count FROM account_bot_bindings")
    .get() as { count: number };

  if (bindingCount.count > 0) return;

  const accounts = db.prepare("SELECT username FROM accounts").all() as { username: string }[];
  const now = nowTimestamp();

  const insertBinding = db.prepare(`
    INSERT OR IGNORE INTO account_bot_bindings (
      account_username, bot_profile_id, api_token, webhook_url, last_heartbeat_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const acc of accounts) {
    const token = acc.username === "r9spoort1" ? "inflow_bot_test_key_123" : `inflow_bot_${acc.username}_key`;
    insertBinding.run(
      acc.username,
      `hermes_${acc.username}`,
      token,
      `http://127.0.0.1:8000/webhook/${acc.username}`,
      now,
      now,
      now
    );
  }
}

export function cleanupStaleAgentJobs(db: Database.Database = getDb()): number {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    .toISOString()
    .replace("T", " ")
    .slice(0, 19);

  const res = db.prepare(`
    UPDATE agent_jobs
    SET status = 'timed_out',
        error_message = 'Job timed out after 5 minutes without completion',
        completed_at = datetime('now')
    WHERE status IN ('pending', 'running')
      AND created_at < ?
  `).run(fiveMinutesAgo);

  return res.changes;
}

export function generateApiToken(): string {
  return "inf_" + crypto.randomBytes(24).toString("hex");
}

export function createAccountMinimal(
  usernameInput: string,
  initialUserId?: number | null
): { account: AccountRow; binding: AccountBotBindingRow; assigned_user_id: number | null } {
  const db = getDb();
  const username = usernameInput.trim().toLowerCase().replace(/^@/, "");

  if (!/^[a-zA-Z0-9._]{1,30}$/.test(username)) {
    throw new Error("INVALID_USERNAME");
  }

  const existing = db.prepare("SELECT username FROM accounts WHERE username = ?").get(username);
  if (existing) {
    throw new Error("ACCOUNT_EXISTS");
  }

  const now = nowTimestamp();
  const token = generateApiToken();
  const botProfileId = `hermes-${username}`;

  const createTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO accounts (
        username, display_name, avatar_url, bio, followers_text, posts_count, status, agent_interval_sec, updated_at, created_at
      ) VALUES (?, '', '', '', NULL, 0, 'active', 120, ?, ?)
    `).run(username, now, now);

    db.prepare(`
      INSERT INTO account_bot_bindings (
        account_username, bot_profile_id, api_token, webhook_url, last_heartbeat_at, created_at, updated_at
      ) VALUES (?, ?, ?, NULL, NULL, ?, ?)
    `).run(username, botProfileId, token, now, now);

    if (initialUserId) {
      db.prepare(`
        INSERT OR REPLACE INTO user_accounts (user_id, account_username, created_at)
        VALUES (?, ?, ?)
      `).run(initialUserId, username, now);
    }
  });

  createTx();

  const account = db.prepare("SELECT * FROM accounts WHERE username = ?").get(username) as AccountRow;
  const binding = db.prepare("SELECT * FROM account_bot_bindings WHERE account_username = ?").get(username) as AccountBotBindingRow;

  return { account, binding, assigned_user_id: initialUserId || null };
}

export function getOrCreateAccountBotBinding(accountUsername: string): AccountBotBindingRow {
  const db = getDb();
  let binding = db.prepare("SELECT * FROM account_bot_bindings WHERE account_username = ?").get(accountUsername) as AccountBotBindingRow | undefined;
  if (!binding) {
    const now = nowTimestamp();
    const token = generateApiToken();
    const botProfileId = `hermes-${accountUsername}`;
    db.prepare(`
      INSERT OR IGNORE INTO account_bot_bindings (
        account_username, bot_profile_id, api_token, webhook_url, last_heartbeat_at, created_at, updated_at
      ) VALUES (?, ?, ?, NULL, NULL, ?, ?)
    `).run(accountUsername, botProfileId, token, now, now);
    binding = db.prepare("SELECT * FROM account_bot_bindings WHERE account_username = ?").get(accountUsername) as AccountBotBindingRow;
  }
  return binding;
}

export function getBackofficeAccounts(): BackofficeAccountItem[] {
  const db = getDb();
  interface AccountQueryRow {
    id: number;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    followers_text: string | null;
    posts_count: number | null;
    status: "active" | "paused";
    session_status: string | null;
    created_at: string;
    updated_at: string;
    user_id: number | null;
    user_name: string | null;
    user_display_name: string | null;
    bot_profile_id: string | null;
    api_token: string | null;
    last_heartbeat_at: string | null;
    binding_created_at: string | null;
    binding_updated_at: string | null;
  }

  const accounts = db.prepare(`
    SELECT 
      a.id, a.username, a.display_name, a.avatar_url, a.bio, a.followers_text, a.posts_count, a.status, a.session_status, a.created_at, a.updated_at,
      u.id as user_id, u.username as user_name, u.display_name as user_display_name,
      b.bot_profile_id, b.api_token, b.last_heartbeat_at, b.created_at as binding_created_at, b.updated_at as binding_updated_at
    FROM accounts a
    LEFT JOIN user_accounts ua ON a.username = ua.account_username
    LEFT JOIN users u ON ua.user_id = u.id
    LEFT JOIN account_bot_bindings b ON a.username = b.account_username
    ORDER BY a.id ASC
  `).all() as AccountQueryRow[];

  return accounts.map((r) => {
    // If binding is missing for an existing legacy account, ensure it has one
    let binding = r.bot_profile_id
      ? {
          bot_profile_id: r.bot_profile_id,
          api_token: r.api_token || "",
          last_heartbeat_at: r.last_heartbeat_at,
          created_at: r.binding_created_at || "",
          updated_at: r.binding_updated_at || "",
        }
      : null;

    if (!binding) {
      const generated = getOrCreateAccountBotBinding(r.username);
      binding = {
        bot_profile_id: generated.bot_profile_id,
        api_token: generated.api_token,
        last_heartbeat_at: generated.last_heartbeat_at,
        created_at: generated.created_at,
        updated_at: generated.updated_at,
      };
    }

    return {
      id: r.id,
      username: r.username,
      display_name: r.display_name || "",
      avatar_url: r.avatar_url || "",
      bio: r.bio || "",
      followers_text: r.followers_text || null,
      posts_count: r.posts_count || 0,
      status: r.status,
      session_status: r.session_status || "unauthenticated",
      created_at: r.created_at,
      updated_at: r.updated_at,
      assigned_user: r.user_id
        ? {
            id: r.user_id,
            username: r.user_name || "",
            display_name: r.user_display_name || "",
          }
        : null,
      bot_binding: binding,
    };
  });
}

export function getAccountBotBinding(accountUsername: string): AccountBotBindingRow | null {
  const db = getDb();
  return (db.prepare("SELECT * FROM account_bot_bindings WHERE account_username = ?").get(accountUsername) as AccountBotBindingRow) || null;
}

export function regenerateAccountToken(accountUsername: string): { api_token: string; updated_at: string } {
  const db = getDb();
  // Ensure binding exists
  getOrCreateAccountBotBinding(accountUsername);

  const newToken = generateApiToken();
  const now = nowTimestamp();

  db.prepare(`
    UPDATE account_bot_bindings 
    SET api_token = ?, updated_at = ? 
    WHERE account_username = ?
  `).run(newToken, now, accountUsername);

  return { api_token: newToken, updated_at: now };
}

export function assignAccountToUser(accountUsername: string, userId: number | null): void {
  const db = getDb();
  if (userId === null || userId === undefined || userId <= 0) {
    db.prepare("DELETE FROM user_accounts WHERE account_username = ?").run(accountUsername);
  } else {
    const now = nowTimestamp();
    db.prepare(`
      INSERT INTO user_accounts (user_id, account_username, created_at)
      VALUES (?, ?, ?)
      ON CONFLICT(account_username) DO UPDATE SET user_id = excluded.user_id
    `).run(userId, accountUsername, now);
  }
}

export function deleteAccount(accountUsername: string): void {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM accounts WHERE username = ?").run(accountUsername);
    db.prepare("DELETE FROM dm_automations WHERE account_username = ?").run(accountUsername);
    db.prepare("DELETE FROM dm_logs WHERE account_username = ?").run(accountUsername);
    db.prepare("DELETE FROM account_bot_bindings WHERE account_username = ?").run(accountUsername);
    db.prepare("DELETE FROM user_accounts WHERE account_username = ?").run(accountUsername);
    db.prepare("DELETE FROM posts WHERE account_username = ?").run(accountUsername);
    db.prepare("DELETE FROM comment_logs WHERE account_username = ?").run(accountUsername);
    db.prepare("DELETE FROM agent_jobs WHERE account_username = ?").run(accountUsername);
    db.prepare("DELETE FROM bot_lifecycle_logs WHERE account_username = ?").run(accountUsername);
    db.prepare("DELETE FROM bot_activity_logs WHERE account_username = ?").run(accountUsername);
  });
  tx();
}

export interface SocialApiConfig {
  apiKey: string;
  hasKey: boolean;
  baseUrl: string;
  webhookSecret: string;
  webhookId: string;
}

export function getSocialApiConfig(): SocialApiConfig {
  const db = getDb();
  let apiKey = process.env.SOCIAL_API_KEY || process.env.SOCAPI_KEY || "";
  let baseUrl = process.env.SOCIAL_API_BASE_URL || "https://api.social-api.ai";
  let webhookSecret = process.env.SOCIAL_WEBHOOK_SECRET || "";
  let webhookId = process.env.SOCIAL_WEBHOOK_ID || "";

  try {
    const rows = db
      .prepare(
        "SELECT key, value FROM app_settings WHERE key IN ('social_api_key', 'social_api_base_url', 'social_webhook_secret', 'social_webhook_id')"
      )
      .all() as AppSettingRow[];

    for (const r of rows) {
      if (r.key === "social_api_key" && r.value) apiKey = r.value;
      else if (r.key === "social_api_base_url" && r.value) baseUrl = r.value;
      else if (r.key === "social_webhook_secret" && r.value) webhookSecret = r.value;
      else if (r.key === "social_webhook_id" && r.value) webhookId = r.value;
    }
  } catch (err) {
    console.error("[db] Error reading SocialAPI settings:", err);
  }

  return {
    apiKey: apiKey.trim(),
    hasKey: Boolean(apiKey && apiKey.trim().length > 5),
    baseUrl: baseUrl.replace(/\/+$/, ""),
    webhookSecret: webhookSecret.trim(),
    webhookId: webhookId.trim(),
  };
}

export function saveSocialApiConfig(params: {
  apiKey?: string;
  baseUrl?: string;
  webhookSecret?: string;
  webhookId?: string;
}): void {
  const db = getDb();
  const now = nowTimestamp();
  const upsert = db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);

  db.transaction(() => {
    if (params.apiKey !== undefined && params.apiKey.trim().length > 0) {
      upsert.run("social_api_key", params.apiKey.trim(), now);
    }
    if (params.baseUrl !== undefined && params.baseUrl.trim().length > 0) {
      upsert.run("social_api_base_url", params.baseUrl.trim().replace(/\/+$/, ""), now);
    }
    if (params.webhookSecret !== undefined) {
      upsert.run("social_webhook_secret", params.webhookSecret.trim(), now);
    }
    if (params.webhookId !== undefined) {
      upsert.run("social_webhook_id", params.webhookId.trim(), now);
    }
  })();
}

export function validateAccountToken(token: string): { account_username: string; bot_profile_id: string } | null {
  if (!token) return null;
  const db = getDb();
  const binding = db.prepare(`
    SELECT account_username, bot_profile_id 
    FROM account_bot_bindings 
    WHERE api_token = ?
  `).get(token) as { account_username: string; bot_profile_id: string } | undefined;

  if (!binding) return null;

  const now = nowTimestamp();
  db.prepare("UPDATE account_bot_bindings SET last_heartbeat_at = ? WHERE api_token = ?").run(now, token);
  return binding;
}

export function updateAccountProfileFromAgent(
  accountUsername: string,
  data: { display_name?: string; avatar_url?: string; bio?: string; followers_text?: string }
): void {
  const db = getDb();
  const now = nowTimestamp();
  db.prepare(`
    UPDATE accounts 
    SET display_name = COALESCE(?, display_name),
        avatar_url = COALESCE(?, avatar_url),
        bio = COALESCE(?, bio),
        followers_text = COALESCE(?, followers_text),
        updated_at = ?
    WHERE username = ?
  `).run(
    data.display_name !== undefined ? data.display_name : null,
    data.avatar_url !== undefined ? data.avatar_url : null,
    data.bio !== undefined ? data.bio : null,
    data.followers_text !== undefined ? data.followers_text : null,
    now,
    accountUsername
  );
}

export function getAccountBotStatus(accountUsername: string) {
  const db = getDb();
  const row = db.prepare(`
    SELECT username, bot_profile_name, bot_status, bot_vnc_active, bot_vnc_token, bot_vnc_expires_at, bot_last_error, last_heartbeat_at
    FROM accounts WHERE username = ?
  `).get(accountUsername) as {
    username: string;
    bot_profile_name: string | null;
    bot_status: BotStatus;
    bot_vnc_active: number;
    bot_vnc_token: string | null;
    bot_vnc_expires_at: string | null;
    bot_last_error: string | null;
    last_heartbeat_at: string | null;
  } | undefined;

  if (!row) return null;

  // Auto-cleanup expired VNC session
  if (row.bot_vnc_active && row.bot_vnc_expires_at) {
    const expiresAt = new Date(row.bot_vnc_expires_at).getTime();
    if (Date.now() > expiresAt) {
      db.prepare(`
        UPDATE accounts
        SET bot_vnc_active = 0, bot_vnc_token = NULL, bot_vnc_expires_at = NULL
        WHERE username = ?
      `).run(accountUsername);
      row.bot_vnc_active = 0;
      row.bot_vnc_token = null;
      row.bot_vnc_expires_at = null;
    }
  }

  return row;
}

export function updateAccountBotStatus(
  accountUsername: string,
  newStatus: BotStatus,
  message: string,
  actor: "system" | "user" | "agent" = "system",
  lastError: string | null = null,
  botProfileName: string | null = null
) {
  const db = getDb();
  const current = db.prepare("SELECT bot_status, bot_profile_name FROM accounts WHERE username = ?").get(accountUsername) as { bot_status: string; bot_profile_name: string | null } | undefined;
  const fromStatus = current?.bot_status || null;
  const profileName = botProfileName || current?.bot_profile_name || `inflow_${accountUsername}`;

  db.prepare(`
    UPDATE accounts
    SET bot_status = ?, bot_profile_name = ?, bot_last_error = ?, updated_at = datetime('now')
    WHERE username = ?
  `).run(newStatus, profileName, lastError, accountUsername);

  db.prepare(`
    INSERT INTO bot_lifecycle_logs (account_username, from_status, to_status, message, actor)
    VALUES (?, ?, ?, ?, ?)
  `).run(accountUsername, fromStatus, newStatus, message, actor);
}

export function setAccountVncSession(accountUsername: string, token: string, expiresAt: string) {
  const db = getDb();
  db.prepare(`
    UPDATE accounts
    SET bot_vnc_active = 1, bot_vnc_token = ?, bot_vnc_expires_at = ?, updated_at = datetime('now')
    WHERE username = ?
  `).run(token, expiresAt, accountUsername);
}

export function clearAccountVncSession(accountUsername: string) {
  const db = getDb();
  db.prepare(`
    UPDATE accounts
    SET bot_vnc_active = 0, bot_vnc_token = NULL, bot_vnc_expires_at = NULL, updated_at = datetime('now')
    WHERE username = ?
  `).run(accountUsername);
}

export function getBotLifecycleLogs(accountUsername: string, limit: number = 20): BotLifecycleLogRow[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM bot_lifecycle_logs
    WHERE account_username = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(accountUsername, limit) as BotLifecycleLogRow[];
}

export interface UnifiedBotActivityLog {
  id: string;
  category: "scan" | "comment" | "reply" | "dm" | "lifecycle" | "error" | "warning";
  title: string;
  description: string;
  badge?: {
    text: string;
    variant: "default" | "success" | "warning" | "destructive" | "secondary";
  };
  metadata?: Record<string, any>;
  created_at: string;
}

export function logBotActivity(
  accountUsername: string,
  eventType: string,
  title: string,
  description: string = "",
  metadata: any = {}
) {
  const db = getDb();
  const metaStr = typeof metadata === "string" ? metadata : JSON.stringify(metadata || {});
  db.prepare(`
    INSERT INTO bot_activity_logs (account_username, event_type, title, description, metadata)
    VALUES (?, ?, ?, ?, ?)
  `).run(accountUsername, eventType, title, description, metaStr);
}

export function getUnifiedBotActivityLogs(accountUsername: string, limit: number = 25): UnifiedBotActivityLog[] {
  const db = getDb();
  const items: UnifiedBotActivityLog[] = [];

  try {
    // 1. Bot activity logs (scans, worker events, system notices)
    const actRows = db.prepare(`
      SELECT * FROM bot_activity_logs
      WHERE account_username = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(accountUsername, limit) as Array<{
      id: number;
      account_username: string;
      event_type: string;
      title: string;
      description: string;
      metadata: string;
      created_at: string;
    }>;

    for (const r of actRows) {
      let meta = {};
      try { meta = JSON.parse(r.metadata || "{}"); } catch {}
      let variant: "default" | "success" | "warning" | "destructive" | "secondary" = "secondary";
      if (r.event_type === "error" || r.event_type.includes("failed")) variant = "destructive";
      else if (r.event_type === "warning") variant = "warning";
      else if (r.event_type === "dm_sent" || r.event_type === "reply_sent" || r.event_type === "trigger_match") variant = "success";
      
      let badgeText = "سیستم";
      if (r.event_type === "scan") badgeText = "سرکشی و پایش";
      else if (r.event_type === "trigger_match") badgeText = "تطابق هوش مصنوعی";
      else if (r.event_type === "dm_sent") badgeText = "دایرکت ارسال شد";
      else if (r.event_type === "dm_failed") badgeText = "خطای دایرکت";
      else if (r.event_type === "reply_sent") badgeText = "پاسخ کامنت ارسال شد";
      else if (r.event_type === "reply_failed") badgeText = "خطای کامنت";
      else if (r.event_type === "warning") badgeText = "هشدار";
      else if (r.event_type === "error") badgeText = "خطا";

      items.push({
        id: `act-${r.id}`,
        category: (r.event_type as any) || "scan",
        title: r.title,
        description: r.description,
        badge: { text: badgeText, variant },
        metadata: meta,
        created_at: r.created_at,
      });
    }
  } catch {}

  try {
    // 2. Comment & automation interaction logs
    const commentRows = db.prepare(`
      SELECT * FROM comment_logs
      WHERE account_username = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(accountUsername, limit) as Array<{
      id: number;
      comment_id: string;
      shortcode: string;
      username: string;
      comment_text: string;
      trigger_matched: number;
      comment_reply_status: string;
      comment_reply_text: string;
      dm_status: string;
      dm_text: string;
      created_at: string;
    }>;

    for (const c of commentRows) {
      const isMatched = Boolean(c.trigger_matched);
      let desc = `متن کامنت: «${c.comment_text}»\n`;
      if (isMatched) {
        const dmFa = c.dm_status === "sent" ? "ارسال شد ✅" : c.dm_status === "failed" ? "ناموفق ❌" : c.dm_status === "pending_follow" ? "در انتظار فالو ⏳" : "انجام نشد";
        const replyFa = c.comment_reply_status === "sent" ? "ارسال شد ✅" : c.comment_reply_status === "failed" ? "ناموفق ❌" : "انجام نشد";
        desc += `📩 دایرکت: ${dmFa} | 💬 ریپلای: ${replyFa}`;
      } else {
        desc += `وضعیت: نامرتبط با تریگر خودکار`;
      }

      items.push({
        id: `comment-${c.id}`,
        category: "comment",
        title: `کامنت از @${c.username} در پست ${c.shortcode}`,
        description: desc,
        badge: isMatched
          ? { text: "تطابق هوش مصنوعی", variant: "success" }
          : { text: "بدون تریگر", variant: "secondary" },
        metadata: {
          username: c.username,
          comment_id: c.comment_id,
          shortcode: c.shortcode,
          dm_status: c.dm_status,
          dm_text: c.dm_text,
          reply_status: c.comment_reply_status,
          reply_text: c.comment_reply_text,
        },
        created_at: c.created_at,
      });
    }
  } catch {}

  try {
    // 3. Lifecycle logs
    const lifeRows = db.prepare(`
      SELECT * FROM bot_lifecycle_logs
      WHERE account_username = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(accountUsername, limit) as BotLifecycleLogRow[];

    for (const l of lifeRows) {
      items.push({
        id: `life-${l.id}`,
        category: "lifecycle",
        title: l.actor === "user" ? "اقدام دستی کاربر" : "تغییر وضعیت نشست ربات",
        description: `${l.message}${l.from_status ? ` (${l.from_status} ➔ ${l.to_status})` : ""}`,
        badge: {
          text: l.to_status === "live" ? "آنلاین و آماده" : l.to_status === "login_required" ? "نیاز به ورود" : l.to_status,
          variant: l.to_status === "live" ? "success" : l.to_status === "login_required" ? "warning" : "default"
        },
        created_at: l.created_at,
      });
    }
  } catch {}

  // Sort unified logs chronologically (newest first)
  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return items.slice(0, limit);
}

export function getAppLanguage(accountUsername?: string): "fa" | "en" | "ar" {
  const db = getDb();
  try {
    if (accountUsername) {
      const dmRow = db
        .prepare("SELECT app_language FROM dm_automations WHERE account_username = ?")
        .get(accountUsername) as { app_language?: string } | undefined;
      if (dmRow?.app_language && ["fa", "en", "ar"].includes(dmRow.app_language)) {
        return dmRow.app_language as "fa" | "en" | "ar";
      }
      const postRow = db
        .prepare("SELECT app_language FROM posts WHERE account_username = ? AND app_language IS NOT NULL ORDER BY updated_at DESC LIMIT 1")
        .get(accountUsername) as { app_language?: string } | undefined;
      if (postRow?.app_language && ["fa", "en", "ar"].includes(postRow.app_language)) {
        return postRow.app_language as "fa" | "en" | "ar";
      }
    }
    const globalLang = db
      .prepare("SELECT value FROM app_settings WHERE key = 'app_language'")
      .get() as { value?: string } | undefined;
    if (globalLang?.value && ["fa", "en", "ar"].includes(globalLang.value)) {
      return globalLang.value as "fa" | "en" | "ar";
    }
  } catch {
    // ignore
  }
  return "fa";
}

export function saveAppLanguage(lang: string, accountUsername?: string): void {
  const normalized = ["fa", "en", "ar"].includes(lang) ? lang : "fa";
  const db = getDb();
  const now = nowTimestamp();
  try {
    db.prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES ('app_language', ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(normalized, now);

    if (accountUsername) {
      db.prepare("UPDATE dm_automations SET app_language = ? WHERE account_username = ?").run(
        normalized,
        accountUsername
      );
      db.prepare("UPDATE posts SET app_language = ? WHERE account_username = ?").run(
        normalized,
        accountUsername
      );
    }
  } catch {
    // ignore
  }
}

export interface DmHistoryExchange {
  incomingText: string;
  replyText: string;
  createdAt: string;
}

export function getRecentDmConversationHistory(params: {
  accountUsername: string;
  threadId?: string;
  senderId?: string;
  senderUsername?: string;
  excludeMessageId?: string;
  limit?: number;
}): DmHistoryExchange[] {
  const db = getDb();
  const limit = Math.min(Math.max(params.limit || 8, 1), 20);
  const cleanSender = (params.senderUsername || "").replace(/^@/, "").toLowerCase();

  const rows = db
    .prepare(`
      SELECT incoming_text, reply_text, created_at
      FROM dm_logs
      WHERE account_username = @account_username
        AND (
          (@thread_id != '' AND thread_id = @thread_id)
          OR (@sender_id != '' AND sender_id = @sender_id)
          OR (@sender_username != '' AND @sender_username != 'user' AND LOWER(sender_username) = @sender_username)
        )
        AND message_id != @exclude_message_id
        AND reply_status IN ('sent', 'queued')
        AND incoming_text != ''
        AND reply_text != ''
        AND reply_text NOT LIKE '[%'
      ORDER BY id DESC
      LIMIT @limit
    `)
    .all({
      account_username: params.accountUsername,
      thread_id: params.threadId || "",
      sender_id: params.senderId || "",
      sender_username: cleanSender,
      exclude_message_id: params.excludeMessageId || "",
      limit,
    }) as Array<{ incoming_text: string; reply_text: string; created_at: string }>;

  // Filter out follow confirmation control clicks from conversational history
  const followControlTokens = new Set([
    "follow_confirmed",
    "فالو کردم",
    "فالو شد",
    "followed",
    "done",
  ]);

  return rows
    .filter((r) => {
      const norm = r.incoming_text.trim().toLowerCase();
      return !followControlTokens.has(norm) && !norm.startsWith("follow_confirmed");
    })
    .reverse()
    .map((r) => ({
      incomingText: r.incoming_text,
      replyText: r.reply_text,
      createdAt: r.created_at,
    }));
}





