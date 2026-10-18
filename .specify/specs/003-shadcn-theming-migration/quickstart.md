# Quickstart Validation Guide: shadcn/ui & Theming Migration

**Feature**: `003-shadcn-theming-migration`
**Date**: 2026-10-18

This guide outlines end-to-end verification of the design system migration across all application routes.

## Prerequisites
- Node.js 20+
- pnpm 11+
- Development server running on port 3000

## Verification Scenarios

### Scenario 1: Theme Consistency Across Routes
1. Open browser to `http://localhost:3000/login`.
2. Inspect the inFlow brand logo in the top-left header.
3. Open `http://localhost:3000/`. Confirm the Vercel triangle logo is completely gone and replaced by the identical inFlow brand logo.
4. Verify the header height and background blur are consistent.

### Scenario 2: Token Centralization Test
1. Temporarily modify `--primary: #9333ea;` to `--primary: #2563eb;` in `src/app/globals.css`.
2. Verify that primary buttons on both `/login` and `/` instantly change color without manual component edits.
3. Revert `--primary` back to `#9333ea`.

### Scenario 3: RTL & BiDi Validation
1. Click the language switcher in the header and toggle between `FA`, `AR`, and `EN`.
2. Ensure input padding, icon placements, and layout direction adapt without visual distortion.

### Scenario 4: Build & Lint Validation
Run the full production build:
```bash
pnpm lint
pnpm build
```
Expected outcome: Zero TypeScript errors, zero lint warnings, successful static generation.
