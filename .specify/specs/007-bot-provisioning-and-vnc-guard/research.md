# Research & Architectural Decisions: Dedicated Bot Provisioning & On-Demand VNC Guard

This document records the research findings, technical evaluations, and architectural decisions for feature `007-bot-provisioning-and-vnc-guard`.

---

## 1. Bot Lifecycle State Machine & Persistence

### Context
Every Instagram account in inFlow requires an isolated execution environment on the Linux server. The UI needs to accurately reflect whether the bot profile exists, is being set up, is awaiting interactive Instagram login, or is actively polling and replying to comments.

### Decision
Extend the `accounts` table in SQLite (`data/inflow.db`) with dedicated lifecycle columns:
- `bot_profile_name` (TEXT): The Hermes profile identifier, standardized as `inflow_<username>`.
- `bot_status` (TEXT): Deterministic state machine with valid values:
  - `unprovisioned`: Account exists in inFlow, assigned to a user, but no server profile exists.
  - `provisioning`: Server is actively creating the profile and starting the virtual desktop.
  - `login_required`: Profile is ready, Chrome is open to Instagram login, awaiting user interaction.
  - `live`: Instagram session is validated, session cookies are harvested, and polling is active.
  - `checkpoint_required`: Instagram triggered an SMS/email challenge or CAPTCHA requiring intervention.
  - `paused`: Automation temporarily suspended by the user or admin.
  - `error`: Profile creation or execution encountered an unrecoverable error.
- `bot_vnc_active` (INTEGER): `0` or `1` indicating active VNC Guard stream.
- `bot_vnc_token` (TEXT): Cryptographically random session token for the active noVNC session.
- `bot_vnc_expires_at` (TEXT): ISO timestamp when the active VNC session will auto-terminate.
- `bot_last_error` (TEXT): Human-readable error description if status is `error` or `checkpoint_required`.

Additionally, create a `bot_lifecycle_logs` table to record historical transitions, timestamps, and error messages for auditing and UI timeline rendering.

### Rationale
- Leveraging SQLite with WAL mode (`better-sqlite3`) ensures zero latency, transactional updates, and seamless joins with account data.
- Maintaining the state directly on the account entity respects Constitution Principle VII (Strict 1-to-1 Page-to-Bot Binding).

### Alternatives Considered
- *Separate `bots` table with foreign key*: Rejected because Constitution Principle VII mandates that one account maps to exactly one bot profile forever. A separate table adds join complexity without architectural benefit.
- *In-memory state store (Redis)*: Rejected to maintain inFlow's self-contained single-node design (Constitution Principle IV).

---

## 2. Server Orchestration Mechanism (Control Plane ↔ Execution Plane)

### Context
inFlow (Next.js 16) is the Control Plane and does not directly connect to Instagram or run browsers (Constitution Principle II). The Linux server hosts the master/default Hermes agent. When a tenant clicks "راه‌اندازی ربات اختصاصی", inFlow must instruct the execution server to create the isolated profile.

### Decision
Implement a modular Server Orchestrator Driver (`src/lib/server-orchestrator.ts`):
1. **Host-Local Mode (Production on Linux Server)**:
   - When inFlow runs on the same host as Hermes, the orchestrator invokes a dedicated Python orchestrator daemon/CLI (`scripts/hermes_orchestrator.py` or `hermes profile create`) via a subprocess or local IPC socket.
   - The CLI creates the directory `/root/.hermes/profiles/inflow_<username>`, writes `config.yaml`, deploys `vnc_guard.py`, and starts the Bot Screen.
2. **Remote Webhook / Agent Dispatch Mode**:
   - For distributed deployments, inFlow sends an HMAC-signed HTTP POST request to the server's orchestrator daemon endpoint (`http://server_ip:8765/provision`).
3. **Local Dev & Simulation Mode**:
   - In development environments without a live Linux TigerVNC stack, the orchestrator provides a high-fidelity mock driver that transitions states realistically, generates simulated VNC URLs, and tests all UI states.

### Rationale
- Decouples UI development from server infrastructure.
- Supports both co-located single-box deployments and distributed multi-server architectures without modifying front-end code.

### Alternatives Considered
- *SSH Execution from Next.js (via ssh2)*: Rejected due to SSH key management overhead and security risks of executing raw remote bash commands from a web application.
- *Polling-only Provisioning*: Rejected because profile creation must happen on-demand upon tenant action, not delayed by polling cycles.

---

## 3. Dedicated Virtual Display & Headed Chrome Environment (`hermes-isolated-bot`)

### Context
Headless browsers are immediately detected and blocked by Instagram anti-scraping systems. To guarantee long-term session health, each bot must use a real, headed Google Chrome browser within an isolated virtual desktop.

### Decision
Adopt the production-tested pattern from the `hermes-isolated-bot` skill:
1. **Virtual Display**:
   - Each profile utilizes TigerVNC / Xfce managed by Hermes `bot_desktop`.
   - Dedicated display offset (`DISPLAY=:20` or dynamic `:20 + id`).
2. **Dedicated Chrome Profile**:
   - Launched with `--user-data-dir=/root/.hermes/profiles/inflow_<username>/bot-desktop/browser-profile`.
   - Flags: `--no-sandbox --no-first-run --no-default-browser-check --disable-session-crashed-bubble --start-maximized`.
   - Navigates directly to `https://www.instagram.com/accounts/login/`.
