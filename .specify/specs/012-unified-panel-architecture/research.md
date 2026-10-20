# Research & Architecture Decisions: Unified Panel Architecture & Global UX

**Feature**: `012-unified-panel-architecture`  
**Date**: 2026-10-20  
**Status**: Completed & Approved

---

## 1. Next.js 16 App Router Nested Layout Architecture

### Context
In the current codebase, each sub-page under `src/app/[account]/*` (`page.tsx`, `comments/page.tsx`, `comments/[shortcode]/page.tsx`, `dms/page.tsx`, `dms/logs/page.tsx`) independently verifies authentication (`getSessionUser()`), checks account access (`hasAccountAccess()`), queries the database for the active profile and accessible accounts, and instantiates its own `SidebarNav`, mobile drawer, top toolbar, bot monitor drawer, and VNC modal.

### Decision
Implement a single nested layout at `src/app/[account]/layout.tsx` (Server Component) that delegates persistent presentation to a client component `WorkspaceShell`:
```
src/app/[account]/
├── layout.tsx                  # Server Component: Auth guard, Account query, Accounts list query
├── page.tsx                    # Canonical redirect -> /@{username}/comments
├── comments/
│   ├── page.tsx                # Server Component: Fetches posts -> renders CommentCatalogView
│   └── [shortcode]/page.tsx    # Server Component: Fetches post -> renders PostDetailView
└── dms/
    ├── page.tsx                # Server Component: Fetches DM config -> renders DmAutomationView
    └── logs/page.tsx           # Server Component: Fetches DM logs -> renders DmLogsPageView
```

### Rationale
1. **Zero-Flash Persistent Navigation**: Next.js App Router preserves layouts across sub-route transitions. When a user navigates between `comments`, `dms`, and `logs`, the `SidebarNav` and top toolbar remain mounted. No network queries for accounts or user sessions are repeated.
2. **Persistent Telemetry**: The `BotToolbarButton`, `BotMonitorDrawer`, and `VncViewerModal` reside in the shell. If a user is monitoring bot logs or waiting on a VNC session, navigating across tabs does not unmount or kill the session.
3. **Clean Separation of Concerns**: Page routes become pure content views; they do not worry about sidebar toggles, mobile drawers, or shell layout structures.

### Alternatives Considered
- *Keep Layout Inside Each Page*: Rejected. Leads to 4 duplicate database queries per page, state loss across tabs, and visual layout shifts.
- *Root-Level Layout for Shell*: Rejected. The root route (`/`) is the Page Selection Hub (Account Selector Hub) which has a wide grid layout, and `/login` has a centered card layout without sidebars. Scoping the shell to `[account]/layout.tsx` is the canonical Next.js pattern.

---

## 2. Unified Scroll Container & BiDi Direction Architecture

### Context
Currently, `InflowDashboard` uses `min-h-screen flex flex-col lg:flex-row` (triggering window scroll), while `dm-automation-view.tsx` uses `h-screen overflow-hidden` with an inner `overflow-y-auto` container and hardcodes `dir={lang === "en" ? "ltr" : "rtl"}` on sub-elements. This leads to double scrollbars, scrollbar hopping from left to right, and jittery layouts.

### Decision
Establish a strict **Single Scroll Container** hierarchy:
1. `WorkspaceShell` sets the outer viewport to `h-screen overflow-hidden flex flex-col lg:flex-row`.
2. The sidebar is sticky/fixed on desktop (`w-64 h-full shrink-0 border-e`).
3. The main area is `flex-1 flex flex-col min-w-0 h-full overflow-hidden`.
4. The top header is sticky (`h-14 shrink-0 border-b`).
5. The workspace body is the **exclusive vertical scroll container**: `flex-1 overflow-y-auto min-w-0`.
6. Document direction (`dir="rtl"` vs `dir="ltr"`) is managed synchronously at the root/shell level. In RTL (`fa`, `ar`), the scrollbar sits natively on the left edge of this container; in LTR (`en`), it sits on the right.
7. Custom scrollbar styles in `globals.css` provide sleek zinc tracks without jarring widths.

### Rationale
- Completely eliminates window scrollbar collisions with nested div scrollbars.
- Guarantees predictable scrollbar location matching language direction.
- Prevents page headers from scrolling out of view during long rule edits.

---

## 3. Form State Lifecycle & The Sticky Save Dock

### Context
Configuration forms (post comments, DM prompts, keyword triggers) currently place save buttons either at the bottom of long forms (requiring scrolling) or in ad-hoc locations with local `useState` flags. Unsaved changes are lost if a user clicks a sidebar link.

