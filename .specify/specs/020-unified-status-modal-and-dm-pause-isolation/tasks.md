# Tasks: Unified Status Modal & Direct Message Pause Isolation (Spec 020)

- [x] Task 1: Fix DM isolation logic in `src/lib/instagram/automation-engine.ts` so `dm_automations.enabled === 0` strictly blocks AI/DM auto-replies while keeping follow claims and comment-to-DM release fully functional.
- [x] Task 2: Create `UnifiedStatusModal` in `src/components/layout/unified-status-modal.tsx` with Instagram session card, Master automation toggle, and granular Comment/DM modules control.
- [x] Task 3: Integrate `UnifiedStatusModal` into `src/components/layout/workspace-shell.tsx`, removing duplicate header buttons and replacing them with a single unified status pill.
- [x] Task 4: Add API route or ensure `/api/accounts/[username]/dm-automation` & `/api/accounts/[username]` are cleanly callable from the modal with instant state sync.
- [x] Task 5: Run tests and verify:
  1. Follow verification works when DM automation is disabled.
  2. Direct incoming DMs are skipped without sending replies when DM automation is disabled.
  3. Header UI has only 1 unified clean status button.
  4. Building and restarting `inflow` systemd service.
