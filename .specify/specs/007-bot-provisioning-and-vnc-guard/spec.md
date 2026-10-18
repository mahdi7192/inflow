# Feature Specification: Dedicated Bot Provisioning, Lifecycle Management & On-Demand VNC Guard

**Feature Branch**: `007-bot-provisioning-and-vnc-guard`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "آقا من یک بازنگری رو متد اتصال میخوام بکنم. ببین ما یک سرور لینوکسی داریم که روش هرمس بالاس پروفایل دیفالت هرمس، الان این ریپو رو رفته گرفته و پول کرده و اجرا کرده. طبق صحبت ها و نظر قبلی هر پیج ما نیاز داره که یک پروفایل مجزا هرمس داشته باشه. من میگم اضافه کردن پیج رو بزاریم سمت ادمین. یعنی من ادمین فقط خیلی ساده پیج اضافه میکنم و به یک یوزر میدمش. بعد خود یوزر عادی که لاگین میشه وقتی تو یک پیجش که سلکت کرده میره وضعیت اتصال رو باید ببینه که ما اونجا به اینا میگیم ربات با یک آیکون ربات. اگه هنوز پروفایل براش ساخته نشده بود باید هیچ چیزی نشون نده و فرایند ساخت پروفایل رو نشون بده. دکمه بزنه و درخواست بره به هرمس دیفالت تا براش پروفایل بسازه به نام پیجش. بعد لودینگ و تکمیل ساخت پروفایل هرمس باید بره تو اینستا گرامش لاگین کنه. در واقع هر ربات ما یک کامپیوتر و بروزر منحصر به فرد خودش رو داره تا بتونه بره داخلش تو اینستاگرام لاگین کنه و اگه لاگین کرد و موفق بود و توکن گرفته شد بعد دیگه لایو میشه و سینک میشه و از این به بعد کارش رو انجام میده. این دکمه ربات تو تولبار بالا باید باشه همیشه و وضعیت رو نشون بده و کلیک روش بروزررش رو هم نشون بده با vnc. برای ساخت پروفایل ایزوله میتونی تو همین سیستم به سرور منیجمنت یک نگاهی بندازی و ببینی که اسکیل ساخت پروفایل ایزوله چطوره از همون تقریبا با کمی تغییرات باید استفاده کنی. این خیلی مهمه که امنیت درست باشه کاملا و تو ui هم اینو به کاربر با متن موقع راه اندازی بگه."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Self-Service Bot Provisioning Wizard for Assigned Pages (Priority: P1)

As a Tenant User assigned a newly registered Instagram page by an administrator, when I log in and switch to this page, I want to see an intuitive and reassuring Bot Setup Wizard (instead of an empty, broken feed) that clearly explains my bot's dedicated cloud environment and allows me to provision its isolated Hermes profile with a single click, so that I can initiate my automation bot effortlessly.

**Why this priority**: Essential onboarding experience. Prevents user confusion when an admin registers a page handle that doesn't yet have an active bot profile on the server.

**Independent Test**: Can be tested independently by logging in as a tenant user with an assigned page whose bot status is `unprovisioned`, verifying that the main reels/posts feed is replaced by the Setup Wizard, verifying the clear security explanation text, clicking "راه‌اندازی ربات اختصاصی" (Provision Dedicated Bot), and confirming that the system enters the provisioning state.

**Acceptance Scenarios**:

1. **Given** a tenant user selecting an assigned page in `unprovisioned` state, **When** they view their dashboard, **Then** the system renders the Bot Setup Wizard highlighting the page handle, isolation assurances, and an active "راه‌اندازی ربات اختصاصی" action button.
2. **Given** the Setup Wizard, **When** the tenant clicks "راه‌اندازی ربات اختصاصی", **Then** the UI transitions into an active provisioning state with animated status steps, disabling duplicate trigger requests.
3. **Given** a page already provisioned and live, **When** selected, **Then** the regular automation dashboard and post feed render immediately without showing the provisioning wizard.

---

### User Story 2 - Automated Profile Creation & Dedicated Environment Initialization (Priority: P1)

As the inFlow Control Plane, when a tenant requests bot provisioning, I want to orchestrate profile creation with the execution server's default Hermes agent, creating an isolated profile named after the page handle with a dedicated virtual desktop, headed Google Chrome user data directory, and isolated credentials, so that the bot has a clean, independent execution boundary.

**Why this priority**: Implements Constitution Principle VII and Principle XI. Guarantees complete separation of browser processes, cookies, and local databases between different tenant accounts on the shared Linux server.

