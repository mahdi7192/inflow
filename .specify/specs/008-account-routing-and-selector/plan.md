# Implementation Plan: Root Account Selector Hub, @username Canonical Routing & Zero-Flash Workspace Hydration

**Branch**: `008-account-routing-and-selector` | **Date**: 2026-10-18 | **Spec**: [.specify/specs/008-account-routing-and-selector/spec.md]

## Summary

This feature resolves two related user experience issues:
1. **Root Account Selector Hub**: Visiting `/` renders a clean, focused Account Selector Hub for authenticated users where they can view all assigned Instagram accounts (avatar, bio, follower count, bot state badge) and enter their workspaces.
2. **Canonical `/@username` Dynamic Routing**: Moving account workspaces to `/[account]/page.tsx` where requests starting with `@` (e.g. `/@mahdiketabdar`) or un-prefixed (`/mahdiketabdar` redirected to `/@mahdiketabdar`) are resolved synchronously from server route parameters.
3. **Zero-Flash State Hydration**: `InflowDashboard` receives `initialAccount` directly from route params rather than defaulting to hardcoded `"r9spoort1"`, eliminating hydration flashes and avoiding race condition fetches.

## Technical Context

- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui Light Mode (Constitution Principle X)
- **Database**: SQLite with `better-sqlite3` (`data/inflow.db`)
- **Key Modules**:
  - `src/app/page.tsx`: Root Account Selector Hub component.
  - `src/app/[account]/page.tsx`: Dynamic route matching `/@{username}` and passing `initialAccount`.
  - `src/components/inflow-dashboard.tsx`: Workspace component refactored for synchronous `initialAccount` initialization and route-aware sidebar switching.
  - `src/components/account-selector-hub.tsx`: Dedicated clean light-mode Account Selector component.

## Constitution Check

- **Principle I (Spec-Driven Development)**: Follows specify -> plan -> tasks -> implement -> converge.
- **Principle V (RTL Typography)**: Full RTL support with Vazirmatn font.
- **Principle VI (Multi-Tenant User Authentication & Minimalist Page Entity)**: Validates session and tenancy authorization before displaying pages.
- **Principle X (Unified Design System & shadcn/ui Light Mode)**: Strict clean white/zinc aesthetic, no neon or dark mode.
- **Principle XII (Canonical @username URL Scoping & Zero-Flash Account Selection)**: Directly implements Principle XII.

## Phase Plan

### Phase 1: Route Structure & Account Selector Component
- Implement `AccountSelectorHub` component displaying cards for each assigned account with avatar, username, follower count, and bot status.
- Update `src/app/page.tsx` to query authenticated user's assigned accounts and render `AccountSelectorHub` (or `EmptyTenancyView`).
- Create `src/app/[account]/page.tsx` to handle dynamic account segments, decode URI components (handling `@` and `%40`), validate account tenancy, and render `InflowDashboard` with `initialAccount`.

### Phase 2: Refactor InflowDashboard for Route & State Synchronicity
- Remove hardcoded `"r9spoort1"` default state in `InflowDashboard`.
- Accept `initialAccount` prop and initialize `currentAccount` synchronously with it.
- Update sidebar account switcher to navigate via `router.push('/@' + newUsername)`.
- Ensure post deep linking (`?post=...`) works cleanly on `/@{username}`.

### Phase 3: Verification & Convergence
- Test `/` without path: shows Account Selector Hub.
- Test `/@mahdiketabdar`: renders Mahdi's dashboard directly with zero flash.
- Test browser refresh on `/@mahdiketabdar`: stays on Mahdi's page without showing any other account.
- Test switching to another account: routes to `/@{other}`.
- Run `npm run build` and ensure clean compile.
