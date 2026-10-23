# Implementation Plan: Unified Status Modal & Direct Message Pause Isolation (Spec 020)

**Date**: 2026-10-23
**Spec Reference**: `020-unified-status-modal-and-dm-pause-isolation`

---

## 1. Architecture & Design

### 1.1. Backend (`src/lib/instagram/automation-engine.ts`)
- In `processIncomingDm`:
  ```ts
  const globalDmEnabled = Boolean(dmRule && dmRule.enabled === 1);
  ```
  - When `!globalDmEnabled`:
    - Ensure `isPostContinuation` cannot force AI DM responses when the DM automation switch is disabled/paused.
    - If `pendingComments` were released, consume the event if `!globalDmEnabled`.
    - If no pending items were released or it was not a follow claim, mark as skipped:
      ```ts
      if (!globalDmEnabled) {
        db.prepare(`
          UPDATE dm_logs
          SET trigger_matched = 0, reply_status = 'skipped', processed_at = ?
          WHERE id = ?
        `).run(nowTimestamp(), dmLogId);
        return {
          processed: true,
          trigger_matched: false,
          reply_status: "skipped",
        };
      }
      ```

### 1.2. Frontend Component (`src/components/layout/unified-status-modal.tsx`)
- Create `UnifiedStatusModal`:
  - Receives `account`, `isOpen`, `onClose`, `sessionStatus`, `masterStatus`, `dmAutomationEnabled`, `onMasterStatusChange`, `onDmAutomationChange`, `onOpenLoginModal`.
  - Clean card with:
    - **Session & Instagram Auth status** with Re-login / Check action.
    - **Master Switch** (کلاً فعال / کلاً متوقف).
    - **Comments Module** (تریگر کامنت‌ها و گیت فالو) — همیشه فعال همراه توضیحات.
    - **DMs Module** (پاسخگویی دایرکت و استوری) — کلید روشن/خاموش با توضیح صریح اینکه در صورت خاموش بودن، پاسخ به دایرکت‌ها متوقف می‌شود ولی تایید فالو و ارسال لینک کامنت‌ها کار می‌کند.

### 1.3. Shell Header Integration (`src/components/layout/workspace-shell.tsx`)
- Replace the dual buttons:
  - Remove the standalone `SessionHealthBadge` and standalone `Automation Master Toggle` button from the header.
  - Insert a single `UnifiedStatusButton` that shows combined status and opens `UnifiedStatusModal`.
  - Maintain the existing top alert banner when `profile?.status === "paused"` for visual safety, but trigger modal on click.

---

## 2. Execution Phases

- **Phase 1**: Backend fix in `src/lib/instagram/automation-engine.ts`.
- **Phase 2**: Create `UnifiedStatusModal` component in `src/components/layout/unified-status-modal.tsx`.
- **Phase 3**: Update `workspace-shell.tsx` to use the unified trigger and modal.
- **Phase 4**: Verification & end-to-end tests with SQLite DB checks and mock events.
- **Phase 5**: Restart `inflow` service and verify status.
