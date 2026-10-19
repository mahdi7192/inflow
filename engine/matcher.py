"""
inFlow Comment Text & Trigger Matcher
Handles Persian/Arabic text normalization, keyword matching,
AI semantic context evaluation via local 9Router (ag/gemini-3.8-flash),
and follow-confirmation detection ("فالو کردم").
"""

import os
import re
import json
import logging
import requests
from typing import List

logger = logging.getLogger("matcher")

FOLLOW_CONFIRMATION_PATTERNS = [
    r"فالو\s*(کردم|شد|کردمت|کردم رفیق|کردم برام بفرست|کردم بفرست|انجام شد|دارمت|دارم)",
    r"(کردم|فالو|شد)\s*فالو",
    r"انجام\s*شد",
    r"\bdone\b",
    r"\bfollowed\b",
    r"\bfollow\b",
]

_9ROUTER_URL = "http://127.0.0.1:20128/v1/chat/completions"
_AI_MODEL = "ag/gemini-3.8-flash"

def _get_api_key() -> str:
    config_path = "/root/.hermes/config.yaml"
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                for line in f:
                    if "api_key:" in line:
                        return line.split("api_key:")[1].strip().strip("\"'")
        except Exception:
            pass
    return os.environ.get("OPENAI_API_KEY", "sk-antigravity")

def normalize_text(text: str) -> str:
    """Normalizes Persian/Arabic variants, removes special chars and extra spaces."""
    if not text:
        return ""
    text = text.lower()
    # Replace Arabic letters with Persian counterparts
    text = text.replace("ي", "ی").replace("ك", "ک").replace("ة", "ه").replace("ؤ", "و").replace("إ", "ا").replace("أ", "ا")
    # Remove half spaces (ZWNJ) and special punctuation
    text = text.replace("\u200c", " ").replace("\u200b", " ")
    text = re.sub(r"[^\w\s\d]", " ", text)
    # Collapse multiple whitespaces
    text = re.sub(r"\s+", " ", text).strip()
    return text

def is_follow_confirmation(comment_text: str) -> bool:
    """Checks whether the comment text indicates the user is confirming they followed."""
    norm = normalize_text(comment_text)
    for pattern in FOLLOW_CONFIRMATION_PATTERNS:
        if re.search(pattern, norm, re.IGNORECASE):
            return True
    return False

def evaluate_ai_context(comment_text: str, trigger_context: str, post_caption: str = "") -> bool:
    """
    Evaluates whether a comment matches the specified semantic criteria using local 9Router LLM.
    Returns True if comment matches intent, False otherwise.
    """
    if not comment_text or not trigger_context:
        return False

    prompt = f"""شما یک سیستم هوشمند ارزیابی کامنت اینستاگرام هستید.
وظیفه شما بررسی این است که آیا کامنت کاربر با شرط مشخص شده همخوانی معنایی دارد یا خیر.

کپشن پست:
{post_caption or "بدون کپشن"}

شرط یا موضوع مد نظر ادمین:
{trigger_context}

کامنت کاربر:
"{comment_text}"

آیا مفهوم این کامنت با شرط و موضوع مد نظر همخوانی دارد؟
پاسخ شما باید صرفاً یک کلمه باشد: یا YES یا NO بدون هیچ متن اضافی دیگری."""

    headers = {
        "Authorization": f"Bearer {_get_api_key()}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": _AI_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "max_tokens": 10,
        "stream": False
    }

    try:
        res = requests.post(_9ROUTER_URL, headers=headers, json=payload, timeout=12)
        if res.status_code == 200:
            content = res.json()["choices"][0]["message"]["content"].strip().upper()
            is_yes = "YES" in content
            logger.info(f"AI Context Evaluation: comment='{comment_text}', trigger='{trigger_context}' -> Result={is_yes} (raw: {content})")
            return is_yes
        else:
            logger.error(f"9Router LLM error: {res.status_code} - {res.text[:150]}")
            return False
    except Exception as e:
        logger.error(f"Failed to evaluate AI context with 9Router: {e}")
        return False

