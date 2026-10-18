# Feature Specification: Autonomous Instagram Automation Worker Engine & Follow Verification Lifecycle

**Feature Branch**: `009-instagram-automation-engine`

**Created**: 2026-10-18

**Status**: Ready for Planning

**Input**: User description: "موتور اتوماسیون اینستاگرام برای پردازش خودکار کامنت‌ها، رعایت دقیق شرط dm_require_follow (درخواست فالو و کامنت تاییدیه «فالو کردم» قبل از ارسال دایرکت)، تاخیرهای ضدبلاک، و استقرار به عنوان سرویس پایدار سیستم‌دی برای تمام پروفایل‌ها."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Autonomous Comment Queue Processing & Trigger Execution (Priority: P1)

As an Instagram account owner managing business interactions on inFlow, I want the autonomous background worker to continuously monitor incoming comments on my active reels and posts, so that qualified inquiries automatically receive instant, relevant public replies and configured direct messages without manual human intervention.

**Why this priority**: Core value proposition. Eliminates repetitive manual community management, guarantees rapid response times to customer inquiries, and drives lead conversions 24/7.

**Independent Test**: Can be tested independently by publishing a comment matching a configured keyword or AI trigger on an active post, running the worker pass, and verifying that the comment is processed, logged into the interaction database, and marked as handled so duplicate actions never occur.

**Acceptance Scenarios**:

1. **Given** an active post with configured keyword triggers (e.g. "قیمت", "سایز"), **When** a user posts a comment containing that keyword, **Then** the worker matches the trigger, sends the configured public comment reply, and logs the interaction with a unique lock on the `comment_id`.
2. **Given** an incoming comment that does NOT match any active trigger or rule, **When** evaluated by the worker, **Then** the comment is recorded as evaluated with no action taken and skipped in future passes.
3. **Given** a comment that has already been replied to in a previous pass, **When** the worker rescans the post, **Then** the idempotency check detects the existing `comment_id` in `comment_interactions` and skips reprocessing immediately.

---

### User Story 2 - Follow-Gate Verification & "Followed" Confirmation State Machine (Priority: P1)

As an Instagram creator running lead-generation campaigns where `dm_require_follow` is enabled on a post, I want the system to check if the commenter actually follows my account before dispatching the private DM. If they do not follow, I want the system to post a public comment asking them to follow and reply "فالو کردم", and only send the deferred DM once they provide that confirmation.

**Why this priority**: Directly enforces creator business goals (converting engagement into permanent followers while preventing spam/freeloading) and aligns with specific platform conversion strategies.

**Independent Test**: Can be tested independently with a non-follower commenting on a follow-gated post: verify that the system detects non-follower status, puts the user into `inflow_pending_follows` state, sends the public request to follow, and does NOT send the DM. Then simulate the user commenting "فالو کردم": verify that the matcher recognizes the confirmation, resolves the pending follow record, and triggers the deferred DM delivery.

**Acceptance Scenarios**:

1. **Given** a post with `dm_require_follow = 1` and a commenter who is NOT following the account, **When** the trigger is matched, **Then** the system queues the user in `inflow_pending_follows` with status `pending`, sends a randomized public reply asking them to follow and confirm with "فالو کردم", and does NOT send the DM.
2. **Given** a user in `pending_follow` status who leaves a new comment saying "فالو کردم", "فالو شد", or "done", **When** processed by the worker, **Then** the system matches the confirmation regex pattern, marks the pending state as `resolved`, and immediately delivers the deferred direct message.
3. **Given** a post where `dm_require_follow = 0` (follow not required), **When** a trigger matches, **Then** the system dispatches both the public reply and the private DM immediately without checking follow status.

---

### User Story 3 - Humanized Anti-Ban Jitter & Behavioral Pacing (Priority: P2)

As a system administrator running automated workflows on Instagram accounts, I want the automation engine to simulate natural human pacing with variable delays and randomized reply templates, so that the account's actions remain safe, compliant, and protected against automated bot detection or rate limits.

**Why this priority**: Essential for account security and operational longevity. Failsafe mechanisms protect accounts from action blocks, temporary shadowbans, or account suspensions.

**Independent Test**: Can be tested independently by queueing 5 consecutive comments: verify that the worker introduces variable jittered delays (e.g. 15-45s) between outbound actions, scales delays higher during queue bursts, and randomizes public follow-request phrasing across different commenters.

**Acceptance Scenarios**:

