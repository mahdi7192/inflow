# Feature Specification: inFlow Control Plane Core

**Feature Branch**: `001-inflow-core`
**Created**: 2026-10-18
**Status**: Completed / Living Specification
**Input**: Control Plane for Instagram comment auto-reply and DM automation with 1-to-1 post mapping, multi-account support, SQLite storage, and REST API for worker agents.

---

## User Scenarios & Testing

### User Story 1 - Multi-Account Post Automation Configuration (Priority: P1)
An admin selects an Instagram account, views posts and reels, toggles automation, and configures trigger rules (all / keywords / AI context), public comment reply action (none / direct / AI), and direct message action (none / direct / AI with follow requirement).

**Independent Test**:
Can be fully tested by opening `http://localhost:3005`, switching to `@r9spoort1`, editing post `DehQhnjoEcr`, setting rules, and saving.

**Acceptance Scenarios**:
1. **Given** an inactive post, **When** master switch is toggled ON, **Then** configuration fields become active and change is persisted.
2. **Given** trigger type `keywords`, **When** user enters comma-separated keywords, **Then** agent receives these keywords in `/api/agent/poll`.

---

### User Story 2 - Agent Polling & Idempotency Locking (Priority: P1)
An external worker agent (`Hermes Agent`) polls every 2 minutes for active posts, evaluates incoming comments, locks the comment using `comment_id`, and dispatches replies and DMs without double-posting.

**Independent Test**:
Run `python3 scripts/hermes_worker.py --account r9spoort1 --once`. First run logs actions; second run recognizes locked comments and skips processing.

**Acceptance Scenarios**:
1. **Given** new incoming comment `c123`, **When** agent posts log with `c123`, **Then** database inserts row and returns `already_processed: false`.
2. **Given** already processed `c123`, **When** agent posts log with `c123`, **Then** database returns `already_processed: true` with existing log.

---

## Requirements

### Functional Requirements
- **FR-001**: System MUST support multiple Instagram accounts and allow switching between accounts in the header.
- **FR-002**: System MUST maintain 1-to-1 mapping for Instagram posts and reels with thumbnail, shortcode, and caption.
- **FR-003**: System MUST provide three trigger modes: `all`, `keywords`, and `ai_context`.
- **FR-004**: System MUST support independent comment reply actions and DM actions (direct static text or AI generated prompt instructions).
- **FR-005**: System MUST enforce unique `comment_id` constraint to provide strict idempotency locking.
- **FR-006**: System MUST expose REST API endpoints:
  - `GET /api/agent/poll?account={username}`
  - `POST /api/posts/{shortcode}/logs`
  - `POST /api/sync`
- **FR-007**: System MUST provide RTL support with Vazirmatn font for Persian and Arabic.

### Key Entities
- **Account**: Instagram profile (`username`, `display_name`, `avatar_url`, `bio`, `followers_text`, `status`, `last_heartbeat_at`).
- **Post**: 1-to-1 post/reel (`shortcode`, `caption`, `auto_reply`, `trigger_type`, `trigger_context`, `trigger_keywords`, `comment_action_type`, `comment_action_text`, `dm_action_type`, `dm_action_text`, `dm_require_follow`).
- **CommentLog**: Interaction lock and audit entry (`comment_id` UNIQUE, `shortcode`, `username`, `comment_text`, `trigger_matched`, `comment_reply_status`, `dm_status`).

---

## Success Criteria
- **SC-001**: Worker agent polling response time under 50ms on local SQLite.
- **SC-002**: Zero duplicate replies when identical `comment_id` is processed concurrently.
- **SC-003**: 100% test pass on TypeScript compilation and production build.