3. **Session to API Conversion (API-First Harvesting)**:
   - Chrome is used exclusively for the human login phase, 2FA, and CAPTCHA handling.
   - Once logged in, the orchestrator/worker extracts session cookies (`sessionid`, `csrftoken`, `ds_user_id`) and validates them against Instagram's web API.
   - Once verified, the heavy Chrome browser process is idled or cleanly closed to conserve server RAM (~300-500MB saved per account), and the lightweight Python worker (`scripts/hermes_worker.py`) handles ongoing polling and comment replies via `curl_cffi` / `httpx`.

### Rationale
- Completely avoids Instagram headless bot detection.
- Keeps long-term server resource utilization minimal by relying on lightweight API requests during routine automation.

### Alternatives Considered
- *Keeping Chrome open 24/7 per account*: Rejected because running 20-50 simultaneous active Chrome processes on a server exhausts CPU and RAM.
- *Headless Puppeteer / Playwright*: Rejected because Instagram triggers checkpoints on headless browsers almost immediately.

---

## 4. Dynamic On-Demand VNC Guard & noVNC Web Embedding

### Context
Exposing an open VNC or noVNC port to the internet is a severe security vulnerability. The browser screen must only be visible when the tenant explicitly needs to log in or solve a checkpoint.

### Decision
Adapt `vnc_guard.py` from `hermes-isolated-bot`:
1. **Closed by Default**: Port `6080` (or dynamic proxy) is closed 100% of the time during routine operation.
2. **On-Demand Activation**:
   - When the user clicks "راه‌اندازی ربات" or "باز کردن مانیتور مرورگر", inFlow calls the server orchestrator.
   - `vnc_guard.py` generates an 8-byte hex token (`secrets.token_hex(8)`), writes it to `vnc_token.cfg`, and starts `websockify` with `--token-plugin=ReadOnlyTokenFile`.
   - An automatic background killer terminates the process after 600 seconds (10 minutes).
3. **Secure Embedding in Dashboard**:
   - inFlow renders an embedded noVNC iframe:
     `http://<SERVER_IP>:6080/vnc.html?autoconnect=true&resize=scale&path=websockify/?token=<TOKEN>`
   - The UI includes an active countdown timer showing remaining session time and a "قطع اتصال مانیتور" (Disconnect) button that calls `vnc_guard.py stop` immediately.

### Rationale
- Eliminates attack surface: unauthorized third parties cannot connect without the one-time cryptographically random token.
- Auto-timeout ensures abandoned sessions do not leave lingering server ports open.

### Alternatives Considered
- *Constant open VNC with static password*: Rejected as insecure and susceptible to brute force attacks on public IP addresses.
- *WebRTC Screen Sharing*: Rejected due to high implementation complexity and lack of native support in Xfce/TigerVNC headless stacks.

---

## 5. UI/UX Design & Component Hierarchy (shadcn/ui Light Mode)

### Context
Constitution Principle X mandates strict adherence to shadcn/ui Light Mode (pure white surfaces, `#fafafa` canvas, `#e4e4e7` borders, `#18181b` primary buttons/badges). Constitution Principle V mandates native Persian RTL with Vazirmatn font.

### Decision
Create four key UI components:
1. **`BotSetupWizard` (`src/components/bot/bot-setup-wizard.tsx`)**:
   - Replaces the main posts/reels feed when `bot_status === 'unprovisioned'` or `'provisioning'`.
   - Displays a 3-step visual progress bar:
     1. ایجاد محیط ابری ایزوله (Create isolated cloud environment)
     2. ورود به اکانت اینستاگرام (Instagram authentication)
     3. فعال‌سازی و شروع مانیتورینگ (Live activation)
   - Features a prominent Security Card with Shield icon explaining dedicated sandboxing.
   - Action button: "راه‌اندازی ربات اختصاصی" with loading spinner during provisioning.
2. **`BotToolbarButton` (`src/components/bot/bot-toolbar-button.tsx`)**:
   - Placed in the top toolbar header alongside account switcher and user menu.
   - Displays a `Bot` icon and a live status badge:
     - `لایو (سبز)`: Bot is active and healthy.
     - `در انتظار ورود (زرد)`: Awaiting Instagram credentials.
     - `در حال راه‌اندازی (آبی)`: Profile being created.
     - `راه‌اندازی نشده (طوسی)`: Unprovisioned.
     - `چالش امنیتی (قرمز)`: Instagram checkpoint detected.
   - Clicking opens `BotMonitorDrawer`.
3. **`BotMonitorDrawer` (`src/components/bot/bot-monitor-drawer.tsx`)**:
   - Slide-over sheet (`Sheet` component) displaying:
     - Real-time bot status, profile identifier, server uptime, and last heartbeat.
     - Bot execution log snippets (recent actions, comments processed).
     - Action buttons: "مشاهده زنده مرورگر" (Launch VNC), "توقف موقت ربات" (Pause), "بررسی مجدد اتصال" (Refresh).
4. **`VncViewerModal` (`src/components/bot/vnc-viewer-modal.tsx`)**:
   - High-fidelity dialog modal containing the embedded noVNC iframe.
   - Toolbar with live countdown timer (e.g. `09:42`), Fullscreen toggle, and "بستن و قطع دسترسی" button.

### Rationale
- Seamlessly integrates into inFlow's existing design system without disrupting the clean, minimal aesthetic.
- Provides total transparency to the user while keeping technical details abstracted.
