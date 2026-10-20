# Data Models & State Contracts: Unified Panel Architecture & Global UX

**Feature**: `012-unified-panel-architecture`  
**Date**: 2026-10-20  
**Status**: Completed

---

## 1. Workspace Shell State Model

The workspace shell orchestrates persistent state across all account-scoped sub-routes (`/@[account]/*`).

```typescript
export interface WorkspaceShellContextType {
  // Identity & Tenancy
  account: string;                       // e.g. "r9spoort1"
  profile: AccountRow;                   // Current account row from DB
  accounts: AccountRow[];                // List of accounts user has access to
  currentUser: SafeUser | null;          // Authenticated session user
  
  // Navigation & Drawer States
  mobileDrawerOpen: boolean;
  setMobileDrawerOpen: (open: boolean) => void;
  
  // Global Bot Monitor & VNC Session
  botStatus: BotStatus;
  setBotStatus: (status: BotStatus) => void;
  botDrawerOpen: boolean;
  setBotDrawerOpen: (open: boolean) => void;
  vncModalOpen: boolean;
  setVncModalOpen: (open: boolean) => void;
  vncUrl: string;
  vncExpiresInSec: number;
  openVncSession: () => Promise<void>;
  
  // Language & Direction
  lang: Lang;                            // "fa" | "en" | "ar"
  dir: "rtl" | "ltr";
  setLang: (lang: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  
  // Global Unsaved Changes Interceptor
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  requestNavigation: (targetHref: string) => boolean;
}
```

---

## 2. Universal Form State Contract

All configuration forms (Comments, DMs, Settings) conform to this state machine:

```typescript
export type FormLifecycleState = "pristine" | "dirty" | "submitting" | "success" | "error";

export interface FormStateContract<T> {
  initialValues: T;
  values: T;
  isDirty: boolean;
  lifecycle: FormLifecycleState;
  dirtyCount: number;
  errors: Partial<Record<keyof T, string>>;
  
  // Actions
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setValues: (patch: Partial<T>) => void;
  reset: () => void;
  submit: () => Promise<boolean>;
}
```

### State Transitions

```
[Pristine] ──(field edit)──> [Dirty] ──(Cmd+S / Save click)──> [Submitting]
    ▲                           │                                  │
    │                           └──(Cancel click)──> [Pristine]     ├──(200 OK)──> [Success] ──> [Pristine]
    │                                                               │
    └────────────────────────────────(Error)────────────────────────┴──(500 Err)─> [Error] ─────> [Dirty]
```

---

## 3. Activation Card Model

The standardized data contract for feature toggle cards:

```typescript
export interface ActivationCardProps {
  title: string;                         // e.g. "پاسخ خودکار کامنت"
  subtitleOn: string;                    // Explanatory copy when active
  subtitleOff: string;                   // Explanatory copy when dormant
  enabled: boolean;                      // Current boolean status
  onToggle: (nextState: boolean) => Promise<void> | void;
  icon?: React.ReactNode;                // Feature iconography
  badgeOnText?: string;                  // Default: "روشن"
  badgeOffText?: string;                 // Default: "خاموش"
  disabledNotice?: string;               // Alert banner text when disabled
  loading?: boolean;                     // Mutation in-flight
  className?: string;
}
```

---

## 4. Sticky Save Bar Model

Contract for the floating bottom dock surfaced during dirty form states:

```typescript
export interface StickySaveBarProps {
  isDirty: boolean;                      // Dock renders only when true
  isSaving: boolean;                     // Spinner and disabled state
  dirtyCount?: number;                   // Number of modified fields
  onSave: () => Promise<void> | void;    // Primary action
  onReset: () => void;                   // Secondary rollback action
  saveLabel?: string;                    // Default: "ذخیره تغییرات"
  resetLabel?: string;                   // Default: "لغو تغییرات"
  dirtyMessage?: string;                 // Default: "تغییرات ذخیره‌نشده دارید"
  lang?: Lang;
}
```

---

## 5. Centralized Locale Schema

Structure for `src/locales/{fa,en,ar}.json`:

```json
{
  "common": {
    "save": "ذخیره تغییرات",
    "cancel": "لغو",
    "saving": "در حال ذخیره...",
    "saved": "تغییرات با موفقیت ذخیره شد",
    "unsavedChanges": "تغییرات ذخیره‌نشده دارید",
    "discardChanges": "خروج بدون ذخیره",
    "stayOnPage": "ماندن در صفحه",
    "enabled": "روشن",
    "disabled": "خاموش",
    "delete": "حذف",
    "confirm": "تایید",
    "back": "بازگشت"
  },
  "nav": {
    "comments": "پاسخ خودکار کامنت",
    "dms": "دایرکت هوشمند",
    "dmLogs": "سجل دایرکت‌ها",
    "botStatus": "وضعیت ربات",
    "allAccounts": "همه پیج‌ها",
    "backoffice": "پرتال مدیریت",
    "logout": "خروج از حساب"
  },
  "bot": {
    "live": "لایو و فعال",
    "loginRequired": "نیاز به لاگین",
    "checkpoint": "چک‌پوینت اینستاگرام",
    "provisioning": "در حال راه‌اندازی",
    "error": "خطا در اتصال",
    "openScreen": "مشاهده زنده مرورگر ربات"
  },
  "comments": {
    "title": "پاسخ خودکار کامنت‌ها",
    "subtitleOn": "در حالت روشن، ایجنت به صورت خودکار کامنت‌های جدید را بررسی و پاسخ می‌دهد.",
    "subtitleOff": "در حالت خاموش، کامنت‌ها نادیده گرفته می‌شوند.",
    "countWithTotal": "{count} نظر از {total} پست بررسی شده است"
  },
  "dms": {
    "title": "دایرکت هوشمند و مشاور خودکار",
    "subtitleOn": "پاسخگویی خودکار به پیام‌های دریافتی دایرکت فعال است.",
    "subtitleOff": "اتوماسیون دایرکت غیرفعال است.",
    "processedCount": "{count} پیام به کاربر @{username} ارسال شد"
  }
}
```

---

## 6. Official Terminology Dictionary

Registry of canonical product terms:

| English Identifier | Canonical Persian (`fa`) | Canonical Arabic (`ar`) | Canonical English (`en`) |
| :--- | :--- | :--- | :--- |
| `nav_comments` | پاسخ خودکار کامنت | الرد التلقائي على التعليقات | Comment Auto-Reply |
| `nav_dms` | دایرکت هوشمند | الرسائل المباشرة الذكية | Smart DM Assistant |
| `nav_logs` | تاریخچه و لاگ‌ها | سجل العمليات | Activity Logs |
| `trigger_rule` | شرط فعال‌سازی | شرط التفعيل | Trigger Condition |
| `follow_gate` | شرط دنبال کردن پیج | شرط المتابعة | Follow Gate |
| `ai_instructions`| دستورالعمل هوش مصنوعی | توجيهات الذكاء الاصطناعي | AI Instructions |
| `save_dock` | داک ذخیره تغییرات | شريط حفظ التغييرات | Sticky Save Bar |
| `bot_screen` | مانیتور زنده ربات | شاشة البوت المباشرة | Live Bot Screen |
| `workspace_shell`| پیشخوان پیج | مساحة عمل الحساب | Account Workspace |
