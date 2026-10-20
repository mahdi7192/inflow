# Contract: Form State Lifecycle & Sticky Save Dock

**Type**: Interaction & State Contract  
**Applies to**: All configuration forms across inFlow (`PostDetailView`, `DmAutomationView`, etc.)

---

## 1. Lifecycle State Machine

| State | Dock Visibility | Inputs Editable | Actions Available | Shortcut Enabled |
| :--- | :--- | :--- | :--- | :--- |
| **`pristine`** | Hidden | Yes | Navigation unrestricted | No |
| **`dirty`** | Visible (Slide-up) | Yes | Save, Cancel / Reset | Yes (`Cmd+S` / `Ctrl+S`) |
| **`submitting`** | Visible | Locked | None (Save shows spinner) | No |
| **`success`** | Visible (1.5s checkmark) | Yes | Auto-dismissing | No |
| **`error`** | Visible | Yes | Retry Save, Cancel | Yes |

---

## 2. The Sticky Save Dock Component (`StickySaveBar`)

- **Placement**: Fixed to bottom edge of viewport, centered with responsive horizontal padding:
  ```tsx
  <div className="fixed bottom-4 inset-x-0 z-40 max-w-2xl mx-auto px-4 pointer-events-none">
    <div className="pointer-events-auto bg-card border border-border shadow-xl rounded-2xl p-3 flex items-center justify-between ...">
  ```
- **Contents**:
  1. *Dirty Status Indicator*: Pulsating amber dot + text: `تغییرات ذخیره‌نشده دارید` (or `{count} تغییر اعمال شده`).
  2. *Cancel Action*: Secondary/Ghost button (`لغو تغییرات`) restoring initial values.
  3. *Save Action*: Primary solid zinc button (`ذخیره تغییرات`) with loading spinner during `submitting` and checkmark upon `success`.

---

## 3. Keyboard Shortcut Contract

- Global listener attached to `window`:
  ```typescript
  if ((event.metaKey || event.ctrlKey) && event.key === "s") {
    event.preventDefault();
    if (isDirty && !isSubmitting) {
      handleSave();
    }
  }
  ```

---

## 4. Navigation Interception Contract

- If a user clicks an internal link (e.g. sidebar `/dms` or `/comments`) while `isDirty === true`:
  1. Intercept navigation.
  2. Render `UnsavedChangesModal`:
     - Primary Destructive CTA: "خروج بدون ذخیره" (calls navigation callback).
     - Secondary Default CTA: "ماندن در صفحه" (closes modal, retains edits).
- Before browser window close or refresh:
  - Register `window.addEventListener("beforeunload", handler)` returning standard confirmation warning.
