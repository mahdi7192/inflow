# Quickstart & Verification Guide: Feature 004

**Feature**: Sidebar Navigation, Topbar Decluttering & Deep Linking
**Branch**: `004-sidebar-nav-deep-linking`
**Date**: 2026-10-18

This guide outlines end-to-end verification scenarios to validate the implementation of Feature 004.

---

## 1. Prerequisites & Setup

Ensure the development server is running and database seed is initialized:

```bash
# Verify packages and build cleanly
pnpm install
pnpm dev
```

Navigate to `http://localhost:3000` and authenticate using seeded credentials (e.g. `sport_manager` / `inflow2026` or `admin` / `inflow2026`).

---

## 2. Test Scenarios

### Scenario A: Sidebar Navigation & Topbar Decluttering (Desktop Viewport >= 1024px)
1. **Action**: Open `http://localhost:3000` on a desktop screen.
2. **Verification**:
   - Confirm a dedicated sidebar appears on the start edge (right in Persian RTL, left in English LTR).
   - Confirm the sidebar contains the inFlow brand logo, account switcher dropdown, navigation links (Posts & Reels, Hermes API, Backoffice if superadmin), Sync button, and user footer with logout.
   - Confirm the top header is minimal and clean: no manual post registration buttons, no view toggles, and no horizontal multi-language button strips.
   - Confirm switching language between Persian (`fa`) and English (`en`) flips the sidebar cleanly between the right and left edges.

### Scenario B: Responsive Mobile Drawer (< 1024px)
1. **Action**: Resize browser viewport below 1024px (or open Chrome DevTools device mode).
2. **Verification**:
   - The desktop sidebar disappears.
   - A menu hamburger button appears in the top header.
   - Clicking the hamburger button opens a smooth slide-over drawer containing the full sidebar navigation.
   - Selecting a navigation item or clicking outside closes the drawer cleanly.

### Scenario C: URL Deep-Linking & Page Refresh Persistence
1. **Action**: From the catalog list, click on any post card (e.g. `DehQhnjoEcr`).
2. **Verification**:
   - The post configuration detail view renders.
   - The browser URL address bar immediately updates to `http://localhost:3000/?post=DehQhnjoEcr`.
3. **Action**: Perform a hard page refresh (`F5` or `Cmd+R`).
4. **Verification**:
   - The application reloads and opens directly into the `DehQhnjoEcr` post detail configuration screen. It does NOT revert to the catalog list.
5. **Action**: Click the "بازگشت" (Back) button or click the browser's native Back button.
6. **Verification**:
   - The URL resets to `http://localhost:3000/`.
   - The catalog list view renders with all posts intact.

### Scenario D: Content Toolbar View Mode Toggle
1. **Action**: On the catalog page, inspect the content toolbar above the posts list.
2. **Verification**:
   - Confirm the search bar, filter tabs ("همه پست‌ها", "روشن", "خاموش", "ریلزها", "پست‌ها"), and the view mode toggle (Cards vs Grid) are situated together in the content area.
   - Toggle between Cards and Grid view; verify the layout switches responsively.

### Scenario E: Unified Language Dropdown
1. **Action**: Inspect the language selector on both `/` and `/login`.
2. **Verification**:
   - Only the currently active language (e.g., "فارسی") is shown on the trigger button.
   - Clicking the button opens a clean dropdown menu listing Persian, Arabic, and English.
   - The visual style, tokens, and font on both the login page and dashboard are 100% identical.

### Scenario F: Manual Post Creation Removal
1. **Action**: Search and inspect the dashboard interface for any "ثبت پست / ریلز" button or manual creation modal.
2. **Verification**:
   - Zero manual post registration controls exist.
   - Ingestion is solely driven by the "Sync" action.

---

## 3. Automated Sanity Validation

Run ESLint and production build to confirm zero TypeScript errors:

```bash
pnpm lint
pnpm build
```
