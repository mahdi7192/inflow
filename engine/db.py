"""
inFlow Engine Database Interface
Interacts directly with /opt/inflow/data/inflow.db for automations,
idempotency tracking, and pending-follow state resolution.
"""

import sqlite3
import datetime
import os
from typing import List, Dict, Any, Optional

DB_PATH = os.environ.get("INFLOW_DB_PATH")
if not DB_PATH or not os.path.exists(DB_PATH):
    default_server_path = "/opt/inflow/data/inflow.db"
    if os.path.exists(default_server_path):
        DB_PATH = default_server_path
    else:
        DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "inflow.db")

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

def get_active_posts(account_username: str) -> List[Dict[str, Any]]:
    """Fetches all posts for the account that have auto_reply = 1."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT * FROM posts 
            WHERE account_username = ? AND auto_reply = 1
            ORDER BY sort_index ASC
            """,
            (account_username,)
        )
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

def is_comment_processed(comment_id: str) -> bool:
    """Checks if a comment_id has already been successfully processed or skipped."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT 1 FROM comment_logs WHERE comment_id = ? AND comment_reply_status IN ('sent', 'skipped') LIMIT 1",
            (str(comment_id),)
        )
        return cursor.fetchone() is not None
    finally:
        conn.close()

def get_pending_follow_record(account_username: str, shortcode: str, user_id: str) -> Optional[Dict[str, Any]]:
    """
    Checks if a user is currently waiting for follow confirmation on a specific post.
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT * FROM comment_logs
            WHERE account_username = ? AND shortcode = ? AND user_id = ? AND dm_status = 'pending_follow'
            ORDER BY id DESC LIMIT 1
            """,
            (account_username, shortcode, str(user_id))
        )
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

def update_pending_follow_to_sent(log_id: int, dm_text: str):
    """
    Updates a pending follow log to 'sent' once the user follows and confirms.
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE comment_logs
            SET dm_status = 'sent', dm_text = ?, processed_at = ?
            WHERE id = ?
            """,
            (dm_text, now_iso(), log_id)
        )
        conn.commit()
    finally:
        conn.close()

def record_comment_interaction(
    account_username: str,
    shortcode: str,
    media_id: str,
    comment_id: str,
    user_id: str,
    username: str,
    comment_text: str,
    trigger_matched: bool,
    comment_reply_status: str,
    comment_reply_text: str,
    dm_status: str,
    dm_text: str,
    error_message: Optional[str] = None
) -> Optional[int]:
    """
    Records an interaction in comment_logs with strict comment_id uniqueness.
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        # Verify idempotency again inside transaction
        cursor.execute("SELECT id, comment_reply_status FROM comment_logs WHERE comment_id = ? LIMIT 1", (str(comment_id),))
        row = cursor.fetchone()
        if row:
            if row["comment_reply_status"] in ("sent", "skipped"):
                return row["id"]
            now = now_iso()
            cursor.execute(
                """
                UPDATE comment_logs
                SET comment_reply_status = ?, comment_reply_text = ?, dm_status = ?, dm_text = ?, processed_at = ?
                WHERE id = ?
                """,
                (comment_reply_status, comment_reply_text, dm_status, dm_text, now, row["id"])
            )
            conn.commit()
            return row["id"]

        now = now_iso()
        cursor.execute(
            """
            INSERT INTO comment_logs (
                comment_id, account_username, shortcode, media_id, user_id, username,
                comment_text, trigger_matched, comment_reply_status, comment_reply_text,
                dm_status, dm_text, created_at, processed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(comment_id),
                account_username,
                shortcode,
                str(media_id),
                str(user_id),
                username,
                comment_text,
                1 if trigger_matched else 0,
                comment_reply_status,
                comment_reply_text,
                dm_status,
                dm_text,
                now,
                now
            )
        )
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()

def update_account_heartbeat(account_username: str):
    """Updates the last_heartbeat_at timestamp for the account."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE accounts SET last_heartbeat_at = ? WHERE username = ?",
            (now_iso(), account_username)
        )
        conn.commit()
    finally:
        conn.close()

