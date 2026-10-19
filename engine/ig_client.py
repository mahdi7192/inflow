"""
inFlow Instagram Session & CDP Client
Native Chrome DevTools Protocol (CDP) client directly connected to the
account's isolated Chrome browser instance. Zero subprocess conflict,
zero secondary profile locking, and fully human-simulated interactions.
"""

import os
import sys
import json
import time
import asyncio
import logging
import subprocess
from typing import Dict, Any, Optional, List

try:
    import db
except ImportError:
    from . import db

try:
    from engine.cdp_client import CDPClient
except ImportError:
    from cdp_client import CDPClient

logger = logging.getLogger("inflow.ig_client")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

def _run_async(coro):
    """Run an async coroutine synchronously."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            return pool.submit(asyncio.run, coro).result()
    else:
        return asyncio.run(coro)

def shortcode_to_media_id(shortcode: str) -> str:
    """Converts an Instagram shortcode (e.g. DehQhnjoEcr) to numeric media_id."""
    if not shortcode:
        return ""
    clean_code = shortcode.split("?")[0].split("/")[0].strip()
    if len(clean_code) > 11:
        clean_code = clean_code[:11]
    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
    media_id = 0
    for char in clean_code:
        if char not in alphabet:
            continue
        media_id = media_id * 64 + alphabet.index(char)
    return str(media_id)

def media_id_to_shortcode(media_id: str) -> str:
    """Converts a numeric media_id back to an Instagram shortcode."""
    if not media_id:
        return ""
    try:
        mid = int(media_id)
    except ValueError:
        return ""
    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
    shortcode = []
    while mid > 0:
        mid, rem = divmod(mid, 64)
        shortcode.append(alphabet[rem])
    return "".join(reversed(shortcode))

class InstagramClient:
    def __init__(self, account_username: str):
        self.account_username = account_username
        self.cdp_port = db.get_account_cdp_port(account_username)
        self.profile_dir = f"/root/.hermes/profiles/inflow_{account_username.lower()}"
        self._ds_user_id = None
        self._ensure_browser_ready()

    @property
    def ds_user_id(self) -> str:
        if self._ds_user_id:
            return self._ds_user_id
        async def _get_uid():
            cdp = None
            try:
                cdp = await self._get_cdp()
                cookies = await cdp.get_cookies()
                for c in cookies:
                    if c.get("name") == "ds_user_id":
                        return c.get("value", "")
                return ""
            except Exception:
                return ""
            finally:
                if cdp:
                    await cdp.close()
        self._ds_user_id = _run_async(_get_uid())
        return self._ds_user_id

    def _ensure_browser_ready(self):
        """Verifies Chrome is running on the dedicated CDP port, otherwise triggers vnc_guard."""
        vnc_guard = os.path.join(self.profile_dir, "bin", "vnc_guard.py")
        if not os.path.exists(vnc_guard):
            return

        import urllib.request
        try:
            req = urllib.request.Request(f"http://127.0.0.1:{self.cdp_port}/json/version")
            with urllib.request.urlopen(req, timeout=1.5):
                return
        except Exception:
            pass

        logger.info(f"Chrome CDP port {self.cdp_port} not responding for {self.account_username}. Launching via vnc_guard...")
        try:
            subprocess.run([sys.executable, vnc_guard, "start"], timeout=15, check=False)
            time.sleep(2)
        except Exception as e:
            logger.warning(f"Failed to start browser for {self.account_username}: {e}")

    async def _get_cdp(self) -> CDPClient:
        cdp = CDPClient(port=self.cdp_port)
        await cdp.connect()
        return cdp

    def check_health(self) -> bool:
        """Verifies if the browser session is authenticated."""
        async def _check():
            cdp = None
            try:
                cdp = await self._get_cdp()
                logged = await cdp.is_logged_in()
                if not logged:
                    db.update_account_bot_status(
                        self.account_username,
                        "login_required",
                        last_error="No sessionid cookie in browser",
                        message="نیاز به ورود مجدد از طریق پنل vNC"
                    )
                return logged
            except Exception as e:
                logger.error(f"Health check failed for {self.account_username}: {e}")
                db.update_account_bot_status(
                    self.account_username,
                    "error",
                    last_error=str(e),
                    message="خطا در اتصال به مرورگر ایزوله (CDP)"
                )
                return False
            finally:
                if cdp:
                    await cdp.close()

        return _run_async(_check())

    def fetch_comments(self, media_id: str) -> List[Dict[str, Any]]:
        """Fetches latest comments for a media post via browser context."""
        async def _fetch():
            cdp = None
            try:
                cdp = await self._get_cdp()
                raw_comments = await cdp.fetch_media_comments(media_id)
                parsed: List[Dict[str, Any]] = []
                for c in raw_comments:
                    u = c.get("user", {})
                    parsed.append({
                        "comment_id": str(c.get("pk")),
                        "user_id": str(u.get("pk")),
                        "username": str(u.get("username")),
                        "text": str(c.get("text", "")).strip(),
                        "created_at_utc": int(c.get("created_at_utc", c.get("created_at", 0))),
                    })
                return parsed
            except Exception as e:
                logger.error(f"Error fetching comments for media {media_id}: {e}")
                return []
            finally:
                if cdp:
                    await cdp.close()

        return _run_async(_fetch())

    def check_following(self, target_user_id: str) -> bool:
        """Checks if target_user_id follows the account via browser context."""
        if not target_user_id:
            return False

        async def _check():
            cdp = None
            try:
                cdp = await self._get_cdp()
                is_following, _ = await cdp.check_user_friendship(target_user_id)
                return is_following
            except Exception as e:
                logger.error(f"Error checking friendship for {target_user_id}: {e}")
                return False
            finally:
                if cdp:
                    await cdp.close()

        return _run_async(_check())

    def reply_to_comment(
        self,
        media_id: str,
        comment_id: str,
        text: str,
        shortcode: str = "",
        username: str = "",
        comment_text: str = ""
    ) -> bool:
        """Posts a reply to a comment using native browser context."""
        async def _reply():
            cdp = None
            try:
                cdp = await self._get_cdp()
                sc = shortcode or (media_id_to_shortcode(media_id) if media_id else "")
                if sc and username:
                    ui_success, ui_resp = await cdp.reply_to_comment_ui(sc, username, text)
                    if ui_success:
                        logger.info(f"Successfully replied via UI to comment {comment_id} for @{username}")
                        return True
                    logger.warning(f"UI reply failed for comment {comment_id}: {ui_resp}, falling back to API")

                success, resp = await cdp.reply_to_comment_api(media_id, comment_id, username, text)
                if success:
                    logger.info(f"Successfully replied to comment {comment_id} for @{username}")
                    return True
                logger.warning(f"Failed to reply to comment {comment_id}: {resp}")
                if isinstance(resp, dict) and (resp.get("feedback_required") or resp.get("checkpoint_required")):
                    db.update_account_bot_status(
                        self.account_username,
                        "rate_limited",
                        last_error=str(resp)[:200],
                        message="محدودیت موقت اینستاگرام در ثبت کامنت"
                    )
                return False
            except Exception as e:
                logger.error(f"Error replying to comment {comment_id}: {e}")
                return False
            finally:
                if cdp:
                    await cdp.close()

        return _run_async(_reply())

    def send_dm(self, recipient_user_id: str, text: str, username: Optional[str] = None) -> bool:
        """Sends a Direct Message using humanized CDP UI interaction in the browser."""
        target_username = username or recipient_user_id
        if not target_username:
            logger.error("send_dm called without target username or recipient ID")
            return False

        async def _send():
            cdp = None
            try:
                cdp = await self._get_cdp()
                # 1. Open chat with target user
                opened, reason = await cdp.open_dm_with_user(target_username)
                if not opened:
                    logger.warning(f"Could not open direct chat with @{target_username}: {reason}")
                    return False

                # 2. Type message with human jitter and send
                sent, reason = await cdp.send_dm_text(text)
                if sent:
                    logger.info(f"Successfully sent humanized DM to @{target_username}")
                    return True
                logger.warning(f"Failed to send DM to @{target_username}: {reason}")
                return False
            except Exception as e:
                logger.error(f"Error sending DM to @{target_username}: {e}")
                return False
            finally:
                if cdp:
                    await cdp.close()

        return _run_async(_send())