**Independent Test**: Can be tested independently by dispatching a provisioning request for page `r9spoort1`, verifying that the server provisions `inflow_r9spoort1` profile directory, generates dedicated display configuration, launches the virtual desktop (`Bot Screen`), and returns a ready-to-authenticate state within expected timeout thresholds.

**Acceptance Scenarios**:

1. **Given** a valid provisioning request from an authorized tenant, **When** processed by the server orchestrator, **Then** an isolated Hermes profile is created with independent storage (`hermes.db`, `config.yaml`, and dedicated Chrome profile directory).
2. **Given** successful profile generation on the server, **When** the server initializes the virtual desktop environment, **Then** the bot state advances from `provisioning` to `login_required`.
3. **Given** a server communication failure or timeout during profile generation, **When** detected, **Then** the Control Plane marks the state as `error` with a retry option and descriptive guidance for the tenant.

---

### User Story 3 - Interactive Instagram Login & 2FA via On-Demand VNC Guard (Priority: P1)

As a Tenant User whose bot profile has been provisioned, I want to securely open my bot's dedicated Chrome browser directly inside the dashboard to log into my official Instagram account (handling password entry, 2FA codes, or SMS challenges), so that the bot can capture authentic session credentials without risking automated bot bans or credential leakage.

**Why this priority**: Instagram blocks 99% of headless login attempts. Providing a secure, headed browser screen via VNC Guard enables seamless human-assisted login while ensuring the browser session is authenticated directly from the server's dedicated IP.

**Independent Test**: Can be tested independently by reaching the `login_required` step, verifying that VNC Guard opens an ephemeral tokenized session, interacting with the embedded noVNC view to enter test credentials, completing 2FA, verifying that session capture marks the account as `live`, and verifying that the VNC session closes automatically upon completion.

**Acceptance Scenarios**:

1. **Given** a bot in `login_required` state, **When** the tenant enters the login step, **Then** VNC Guard launches a temporary, tokenized noVNC stream opening the dedicated Chrome browser navigated to Instagram's login page.
2. **Given** the active VNC session, **When** the user enters credentials and solves any required 2FA / CAPTCHA challenges, **Then** the user can complete the login process interactively inside the dashboard.
3. **Given** successful Instagram login, **When** the bot detects valid session cookies and verifies connection to the Instagram API, **Then** the bot status transitions to `live`, the temporary VNC session terminates, and the full automation dashboard activates.
4. **Given** a user who abandons the login screen, **When** the 10-minute VNC Guard timeout expires, **Then** the VNC port closes automatically and the user can request a fresh connection when ready.

---

### User Story 4 - Persistent Top-Toolbar Bot Monitor & Quick Remote Access (Priority: P1)

As a Tenant User managing my active automation, I want a permanent "Bot Status" button in the top navigation toolbar displaying my bot's real-time connection state, and I want to click it at any time to inspect bot health or launch an on-demand VNC session to see my bot's browser, so that I maintain complete transparency and control over my automated agent.

**Why this priority**: Continuous visibility and peace of mind. Users need instant access to monitor their bot, check heartbeats, and visually inspect what the browser is doing whenever needed.

**Independent Test**: Can be tested independently by viewing the top toolbar across all dashboard pages, verifying that the Bot button renders with dynamic color-coded state badges (Live = Green, Login Required = Yellow, Provisioning = Blue, Error = Red), clicking the button to open the Bot Monitor Drawer, and clicking "باز کردن مانیتور زنده مرورگر" (Open Live Browser Screen) to verify that an on-demand VNC session is initialized securely.

**Acceptance Scenarios**:

1. **Given** an authenticated user on any dashboard route, **When** viewing the top navigation bar, **Then** a persistent Bot Status button with a robot icon and dynamic status badge is prominently displayed.
2. **Given** a click on the Bot Status button, **When** triggered, **Then** a slide-over drawer or dialog opens displaying:
   - Dedicated bot profile identifier and status
   - Last heartbeat timestamp and uptime
   - Recent execution logs and interaction counts
   - Action to launch an on-demand live browser monitor via VNC Guard
   - Action to pause or restart the bot worker
3. **Given** a running bot that encounters an unexpected Instagram checkpoint or logout, **When** detected, **Then** the toolbar badge updates to `چالش امنیتی` (Checkpoint Required) in red, alerting the user to open the monitor and solve the checkpoint.

---

### User Story 5 - Zero-Leakage & Transparent Security Assurance in UI (Priority: P2)

