# Spec 024: Google Material Design 3 (M3) Web Redesign

## Goal
Redesign the inFlow Studio application interface end-to-end to strictly conform with Google Material Design 3 (M3: https://m3.material.io/develop/web), matching the architectural patterns of large-scale Google enterprise web applications (Google Drive, Gmail, YouTube Studio, Google Cloud Console). Implement Persian/Arabic typography using the **Estedad** font family, universal **Google Material Symbols**, tonal surface containers, collapsible desktop navigation rail/drawer, and mobile bottom navigation with gesture-friendly bottom sheets.

## Requirements

### 1. Typography & Google Material Symbols
- **Estedad Font**: Set up `@fontsource-variable/estedad` or local woff2 font files in Next.js layout. All Persian/Arabic text, headings, buttons, and inputs must render with Estedad and `font-variant-numeric: tabular-nums`.
- **Google Material Symbols**: Introduce a reusable `<MaterialSymbol name="..." />` component supporting variable weight, grade, optical size, fill, and automatic RTL mirroring for directional icons (`chevron_left`, `chevron_right`, `arrow_back`, `arrow_forward`, `open_in_new`, etc.).
- Replace Lucide icons in major UI elements (navigation, app bars, buttons, status indicators, badges) with Google Material Symbols.

### 2. M3 Tonal Surfaces & Design System Tokens (`DESIGN.md`, `globals.css`)
- **Tonal Elevation (No heavy drop shadows)**:
  - `surface-container-lowest` (`#FFFFFF`) for elevated cards, active modals, and data panels.
  - `surface-container-low` (`#F7F8FC`) for main workspace page canvases.
  - `surface-container` (`#F0F3F9`) for navigation bars, app bars, search anchors.
  - `surface-container-high` (`#E8EDF5`) for chips, search bar inputs, and hovered states.
  - `surface-container-highest` (`#DFE3EB`) for selected segment buttons and inactive pills.
  - `outline` (`#74777F`) and `outline-variant` (`rgba(0, 0, 0, 0.12)`).
  - Shape scale: `rounded-xl` (12px), `rounded-2xl` (16px), `rounded-3xl` (24px-28px), `rounded-full` (capsules/pills).
- Update `DESIGN.md` to document the canonical M3 tokens and rules.

### 3. Desktop Application Architecture (Google Large-Scale Pattern)
- **Collapsible Navigation Drawer / Rail**:
  - Full drawer (280px) on wide desktop screens with Google-style hamburger toggle to collapse into an 80px Navigation Rail.
  - Active destination indicator: M3 Pill Indicator (rounded capsule enclosing icon + text or icon-only in rail mode).
  - Account switcher, sync button, and system health status integrated into M3 header/drawer.
- **Top App Bar & Search Anchor**:
  - Pill-shaped M3 Search Anchor (`rounded-full bg-surface-container`) with search symbol and filter chips for instant filtering of posts, stories, and automations.
- **Side Sheets**:
  - Post and Story playbook drawers styled as M3 Side Sheets with rounded-s-3xl edges, smooth entrance, and tonal container backgrounds.

### 4. Mobile Ergonomics & Adaptive UX (< 1024px)
- **M3 Bottom Navigation Bar**:
  - Fixed 64px (h-16) bottom navigation bar with M3 pill indicators behind active destination icons.
  - Provides quick thumb access to Posts/Catalog, Direct DMs, Comments, and System Status.
- **M3 Bottom Sheet**:
  - Transform slide-over drawers into draggable/dismissible Bottom Sheets on mobile viewports with a drag handle (`w-8 h-1 rounded-full bg-outline-variant`).
  - Sticky thumb-accessible bottom action button bar (touch targets >= 48px).
- **Extended Floating Action Button (FAB)**:
  - Mobile action triggers (e.g. quick test chat, new automation, trigger sync) accessible via M3 FAB.

### 5. Component Refactoring
- Buttons: M3 Filled, Elevated, Tonal, Outlined, and Text button styles.
- Cards: M3 Elevated & Outlined cards (`rounded-2xl`, subtle outline-variant border).
- Text Fields & Selects: M3 Outlined fields with floating/clean labels and rounded-xl corners.
- Segmented buttons and Filter Chips conforming to M3 specs.
