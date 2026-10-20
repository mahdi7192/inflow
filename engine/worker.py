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

def _resolve_reply_text(action_type: str, template: str, comment_text: str, caption: str, channel: str = "comment") -> str:
    """Generates the reply text based on action type (direct, reply, or ai) and target channel ('comment' or 'dm')."""
    if action_type == "ai":
        return matcher.generate_ai_reply(comment_text, template, caption, channel=channel)
    return humanizer.pick_reply_text(template)

def process_dm_inbox_pass(
    client: InstagramClient,
    account_username: str,
    dm_config: Dict[str, Any],
    stats: Dict[str, int],
    max_dms_per_pass: int = 25
):
    """
    Scans the account's direct message inbox, filters out outgoing messages and already processed DMs,
    evaluates trigger conditions, checks follow gate (if required), and dispatches humanized replies.
    """
    logger.info(f"Scanning direct message inbox for @{account_username}...")
    try:
        threads = client.fetch_direct_inbox(limit=25)
    except Exception as e:
        logger.error(f"Failed to fetch direct inbox for @{account_username}: {e}")
        return

    if not threads:
        logger.info(f"No threads found in inbox for @{account_username}")
        return

    trigger_type = dm_config.get("trigger_type", "all")
    trigger_keywords = dm_config.get("trigger_keywords", "")
    trigger_context = dm_config.get("trigger_context", "")
    reply_mode = dm_config.get("reply_mode", "direct")
    direct_reply_text = dm_config.get("direct_reply_text", "")
    ai_instructions = dm_config.get("ai_prompt_instructions", "")
    require_follow = bool(dm_config.get("require_follow", 0))
    follow_prompt = dm_config.get("follow_prompt_text", "سلام! برای دریافت پاسخ، لطفاً ابتدا پیج را فالو کنید 🙏")
    story_handling = dm_config.get("story_handling_mode", "auto")

    # Filter messages that need processing
    owner_id = str(client.ds_user_id or "")
    candidate_messages = []

    for item in threads:
        msg_id = item.get("message_id")
        sender_id = item.get("sender_id")
        sender_username = item.get("sender_username", "")
        is_outgoing = item.get("is_outgoing", False)
        is_story_reply = item.get("is_story_reply", False)

        # Skip outgoing messages sent by the bot itself
        if is_outgoing:
            continue

        # Skip if from owner
        if (owner_id and str(sender_id) == owner_id) or sender_username.lower() == account_username.lower():
            continue

        # Skip story reply if configured to ignore
        if is_story_reply and story_handling == "ignore":
            if not db.is_dm_processed(msg_id):
                db.record_dm_interaction(
                    message_id=msg_id,
                    thread_id=item["thread_id"],
                    account_username=account_username,
                    sender_username=sender_username,
                    sender_id=sender_id,
                    incoming_text=item.get("text", ""),
                    trigger_matched=False,
                    reply_status="skipped",
                    is_story_reply=True,
                    story_id=item.get("story_id"),
                    error_details="Story reply ignored per configuration"
                )
            continue

        # Skip already processed
        if db.is_dm_processed(msg_id):
            continue

        candidate_messages.append(item)

    queue_len = len(candidate_messages)
    logger.info(f"Inbox @{account_username}: {len(threads)} total threads examined, {queue_len} pending customer inquiries")

    for item in candidate_messages[:max_dms_per_pass]:
        msg_id = item["message_id"]
        thread_id = item["thread_id"]
        sender_id = item["sender_id"]
        sender_uname = item["sender_username"]
        text = item.get("text", "").strip()
        is_story_reply = item.get("is_story_reply", False)
        story_id = item.get("story_id")

        stats["dms_scanned"] = stats.get("dms_scanned", 0) + 1

        # 1. Evaluate trigger condition
        is_matched = matcher.matches_trigger(
            comment_text=text,
            trigger_type=trigger_type,
            trigger_keywords=trigger_keywords,
            trigger_context=trigger_context,
            post_caption=""
        )

        if not is_matched:
            logger.info(f"DM from @{sender_uname} ('{text[:30]}...') did not match trigger '{trigger_type}'")
            db.record_dm_interaction(
                message_id=msg_id,
                thread_id=thread_id,
                account_username=account_username,
                sender_username=sender_uname,
                sender_id=sender_id,
                incoming_text=text,
                trigger_matched=False,
                reply_status="skipped",
                is_story_reply=is_story_reply,
                story_id=story_id
            )
            continue

        logger.info(f"DM trigger matched for @{sender_uname}: '{text[:40]}'")

        # 2. Check Follow Gate
        if require_follow:
            is_following = client.check_following(sender_id) if sender_id else False
            if not is_following:
                logger.info(f"User @{sender_uname} is not following @{account_username}. Sending follow prompt.")
                sent_ok = client.send_dm(
                    recipient_user_id=sender_id,
                    text=follow_prompt,
                    username=sender_uname,
                    thread_id=thread_id
                )
                db.record_dm_interaction(
                    message_id=msg_id,
                    thread_id=thread_id,
                    account_username=account_username,
                    sender_username=sender_uname,
                    sender_id=sender_id,
                    incoming_text=text,
                    trigger_matched=True,
                    reply_status="pending_follow",
                    reply_text=follow_prompt,
                    is_story_reply=is_story_reply,
                    story_id=story_id
                )
                if sent_ok:
                    stats["dms_sent"] = stats.get("dms_sent", 0) + 1
                humanizer.human_sleep(queue_len, f"follow prompt sent to @{sender_uname}")
                continue

        # 3. Generate Reply Body
        if reply_mode == "ai":
            reply_body = matcher.generate_ai_dm_inbox_reply(
                incoming_text=text,
                prompt_instructions=ai_instructions or direct_reply_text,
                sender_username=sender_uname,
                is_story_reply=is_story_reply
            )
        else:
            reply_body = humanizer.pick_reply_text(direct_reply_text)

        if not reply_body:
            logger.warning(f"No reply text resolved for DM from @{sender_uname}")
            continue

        # 4. Dispatch DM Reply via CDP
        logger.info(f"Dispatching reply to @{sender_uname} in thread {thread_id}: '{reply_body[:50]}...'")
        sent = client.send_dm(
            recipient_user_id=sender_id,
            text=reply_body,
            username=sender_uname,
            thread_id=thread_id
        )

        if sent:
            logger.info(f"Successfully sent DM reply to @{sender_uname}")
            db.record_dm_interaction(
                message_id=msg_id,
                thread_id=thread_id,
                account_username=account_username,
                sender_username=sender_uname,
                sender_id=sender_id,
                incoming_text=text,
                trigger_matched=True,
                reply_status="sent",
                reply_text=reply_body,
                is_story_reply=is_story_reply,
                story_id=story_id
            )
            stats["dms_sent"] = stats.get("dms_sent", 0) + 1
        else:
            logger.warning(f"Failed to dispatch DM reply to @{sender_uname}")
            db.record_dm_interaction(
                message_id=msg_id,
                thread_id=thread_id,
                account_username=account_username,
                sender_username=sender_uname,
                sender_id=sender_id,
                incoming_text=text,
                trigger_matched=True,
                reply_status="failed",
                reply_text=reply_body,
                is_story_reply=is_story_reply,
                story_id=story_id,
                error_details="Browser UI failed to submit message"
            )

        # 5. Anti-ban pacing
        humanizer.human_sleep(queue_len, f"dm processed for @{sender_uname}")

