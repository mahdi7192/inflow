# Implementation Plan: Consolidated Header Bot Status, Non-Blocking Re-auth UX & Instant VNC Connection

**Feature Spec**: `010-bot-status-header-and-vnc-reconnect`

## Architecture & Root Cause Analysis

### 1. Bot Status Consolidation & Styling
- **Problem**: There were 4 redundant bot status indicators scattered across the header, sidebar, profile header, and footer. The header button was disproportionately large (`h-9`) with long text.
- **Solution**:
  - Keep a single status in the top bar right beside the MCP badge and Language switcher.
  - Apply the exact same visual language as the MCP badge: `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors`.
  - Format label as:
    - Active: `ربات: متصل` (Emerald green dot + border)
    - Login Required: `ربات: نیازمند لاگین` (Amber yellow dot + border)
    - Provisioning: `ربات: در حال راه‌اندازی` (Blue dot + pulse)
    - Error/Stopped: `ربات: غیرفعال` (Slate gray or red)
  - Remove redundant pills in `sidebar-nav.tsx` (bottom footer) and `inflow-dashboard.tsx` (hero banner).

### 2. Non-Blocking Re-Auth UX
- **Problem**: In `inflow-dashboard.tsx`, when `botStatus === 'login_required'`, the UI unconditionally rendered `<BotSetupWizard>`, hiding all existing posts, rules, and metrics.
- **Solution**:
  - Only show `<BotSetupWizard>` if the account is purely new/unprovisioned and has 0 posts.
  - If posts exist or provisioning was completed, keep the full dashboard active.
  - In `BotSideDrawer`, when `botStatus === 'login_required'`, display an informative warning card with error details and a prominent "ورود مجدد با VNC" button.

### 3. Fixing First-Attempt VNC Connection Failures (Race Condition)
- **Root Cause**:
  1. `vnc_start` generates `vnc_token` and writes it to `/opt/inflow/data/vnc_tokens/{account}.token`.
  2. Simultaneously, `vnc_start` launches `vnc_guard.py start ...` in a subprocess.
  3. The first step of `vnc_guard.py start` is calling `stop()`, which immediately **deletes** `/opt/inflow/data/vnc_tokens/{account}.token`.
  4. While `vnc_guard.py` takes ~2s to initialize the X11 desktop and write back the token, the client's iframe connects to `websockify`.
  5. Websockify checks the tokens directory, finds no token file, logs `Token not found`, and drops the WebSocket connection with 502/disconnect.
  6. When the user manually clicks "Connect" 5-10s later, the desktop is up and the token file was restored, so it connects.
- **Solution**:
  - In `vnc_guard.py`:
    - Refactor `start()` so it does not clear the token file if a new token was passed in.
    - Wait until `rfb.sock` is verified ready before completing.
  - In `hermes_orchestrator.py`:
    - Write the token once and ensure the socket is listening before returning the response to the caller.
  - In `vnc-viewer-modal.tsx`:
    - Add a 500ms safety buffer before rendering the iframe to ensure Websockify and socket bindings are fully stabilized.
