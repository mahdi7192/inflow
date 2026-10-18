"""
inFlow Multi-Account Instagram Automation Worker Engine
Processes incoming comments, enforces follow gates (dm_require_follow),
executes humanized / AI replies, and dispatches direct messages with dynamic anti-ban pacing.
"""

import sys
import os
import time
import argparse
import logging
from typing import Dict, Any, List, Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ig_client import InstagramClient, shortcode_to_media_id, media_id_to_shortcode
import db
import matcher
import humanizer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [inFlow:%(name)s] %(message)s"
)
logger = logging.getLogger("worker")

def _resolve_reply_text(action_type: str, template: str, comment_text: str, caption: str) -> str:
    """Generates the reply text based on action type (direct, reply, or ai)."""
    if action_type == "ai":
        return matcher.generate_ai_reply(comment_text, template, caption)
    return humanizer.pick_reply_text(template)

def process_account_pass(account_username: str, max_comments_per_post: int = 50) -> Dict[str, int]:
    stats = {
        "posts_scanned": 0,
        "comments_scanned": 0,
        "replies_sent": 0,
        "dms_sent": 0,
        "pending_follow_queued": 0,
        "pending_follow_resolved": 0,
    }

    logger.info(f"Starting automation pass for account @{account_username}")
    
    # 1. Update heartbeat in DB immediately (Agent worker process is running and alive)
    db.update_account_heartbeat(account_username)

    # 2. Initialize Instagram Client from decrypted profile session
    try:
        client = InstagramClient(account_username)
    except Exception as e:
        err_msg = str(e)
        logger.error(f"Cannot initialize Instagram client for {account_username}: {err_msg}")
        if "sessionid" in err_msg.lower() or "login" in err_msg.lower() or "auth" in err_msg.lower():
            db.update_account_bot_status(
                account_username,
                "login_required",
                last_error=err_msg,
                message="نشست نامعتبر است یا خروج صورت گرفته است (نیاز به ورود)"
            )
        else:
            db.update_account_bot_status(
                account_username,
                "error",
                last_error=err_msg,
                message=f"خطا در کلاینت اینستاگرام: {err_msg}"
            )
        return stats

    # Client successfully connected, ensure status is 'live'
    db.update_account_bot_status(
        account_username,
        "live",
        message="اتصال فعال به اینستاگرام برقرار است"
    )

    # 3. Retrieve active posts with automations enabled
    active_posts = db.get_active_posts(account_username)
    stats["posts_scanned"] = len(active_posts)
    if not active_posts:
        logger.info(f"No active automations found for @{account_username}")
        return stats

    logger.info(f"Found {len(active_posts)} active automations for @{account_username}")

    for post in active_posts:
        shortcode = post.get("shortcode", "")
        media_id = post.get("media_id", "")
        if not media_id or not media_id.isdigit():
            media_id = shortcode_to_media_id(shortcode)
        if not shortcode and media_id:
            shortcode = media_id_to_shortcode(media_id)
        if len(shortcode) > 11:
            shortcode = shortcode[:11]

        caption = post.get("caption", "")
        trigger_type = post.get("trigger_type", "all")
        keywords = post.get("trigger_keywords", "")
        trigger_context = post.get("trigger_context", "")
        
        comment_action = post.get("comment_action_type", "none")
        comment_template = post.get("comment_action_text", "")
        dm_action = post.get("dm_action_type", "none")
        dm_template = post.get("dm_action_text", "")
        require_follow = bool(post.get("dm_require_follow", 0))

        logger.info(f"Scanning post {shortcode} (media_id: {media_id}) - trigger={trigger_type}, require_follow={require_follow}")

        # Fetch comments from Instagram API
        comments = client.fetch_comments(media_id)
        if not comments:
            continue

        # Filter out comments already processed
        unprocessed_comments = [c for c in comments if not db.is_comment_processed(c["comment_id"])]
        # Process in chronological order (oldest first)
        unprocessed_comments.sort(key=lambda x: x["created_at_utc"])
        
        queue_len = len(unprocessed_comments)
        logger.info(f"Post {shortcode}: {len(comments)} total comments, {queue_len} unprocessed")

        for comment in unprocessed_comments[:max_comments_per_post]:
            stats["comments_scanned"] += 1
            cid = comment["comment_id"]
            uid = comment["user_id"]
            uname = comment["username"]
            text = comment["text"]

            # Ignore comments posted by the account owner itself
            if uid == client.ds_user_id or uname.lower() == account_username.lower():
                db.record_comment_interaction(
                    account_username=account_username,
                    shortcode=shortcode,
                    media_id=media_id,
                    comment_id=cid,
                    user_id=uid,
                    username=uname,
                    comment_text=text,
                    trigger_matched=False,
                    comment_reply_status="skipped",
                    comment_reply_text="",
                    dm_status="skipped",
                    dm_text="",
                )
                continue

            # Check if this user had a pending follow request on this post
            pending_rec = db.get_pending_follow_record(account_username, shortcode, uid)

            if pending_rec:
                # User was pending follow; did they reply "فالو کردم" / confirmed follow?
                if matcher.is_follow_confirmation(text):
                    logger.info(f"User @{uname} confirmed follow: '{text}' - checking friendship status...")
                    is_now_following = client.check_following(uid)
                    if is_now_following:
                        logger.info(f"Verified! User @{uname} now follows @{account_username}. Sending deferred DM.")
                        dm_body = _resolve_reply_text(dm_action, dm_template, text, caption)
                        dm_ok = client.send_dm(uid, dm_body)
                        if dm_ok:
                            db.update_pending_follow_to_sent(pending_rec["id"], dm_body)
                            stats["dms_sent"] += 1
                            stats["pending_follow_resolved"] += 1

                        # Reply confirming DM delivery
                        reply_confirm = f"فالو شدنت تایید شد @{uname} عزیز، دایرکتت رو چک کن 📩✨"
                        client.reply_to_comment(
                            media_id=media_id,
                            comment_id=cid,
                            text=reply_confirm,
                            shortcode=shortcode,
                            username=uname,
                            comment_text=text
                        )
                        stats["replies_sent"] += 1

                        # Record this confirmation comment log
                        db.record_comment_interaction(
                            account_username=account_username,
                            shortcode=shortcode,
                            media_id=media_id,
                            comment_id=cid,
                            user_id=uid,
                            username=uname,
                            comment_text=text,
                            trigger_matched=True,
                            comment_reply_status="sent" if dm_ok else "failed",
                            comment_reply_text=reply_confirm,
                            dm_status="sent" if dm_ok else "failed",
                            dm_text=dm_body,
                        )
                        humanizer.human_sleep(queue_len, f"follow resolved for @{uname}")
                        continue
                    else:
                        logger.info(f"User @{uname} said confirmed but is NOT yet following.")
                        unfollow_reply = f"هنوز فالو نکردی @{uname} عزیز! لطفا اول پیج رو فالو کن و بعد بگو «فالو کردم» تا بلافاصله برات ارسال بشه 🌸"
                        client.reply_to_comment(
                            media_id=media_id,
                            comment_id=cid,
                            text=unfollow_reply,
                            shortcode=shortcode,
                            username=uname,
                            comment_text=text
                        )
                        stats["replies_sent"] += 1
                        db.record_comment_interaction(
                            account_username=account_username,
                            shortcode=shortcode,
                            media_id=media_id,
                            comment_id=cid,
                            user_id=uid,
                            username=uname,
                            comment_text=text,
                            trigger_matched=True,
                            comment_reply_status="sent",
                            comment_reply_text=unfollow_reply,
                            dm_status="pending_follow",
                            dm_text="",
                        )
                        humanizer.human_sleep(queue_len, f"follow not yet active for @{uname}")
                        continue

            # Standard comment evaluation
            is_matched = matcher.matches_trigger(
                comment_text=text,
                trigger_type=trigger_type,
                trigger_keywords=keywords,
                trigger_context=trigger_context,
                post_caption=caption
            )
            if not is_matched:
                db.record_comment_interaction(
                    account_username=account_username,
                    shortcode=shortcode,
                    media_id=media_id,
                    comment_id=cid,
                    user_id=uid,
                    username=uname,
                    comment_text=text,
                    trigger_matched=False,
                    comment_reply_status="skipped",
                    comment_reply_text="",
                    dm_status="skipped",
                    dm_text="",
                )
                continue

            logger.info(f"Trigger matched for comment from @{uname}: '{text}'")

            reply_status = "none"
            reply_body = ""
            dm_status = "none"
            dm_body = ""

            # Check Follow Gate condition
            if dm_action in ("direct", "ai"):
                if require_follow:
                    is_following = client.check_following(uid)
                    if is_following:
                        logger.info(f"User @{uname} already follows. Sending DM immediately.")
                        dm_body = _resolve_reply_text(dm_action, dm_template, text, caption)
                        dm_sent = client.send_dm(uid, dm_body)
                        dm_status = "sent" if dm_sent else "failed"
                        if dm_sent:
                            stats["dms_sent"] += 1

                        if comment_action in ("reply", "direct", "ai"):
                            reply_body = _resolve_reply_text(comment_action, comment_template, text, caption)
                            reply_ok = client.reply_to_comment(
                                media_id=media_id,
                                comment_id=cid,
                                text=reply_body,
                                shortcode=shortcode,
                                username=uname,
                                comment_text=text
                            )
                            reply_status = "sent" if reply_ok else "failed"
                            if reply_ok:
                                stats["replies_sent"] += 1
                    else:
                        # User DOES NOT follow -> Do NOT send main DM!
                        logger.info(f"User @{uname} does NOT follow. Requesting follow and setting pending_follow.")
                        dm_status = "pending_follow"
                        stats["pending_follow_queued"] += 1
                        
                        # Public reply asking them to follow and say "فالو کردم"
                        reply_body = humanizer.get_follow_request_reply()
                        reply_ok = client.reply_to_comment(
                            media_id=media_id,
                            comment_id=cid,
                            text=reply_body,
                            shortcode=shortcode,
                            username=uname,
                            comment_text=text
                        )
                        reply_status = "sent" if reply_ok else "failed"
                        if reply_ok:
                            stats["replies_sent"] += 1
                else:
                    # require_follow is False -> Send DM directly
                    dm_body = _resolve_reply_text(dm_action, dm_template, text, caption)
                    dm_sent = client.send_dm(uid, dm_body)
                    dm_status = "sent" if dm_sent else "failed"
                    if dm_sent:
                        stats["dms_sent"] += 1

                    if comment_action in ("reply", "direct", "ai"):
                        reply_body = _resolve_reply_text(comment_action, comment_template, text, caption)
                        reply_ok = client.reply_to_comment(
                            media_id=media_id,
                            comment_id=cid,
                            text=reply_body,
                            shortcode=shortcode,
                            username=uname,
                            comment_text=text
                        )
                        reply_status = "sent" if reply_ok else "failed"
                        if reply_ok:
                            stats["replies_sent"] += 1
            else:
                # DM is none, only comment reply if enabled
                if comment_action in ("reply", "direct", "ai"):
                    reply_body = _resolve_reply_text(comment_action, comment_template, text, caption)
                    reply_ok = client.reply_to_comment(
                        media_id=media_id,
                        comment_id=cid,
                        text=reply_body,
                        shortcode=shortcode,
                        username=uname,
                        comment_text=text
                    )
                    reply_status = "sent" if reply_ok else "failed"
                    if reply_ok:
                        stats["replies_sent"] += 1

            # Record interaction
            db.record_comment_interaction(
                account_username=account_username,
                shortcode=shortcode,
                media_id=media_id,
                comment_id=cid,
                user_id=uid,
                username=uname,
                comment_text=text,
                trigger_matched=True,
                comment_reply_status=reply_status,
                comment_reply_text=reply_body,
                dm_status=dm_status,
                dm_text=dm_body,
            )

            # Apply human anti-ban jitter
            humanizer.human_sleep(queue_len, f"action completed for @{uname}")

    logger.info(f"Pass completed for @{account_username}: {stats}")
    return stats

def main():
    parser = argparse.ArgumentParser(description="inFlow Multi-Account Instagram Worker")
    parser.add_argument("--account", required=True, help="Instagram username (e.g. mahdiketabdar)")
    parser.add_argument("--loop", action="store_true", help="Run continuously in a loop")
    parser.add_argument("--interval", type=int, default=120, help="Interval in seconds between passes if --loop is set (default: 120)")
    parser.add_argument("--max-comments", type=int, default=50, help="Max comments to process per post per pass")
    args = parser.parse_args()

    account = args.account.strip().replace("@", "")

    if args.loop:
        logger.info(f"Starting worker daemon for @{account} with {args.interval}s interval...")
        while True:
            try:
                process_account_pass(account, args.max_comments)
            except Exception as e:
                logger.error(f"Unhandled error in worker loop for @{account}: {e}")
            time.sleep(args.interval)
    else:
        process_account_pass(account, args.max_comments)

if __name__ == "__main__":
    main()
