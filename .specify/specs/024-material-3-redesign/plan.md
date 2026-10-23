# Plan: Spec 024 - Material 3 Redesign

## Phase 1: Foundation & Typography
1. Install or configure `@fontsource-variable/estedad` and Google Material Symbols font in `src/app/layout.tsx` and `src/app/globals.css`.
2. Create `<MaterialSymbol />` component in `src/components/ui/material-symbol.tsx` with weight, fill, and RTL auto-mirroring.
3. Update `DESIGN.md` and CSS tokens in `src/app/globals.css` with M3 surface containers, tonal elevations, and color roles.

## Phase 2: Core Shell & Navigation
1. Refactor `SidebarNav` into an M3 Navigation Drawer / Rail (`src/components/sidebar-nav.tsx` & `src/components/layout/m3-navigation.tsx`).
2. Add M3 Top App Bar with search anchor, account selector, and sync actions in `src/components/layout/workspace-shell.tsx`.
3. Add M3 Bottom Navigation Bar for mobile viewports (< 1024px) in `src/components/layout/workspace-shell.tsx`.

## Phase 3: Sheets & Contextual Drawers
1. Update `PostPlaybookDrawer` and `StoryPlaybookDrawer` to render as M3 Side Sheets on desktop and M3 Bottom Sheets on mobile with drag handles.
2. Upgrade UI primitive components (Button, Input, Textarea, Card, Badge, Switch) to M3 specifications.

## Phase 4: Verification & Polish
1. Test TypeScript compilation (`pnpm build` or `next build`).
2. Verify desktop rail/drawer collapse, mobile bottom bar, Estedad font loading, and Material Symbols rendering.
3. Commit and push changes.
