# Contract: Unified Language Dropdown Menu

**Feature**: Sidebar Navigation, Topbar Decluttering & Deep Linking
**Branch**: `004-sidebar-nav-deep-linking`
**Date**: 2026-10-18

## 1. Component Specification: `LanguageDropdown`

Location: `src/components/ui/language-dropdown.tsx`

```typescript
import { Lang } from "@/lib/i18n";

export interface LanguageDropdownProps {
  /** The currently selected language code ('fa' | 'ar' | 'en') */
  currentLang: Lang;

  /** Callback fired when the user selects a new language */
  onLangChange: (lang: Lang) => void;

  /** Optional CSS class name for styling the trigger wrapper */
  className?: string;

  /** Size variant for the trigger button */
  size?: "sm" | "default";
}
```

### Visual & Interactive Behavior

1. **Trigger Representation**:
   * Displays the `Globe` icon (`w-3.5 h-3.5`).
   * Displays the active language title (e.g. "فارسی" for `fa`, "العربية" for `ar`, "English" for `en`).
   * Displays a `ChevronDown` arrow (`w-3 h-3 text-muted-foreground`).
   * Renders as a lightweight shadcn/ui button with `variant="outline"` or `variant="ghost"`.

2. **Dropdown Menu Presentation**:
   * Clean popover card with border, subtle shadow, light mode background (`bg-popover`).
   * Displays the 3 available languages:
     - فارسی (fa)
     - العربية (ar)
     - English (en)
   * The currently active language has a checkmark (`Check` icon) and subtle active highlight.
   * Clicking an item fires `onLangChange(newLang)`, saves to `localStorage.setItem('inflow_lang', newLang)`, updates `document.documentElement.dir` (`rtl` for `fa`/`ar`, `ltr` for `en`), and closes the menu.
   * Clicking outside closes the menu.

3. **Universal Usage**:
   * Used identically in `src/app/login/page.tsx`.
   * Used identically in the dashboard header (`src/components/inflow-dashboard.tsx`).
   * Used identically in the back-office header (`src/app/backoffice/backoffice-client.tsx`).