### Decision
Adopt the **Sticky Save Dock** pattern (standardized in enterprise SaaS platforms like Shopify Polaris, Stripe, and Linear):
1. **Universal Form State Machine**:
   - `Pristine`: Form inputs match persisted server state. Dock is hidden. Navigation is unimpeded.
   - `Dirty`: One or more fields differ from server state. Sticky dock surfaces at bottom of viewport.
   - `Submitting`: User clicked save or pressed `Cmd+S`. Inputs locked; spinner shown.
   - `Success`: Server confirmed save. Button displays green checkmark; dock auto-dismisses; success toast emitted.
   - `Error`: Mutation failed. Inputs remain editable; error toast emitted; dock stays open for retry.
2. **Keyboard Shortcut**:
   - Form registers a window listener for `Cmd+S` (macOS) and `Ctrl+S` (Windows/Linux) to trigger submission immediately when dirty.
3. **Unsaved Changes Interception**:
   - In-app navigation (clicking sidebar, breadcrumbs, account switcher) is intercepted if `isDirty === true`, prompting an `UnsavedChangesModal`.
   - Browser tab closure or reload registers a `beforeunload` listener.

### Rationale
- Operators often write long AI prompts or complex keyword sets; having a persistent dock at the bottom ensures they never have to hunt for a save button.
- Eliminates accidental data loss.

---

## 4. Universal Feature Activation Card & Progressive Disclosure

### Context
Comment automation toggling exists inside post feed cards or a custom card in detail view, while DM automation uses a custom `DmHeaderToggle` component.

### Decision
Standardize on a single universal `ActivationCard` component located in `src/components/ui/activation-card.tsx`:
- **Props**:
  - `title: string` (e.g. "اتوماسیون پاسخ خودکار کامنت", "دایرکت هوشمند")
  - `subtitleOn: string` (explanatory text when enabled)
  - `subtitleOff: string` (explanatory text when disabled)
  - `enabled: boolean`
  - `onToggle: (checked: boolean) => Promise<void> | void`
  - `icon: React.ReactNode`
  - `disabledNotice?: string`
- **Behavior**:
  - Toggling ON/OFF immediately applies optimistic UI state.
  - When OFF: all dependent sub-settings below the card are styled with `opacity-50 pointer-events-none select-none`, preceded by an informative alert banner ("این قابلیت غیرفعال است...").
  - When ON: child controls are fully interactive.

---

## 5. Centralized Multi-Language JSON Store & Dynamic Interpolation

### Context
Translations are currently stored in a 1009-line TypeScript object in `src/lib/i18n.ts`. Dynamic values like `{count}` or `@{username}` are manually concatenated in JSX, leading to grammar bugs and untranslated fragments.

### Decision
1. Create dedicated JSON files:
   - `src/locales/fa.json`
   - `src/locales/en.json`
   - `src/locales/ar.json`
2. Migrate all translation keys to this structure.
3. Enhance `t(key, params)` in `src/lib/i18n.ts` to support parameterized replacement:
   ```typescript
   export function t(key: string, params?: Record<string, string | number>): string {
     let str = dictionaries[currentLang][key] || dictionaries.fa[key] || key;
     if (params) {
       Object.entries(params).forEach(([k, v]) => {
         str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
       });
     }
     return str;
   }
   ```
4. Create a test/script that validates 100% key parity across `fa.json`, `en.json`, and `ar.json`.

---

## 6. Global Feedback System (Toast Provider)

### Context
Views currently maintain independent `const [toastMsg, setToastMsg] = useState(...)` and `const [syncAlert, setSyncAlert] = useState(...)` with custom timeouts and absolute positioned divs.

### Decision
Adopt `sonner` (the official shadcn/ui toast provider):
- Place `<Toaster position="bottom-left" dir="rtl" />` inside `WorkspaceShell`.
- Export standard `toast.success()`, `toast.error()`, `toast.info()`, `toast.warning()` utilities.
- Guarantees uniform animation, auto-dismissal, RTL alignment, and Vazirmatn typography.

---

## 7. Typography & Font Stack Fix

### Context
Components use `className="... font-vazir"` which does not exist in Tailwind v4 `@theme inline`, causing intermittent fallback to generic system fonts. In addition, mixed Persian-English text frequently experiences reversed punctuation.

### Decision
1. In `src/app/globals.css`:
   - Ensure `--font-sans: var(--font-vazirmatn), var(--font-geist-sans), sans-serif;` applies to `body` and all shadcn primitives.
   - Add explicit `@utility font-vazir { font-family: var(--font-vazirmatn), sans-serif; }` for backwards compatibility.
2. In all text rendering handles (`@username`), technical abbreviations (`AI`, `DM`, `MCP`, `API`), and numbers:
   - Wrap in `<bdi>` or unicode bidirectional markers to isolate Latin script from right-to-left layout flows.
