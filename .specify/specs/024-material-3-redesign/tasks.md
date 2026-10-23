# Tasks: Spec 024 - Material 3 Redesign

- [ ] Task 1: Typography & Symbols
  - [ ] Add `@fontsource-variable/estedad` and Google Material Symbols CDN/CSS
  - [ ] Implement `src/components/ui/material-symbol.tsx` with RTL support
  - [ ] Update `src/app/layout.tsx` to set Estedad as primary font and import symbols
- [ ] Task 2: Design Tokens & CSS
  - [ ] Update `src/app/globals.css` with M3 surface containers and elevations
  - [ ] Update `DESIGN.md`
- [ ] Task 3: Desktop M3 Navigation Drawer & Rail
  - [ ] Support collapsible drawer (280px <-> 80px rail) with M3 active pill indicator
  - [ ] Implement M3 Top App Bar with account dropdown, status, and search anchor
- [ ] Task 4: Mobile M3 Bottom Navigation & Sheets
  - [ ] Implement fixed M3 Bottom Navigation Bar
  - [ ] Update `PostPlaybookDrawer` and `StoryPlaybookDrawer` to be responsive Bottom Sheets on mobile
- [ ] Task 5: M3 Component Styling (Buttons, Cards, Chips, Badges)
  - [ ] Update button, card, input, badge components
- [ ] Task 6: Build & Test Verification
  - [ ] Run `pnpm build`
  - [ ] Verify clean UI and no layout regression
