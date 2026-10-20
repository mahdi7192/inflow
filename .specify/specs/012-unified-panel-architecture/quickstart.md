# Quickstart & Verification Guide: Unified Panel Architecture & Global UX

**Feature**: `012-unified-panel-architecture`  
**Date**: 2026-10-20  
**Status**: Ready for Verification

---

## 1. Prerequisites & Environment Setup

Ensure the Next.js local development server is active with clean dependencies:
```bash
# Verify dependencies
pnpm install

# Start development server
pnpm dev
```
Navigate to `http://localhost:3000` and authenticate into the platform.

---

## 2. Validation Scenario 1: Persistent Workspace Shell Navigation

### Goal
Prove that navigating between Comment Automation and DM Automation preserves the shell without remounting, flickering, or repeating database queries.

### Steps
1. Navigate to an assigned account workspace: `http://localhost:3000/@r9spoort1/comments`.
2. Open Browser DevTools -> Console & Network tab.
3. Open the **Bot Status Drawer** from the top header button. Observe that bot telemetry is visible.
4. Click on the **دایرکت هوشمند (DMs)** link in the persistent sidebar.
5. **Expected Outcomes**:
   - The route transitions seamlessly to `/@r9spoort1/dms`.
   - The sidebar navigation and top header remain mounted with zero visual flash.
   - The Bot Status Drawer remains open (or retains its state) without crashing.
   - No redundant fetch requests for the account profile or accounts list are dispatched.

---

## 3. Validation Scenario 2: Single Scroll Container & BiDi Direction

### Goal
Prove that the workspace content container is the exclusive vertical scroll container and correctly positions the scrollbar based on language direction.

### Steps
1. On `/@r9spoort1/comments`, observe the vertical scrollbar.
2. **Expected Outcome**: Exactly one vertical scrollbar appears on the **left edge** of the content area. The main browser window has zero scrollbars.
3. Use the Language Dropdown in the top header to switch to **English (en)**.
4. **Expected Outcome**: The interface flips to `dir="ltr"`. The scrollbar instantly moves to the **right edge** of the content area without double scrollbars or page jitter.
5. Switch back to **فارسی (fa)**. The scrollbar returns to the left edge.

---

## 4. Validation Scenario 3: Activation Card Progressive Disclosure

### Goal
Prove that turning an automation OFF visually mutes child configurations with an informative banner, and turning it ON immediately enables editing.

### Steps
1. Navigate to `/@r9spoort1/dms`.
2. If currently active, click the master switch on the `ActivationCard` to turn it OFF.
3. **Expected Outcomes**:
   - Status badge transitions to `خاموش`.
   - Dependent sections below (Triggers, Direct Reply, AI Prompt, Follow Gate) become 50% opaque and `pointer-events-none`.
   - An alert banner displays: "اتوماسیون در حال حاضر خاموش است...".
   - A global toast confirms: "اتوماسیون دایرکت غیرفعال شد".
4. Click the switch again to turn it ON.
5. **Expected Outcomes**:
   - Badge transitions to `روشن`.
   - All form sections become 100% interactive.
   - Banner disappears.

---

## 5. Validation Scenario 4: Form Dirty State, Sticky Save Bar & Keyboard Shortcut

### Goal
Prove that editing any field surfaces the bottom Sticky Save Dock, enables `Cmd+S`, and intercepts unsaved navigation.

### Steps
1. On `/@r9spoort1/dms`, modify the direct message reply text.
2. **Expected Outcome**: The Sticky Save Dock slides up smoothly at the bottom of the viewport showing `تغییرات ذخیره‌نشده دارید` and buttons `ذخیره تغییرات` / `لغو تغییرات`.
3. Press `Cmd+S` (macOS) or `Ctrl+S` (Windows/Linux).
4. **Expected Outcomes**:
   - The save button shows a loading spinner ("در حال ذخیره...").
   - Upon completion, turns into a green checkmark.
   - Dock smoothly slides away.
   - A success toast is displayed.
5. Edit the text again to enter dirty state. Now click on the sidebar link for **پاسخ خودکار کامنت**.
6. **Expected Outcome**: The `UnsavedChangesModal` pops up warning that unsaved changes will be lost. Clicking "ماندن در صفحه" keeps the user on the page; clicking "خروج بدون ذخیره" discards edits and proceeds.

---

## 6. Validation Scenario 5: Multilingual JSON Key Parity

### Goal
Validate that all locale strings are served from JSON files and 100% of keys exist across Persian, English, and Arabic.

### Steps
1. Run the i18n parity validation script:
   ```bash
   pnpm test:i18n
   # or node -e "..." checking key matching between src/locales/fa.json, en.json, ar.json
   ```
2. **Expected Outcome**: All keys match 100% with 0 missing translations.
3. Inspect parameterized strings (e.g. `{count}`) and verify dynamic numbers are interpolated properly in all 3 languages.
