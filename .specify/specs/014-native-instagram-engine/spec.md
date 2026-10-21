# Feature Specification: Native Self-Contained Instagram Engine with Direct Mobile Login, Real-Time Messaging & Zero-Bot UX

**Feature Branch**: `014-native-instagram-engine`

**Created**: 2026-10-21 (Updated: 2026-10-21)

**Status**: Draft (Refined with Direct In-App Login, MQTT Real-Time & Zero-Bot Terminology)

**Input**: User description: "من یکسری چیز اضافه کنم اگه لازمه specify رو درست کنیم و دوباره پلن کنیم. دیگه اون ربات بالا سمت چپ اشتباهه، چیزی به اسم ربات دیگه نداریم. فلو لاگین دیگه اونجوری نیست باید یوزر پس بده و اونجوری لاگین کنه. کل فلو های دیگه از جمله پیام دادن دایرکت دادن کامنت دادن ریپلای کردن خوندن کامنت ها از طریق mqtt و همه اینها انجام بشه. فقط مشخص مشخص باشه که لاگین هستیم و اگه لاگ اوت شده بود خطا بده تا دوباره بشه لاگین کرد. ایجنت هوش مصنوعی که دیگه نداریم ولی api key , کلید برای استفاده از هوش مصنوعی داریم."

---

## 1. Overview & Fundamental Philosophy Shift

This specification codifies the complete deprecation of the legacy "Bot / VNC / Hermes" paradigm and replaces it with a **Clean, Native Instagram Account Integration**:

1. **Total Elimination of "Robot / Bot" Terminology and UI Elements**:
   - The phrase "ربات" and the top-left bot status badge (`ربات: متصل`, `پروویژنینگ`, `VNC Guard`, `Bot Screen`) are **permanently removed**.
   - Replaced by a clean **Account Connection & Session Health Indicator** (`نشست اکانت: فعال` / `نیازمند ورود مجدد`).
   - All VNC drawers, virtual display modals, and bot provisioning spinners are purged from the UI.
2. **Direct In-App Credential Login Flow**:
   - The operator logs into an account by directly providing Instagram Username and Password (and 2FA code if challenged) within an inFlow dialog.
   - Zero-Password Storage Guarantee: Password is kept strictly in volatile RAM during the authentication handshake and instantly wiped. The resulting encrypted session cookies and mobile device parameters are saved in the `account_sessions` vault.
3. **Native Protocol Execution (HTTP Mobile API + Real-Time MQTT)**:
   - All interactions — fetching comments, replying to comments, reading inbox threads, and dispatching direct messages — are executed natively through the Instagram private mobile protocol and real-time MQTT push layer.
4. **Crystal-Clear Session State & Graceful Re-Authentication**:
   - Clear visual indicator of connection state (`active` vs. `reauth_required`).
   - If Instagram invalidates the session (`LoginRequired`), the system immediately displays a high-visibility alert with a 1-click **ورود مجدد (Re-login)** button.
5. **Direct AI Key Integration (No External Agents)**:
   - No separate AI agent process. inFlow manages an **AI Provider API Key** (OpenAI / Gemini / Anthropic) to evaluate semantic comment triggers and draft contextual replies and DMs directly.

---

## 2. User Scenarios & Testing *(mandatory)*

### User Story 1 - Direct In-App Instagram Login & Encrypted Session Vault (Priority: P1)

As an account operator, I want to connect my Instagram account by entering my username and password directly inside a clean inFlow dialog, so that my account is immediately connected without running any external bots or browsers.

**Why this priority**: Core authentication pathway replacing all legacy provisioning mechanisms.

**Independent Test**: An operator opens the connection dialog, enters credentials, submits, and successfully logs in. The database shows the encrypted session token saved in `account_sessions` with zero instances of the raw password stored anywhere.

**Acceptance Scenarios**:

1. **Given** an operator on the account management view, **When** they click "اتصال اکانت" and submit their Instagram username and password, **Then** the engine completes the mobile authentication handshake, creates an encrypted session vault, wipes the password from RAM, and marks the account session as `active`.
2. **Given** an account with Two-Factor Authentication (2FA) active, **When** credentials are submitted, **Then** the dialog smoothly transitions to a 2FA prompt asking for the 6-digit code, completes the handshake, and saves the session.
3. **Given** incorrect credentials, **When** submitted, **Then** the dialog displays an inline Persian error message ("نام کاربری یا رمز عبور اشتباه است") and allows immediate correction.

---

### User Story 2 - High-Visibility Session Health & 1-Click Re-Login (Priority: P1)

As an operator, I want to clearly see whether my account's Instagram session is currently active or logged out, and if logged out, receive an immediate alert and a 1-click re-login action.

**Why this priority**: Prevents silent automation failures when Instagram rotates sessions or issues checkpoints.

**Independent Test**: Force-invalidate an account session; verify the top toolbar badge instantly changes from green "نشست فعال" to red "نشست منقضی شده", renders an action banner, and clicking "ورود مجدد" opens the login modal.

**Acceptance Scenarios**:

1. **Given** an active Instagram account, **When** viewing the workspace toolbar, **Then** a prominent status badge displays "نشست: متصل (@username)" with green indicator and last sync timestamp.
2. **Given** an account whose session was invalidated by Instagram (`LoginRequired`), **When** the next engine cycle runs, **Then** the account state transitions to `reauth_required`, the badge turns red ("نیاز به ورود مجدد"), and a non-dismissible alert banner appears.
3. **Given** an account in `reauth_required` state, **When** the operator clicks "ورود مجدد", **Then** the connection dialog opens pre-filled with the username, allowing instant credential submission and session restoration.