1. **Given** multiple comments awaiting action in a single scan pass, **When** actions are executed, **Then** the worker enforces a dynamic jitter delay between each action, preventing rapid burst requests.
2. **Given** follow-request replies sent to multiple users, **When** generated, **Then** the engine selects among diverse natural Persian/Arabic phrasing templates rather than sending identical repetitive strings.
3. **Given** an unexpected rate limit or network error from Instagram, **When** encountered, **Then** the worker backs off exponentially, logs the warning, and gracefully continues in the next cycle without crashing.

---

### User Story 4 - Multi-Account Linux Systemd Service Isolation (Priority: P2)

As an operator running multiple Instagram accounts on the inFlow server, I want each account's automation worker to run as an independent systemd service (`inflow-worker@<username>.service`), so that workers start automatically on server boot, restart on failures, and maintain strict memory and session isolation.

**Why this priority**: Ensures 99.9% unattended uptime, process resiliency, and zero cross-contamination between different managed Instagram accounts.

**Independent Test**: Can be tested independently by running `systemctl start inflow-worker@<account>`, verifying the service reaches `active (running)`, killing the process, and verifying that systemd restarts it automatically with proper logging in `journalctl`.

**Acceptance Scenarios**:

1. **Given** an account configured in inFlow with an active browser profile, **When** `systemctl enable --now inflow-worker@<username>` is executed, **Then** systemd launches the dedicated worker process in the background.
2. **Given** an unexpected exception or crash in a worker process, **When** the process exits, **Then** systemd automatically restarts the worker after a 10-second cooldown (`Restart=always`).
3. **Given** multiple active accounts (e.g. `mahdiketabdar` and `r9spoort1`), **When** both services run concurrently, **Then** each accesses only its own profile directory, SQLite transactions, and Instagram session without interference.

---

### Edge Cases

- **Self-Comments & Bot Loops**: The system MUST detect comments posted by the account owner itself and skip them immediately to prevent recursive self-replies.
- **Ambiguous Comments during Pending Follow**: If a user in `pending_follow` status posts an unrelated question instead of confirming follow, the system keeps the pending state active and avoids sending duplicate follow requests within a 24-hour window.
- **Instagram Session Expiry**: If cookies or session IDs expire, the worker logs an authentication error, notifies the system log, and pauses actions until the session is renewed rather than continuing with broken requests.
- **Empty or Deleted Comments**: If a comment is deleted by the user before the worker processes it, the worker handles the 404 or missing ID gracefully without aborting the queue pass.
- **Concurrent DB Access**: All SQLite interactions use WAL mode and retry timeouts to avoid database lock errors between concurrent workers and web API endpoints.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST scan all active posts (`auto_reply = 1`) for a target account and identify all unhandled comments.
- **FR-002**: The system MUST support trigger matching based on keywords, full text, and AI context parameters.
- **FR-003**: The system MUST check whether the commenting user follows the target account when `dm_require_follow = 1` is enabled on the post.
- **FR-004**: If the user does not follow the account, the system MUST record a pending follow record in `inflow_pending_follows` with status `pending` and the deferred DM payload.
- **FR-005**: If the user does not follow the account, the system MUST post a public reply asking the user to follow and reply with a confirmation phrase.
- **FR-006**: The system MUST monitor subsequent comments from users with active `pending_follow` records and match follow confirmation phrases using normalized Persian, Arabic, and English patterns.
- **FR-007**: When a follow confirmation is detected, the system MUST mark the pending follow record as `resolved` and dispatch the deferred direct message.
- **FR-008**: The system MUST enforce strict idempotency by recording every processed `comment_id` in `comment_interactions` prior to or immediately upon action execution.
- **FR-009**: The system MUST enforce dynamic humanized jitter delays (between 8 and 45 seconds) between outgoing actions to protect account reputation.
- **FR-010**: The worker MUST be deployable as an isolated Linux systemd template service (`inflow-worker@.service`) that automatically restarts upon unexpected failures.
- **FR-011**: The worker MUST route network requests through the local SOCKS5 proxy (`127.0.0.1:40000`) and extract session cookies securely from the isolated browser profile directory.

---

## Success Criteria *(mandatory)*

- **SC-001**: **100% Idempotency**: Zero duplicate replies or duplicate DMs sent to the same user comment under any operating condition.
- **SC-002**: **Reliable Follow-Gate Execution**: 100% of non-follower comments on follow-gated posts correctly trigger the follow request and withhold the private DM until confirmed.
- **SC-003**: **Fast Turnaround**: Incoming comments are processed within 60 to 90 seconds of publication during active worker cycles.
- **SC-004**: **Zero Bot Detection Penalties**: Accounts operate continuously without trigger-induced action blocks or shadowbans due to humanized jitter and rate limiting.
- **SC-005**: **Autonomous 24/7 Resilience**: Systemd service maintains 99.9% uptime with automatic recovery from transient network or platform disconnections.