def update_account_bot_status(account_username: str, bot_status: str, last_error: Optional[str] = None, message: str = ""):
    """Updates bot_status, bot_last_error and lifecycle log for the account."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT bot_status, bot_profile_name FROM accounts WHERE username = ?", (account_username,))
        row = cursor.fetchone()
        from_status = row["bot_status"] if row else None
        profile_name = row["bot_profile_name"] if row and row["bot_profile_name"] else f"inflow_{account_username}"
        cursor.execute(
            """
            UPDATE accounts 
            SET bot_status = ?, bot_profile_name = ?, bot_last_error = ?, updated_at = datetime('now')
            WHERE username = ?
            """,
            (bot_status, profile_name, last_error, account_username)
        )
        try:
            cursor.execute(
                """
                INSERT INTO bot_lifecycle_logs (account_username, from_status, to_status, message, actor)
                VALUES (?, ?, ?, ?, 'system')
                """,
                (account_username, from_status, bot_status, message or f"Worker updated status to {bot_status}")
            )
        except Exception:
            pass
        conn.commit()
    finally:
        conn.close()

def get_account(username: str) -> Optional[Dict[str, Any]]:
    """Fetches account record by username."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM accounts WHERE username = ?", (username,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

def get_account_cdp_port(username: str) -> int:
    """Returns the dedicated CDP port for the account's browser."""
    profile_dir = f"/root/.hermes/profiles/inflow_{username.lower()}"
    cdp_file = f"{profile_dir}/bot-desktop/cdp_port"
    if os.path.exists(cdp_file):
        try:
            with open(cdp_file, "r") as f:
                port = int(f.read().strip())
                if 1024 < port < 65535:
                    return port
        except Exception:
            pass
    acc = get_account(username)
    acc_id = acc["id"] if acc and "id" in acc else 6
    port = 9220 + int(acc_id)
    try:
        os.makedirs(os.path.dirname(cdp_file), exist_ok=True)
        with open(cdp_file, "w") as f:
            f.write(str(port))
    except Exception:
        pass
    return port

def get_dm_automation(account_username: str) -> Optional[Dict[str, Any]]:
    """Fetches DM automation settings for the given account."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM dm_automations WHERE account_username = ? LIMIT 1",
            (account_username,)
        )
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

def is_dm_processed(message_id: str) -> bool:
    """Checks if a direct message_id has already been processed or logged."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT 1 FROM dm_logs WHERE message_id = ? LIMIT 1",
            (str(message_id),)
        )
        return cursor.fetchone() is not None
    finally:
        conn.close()

def record_dm_interaction(
    message_id: str,
    thread_id: str,
    account_username: str,
    sender_username: str,
    sender_id: str,
    incoming_text: str,
    trigger_matched: bool,
    reply_status: str,
    reply_text: str = "",
    is_story_reply: bool = False,
    story_id: Optional[str] = None,
    error_details: Optional[str] = None
) -> Optional[int]:
    """Records an interaction in dm_logs table with message_id idempotency."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        now = now_iso()
        cursor.execute(
            """
            INSERT INTO dm_logs (
                message_id, thread_id, account_username, sender_username, sender_id,
                incoming_text, is_story_reply, story_id, trigger_matched,
                reply_status, reply_text, error_details, processed_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(message_id) DO UPDATE SET
                reply_status = excluded.reply_status,
                reply_text = excluded.reply_text,
                error_details = excluded.error_details,
                processed_at = excluded.processed_at
            """,
            (
                str(message_id),
                str(thread_id),
                account_username,
                sender_username,
                str(sender_id),
                incoming_text,
                1 if is_story_reply else 0,
                story_id,
                1 if trigger_matched else 0,
                reply_status,
                reply_text,
                error_details,
                now,
                now
            )
        )
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()


