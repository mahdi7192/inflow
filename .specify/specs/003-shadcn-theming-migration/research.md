# Research: Migrate to shadcn/ui & Centralized Token Theming

**Feature**: `003-shadcn-theming-migration`
**Date**: 2026-10-18

## 1. Theming Architecture with Tailwind CSS v4

### Decision
Use CSS Custom Properties in `:root` inside `src/app/globals.css` combined with `@theme inline` directives supported in Tailwind CSS v4.

### Rationale
- Tailwind CSS v4 no longer requires a legacy `tailwind.config.js`. Theme tokens declared via `@theme inline` automatically generate utility classes (e.g. `bg-primary`, `text-primary-foreground`, `border-border`, `ring-ring`).
- Provides 100% centralized color control: changing `--primary` in `:root` updates every primary button, active tab indicator, and focus ring across `/login`, `/`, and `/backoffice` simultaneously.
- Zero runtime performance cost: Pure native CSS variables compile at build time via Turbopack.

### Alternatives Considered
- **Inline Tailwind Palette Classes (`bg-purple-600`, `bg-zinc-900`)**: Rejected because it caused the exact design fragmentation between Feature 001 and 002.
- **CSS-in-JS (Emotion / Styled Components)**: Rejected due to Next.js App Router (RSC) performance overhead and React 19 incompatibility.

---

## 2. shadcn/ui Configuration & `components.json`

### Decision
Establish standard `components.json` at repository root targeting `@/components/ui`, `@/components`, and `@/lib/utils` with `cssVariables: true`.

### Rationale
- Enables standard shadcn toolchains, AI agent comprehension, and ensures all future primitives follow standard directory naming and export conventions.
- Compatible with Next.js 16 App Router and React 19.

### Alternatives Considered
- **Leaving `components.json` absent**: Rejected because external coding agents (and developers) cannot determine the component path aliases or theming standard without it.

---

## 3. Component Architecture & Backward Compatibility

### Decision
Implement individual atomic primitives in `src/components/ui/`:
- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/switch.tsx`
- `src/components/ui/brand-logo.tsx`

Re-export these from `src/components/ui/primitives.tsx` during migration to guarantee zero breaking changes for existing components while codebase migrations take place.

### Rationale
- Prevents build failures while refactoring screens iteratively.
- Clean separation of concerns adhering to standard shadcn layout.

---

## 4. Official inFlow Brand Mark

### Decision
Standardize on the inFlow official brand mark:
- Rounded squircle container with Instagram sunset gradient (`from-purple-600 via-indigo-600 to-pink-500`).
- White automation icon / Instagram camera glyph.
- High-contrast typography `inFlow` in font-semibold with subtle tracking.
- Completely remove the Vercel triangle (`▲`) from the dashboard header.
