"""
inFlow Engine Database Interface
Interacts directly with /opt/inflow/data/inflow.db for automations,
idempotency tracking, and pending-follow state resolution.
"""

import sqlite3
import datetime
from typing import List, Dict, Any, Optional

DB_PATH = "/opt/inflow/data/inflow.db"

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