def process_account_pass(account_username: str, max_comments_per_post: int = 50) -> Dict[str, int]:
    stats = {
        "posts_scanned": 0,
        "comments_scanned": 0,
        "dms_scanned": 0,
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

    # 3. Retrieve active posts and DM automations enabled
    active_posts = db.get_active_posts(account_username)
    dm_config = db.get_dm_automation(account_username)
    dm_enabled = bool(dm_config and dm_config.get("enabled", 0))

    stats["posts_scanned"] = len(active_posts)
    if not active_posts and not dm_enabled:
        logger.info(f"No active comment or DM automations found for @{account_username}")
        return stats

    if active_posts:
        logger.info(f"Found {len(active_posts)} active comment automations for @{account_username}")
    if dm_enabled:
        logger.info(f"DM automation is enabled for @{account_username} (trigger={dm_config.get('trigger_type')}, mode={dm_config.get('reply_mode')})")

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

        # Immediately ignore comments posted by the account owner itself
        owner_id = str(client.ds_user_id or "")
        comments = [
            c for c in comments
            if c.get("username", "").strip().lower() != account_username.lower()
            and (not owner_id or str(c.get("user_id", "")) != owner_id)
        ]

        # Filter out comments already processed
        unprocessed_comments = [c for c in comments if not db.is_comment_processed(c["comment_id"])]
        # Process in chronological order (oldest first)
        unprocessed_comments.sort(key=lambda x: x["created_at_utc"])
        
        queue_len = len(unprocessed_comments)
        logger.info(f"Post {shortcode}: {len(comments)} user comments, {queue_len} unprocessed")

        for comment in unprocessed_comments[:max_comments_per_post]:
            cid = comment["comment_id"]
            uid = comment["user_id"]
            uname = comment["username"]
            text = comment["text"]

            # Double check: skip account owner's own comments completely without logging
            if (owner_id and str(uid) == owner_id) or uname.strip().lower() == account_username.lower():
                continue

            stats["comments_scanned"] += 1

            # Check if this user had a pending follow request on this post
            pending_rec = db.get_pending_follow_record(account_username, shortcode, uid)

            if pending_rec:
                # User was pending follow; did they reply "فالو کردم" / confirmed follow?
                if matcher.is_follow_confirmation(text):
                    logger.info(f"User @{uname} confirmed follow: '{text}' - checking friendship status...")
                    is_now_following = client.check_following(uid)
                    if is_now_following:
                        logger.info(f"Verified! User @{uname} now follows @{account_username}. Sending deferred DM.")
                        dm_body = _resolve_reply_text(dm_action, dm_template, text, caption, channel="dm")
                        dm_ok = client.send_dm(uid, dm_body, username=uname)
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
                        dm_body = _resolve_reply_text(dm_action, dm_template, text, caption, channel="dm")
                        dm_sent = client.send_dm(uid, dm_body, username=uname)
                        dm_status = "sent" if dm_sent else "failed"
                        if dm_sent:
                            stats["dms_sent"] += 1

                        if comment_action in ("reply", "direct", "ai"):
                            reply_body = _resolve_reply_text(comment_action, comment_template, text, caption, channel="comment")
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
                    dm_body = _resolve_reply_text(dm_action, dm_template, text, caption, channel="dm")
                    dm_sent = client.send_dm(uid, dm_body, username=uname)
                    dm_status = "sent" if dm_sent else "failed"
                    if dm_sent:
                        stats["dms_sent"] += 1

                    if comment_action in ("reply", "direct", "ai"):
                        reply_body = _resolve_reply_text(comment_action, comment_template, text, caption, channel="comment")
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
                    reply_body = _resolve_reply_text(comment_action, comment_template, text, caption, channel="comment")
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

    # 4. Direct Message Inbox Pass (if DM automation is enabled)
    if dm_enabled:
        process_dm_inbox_pass(client, account_username, dm_config, stats)

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