As a Tenant User, I want the onboarding interface and bot settings to clearly communicate that my Instagram automation runs in an isolated cloud computer with dedicated hardware simulation, dedicated IP, and zero data sharing with other users, so that I feel 100% confident in the privacy and security of my account.

**Why this priority**: Trust and user reassurance. Automation tools often feel like black boxes; explicitly clarifying the sandboxed architecture demystifies the system and justifies its reliability.

**Independent Test**: Can be tested independently by inspecting the onboarding screen and Bot Monitor drawer, verifying that Persian RTL copy explains the isolated cloud sandbox, dedicated IP preservation, and on-demand VNC encryption without exposing internal server tokens or filesystem paths.

**Acceptance Scenarios**:

1. **Given** the Bot Setup Wizard, **When** read by the tenant, **Then** it clearly features a security reassurance card explaining dedicated containerization, sandboxed Chrome profiles, and ephemeral VNC access.
2. **Given** any tenant-facing screen, **When** inspected, **Then** zero raw server tokens, internal Unix paths, or master agent endpoints are leaked in HTML, JavaScript bundles, or API payloads.

---

### User Story 6 - Checkpoint Recovery & Re-Authentication Flow (Priority: P2)

As a Tenant User whose bot encountered an Instagram session expiration or phone/SMS checkpoint during routine automation, I want to receive an immediate alert and be able to open the browser monitor via VNC Guard to resolve the challenge, so that my automations resume without losing configurations or historical comment logs.

**Why this priority**: Instagram periodically challenges long-running sessions. A streamlined recovery loop ensures zero downtime for comment replies and DMs.

**Independent Test**: Can be tested independently by simulating a checkpoint event, verifying the toolbar indicator turns red with a notification banner, opening the Bot Monitor, launching the VNC Guard session, confirming the challenge resolution, and verifying the bot returns to `live` status.

**Acceptance Scenarios**:

1. **Given** an active bot encountering an Instagram challenge, **When** reported by the execution plane, **Then** the bot state changes to `checkpoint_required` and inFlow displays an urgent action notice.
2. **Given** the checkpoint notice, **When** the tenant clicks "حل چالش در مرورگر" (Resolve Challenge in Browser), **Then** VNC Guard launches with the active Instagram challenge screen.
3. **Given** the user resolves the SMS or email code, **When** verified, **Then** the bot updates its session tokens and resumes its standard polling cycle automatically.

---

### Edge Cases

- **Server Connection Failure During Provisioning**: If the execution server or master agent does not respond within 30 seconds of a provisioning request, the UI must transition to a clean error state with an explanation ("ارتباط با سرور ارکستراتور برقرار نشد") and a retry button.
- **VNC Guard Timeout Expiration**: VNC sessions must strictly auto-terminate after 10 minutes of inactivity. If a user leaves the screen open, the port closes, displaying a message: "نشست موقت مانیتور منقضی شد. در صورت نیاز مجدداً دکمه اتصال را بزنید."
- **Concurrent VNC Requests**: If a user attempts to open multiple VNC sessions simultaneously, the existing session is cleanly terminated and replaced by a fresh tokenized session to prevent port collision on the server.
- **Logging In with Wrong Instagram Account**: If the user enters credentials for `@other_page` instead of the assigned `@assigned_page`, the bot detects the mismatch upon session inspection, informs the user, and keeps the state as `login_required` until the correct account is authenticated.
- **Admin Reassigns Page While Bot Is Live**: If an admin transfers page ownership to another user while a bot is running, the running bot profile remains active on the server, but the UI access transfers immediately to the new owner.
- **Admin Deletes Page**: If an admin removes a page from the platform, the Control Plane instructs the execution plane to shut down the worker process and safely archive the profile directory.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST maintain deterministic bot lifecycle states for every Instagram account: `unprovisioned`, `provisioning`, `login_required`, `live`, `checkpoint_required`, `paused`, and `error`.
- **FR-002**: System MUST render a specialized Bot Setup Wizard when an authorized tenant selects an assigned account in `unprovisioned` state, hiding standard post/reel automation feeds until the bot is initialized.
- **FR-003**: System MUST provide an authenticated API endpoint (`POST /api/bot/provision`) allowing authorized tenants to initiate profile creation for their assigned pages.
- **FR-004**: System MUST communicate with the server execution plane to create an isolated Hermes profile named after the page handle (`inflow_<account_username>`) with independent storage and configuration.
- **FR-005**: Server orchestrator MUST equip the provisioned profile with a dedicated virtual desktop display (TigerVNC/Xfce) and headed Google Chrome configured with an isolated `--user-data-dir`.
- **FR-006**: Server orchestrator MUST deploy and execute the on-demand `vnc_guard.py` security script to expose a temporary, tokenized noVNC web stream (`ReadOnlyTokenFile`) only when human interaction is required.
- **FR-007**: System MUST embed or popup the interactive noVNC browser session inside the inFlow dashboard, allowing tenants to interact directly with the dedicated Chrome browser.
- **FR-008**: System MUST automatically detect when the Instagram login process succeeds, harvest valid session cookies/tokens, transition the bot status to `live`, and terminate the active VNC Guard stream.
- **FR-009**: System MUST display a persistent Bot Status button with an icon and dynamic status badge in the top navigation toolbar on all tenant dashboard routes.
- **FR-010**: Clicking the Bot Status toolbar button MUST open a dedicated Bot Monitor Drawer displaying live bot metrics, heartbeat, status summary, and a button to launch an on-demand VNC session.
- **FR-011**: System MUST provide an authenticated endpoint (`POST /api/bot/vnc-session`) to generate an ephemeral, one-time VNC access token with an automatic 10-minute expiration timer.
- **FR-012**: System MUST allow tenants to pause and resume bot automation cycles directly from the Bot Monitor Drawer.
- **FR-013**: System MUST update the bot's `last_heartbeat_at` timestamp whenever the worker polls for active posts or reports execution logs.
- **FR-014**: System MUST present clear, reassuring Persian RTL copy explaining dedicated cloud isolation, isolated browser sandboxing, and zero cross-tenant contamination during setup and monitoring.
- **FR-015**: System MUST strictly forbid exposing internal server tokens, raw VNC ports, or server filesystem paths in tenant-facing responses.

