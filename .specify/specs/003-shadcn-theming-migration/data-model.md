# Data Model: UI Design Tokens & Component Contracts

**Feature**: `003-shadcn-theming-migration`
**Date**: 2026-10-18

## 1. Design Token Schema (CSS Variables in `globals.css`)

The design system is parameterized by standard CSS custom properties defined in `:root`:

| Token Name | Default Value (Dark Mode) | Purpose |
| :--- | :--- | :--- |
| `--background` | `#050505` | Primary canvas background (deep OLED dark) |
| `--foreground` | `#ededed` | Primary text color |
| `--card` | `#0c0c0e` | Card container background |
| `--card-hover` | `#121215` | Card hover state background |
| `--card-foreground`| `#ededed` | Text inside card containers |
| `--popover` | `#0d0d10` | Dropdown and popover container background |
| `--popover-foreground` | `#ededed` | Popover text color |
| `--primary` | `#9333ea` (`rgb(147 51 234)`) | Brand primary color (Purple 600) |
| `--primary-hover` | `#a855f7` (`rgb(168 85 247)`) | Primary button hover state (Purple 500) |
| `--primary-foreground` | `#ffffff` | Text/icons on primary surfaces |
| `--secondary` | `#18181b` | Secondary surface background (Zinc 900) |
| `--secondary-foreground` | `#fafafa` | Secondary text |
| `--muted` | `#27272a` | Muted background (Zinc 800) |
| `--muted-foreground` | `#a1a1aa` | Muted / secondary text (Zinc 400) |
| `--accent` | `#2e1065` | Subtle purple accent background |
| `--accent-foreground` | `#d8b4fe` | Accent text |
| `--destructive` | `#ef4444` | Error / danger state (Red 500) |
| `--destructive-foreground` | `#ffffff` | Destructive text |
| `--border` | `rgba(255, 255, 255, 0.08)` | Default subtle border |
| `--input` | `rgba(255, 255, 255, 0.12)` | Form field border |
| `--ring` | `#9333ea` | Keyboard focus ring color |
| `--radius` | `0.75rem` (`12px`) | Standard border radius |

---

## 2. Component Variant Contracts

### `Button` (via `class-variance-authority`)
* **Variants**:
  * `default`: `bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm`
  * `secondary`: `bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border`
  * `outline`: `border border-border bg-transparent hover:bg-white/5 text-foreground`
  * `ghost`: `bg-transparent hover:bg-white/5 text-muted-foreground hover:text-foreground`
  * `destructive`: `bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25`
  * `brand`: `bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 text-white shadow-md shadow-purple-600/20 hover:opacity-95`
* **Sizes**:
  * `sm`: `h-7 px-2.5 text-xs rounded-md`
  * `default`: `h-9 px-4 py-2 text-xs rounded-lg`
  * `lg`: `h-11 px-6 text-sm rounded-xl`
  * `icon`: `h-9 w-9 p-0 rounded-lg flex items-center justify-center`

### `Input`
* **Attributes**: `HTMLInputElement` standard props
* **Styling**: `h-10 w-full rounded-xl border border-input bg-background/80 px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-colors disabled:cursor-not-allowed disabled:opacity-50`

### `Card`
* Composite parts: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
* Default styling: `rounded-2xl border border-border bg-card text-card-foreground shadow-sm`
