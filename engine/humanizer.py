"""
inFlow Humanizer & Anti-Ban Pacing
Calculates dynamic jitter delays and provides safe reply text randomization
to prevent account action blocks.
"""

import time
import random
import logging
from typing import List, Optional

logger = logging.getLogger("inflow.humanizer")

DEFAULT_FOLLOW_PROMPT_REPLIES = [
    "برای دریافت، لطفا پیج رو فالو داشته باش و بعد بنویس «فالو کردم» تا اتوماتیک ارسال بشه برات 🌸",
    "رفیق فقط برای فالوئرها ارسال میشه، پیج رو فالو کن و بگو «فالو کردم» تا دایرکت بشه برات ✨",
    "لطفا اول پیج رو فالو کن و بعد همینجا بنویس «فالو کردم» تا لینک برات دایرکت بشه 📩",
]

def calculate_sleep_interval(queue_len: int) -> float:
    """
    Calculates dynamic jitter sleep duration in seconds based on pending queue depth.
    - Large queue (> 20): 8 to 14 seconds (faster processing without hitting aggressive burst limits).
    - Medium queue (6 to 20): 15 to 25 seconds.
    - Idle/Small queue (1 to 5): 25 to 45 seconds (maximum human-like rhythm).
    """
    if queue_len > 20:
        base = random.uniform(8.0, 14.0)
    elif queue_len > 5:
        base = random.uniform(15.0, 25.0)
    else:
        base = random.uniform(25.0, 45.0)
    
    # Add fractional jitter
    jitter = random.uniform(-1.5, 2.5)
    return max(5.0, round(base + jitter, 2))

def human_sleep(queue_len: int, reason: str = ""):
    """Sleeps for a human-like interval and logs the pacing."""
    delay = calculate_sleep_interval(queue_len)
    logger.info(f"Pacing delay {delay}s (queue={queue_len}) [{' - ' + reason if reason else ''}]")
    time.sleep(delay)

def pick_reply_text(template: str) -> str:
    """
    Selects a reply text from a piped template ('گزینه ۱ | گزینه ۲ | گزینه ۳').
    Falls back to single string if no pipe found.
    """
    if not template:
        return ""
    if "|" in template:
        variants = [v.strip() for v in template.split("|") if v.strip()]
        if variants:
            return random.choice(variants)
    return template.strip()

def get_follow_request_reply() -> str:
    """Returns a randomized prompt asking the commenter to follow and confirm."""
    return random.choice(DEFAULT_FOLLOW_PROMPT_REPLIES)

def parse_time_str_to_timestamp(time_val) -> Optional[float]:
    """Converts relative time text (English & Persian) or ISO/epoch timestamps to UTC epoch seconds."""
    if not time_val:
        return None

    if isinstance(time_val, (int, float)):
        ts = float(time_val)
        if ts > 1e14:  # microseconds
            return ts / 1e6
        if ts > 1e11:  # milliseconds
            return ts / 1e3
        return ts

    s = str(time_val).strip()
    if not s:
        return None

    # Try ISO or SQL date format
    if "T" in s or ("-" in s and ":" in s):
        try:
            import datetime
            dt = datetime.datetime.fromisoformat(s.replace("Z", "+00:00"))
            return dt.timestamp()
        except Exception:
            pass

    # Try numeric string
    try:
        ts = float(s)
        if ts > 1e14:
            return ts / 1e6
        if ts > 1e11:
            return ts / 1e3
        return ts
    except ValueError:
        pass

    import re
    now = time.time()
    low = s.lower()

    # Persian digits to English
    for p, e in [('۰','0'),('۱','1'),('۲','2'),('۳','3'),('۴','4'),('۵','5'),('۶','6'),('۷','7'),('۸','8'),('۹','9')]:
        low = low.replace(p, e)

    if any(w in low for w in ["now", "just now", "لحظه", "همین الان"]):
        return now

    if any(w in low for w in ["دیروز", "yesterday"]):
        return now - 86400

    m = re.search(r'(\d+)', low)
    num = int(m.group(1)) if m else 1

    if any(w in low for w in ["m", "دقیقه", "min"]):
        return now - (num * 60)
    if any(w in low for w in ["h", "ساعت", "hr"]):
        return now - (num * 3600)
    if any(w in low for w in ["d", "روز", "day"]):
        return now - (num * 86400)
    if any(w in low for w in ["w", "هفته", "week"]):
        return now - (num * 7 * 86400)

    return None