---

### User Story 3 - Full Native Automation: Comments & Real-Time Direct Messaging (Priority: P1)

As an account owner, I want all comment fetching, comment replies, direct message ingestion, and DM sending to happen natively via mobile API and MQTT real-time channels, without any external browser or Hermes worker.

**Why this priority**: Replaces the core execution plane with a stable, high-throughput protocol client.

**Independent Test**: Receive a comment and a direct message on Instagram; verify both are ingested in real-time, displayed in the respective inFlow tabs, and can be replied to directly.

**Acceptance Scenarios**:

1. **Given** an active monitored post, **When** a user posts a comment, **Then** the engine detects it via mobile endpoint polling/push, checks for duplicate `comment_id`, and applies configured auto-reply rules.
2. **Given** an incoming direct message, **When** delivered over the real-time MQTT/mobile channel, **Then** the message instantly appears in the inFlow DM inbox with a new message badge and audio notification.
3. **Given** an operator typing a direct reply or comment response, **When** they click "ارسال", **Then** the message is dispatched through the native API and marked as delivered within 3 seconds.

---

### User Story 4 - Direct AI API Key Configuration & Contextual Reply (Priority: P2)

As a business manager, I want inFlow to use my AI API key (OpenAI / Gemini) directly to analyze incoming comments and generate contextual DMs and replies, without managing any AI agents.

**Why this priority**: Eliminates external AI agent orchestration while keeping conversational automation intelligent.

**Independent Test**: Configure an AI API key and post trigger prompt; publish a question comment ("آیا سایز ۴۲ موجود است؟"); verify inFlow queries the AI API directly and sends a personalized response.

**Acceptance Scenarios**:

1. **Given** an AI API key configured in system settings or environment, **When** an incoming comment matches an `ai_context` trigger, **Then** inFlow calls the LLM API directly with the post caption and question.
2. **Given** the AI generated text, **When** the response arrives within 4 seconds, **Then** inFlow dispatches the public reply and private DM.
3. **Given** an AI API timeout or rate limit, **When** failure occurs, **Then** the engine falls back to pre-configured static reply text seamlessly.

---

## 3. Requirements

### Functional Requirements

#### User Interface & Terminology (Zero-Bot Standard)
- **FR-001**: The system MUST NOT display the word "ربات" or "Bot" anywhere in the primary user interface.
- **FR-002**: The top header MUST replace the legacy bot button with a unified **Session Health Badge**:
  - `نشست فعال`: Green indicator with account handle.
  - `نیاز به ورود مجدد`: Red indicator with interactive 1-click re-login action.
- **FR-003**: All VNC viewer dialogs, X11 display settings, and Hermes agent connection status cards MUST be removed from the UI and codebase.

#### Direct In-App Authentication & Session Vault
- **FR-004**: The system MUST provide an in-app Account Connection Dialog accepting Instagram `username` and `password`.
- **FR-005**: Raw passwords MUST NEVER be persisted to SQLite, log files, browser storage, or disk. Passwords MUST be processed strictly in volatile memory during the handshake and immediately erased.
- **FR-006**: The resulting session state (cookies, tokens, device identifiers) MUST be encrypted via `AES-256-GCM` in the `account_sessions` table.
- **FR-007**: The login flow MUST handle Two-Factor Authentication (SMS and Authenticator App TOTP codes) and security challenge checkpoints interactively within the same modal.
- **FR-008**: If any API call returns `LoginRequired` or session expiry, the system MUST transition the account to `reauth_required` and prompt the user for re-authentication.

#### Native Interactions & Real-Time Messaging (HTTP + MQTT)
- **FR-009**: The engine MUST fetch posts, reels, and comments directly via the native mobile API protocol (`instagrapi`).
- **FR-010**: The engine MUST support real-time message ingestion via mobile MQTT push and Smart Polling fallback.
- **FR-011**: Comment replies (`comment_reply`) and direct messages (`direct_send`) MUST be executed directly through the native engine with idempotency locks on `comment_logs`.

#### Direct AI API Integration
- **FR-012**: AI context evaluation and reply drafting MUST be performed via direct HTTP API calls using standard API keys (`OPENAI_API_KEY` or `GEMINI_API_KEY`).
- **FR-013**: The AI prompt template MUST inject post caption, commenter username, comment text, and operator business guidelines.
- **FR-014**: A hard 4.5-second timeout MUST be enforced on AI calls, with graceful fallback to static action text.

---

## 4. Key Entities

- **Account Session**: Encrypted mobile settings record (`AES-256-GCM`) keyed by `account_username`. Stores tokens and device fingerprints; never stores raw passwords.
- **Session Health State**: Enum with values `active`, `reauth_required`, `paused`, `error`.
- **AI Completion Config**: System or tenant configuration holding API key, model choice, and default temperature for direct LLM calls.
- **Direct Message Thread**: Native chat conversation synced via mobile API and MQTT push.

---

## 5. Success Criteria *(mandatory)*

### Measurable Outcomes
- **SC-001**: 100% elimination of "ربات" terminology and legacy VNC components across all screens.
- **SC-002**: Zero plain-text Instagram passwords stored anywhere in the platform (0 bytes on disk or in database).
- **SC-003**: Operators can connect a new account or re-authenticate in under 45 seconds using the direct in-app modal.
- **SC-004**: Session invalidation detection latency is under 30 seconds; 1-click re-login action restores full functionality immediately.
- **SC-005**: Real-time comment-to-reply processing latency averages under 15 seconds.
