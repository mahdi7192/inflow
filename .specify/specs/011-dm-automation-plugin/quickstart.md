# Quickstart Validation Guide: Direct Message (DM) Automation Plugin

**Feature**: `011-dm-automation-plugin`  
**Date**: 2026-10-20  
**Status**: Ready for Implementation

This guide provides end-to-end manual and automated scenarios to validate that the DM Automation Plugin functions correctly in inFlow.

---

## Prerequisites

1. inFlow local server running on `http://localhost:3000` via `pnpm dev`.
2. Active user session (superadmin or tenant with an assigned account, e.g. `mahdiketabdar`).
3. Database `data/inflow.db` initialized with `dm_automations` and `dm_logs` tables.

---

## Scenario 1: Navigation & Instant Master Toggle Auto-Save

### Objective
Verify that navigating to `/@{username}/dms` loads the DM Automation interface and that flipping the master switch instantly updates the database and shows a toast notification without clicking a manual apply button.

### Steps
1. Open browser to `http://localhost:3000/`.
   - **Expected Result**: Automatically redirects authenticated user to `/@mahdiketabdar` (the comment plugin).
2. Click "اتوماسیون دایرکت" in the left sidebar navigation.
   - **Expected Result**: URL changes cleanly to `/@mahdiketabdar/dms` with zero page flash; shows DM header, master toggle, trigger tabs, and prompt configuration.
3. Click the Master Switch to toggle it **ON**.
   - **Expected Result**: 
     - Switch transitions immediately to green/active.
     - A toast message appears: "اتوماسیون دایرکت با موفقیت فعال شد".
     - Inspect database: `SELECT enabled FROM dm_automations WHERE account_username = 'mahdiketabdar'` returns `1`.
4. Click the Master Switch to toggle it **OFF**.
   - **Expected Result**: 
     - Switch transitions to gray/paused.
     - A toast appears: "اتوماسیون دایرکت متوقف شد".
     - Inspect database: `enabled` returns `0`.

---

## Scenario 2: Configuring Dual-Layer Triggers & Knowledge Sources

### Objective
Configure semantic AI intent triggering, rapid web context URLs, and select an MCP tool.

### Steps
1. In `/@mahdiketabdar/dms`, set:
   - **Trigger Mode**: Select `تشخیص هوشمند با هوش مصنوعی (ai_context)`.
   - **Trigger Condition**: "فقط اگر درباره قیمت، تخفیف، سایزبندی یا نحوه سفارش سوال شد پاسخ بده. احوال‌پرسی‌های ساده اسکیپ شوند."
   - **Reply Mode**: Select `پاسخ با هوش مصنوعی (ai)`.
   - **AI Instructions Textarea**:
     ```text
     شما کارشناس فروشگاه هستید. با لحنی دوستانه، حرفه‌ای و صمیمی پاسخ دهید.
     برای اطلاع از موجودی لحظه‌ای و قیمت، از ابزار بررسی کاتالوگ استفاده کنید.
     در صورتی که موجودی به اتمام رسیده بود، پیشنهاد سایز مشابه بدهید.
     ```
   - **Web Context URLs**: Add `https://example.com/shop/catalog`.
   - **Require Follow**: Toggle **ON** with prompt: "سلام دوست عزیز! برای دریافت کد تخفیف اختصاصی، لطفاً ابتدا پیج را فالو کنید ❤️".
2. Click "ذخیره تنظیمات".
   - **Expected Result**: Settings save successfully with toast "تنظیمات اتوماسیون دایرکت ذخیره شد".

---

## Scenario 3: Agent Polling Contract Verification

### Objective
Verify that the worker polling endpoint delivers the complete DM automation configuration alongside comment rules.

### Test Command
```bash
curl -s "http://localhost:3000/api/agent/poll?account=mahdiketabdar" | jq .dm_automation
```

### Expected Output
```json
{
  "enabled": 1,
  "trigger_type": "ai_context",
  "trigger_context": "فقط اگر درباره قیمت، تخفیف، سایزبندی یا نحوه سفارش سوال شد پاسخ بده. احوال‌پرسی‌های ساده اسکیپ شوند.",
  "trigger_keywords": [],
  "reply_mode": "ai",
  "direct_reply_text": "",
  "ai_prompt_instructions": "شما کارشناس فروشگاه هستید...",
  "web_context_urls": ["https://example.com/shop/catalog"],
  "mcp_servers_config": [],
  "require_follow": 1,
  "follow_prompt_text": "سلام دوست عزیز! برای دریافت کد تخفیف اختصاصی..."
}
```

---

## Scenario 4: Idempotent DM Logging & Duplicate Lock Rejection

### Objective
Verify that `POST /api/accounts/{username}/dm-logs` records interactions and rejects duplicate deliveries.

### Step 1: Record First DM Event
```bash
curl -X POST "http://localhost:3000/api/accounts/mahdiketabdar/dm-logs" \
  -H "Content-Type: application/json" \
  -d '{
    "message_id": "mid.1234567890",
    "thread_id": "thread.999",
    "sender_username": "customer_ali",
    "incoming_text": "سلام قیمت این ست ورزشی چنده؟",
    "is_story_reply": 0,
    "trigger_matched": 1,
    "reply_status": "sent",
    "reply_text": "سلام علی عزیز! قیمت ست ورزشی ۶۸۰ هزار تومان است."
  }' | jq .
```
- **Expected Outcome**: `{"success": true, "log_id": 1}`.

### Step 2: Simulate Duplicate Delivery (Same `message_id`)
Execute the identical curl command a second time.
- **Expected Outcome**: `{"success": true, "already_processed": true}` (or idempotent 200 without duplicate database rows).
- **Verification**: `SELECT count(*) FROM dm_logs WHERE message_id = 'mid.1234567890'` returns exactly `1`.

---

## Scenario 5: Follow-Gating & Story Reply Verification

### Objective
Confirm that non-followers are flagged as `pending_follow` and story replies include referenced content.

### Step 1: Follow-Gated Non-Follower Log
```bash
curl -X POST "http://localhost:3000/api/accounts/mahdiketabdar/dm-logs" \
  -H "Content-Type: application/json" \
  -d '{
    "message_id": "mid.non_follower_001",
    "thread_id": "thread.888",
    "sender_username": "new_visitor",
    "incoming_text": "کد تخفیف می‌خوام",
    "trigger_matched": 1,
    "reply_status": "pending_follow",
    "reply_text": "سلام دوست عزیز! برای دریافت کد تخفیف اختصاصی، لطفاً ابتدا پیج را فالو کنید ❤️"
  }' | jq .
```
- **Expected Outcome**: Status saved as `pending_follow`.

### Step 2: Story Reply with Context Injection
```bash
curl -X POST "http://localhost:3000/api/accounts/mahdiketabdar/dm-logs" \
  -H "Content-Type: application/json" \
  -d '{
    "message_id": "mid.story_reply_002",
    "thread_id": "thread.777",
    "sender_username": "shayan_buyer",
    "incoming_text": "موجود دارید؟",
    "is_story_reply": 1,
    "story_id": "story_998877",
    "story_content": "کفش ورزشی نایک مدل زوم ۲۰۲۶ - تخفیف ۳۰٪",
    "trigger_matched": 1,
    "reply_status": "sent",
    "reply_text": "سلام شایان عزیز! بله کفش نایک زوم در استوری موجود است، سایزهای ۴۱ تا ۴۴ شارژ شد."
  }' | jq .
```
- **Expected Outcome**: Status `sent`, `is_story_reply: 1` and `story_content` persisted and visible in DM logs table.
