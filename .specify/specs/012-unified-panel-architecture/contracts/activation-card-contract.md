# Contract: Universal Activation Card & Progressive Disclosure

**Type**: UI & UX Component Contract  
**Component**: `src/components/ui/activation-card.tsx`

---

## 1. Visual Hierarchy & Anatomy

```text
┌────────────────────────────────────────────────────────────────────────┐
│ [Icon]  Title                              [Badge: روشن / خاموش] [Switch]│
│         Subtitle (Two-state explanatory text)                          │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Feature Icon**: Contained in a rounded squircle badge matching feature theme.
2. **Title**: Bold, unambiguous Persian name (e.g. "پاسخ خودکار کامنت", "دایرکت هوشمند").
3. **Status Badge**:
   - `روشن` / `فعال`: Emerald pastel background (`bg-emerald-50 text-emerald-700 border-emerald-200`).
   - `خاموش` / `غیرفعال`: Zinc muted background (`bg-zinc-100 text-zinc-600 border-zinc-200`).
4. **Subtitles**:
   - `subtitleOn`: Explains what automation cycles are currently performing.
   - `subtitleOff`: Explains that operations are dormant and how to turn them on.
5. **Switch**: Primary shadcn switch with keyboard focus ring.

---

## 2. Progressive Disclosure Behavior

- **When `enabled === false`**:
  1. The activation card shows `خاموش` and `subtitleOff`.
  2. Directly below the activation card, an informative banner renders:
     ```tsx
     <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-800 ...">
       اتوماسیون در حال حاضر خاموش است. برای پاسخگویی به کاربران، کلید بالا را روشن کنید.
     </div>
     ```
  3. All child configuration sections (triggers, prompt editors, actions) receive:
     `opacity-50 pointer-events-none select-none transition-opacity duration-200`.
- **When `enabled === true`**:
  1. The banner is hidden.
  2. All child configuration sections receive `opacity-100 pointer-events-auto`.
  3. Full interactivity is immediately restored.