def generate_ai_reply(
    comment_text: str,
    prompt_instructions: str,
    post_caption: str = "",
    channel: str = "comment"
) -> str:
    """
    Generates a natural, human-like Persian reply to a comment or direct message (DM)
    based on admin instructions.
    """
    if channel == "dm":
        prompt = f"""شما ادمین صمیمی، محترم و پاسخگوی این پیج اینستاگرام هستید.
شما هم‌اکنون دقیقاً در صفحه چت خصوصی (دایرکت اینستاگرام) با این کاربر قرار دارید و می‌خواهید پیام دایرکت برایش ارسال کنید.

کامنت کاربر در زیر پست:
"{comment_text}"

کپشن پست مربوطه:
{post_caption or "بدون کپشن"}

دستورالعمل ادمین برای محتوای دایرکت:
{prompt_instructions}

قوانین حیاتی و ضروری برای دایرکت:
۱. شما هم‌اکنون داخل دایرکت هستید! بنابراین اکیداً و هرگز نباید عباراتی مثل «دایرکت شد»، «دایرکت فرستادم»، «دایرکتتون رو چک کنید» یا «براتون ارسال شد» بنویسید.
۲. اصل پیام، پاسخ، لینک، تشکر یا اطلاعات مورد نظر را مستقیماً، گرم و صمیمی به کاربر تحویل دهید.
۳. متن کوتاه، محاوره‌ای و روان باشد (حداکثر ۱ الی ۳ جمله).
۴. فقط متن پیام را بنویسید، بدون گیومه یا توضیحات فرعی."""
    else:
        prompt = f"""شما ادمین صمیمی، محترم و پاسخگوی اینستاگرام هستید.
شما در حال نوشتن یک پاسخ (ریپلای) عمومی زیر کامنت کاربر در پست اینستاگرام هستید.

کپشن پست:
{post_caption or "بدون کپشن"}

کامنت کاربر:
"{comment_text}"

دستورالعمل ادمین برای پاسخ:
{prompt_instructions}

نکات:
- فقط متن مستقیم پاسخ عمومی را بنویسید (بدون نقل قول یا توضیحات اضافه).
- حداکثر در ۱ الی ۲ جمله کوتاه و صمیمی.
- کاملاً فارسی روان و محاوره‌ای متناسب با کامنت‌های اینستاگرام."""

    headers = {
        "Authorization": f"Bearer {_get_api_key()}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": _AI_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens": 100,
        "stream": False
    }

    try:
        res = requests.post(_9ROUTER_URL, headers=headers, json=payload, timeout=15)
        if res.status_code == 200:
            content = res.json()["choices"][0]["message"]["content"].strip()
            # Clean wrapping quotes if any
            content = content.strip("\"'«»")
            logger.info(f"AI Reply generated: '{content}'")
            return content
        else:
            logger.error(f"9Router LLM reply generation error: {res.status_code}")
            return prompt_instructions
    except Exception as e:
        logger.error(f"Failed to generate AI reply with 9Router: {e}")
        return prompt_instructions

def matches_trigger(
    comment_text: str,
    trigger_type: str,
    trigger_keywords: str = "",
    trigger_context: str = "",
    post_caption: str = ""
) -> bool:
    """
    Checks if a comment meets the trigger condition.
    - trigger_type == 'all': matches every comment.
    - trigger_type == 'keyword': matches if any specified keyword is in the comment.
    - trigger_type == 'ai_context': uses local LLM semantic evaluation.
    """
    if trigger_type == "all":
        return True
    
    if trigger_type == "ai_context":
        return evaluate_ai_context(comment_text, trigger_context, post_caption)

    if trigger_type == "keyword":
        if not trigger_keywords:
            return False
            
        keywords = [normalize_text(kw) for kw in trigger_keywords.split(",") if kw.strip()]
        if not keywords:
            return False

        norm_comment = normalize_text(comment_text)
        words = set(norm_comment.split())

        for kw in keywords:
            if " " in kw:
                # Multi-word keyword phrase
                if kw in norm_comment:
                    return True
            else:
                # Single word keyword
                if kw in words or kw in norm_comment:
                    return True

        return False

    return False
