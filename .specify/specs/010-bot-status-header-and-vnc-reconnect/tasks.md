# Tasks: Consolidated Header Bot Status, Non-Blocking Re-auth UX & Instant VNC Connection

**Feature Spec**: `010-bot-status-header-and-vnc-reconnect`

## Task Breakdown

- [x] **Task 1: VNC Zero-Failure Connection Race Fix**
  - Fix token deletion race in `vnc_guard.py` (`start()` should not wipe the token passed by the orchestrator).
  - Verify RFB socket readiness in `hermes_orchestrator.py` before returning the `vnc_url`.
  - Add smooth loading state and safety buffer in `vnc-viewer-modal.tsx`.

- [x] **Task 2: Header Bot Status Redesign & Deduplication**
  - Redesign `BotToolbarButton` (`src/components/bot/bot-toolbar-button.tsx`) to match MCP badge styling (`text-[11px] px-2.5 py-1 rounded-full`).
  - Label strictly as `ربات: متصل`, `ربات: نیازمند لاگین`, etc.
  - Remove redundant duplicate status badge in `src/components/sidebar-nav.tsx` footer.
  - Remove redundant duplicate status badge in `src/components/inflow-dashboard.tsx` hero banner.

- [x] **Task 3: Non-Blocking Re-authentication Experience**
  - Update `inflow-dashboard.tsx` conditional rendering: show `<BotSetupWizard>` only if truly first-time unprovisioned (`botStatus === 'unprovisioned' && posts.length === 0`).
  - Ensure dashboard remains visible and interactive when `botStatus === 'login_required'`.
  - Enhance `BotMonitorDrawer` (`bot-monitor-drawer.tsx`) to display clear session error details and one-click VNC re-auth action.

- [x] **Task 4: Build, End-to-End Verification & Service Restart**
  - Run `npm run build` in `/opt/inflow` to verify zero TypeScript/JSX errors.
  - Restart `inflow.service` and verify VNC connection on first try.

- [x] **Task 5: Header Simplification (MCP Migration) & Telegram Live Tool Progress**
  - Add `Bot` icon to header status button.
  - Remove redundant standalone `Agent Connected (MCP)` badge from header toolbar.
  - Relocate MCP agent connection status inside `BotMonitorDrawer` (Telemetry card).
  - Enable live Telegram tool progress in Hermes config (`display.platforms.telegram.tool_progress = all`).