### Key Entities *(include if feature involves data)*

- **`Account` (Enhanced)**:
  - `username` (TEXT PRIMARY KEY): Unique Instagram page handle.
  - `bot_profile_name` (TEXT): Identifier of the dedicated Hermes profile (e.g. `inflow_r9spoort1`).
  - `bot_status` (TEXT): Current lifecycle state (`unprovisioned`, `provisioning`, `login_required`, `live`, `checkpoint_required`, `paused`, `error`).
  - `bot_vnc_active` (INTEGER): `1` if a VNC Guard session is currently open, `0` if closed.
  - `bot_vnc_token` (TEXT): Ephemeral session token for the active noVNC stream.
  - `bot_vnc_expires_at` (TEXT): Expiration timestamp of the current VNC session.
  - `bot_last_error` (TEXT): Description of the last error or checkpoint encountered.
  - `last_heartbeat_at` (TEXT): Timestamp of last active polling or communication by the bot.

- **`BotLifecycleLog`**:
  - `id` (INTEGER PRIMARY KEY AUTOINCREMENT).
  - `account_username` (TEXT NOT NULL REFERENCES accounts(username)).
  - `from_status` (TEXT).
  - `to_status` (TEXT NOT NULL).
  - `message` (TEXT).
  - `created_at` (TEXT).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Tenant users can initiate and complete full bot onboarding (from `unprovisioned` to `live` status) in under 3 minutes, including Instagram login and 2FA entry.
- **SC-002**: 100% of headless-detection bans are eliminated by utilizing headed Google Chrome on dedicated virtual displays with persistent user-data directories.
- **SC-003**: 0% persistent open VNC ports: 100% of VNC sessions auto-terminate within 10 minutes or immediately upon successful session harvesting.
- **SC-004**: Users have real-time visibility into bot health with toolbar status updates reflecting server state changes within 5 seconds.
- **SC-005**: 100% tenant isolation: No tenant can view, control, or intercept another tenant's bot display, VNC stream, or session credentials.

## Assumptions

- The Linux server running the default Hermes agent has system dependencies installed (`novnc`, `websockify`, `google-chrome-stable`, `tigervnc-standalone-server`) or can execute `hermes computer-use screen install`.
- Each provisioned bot profile on the server has sufficient RAM to run Google Chrome during interactive login (typically ~300-500MB per active browser session) and frees resources once transitioning to the lightweight API worker mode.
- The Control Plane (Next.js server) and the execution server can communicate via local network, SSH agent dispatch, secure reverse proxy, or authenticated REST/webhook endpoints.
- Standard tenants have legitimate Instagram account credentials and access to their associated 2FA authenticators or SMS phones to complete the login process.
