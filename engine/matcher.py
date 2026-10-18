"""
inFlow Comment Text & Trigger Matcher
Handles Persian/Arabic text normalization, keyword matching,
and follow-confirmation detection ("فالو کردم").
"""

import re
from typing import List

FOLLOW_CONFIRMATION_PATTERNS = [
    r"فالو\s*(کردم|شد|کردمت|کردم رفیق|کردم برام بفرست|کردم بفرست|انجام شد|دارمت|دارم)",
    r"(کردم|فالو|شد)\s*فالو",
    r"انجام\s*شد",
    r"\bdone\b",
    r"\bfollowed\b",
    r"\bfollow\b",
]

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

def matches_trigger(comment_text: str, trigger_type: str, trigger_keywords: str) -> bool:
    """
    Checks if a comment meets the trigger condition.
    - trigger_type == 'all': matches every comment.
    - trigger_type == 'keyword': matches if any specified keyword is in the comment.
    """
    if trigger_type == "all":
        return True
    
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
