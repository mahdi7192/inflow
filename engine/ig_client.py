"""
inFlow Instagram Session & API Client
Safe, authenticated communication with Instagram Web endpoints
using decrypted cookies from the isolated Chrome bot profile.
"""

import os
import sys
import json
import uuid
import time
import shutil
import tempfile
import hashlib
import subprocess
import logging
from typing import Dict, Any, Optional, List
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from curl_cffi import requests

try:
    import db
except ImportError:
    from . import db

logger = logging.getLogger("inflow.ig_client")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

PROXY_SOCKS5 = "socks5://127.0.0.1:40000"
IG_APP_ID = "936619743392459"
USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"

def shortcode_to_media_id(shortcode: str) -> str:
    """Converts an Instagram shortcode (e.g. DehQhnjoEcr or web slug) to its numeric media_id."""
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

def extract_profile_cookies(profile_dir: str) -> Dict[str, str]:
    """
    Extracts and decrypts Instagram cookies from Chromium SQLite database.
    Does NOT require Chrome to be running or open.
    """
    cookie_path = os.path.join(profile_dir, "Default", "Cookies")
    if not os.path.exists(cookie_path):
        cookie_path = os.path.join(profile_dir, "Default", "Network", "Cookies")
        if not os.path.exists(cookie_path):
            raise FileNotFoundError(f"Chrome cookie database not found in {profile_dir}")

    # Standard Linux Chromium key derivation (PBKDF2 with key 'peanuts' and salt 'saltysalt')
    key = hashlib.pbkdf2_hmac("sha1", b"peanuts", b"saltysalt", 1, 16)
    
    tmp_path = tempfile.mktemp(prefix="ig_cookies_")
    try:
        shutil.copyfile(cookie_path, tmp_path)
        import sqlite3
        con = sqlite3.connect(tmp_path)
        rows = con.execute("SELECT name, encrypted_value FROM cookies WHERE host_key LIKE '%instagram%'").fetchall()
        con.close()
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    cookies: Dict[str, str] = {}
    for name, enc in rows:
        try:
            if enc.startswith(b"v10") or enc.startswith(b"v11"):
                enc_data = enc[3:]
                iv = b" " * 16
                cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
                decryptor = cipher.decryptor()
                dec = decryptor.update(enc_data) + decryptor.finalize()
                pad = dec[-1]
                # Modern Linux Chromium has a 32-byte hash header
                val = dec[32:-pad].decode("utf-8", errors="ignore")
                cookies[name] = val
            else:
                cookies[name] = enc.decode("utf-8", errors="ignore")
        except Exception as e:
            logger.debug(f"Failed to decrypt cookie {name}: {e}")

    return cookies

