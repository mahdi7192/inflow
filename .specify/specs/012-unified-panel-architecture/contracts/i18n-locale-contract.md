# Contract: Multi-Language JSON Architecture & Dynamic Interpolation

**Type**: Internationalization (i18n) Contract  
**Location**: `src/locales/{fa,en,ar}.json` & `src/lib/i18n.ts`

---

## 1. File Structure & Scope

```text
src/
└── locales/
    ├── fa.json       # Canonical Persian dictionary (Source of Truth)
    ├── en.json       # Complete English dictionary
    └── ar.json       # Complete Arabic dictionary
```

- Every top-level key or nested section must be 100% mirrored across all three files.
- Hardcoded user-facing strings in TypeScript/TSX components are strictly prohibited.

---

## 2. Dynamic Token Interpolation

- Tokens are delimited with `{paramName}`:
  ```json
  "postsActiveCount": "{active} پست از مجموع {total} فعال است"
  ```
- The translation function handles dynamic substitution:
  ```typescript
  t("postsActiveCount", { active: 5, total: 10 })
  // Outputs: "۵ پست از مجموع ۱۰ فعال است"
  ```
- If a parameter is omitted, the placeholder token is preserved or safely cleared without throwing an exception.

---

## 3. Direction & Locale State

- `Lang`: `"fa"` | `"en"` | `"ar"`
- `dir`:
  - `"fa"` -> `"rtl"`
  - `"ar"` -> `"rtl"`
  - `"en"` -> `"ltr"`
- When `setLang(newLang)` is invoked:
  1. Saves language to cookie or `localStorage` (`inflow_lang`).
  2. Updates `document.documentElement.dir` and `lang` attribute.
  3. Re-renders UI smoothly without full page refresh.

---

## 4. Key Parity Validator Script

- A lightweight verification test (`tests/i18n-parity.test.ts` or CLI check `pnpm test:i18n`) checks:
  1. All keys in `fa.json` exist in `en.json` and `ar.json`.
  2. All keys in `en.json` exist in `fa.json`.
  3. All keys in `ar.json` exist in `fa.json`.
  4. Returns exit code 1 if any key is missing.
