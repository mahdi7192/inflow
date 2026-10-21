# Research & Architectural Decisions: Zero-Bot Direct Integration & Native Engine

**Feature**: `014-native-instagram-engine`  
**Date**: 2026-10-21 (Updated)  
**Status**: Completed & Approved

---

## 1. UI & Terminology Shift: Elimination of the "Bot / VNC" Paradigm

### Context
In the previous architecture, the UI presented the automation as an external "ربات" with complex lifecycle states (`پروویژنینگ`, `VNC Guard`, `Bot Screen`, `VNC Viewer Modal`).
The user explicitly stated:
> "دیگه اون ربات بالا سمت چپ اشتباهه، چیزی به اسم ربات دیگه نداریم. فلو لاگین دیگه اونجوری نیست باید یوزر پس بده و اونجوری لاگین کنه."

### Decision
1. **Purge "Bot / ربات" Everywhere**:
   - The top toolbar button is now **`SessionHealthBadge`**:
     - Status: `🟢 نشست فعال (@username)` or `🔴 نیاز به ورود مجدد`
   - Complete removal of `VncViewerModal`, `BotMonitorDrawer`, `BotScreen`, and VNC token generation.
2. **Direct In-App Modal Login**:
   - Connection happens via a clean dialog: input Instagram `username` and `password`.
   - The dialog supports inline 2FA challenge code entry if SMS/authenticator is active.

### Rationale
- Users understand "Account Connection" and "Session Status" far better than server-level bot provisioning and remote VNC ports.
- Radically simplifies the UI codebase by deleting hundreds of lines of legacy VNC iframe code.

---

## 2. Protocol Architecture: Mobile API + MQTT Real-Time

### Context
The user requested:
> "کل فلو های دیگه از جمله پیام دادن دایرکت دادن کامنت دادن ریپلای کردن خوندن کامنت ها از طریق mqtt و همه اینها انجام بشه"

### Decision
Utilize the Instagram Mobile Protocol stack through `instagrapi`:
1. **HTTP Mobile Endpoints (`curl_cffi` with iOS/Android TLS Impersonation)**:
   - Reading media, reels, and stories: `cl.user_medias()`
   - Reading comments: `cl.media_comments()`
   - Replying to comments: `cl.comment_reply()`
   - Sending direct messages: `cl.direct_send()`
2. **MQTT Push Notification & Real-Time Sync**:
   - Active accounts leverage mobile MQTT push notifications for instant DM delivery events.
   - Dual-mode resilience: Real-time MQTT backed by Smart Polling fallback (20s interval) guarantees zero lost messages even across network drops.

---

## 3. Session Health, Error Interception & 1-Click Re-Login

### Context
The user emphasized:
> "فقط مشخص مشخص باشه که لاگین هستیم و اگه لاگ اوت شده بود خطا بده تا دوباره بشه لاگین کرد"

### Decision
1. **Explicit Session State Indicator**:
   - Every background API call catches `LoginRequired`, `CheckpointRequired`, or `ChallengeRequired`.
   - On exception:
     - The account's `engine_status` is immediately updated to `reauth_required`.
     - The encrypted vault marks `is_valid = 0`.
2. **High-Visibility UI Warning & 1-Click Action**:
   - The header displays an attention-grabbing red badge with an exclamation icon: `نیاز به ورود مجدد`.
   - Clicking the badge immediately pops up the Account Connection Dialog pre-filled with the username, allowing the operator to enter their password and restore the session in seconds.

---

## 4. Direct AI API Key Integration (No External AI Agents)

### Context
The user specified:
> "ایجنت هوش مصنوعی که دیگه نداریم ولی api key , کلید برای استفاده از هوش مصنوعی داریم"

### Decision
Remove all external AI agent processes. Instead, implement a direct, stateless LLM client in the repository:
1. **Configuration**: Operator sets `AI_PROVIDER` (`openai` or `gemini`) and `AI_API_KEY` (via `.env` or inFlow Settings).
2. **Direct Execution**:
   - When a comment arrives matching `ai_context`, inFlow directly calls the LLM endpoint (e.g., `https://api.openai.com/v1/chat/completions` or Gemini API).
   - Injects post caption, business rules, and user question.
   - Parses the JSON response for public reply and private DM.
3. **Resilience**: 4.5-second timeout with deterministic fallback to static templates if the LLM API is slow.
