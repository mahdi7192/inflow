# Feature Specification: Consolidated Header Bot Status, Non-Blocking Re-auth UX & Instant VNC Connection

**Feature Branch**: `010-bot-status-header-and-vnc-reconnect`
**Created**: 2026-10-18
**Status**: Ready for Implementation
**Input**: User feedback:
1. یکپارچه‌سازی وضعیت ربات: فقط یک وضعیت در هدر کنار نشانگر MCP و انتخاب زبان، با اندازه کوچک و ارتفاع متناسب با MCP، عنوان «ربات»، رنگ گویا و نمایش نوع خطا در صورت بروز مشکل؛ حذف سایر نشانگرهای تکراری در صفحه.
2. عدم نمایش صفحه خالی ورود برای لاگین مجدد: اگر اکانت قبلاً ست‌آپ شده و نیاز به لاگین دارد (`login_required`)، داشبورد و لیست پست‌ها مسدود نشود؛ وضعیت ربات زرد/قرمز باشد و مدیریت لاگین مجدد داخل مودال/دراور کناری انجام شود.
3. رفع خطای اول اتصال noVNC (Connection Failed): رفع Race Condition بین ساخت توکن، `vnc_guard.py` و Websockify تا اولین باز شدن VNC بدون نیاز به زدن مجدد Connect انجام شود.

---

## User Scenarios & Testing

### User Story 1 - Unified Header Bot Status Indicator (Priority: P1)
As an inFlow dashboard user, I want a single, compact, cleanly styled bot status indicator in the top header adjacent to the language switcher and MCP badge, so that I can see the exact real-time health of my bot at a glance without visual noise or redundant indicators throughout the dashboard.

**Acceptance Criteria**:
1. **Header Placement**: The bot indicator is located strictly in the header bar next to the MCP status badge and Language switcher.
2. **Compact Dimension**: Height and padding match the MCP status badge (`text-[11px]`, `px-2.5 py-1 rounded-full`).
3. **Clear Semantic Labeling**: The title is explicitly "ربات" (Bot) followed by the state (e.g., `ربات: متصل`, `ربات: نیازمند لاگین`, `ربات: متوقف`).
4. **Expressive Color Coding**:
   - Green (Emerald): `active` / `running` / `authenticated`.
   - Amber (Yellow): `login_required` / `reconnect_needed`.
   - Red (Rose): `error` / `crashed` / `unreachable`.
   - Slate (Gray): `stopped` / `unprovisioned`.
5. **Deduplication**: Redundant bot status pills in the sidebar footer and the dashboard hero banner are removed.

---

### User Story 2 - Non-Blocking Dashboard for Re-authentication (Priority: P1)
As an Instagram creator with synced posts, when my Instagram session expires and requires re-login, I want to continue browsing and managing my existing posts, rules, and activity on the dashboard, so that a temporary session expiry does not wipe or hide my workspace behind an empty setup wizard.

**Acceptance Criteria**:
1. **Preserve Workspace on `login_required`**: If an account has synced posts or has already completed initial provisioning, `login_required` does NOT mount the fullscreen `<BotSetupWizard>`.
2. **Setup Wizard Scope**: The blank `<BotSetupWizard>` is only rendered when an account is strictly new and unprovisioned (`botStatus === "unprovisioned"` with zero posts).
3. **Drawer Re-login Action**: When clicking on the yellow/amber bot status badge in the header, the Side Drawer opens showing:
   - Clear banner stating the session has expired (`نشست اینستاگرام منقضی شده است`).
   - Direct one-click action to launch the VNC virtual desktop to re-authenticate.
   - Status auto-refreshes once the login completes.

---

### User Story 3 - Instant, Zero-Failure noVNC Connection (Priority: P1)
As a user opening the VNC virtual desktop to authenticate or monitor my Instagram profile, I want the remote viewer to connect immediately on the first attempt without displaying "Connection Failed" or forcing me to click the manual "Connect" button inside noVNC.

**Acceptance Criteria**:
1. **Eliminate Token Race Condition**: In `vnc_guard.py` and `hermes_orchestrator.py`, launching a session must NOT wipe the active token file before the RFB socket and websockify listener are fully ready.
2. **Readiness Verification**: The backend or helper script must verify that the UNIX RFB socket (`rfb.sock`) exists and is receptive before returning the session URL or mounting the client iframe.
3. **Seamless Client Handshake**: When the VNC iframe loads `https://inflow.ketabdar.dev/vnc/vnc.html?autoconnect=true...`, Websockify immediately finds the valid token file, completes the WebSocket upgrade (`101 Switching Protocols`), and displays the desktop instantly.

---

## Technical Design & Architecture

### Component Edits:
1. `src/components/bot/bot-toolbar-button.tsx`:
   - Refactor into compact badge matching the MCP button style (`h-auto py-1 px-2.5 text-[11px] rounded-full`).
   - Title set to "ربات" with concise status text.
2. `src/components/inflow-dashboard.tsx`:
   - Change conditional rendering so `login_required` does not trigger `<BotSetupWizard>` when `posts.length > 0` or account is already configured.
   - Remove redundant `liveSession` / bot status banner in the dashboard main header.
3. `src/components/sidebar-nav.tsx`:
   - Remove redundant `liveSession` footer pill to eliminate clutter.
4. `src/components/bot/bot-side-drawer.tsx`:
   - Enhance the drawer UI for `login_required` to display clear warning and prominent "ورود مجدد با دسکتاپ مجازی" button.
5. `/opt/inflow/scripts/hermes_orchestrator.py` & `/root/.hermes/profiles/inflow_mahdiketabdar/bin/vnc_guard.py`:
   - Fix the token lifecycle: ensure `stop()` in `vnc_guard.py start` does not delete the newly issued token or cause race conditions.
   - Wait for `rfb.sock` to exist before finishing `start()`.
