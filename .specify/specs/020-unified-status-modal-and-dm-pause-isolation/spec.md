# Feature Specification: Unified Status Modal & Direct Message Pause Isolation (Spec 020)

**Feature Branch / Spec**: `020-unified-status-modal-and-dm-pause-isolation`
**Date**: 2026-10-23
**Status**: Approved & Ready for Implementation

---

## 1. Context & User Goal

1. **Avoid Button/Badge Clutter in Header**:
   Currently, the header renders multiple separate status indicators:
   - Automation master toggle (`اتوماسیون فعال` / `متوقف`)
   - Session health badge (`نشست: فعال` / `نیاز به ورود به حساب`)
   
   The user requested:
   > "نمیخوام 20 تا دکمه باشه، همون نشست فعال هم الان با اتوماسیون فعال یکی بشن دیگه اونو که میزنی بشه تو یک پنجره ای مشخص کنی چی فعال باشه چی نباشه کلا فعال یا غیرفعال باشه"

2. **Pause/Disable General Direct Messaging while Preserving Comment-to-DM Follow Gate**:
   The user requested:
   > "پروژه inflow رو سرور یک مشکلی داره امکان pause کردن و یا غیر فعال کردن دایرکت دهی رو نداره یعنی کسی دایرکت داد پاسخ نده ولی اون حالات فالو کردن که از رو تریگر کامنت میاد کار کنه"

   Currently:
   - If `account.status === 'paused'`, it kills comments AND DMs AND follow checks.
   - If `dm_automations.enabled === 0`, `isPostContinuation` in `automation-engine.ts` still caused the bot to reply to users who previously commented on posts with AI replies.
   - There was no single clean control panel to toggle DMs independently from comments without digging into sub-tabs.

---

## 2. Requirements

### FR-001: Unified Status Indicator (Header)
- Merge `SessionHealthBadge` and `MasterAutomationToggle` in `workspace-shell.tsx` into a single, compact, modern interactive status badge.
- Visual state:
  - If session is `unauthenticated` / `challenge_required` / `expired`: Amber/Rose warning indicator with text e.g. `⚠️ وضعیت پیج (نیاز به ورود)`.
  - If session is active and automation is active: Emerald indicator `🟢 وضعیت و اتوماسیون پیج`.
  - If session is active but master automation is paused: Amber indicator `⏸️ اتوماسیون پیج (متوقف)`.
  - If session is active and DM automation is paused but comment automation is active: Clean badge showing active with DM paused hint.
- Clicking the badge opens `UnifiedStatusModal`.

### FR-002: Unified Status & Modules Modal (`UnifiedStatusModal`)
- A clean dialog/modal opened by clicking the unified status badge:
  1. **Instagram Account & Session Card**:
     - Shows account username, avatar, and connection status (`نشست فعال` or `نیاز به ورود`).
     - Button for "اتصال مجدد / ورود به حساب" (triggers the Instagram login modal).
  2. **Master Switch (کلید اصلی اتوماسیون پیج)**:
     - Toggle: `کلاً فعال` vs `کلاً متوقف` (`accounts.status = 'active' | 'paused'`).
  3. **Granular Modules Control (تفکیک ماژول‌ها)**:
     - **ماژول ۱: تریگر کامنت‌ها و احراز فالو (Comment Triggers & Follow Gate)**:
       - Displays active status (linked to post comment auto-replies).
       - Explains: پاسخ به کامنت‌ها، ارسال دایرکت اولیه، و بررسی شرط فالو برای تحویل هدیه/لینک.
     - **ماژول ۲: پاسخگوی هوشمند دایرکت‌های مستقیم و استوری (Direct Message Automation)**:
       - Toggle switch: `فعال` vs `متوقف` (`dm_automations.enabled = 1 | 0`).
       - Explains: پاسخ خودکار به کسانی که مستقیماً در دایرکت پیام می‌دهند.
       - Clear note: وقتی متوقف باشد، هیچ پاسخی به پیام‌های مستقیم دایرکت داده نمی‌شود، اما تأیید فالو برای کامنت‌ها به طور کامل کار می‌کند.

### FR-003: Backend Isolation & Fix in `automation-engine.ts`
- In `processIncomingDm`:
  - When `dmRule.enabled === 0`:
    - Check if message is a follow confirmation (`isFollowClaim`) or user has pending comment DMs (`pendingComments.length > 0`).
    - If yes: follow verification runs, pending comment rewards are enqueued and sent, and function returns.
    - If no (or once pending items are handled and the remaining text is a general DM question):
      - DO NOT allow `isPostContinuation` to bypass `!globalDmEnabled`.
      - Cleanly record in `dm_logs` as `reply_status = 'skipped'`, `trigger_matched = 0`.
      - Send NO outbound DM action.

### FR-004: Poller Coexistence in `aggregator.ts`
- Ensure that when `dmRule.enabled === 0`:
  - The poller continues to monitor conversations for users who have `pending_follow` items in `comment_logs` or `dm_logs`.
  - It does NOT waste API calls polling inactive DM conversations when there are no pending follow claims.

---

## 3. Success Verification
- Changing DM auto-reply state from the Unified Status Modal updates `dm_automations.enabled` in SQLite.
- Changing Master state updates `accounts.status`.
- Sending a direct DM when `dm_automations.enabled === 0` results in `reply_status = 'skipped'`.
- Submitting a comment requiring follow -> user gets initial prompt -> user sends "فالو کردم" in DM -> bot releases link even if general DM automation is disabled!
