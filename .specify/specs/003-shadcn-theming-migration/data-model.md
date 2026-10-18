# Data Model: UI Design Tokens & Component Contracts

**Feature**: `003-shadcn-theming-migration`
**Date**: 2026-10-18

## 1. Design Token Schema (CSS Variables in `globals.css`)

The design system is parameterized by standard shadcn/ui CSS custom properties defined in `:root` (Zinc Light Mode):

| Token Name | Default Value (Light Mode) | Purpose |
| :--- | :--- | :--- |
| `--background` | `#ffffff` | Primary canvas background (pure white) |
| `--foreground` | `#09090b` | Primary text color (Zinc 950) |
| `--card` | `#ffffff` | Card container background |
| `--card-foreground`| `#09090b` | Text inside card containers |
| `--popover` | `#ffffff` | Dropdown and popover container background |
| `--popover-foreground` | `#09090b` | Popover text color |
| `--primary` | `#18181b` | Primary element color (Zinc 900) |
| `--primary-hover` | `#27272a` | Primary button hover state (Zinc 800) |
| `--primary-foreground` | `#fafafa` | Text/icons on primary surfaces (Zinc 50) |
| `--secondary` | `#f4f4f5` | Secondary surface background (Zinc 100) |
| `--secondary-foreground` | `#18181b` | Secondary text (Zinc 900) |
| `--muted` | `#f4f4f5` | Muted background (Zinc 100) |
| `--muted-foreground` | `#71717a` | Muted / secondary text (Zinc 500) |
| `--accent` | `#f4f4f5` | Subtle accent background (Zinc 100) |
| `--accent-foreground` | `#18181b` | Accent text (Zinc 900) |
| `--destructive` | `#ef4444` | Error / danger state (Red 500) |
| `--destructive-foreground` | `#fafafa` | Destructive text |
| `--border` | `#e4e4e7` | Standard border (Zinc 200) |
| `--input` | `#e4e4e7` | Form field border (Zinc 200) |
| `--ring` | `#18181b` | Keyboard focus ring color (Zinc 900) |
| `--radius` | `0.5rem` (`8px`) | Standard border radius |

---

## 2. Component Variant Contracts

### `Button` (via `class-variance-authority`)
* **Variants**:
  * `default`: `bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs`
  * `secondary`: `bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/50`
  * `outline`: `border border-border bg-background hover:bg-muted text-foreground shadow-xs`
  * `ghost`: `hover:bg-muted text-foreground`
  * `destructive`: `bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs`
  * `brand`: `bg-zinc-900 text-white hover:bg-zinc-800 shadow-xs`
  * `emerald`: `bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs`
* **Sizes**:
  * `sm`: `h-8 px-3 text-xs rounded-md`
  * `default`: `h-9 px-4 py-2 text-xs rounded-lg`
  * `lg`: `h-10 px-6 text-sm rounded-lg`
  * `icon`: `h-9 w-9 p-0 rounded-lg flex items-center justify-center`

### `Input`
* **Attributes**: `HTMLInputElement` standard props
* **Styling**: `h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50`

### `Card`
* Composite parts: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
* Default styling: `rounded-xl border border-border bg-card text-card-foreground shadow-xs`
