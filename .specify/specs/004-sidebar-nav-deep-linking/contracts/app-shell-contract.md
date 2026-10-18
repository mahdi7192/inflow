# Contract: App Shell & Sidebar Navigation

**Feature**: Sidebar Navigation, Topbar Decluttering & Deep Linking
**Branch**: `004-sidebar-nav-deep-linking`
**Date**: 2026-10-18

## 1. Component Interface: `SidebarNav`

The `SidebarNav` component renders the persistent navigation on desktop and the internal content of the mobile drawer.

```typescript
export interface SidebarNavProps {
  /** Currently selected Instagram account username */
  currentAccount: string;
  /** List of connected accounts available to the authenticated user */
  accounts: AccountRow[];
  /** Callback fired when the user selects a different account */
  onSelectAccount: (username: string) => void;
  /** Callback to trigger the Add Account modal */
  onOpenAddAccount: () => void;
  /** Callback to trigger the Hermes Agent API modal */
  onOpenAgentApi: () => void;
  /** Callback to trigger account synchronization */
  onSync: () => Promise<void>;
  /** Indicates whether synchronization is actively executing */
  syncing: boolean;
  /** Current authenticated user details */
  currentUser?: SafeUser | null;
  /** Callback fired when user triggers logout */
  onLogout: () => void;
  /** Active language code for localized strings */
  lang: Lang;
  /** Optional callback to close the mobile drawer upon navigation */
  onCloseMobileDrawer?: () => void;
}
```

### Visual Structure & Ordering

```text
+------------------------------------------+
|  [BrandLogo] inFlow                      |
+------------------------------------------+
|  [Account Switcher Dropdown: @r9spoort1] |
+------------------------------------------+
|  NAVIGATION LINKS:                       |
|  - [Icon] پست‌ها و ریلزها (Active)         |
|  - [Icon] API ایجنت هرمس                  |
|  - [Icon] پرتال مدیریت (Superadmin only) |
+------------------------------------------+
|  ACTIONS:                                |
|  - [RotateCw] سینک پیج (Sync Button)     |
+------------------------------------------+
|  USER FOOTER:                            |
|  - User Avatar & Name                    |
|  - Role Badge                            |
|  - [LogOut] خروج از حساب کاربری          |
+------------------------------------------+
```

---

## 2. Component Interface: Decluttered Top Header

The top header on desktop provides contextual breadcrumbs and the unified language dropdown, with a mobile menu trigger on small screens.

```typescript
export interface DashboardTopHeaderProps {
  /** Title or contextual breadcrumb (e.g. catalog name or post shortcode) */
  contextTitle: string;
  /** Active post shortcode if in detail view, or null */
  selectedShortcode: string | null;
  /** Callback to return to catalog list */
  onBackToCatalog?: () => void;
  /** Active language */
  lang: Lang;
  /** Callback to change language */
  onLangChange: (lang: Lang) => void;
  /** Callback to open mobile sidebar drawer */
  onOpenMobileMenu: () => void;
}
```