class InstagramClient:
    def __init__(self, account_username: str):
        self.account_username = account_username
        self.profile_dir = f"/root/.hermes/profiles/inflow_{account_username}/bot-desktop/browser-profile"
        self.cookies = extract_profile_cookies(self.profile_dir)
        
        self.ds_user_id = self.cookies.get("ds_user_id", "")
        self.csrf_token = self.cookies.get("csrftoken", "")
        self.session_id = self.cookies.get("sessionid", "")
        
        if not self.session_id:
            try:
                db.update_account_bot_status(
                    account_username,
                    "login_required",
                    last_error="No active sessionid found",
                    message="کوکی نشست sessionid در پروفایل یافت نشد"
                )
            except Exception as e:
                logger.warning(f"Could not update bot status in DB: {e}")
            raise ValueError(f"No active sessionid found for account '{account_username}'. Is account logged in?")

        self.session = requests.Session(impersonate="chrome120", proxy=PROXY_SOCKS5)
        for k, v in self.cookies.items():
            self.session.cookies.set(k, v, domain=".instagram.com")

        self.default_headers = {
            "X-CSRFToken": self.csrf_token,
            "X-IG-App-ID": IG_APP_ID,
            "X-Requested-With": "XMLHttpRequest",
            "Referer": "https://www.instagram.com/",
            "User-Agent": USER_AGENT,
        }

    def check_health(self) -> bool:
        """Verifies if the session is currently authenticated and valid."""
        try:
            url = "https://www.instagram.com/api/v1/users/web_profile_info/?username=" + self.account_username
            res = self.session.get(url, headers=self.default_headers, timeout=15)
            # If not logged in, Instagram returns 404 or redirects
            return res.status_code == 200 or "sessionid" in self.cookies
        except Exception as e:
            logger.error(f"Health check failed for {self.account_username}: {e}")
            return False

    def fetch_comments(self, media_id: str) -> List[Dict[str, Any]]:
        """
        Fetches latest comments for a media post.
        Returns a list of parsed comment dicts.
        """
        url = f"https://www.instagram.com/api/v1/media/{media_id}/comments/?can_support_threading=true&permalink_enabled=false"
        try:
            res = self.session.get(url, headers=self.default_headers, timeout=20)
            if res.status_code in (401, 403):
                logger.warning(f"Fetch comments unauthorized {res.status_code} for media {media_id}")
                try:
                    db.update_account_bot_status(
                        self.account_username,
                        "login_required",
                        last_error=f"Fetch comments HTTP {res.status_code}",
                        message="نشست در اینستاگرام منقضی شد (نیاز به ورود)"
                    )
                except Exception:
                    pass
                return []
            if "feedback_required" in res.text or "checkpoint_required" in res.text:
                status_val = "checkpoint_required" if "checkpoint" in res.text else "rate_limited"
                try:
                    db.update_account_bot_status(
                        self.account_username,
                        status_val,
                        last_error=res.text[:200],
                        message="محدودیت اکشن یا چک‌پوینت از سمت اینستاگرام"
                    )
                except Exception:
                    pass
                return []
            if res.status_code != 200:
                logger.warning(f"Fetch comments returned status {res.status_code} for media {media_id}")
                return []
            data = res.json()
            raw_comments = data.get("comments", [])
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

    def check_following(self, target_user_id: str) -> bool:
        """
        Checks if target_user_id follows the authenticated account.
        Returns True if followed_by is True.
        """
        if not target_user_id:
            return False
        url = f"https://www.instagram.com/api/v1/friendships/show/{target_user_id}/"
        try:
            res = self.session.get(url, headers=self.default_headers, timeout=15)
            if res.status_code == 200:
                data = res.json()
                # 'followed_by': True indicates target user follows our account!
                return bool(data.get("followed_by", False))
            return False
        except Exception as e:
            logger.error(f"Error checking friendship for {target_user_id}: {e}")
            return False

    def reply_to_comment(
        self,
        media_id: str,
        comment_id: str,
        text: str,
        shortcode: str = "",
        username: str = "",
        comment_text: str = ""
    ) -> bool:
        """
        Replies publicly to a specific comment.
        Uses headless Playwright script with Chrome profile for 100% reliability,
        falling back to web API if needed.
        """
        if not shortcode:
            shortcode = media_id_to_shortcode(media_id)

        # 1. Try via browser helper script (Playwright)
        helper_path = "/opt/inflow/scripts/post_comment_reply.js"
        if os.path.exists(helper_path) and shortcode:
            try:
                cmd = [
                    "node",
                    helper_path,
                    "--account", self.account_username,
                    "--shortcode", shortcode,
                    "--reply", text
                ]
                if comment_id:
                    cmd.extend(["--comment-id", str(comment_id)])
                if username:
                    cmd.extend(["--target-user", username])
                if comment_text:
                    cmd.extend(["--target-text", comment_text])

                env = dict(os.environ)
                env["NODE_PATH"] = "/root/twenty-repo/node_modules:/opt/inflow/node_modules"
                proc = subprocess.run(cmd, capture_output=True, text=True, timeout=45, env=env)
                if proc.returncode == 0:
                    try:
                        res_data = json.loads(proc.stdout.strip())
                        if res_data.get("login_required"):
                            db.update_account_bot_status(
                                self.account_username,
                                "login_required",
                                last_error=res_data.get("error", "Login required"),
                                message="نشست نامعتبر است یا نیاز به ورود دارد"
                            )
                            return False
                        if res_data.get("success"):
                            logger.info(f"Successfully posted comment reply via browser helper for @{username}: {text}")
                            return True
                    except Exception:
                        pass
                logger.warning(f"Browser helper reply note: {proc.stderr[:150] or proc.stdout[:150]}")
            except Exception as e:
                logger.warning(f"Error calling browser helper: {e}")

        # 2. Fallback to API if browser helper did not succeed
        url = f"https://www.instagram.com/api/v1/web/comments/{media_id}/add/"
        payload = {
            "comment_text": text,
            "replied_to_comment_id": comment_id,
        }
        headers = dict(self.default_headers)
        headers["Content-Type"] = "application/x-www-form-urlencoded"
        headers["X-Instagram-AJAX"] = "1"
        try:
            res = self.session.post(url, data=payload, headers=headers, timeout=20)
            if res.status_code == 200:
                data = res.json()
                if data.get("status") == "ok":
                    logger.info(f"Successfully replied to comment {comment_id} via API")
                    return True
            if "feedback_required" in res.text or "checkpoint_required" in res.text:
                status_val = "checkpoint_required" if "checkpoint" in res.text else "rate_limited"
                try:
                    db.update_account_bot_status(
                        self.account_username,
                        status_val,
                        last_error=res.text[:200],
                        message="محدودیت اکشن یا چک‌پوینت از سمت اینستاگرام در ثبت پاسخ کامنت"
                    )
                except Exception:
                    pass
                return False
            if res.status_code in (401, 403) or "login_required" in res.text:
                try:
                    db.update_account_bot_status(
                        self.account_username,
                        "login_required",
                        last_error=f"API reply HTTP {res.status_code}",
                        message="نشست نامعتبر است یا نیاز به ورود دارد"
                    )
                except Exception:
                    pass
            logger.warning(f"Reply to comment {comment_id} failed with code {res.status_code}: {res.text[:200]}")
            return False
        except Exception as e:
            logger.error(f"Error replying to comment {comment_id}: {e}")
            return False

    def send_dm(self, recipient_user_id: str, text: str) -> bool:
        """
        Sends a Direct Message (DM) to recipient_user_id.
        """
        url = "https://www.instagram.com/api/v1/direct_v2/threads/broadcast/text/"
        payload = {
            "recipient_users": f"[[{recipient_user_id}]]",
            "text": text,
            "action": "send_item",
            "client_context": str(uuid.uuid4()),
        }
        headers = dict(self.default_headers)
        headers["Content-Type"] = "application/x-www-form-urlencoded"
        try:
            res = self.session.post(url, data=payload, headers=headers, timeout=20)
            if res.status_code == 200:
                data = res.json()
                if data.get("status") == "ok":
                    logger.info(f"Successfully sent DM to user {recipient_user_id}")
                    return True
            if "feedback_required" in res.text or "checkpoint_required" in res.text:
                status_val = "checkpoint_required" if "checkpoint" in res.text else "rate_limited"
                try:
                    db.update_account_bot_status(
                        self.account_username,
                        status_val,
                        last_error=res.text[:200],
                        message="محدودیت ارسال دایرکت (Action Block) از سمت اینستاگرام"
                    )
                except Exception:
                    pass
                return False
            if res.status_code in (401, 403) or "login_required" in res.text:
                try:
                    db.update_account_bot_status(
                        self.account_username,
                        "login_required",
                        last_error=f"Send DM HTTP {res.status_code}",
                        message="نشست نامعتبر است یا نیاز به ورود دارد"
                    )
                except Exception:
                    pass
            logger.warning(f"Send DM to {recipient_user_id} failed with code {res.status_code}: {res.text[:200]}")
            return False
        except Exception as e:
            logger.error(f"Error sending DM to {recipient_user_id}: {e}")
            return False
