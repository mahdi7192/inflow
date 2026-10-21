# Quickstart: Direct Native Instagram Integration & Zero-Bot Verification

**Feature**: `014-native-instagram-engine`  
**Purpose**: Validation scenarios for direct in-app login, session health badges, real-time messaging, and direct AI responses.

---

## 1. Setup & Environment

Ensure Python 3.10+ with `uv` and Node.js 20+ with `pnpm` are installed:
```bash
# In .env.local:
SESSION_VAULT_SECRET="your-vault-encryption-secret-32-chars-min"
OPENAI_API_KEY="sk-..." # or GEMINI_API_KEY
```

---

## 2. Validation Scenarios

### Scenario 1: Zero-Bot Direct In-App Login
1. Open the inFlow workspace at [http://localhost:3000](http://localhost:3000).
2. Click **اتصال اکانت اینستاگرام (Connect Account)**.
3. Enter Instagram username (`mahdiketabdar`) and password.
4. If 2FA is active, input the 6-digit verification code.
5. **Verify**:
   - The top toolbar displays: `🟢 نشست فعال (@mahdiketabdar)`.
   - The word "ربات" or VNC buttons **do not appear** anywhere.
   - Database verification: `sqlite3 data/inflow.db "SELECT * FROM account_sessions;"` shows encrypted ciphertexts only. Zero raw passwords.

### Scenario 2: Real-Time Comment Auto-Reply & DM
1. In the Posts tab, select a post and set auto-reply to ON with trigger keywords: `قیمت`.
2. Post a comment on Instagram: *"قیمت این ست چنده؟"*.
3. **Verify**:
   - Comment is detected via mobile API/push.
   - Public reply is published.
   - Direct message is dispatched to the user.
   - Action is locked in `comment_logs` (0 duplicate replies).

### Scenario 3: Session Expiry Alert & 1-Click Re-Login
1. Invalidate the session (simulate `LoginRequired` by expiring the cookie or changing the password).
2. On next engine cycle:
   - The top badge turns red: `🔴 نشست منقضی شده`.
   - A non-dismissible banner alerts the user: *"نشست اینستاگرام منقضی شده است. لطفاً مجدداً وارد شوید."*
   - Clicking **ورود مجدد (Re-login)** opens the login dialog pre-filled with the username.
   - Entering the new password restores the session to `🟢 نشست فعال` immediately.

### Scenario 4: Direct AI Completion Test
1. Set a post's trigger to `ai_context` with instructions: *"پاسخ کوتاه و صمیمی به سوالات قیمت"*.
2. Post a question: *"چطوری میتونم سفارش بدم؟"*.
3. **Verify**:
   - inFlow directly queries the OpenAI/Gemini API using `OPENAI_API_KEY`.
   - Generates and delivers a natural response without any external AI agent.
