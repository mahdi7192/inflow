# Quickstart & Verification Guide: Dedicated Bot Provisioning & VNC Guard

This guide outlines runnable scenarios to validate the implementation of feature `007-bot-provisioning-and-vnc-guard`.

---

## 1. Prerequisites & Setup

1. **Start the local inFlow development server**:
   ```bash
   pnpm dev
   ```
   Open `http://localhost:3000` in your browser.

2. **Verify Database Schema Migration**:
   Confirm that the `accounts` table contains `bot_status`, `bot_profile_name`, `bot_vnc_active`, `bot_vnc_token`, and that `bot_lifecycle_logs` exists:
   ```bash
   node -e "const db = require('better-sqlite3')('data/inflow.db'); console.log(db.prepare('PRAGMA table_info(accounts)').all().map(c => c.name));"
   ```

---

## 2. Validation Scenarios

### Scenario 1: Setup Wizard Display for Unprovisioned Page
1. Log in as a Superadmin (`admin` / default password).
2. Go to `/backoffice/pages` and register a new test page: `test_shop_99`.
3. Assign `test_shop_99` to a tenant user (or log in as that tenant).
4. Select `test_shop_99` in the dashboard account switcher.
5. **Expected Outcome**:
   - The regular reels/posts feed is replaced by the `BotSetupWizard`.
   - The Security Card with the Shield icon is rendered, explaining isolated cloud containerization and dedicated IP protection in Persian.
   - The primary button "راه‌اندازی ربات اختصاصی" is active and clickable.
   - The top toolbar displays a gray Bot badge: `راه‌اندازی نشده`.

---

### Scenario 2: Provisioning Initiation & State Transition
1. On the `BotSetupWizard`, click "راه‌اندازی ربات اختصاصی".
2. **Expected Outcome**:
   - The wizard transitions into an active loading state with animated progress steps.
   - The top toolbar Bot badge switches to blue: `در حال راه‌اندازی`.
   - The server orchestrator logs a profile creation request for `inflow_test_shop_99`.
   - Within seconds, the UI transitions to Step 2: "ورود به اکانت اینستاگرام" (`login_required`).

---

### Scenario 3: On-Demand VNC Guard & Interactive Browser Modal
1. On the `login_required` step, click "ورود به اینستاگرام در مرورگر".
2. **Expected Outcome**:
   - An API request `POST /api/bot/vnc-session` is triggered.
   - A sleek modal opens with an embedded noVNC view showing Google Chrome loaded at `https://www.instagram.com/accounts/login/`.
   - The modal header shows a live countdown timer starting at `10:00`.
   - Clicking "قطع اتصال و خروج" calls `DELETE /api/bot/vnc-session` and immediately closes the session.

---

### Scenario 4: Successful Login & Transition to Live
1. Simulate successful session verification by calling:
   ```bash
   curl -X POST http://localhost:3000/api/bot/session-harvested \
     -H "Content-Type: application/json" \
     -d '{"account": "test_shop_99", "verified": true}'
   ```
2. **Expected Outcome**:
   - The UI automatically updates: the setup wizard disappears, and the active dashboard (reels, triggers, comment logs) renders.
   - The top toolbar Bot badge turns solid green: `لایو`.
   - Any active VNC modal closes automatically.

---

### Scenario 5: Persistent Toolbar Monitor Drawer & Actions
1. Click the green `لایو` Bot button in the top toolbar.
2. **Expected Outcome**:
   - A slide-over drawer (`BotMonitorDrawer`) opens from the side.
   - Displays real-time uptime, last heartbeat timestamp, and profile name (`inflow_test_shop_99`).
   - Clicking "مشاهده زنده مرورگر" launches a fresh on-demand VNC session.
   - Clicking "توقف موقت" transitions the bot status to `paused` with an amber badge.
   - Clicking "ادامه کار ربات" restores status to `live`.
