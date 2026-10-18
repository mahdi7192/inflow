# Tasks: Root Account Selector Hub, @username Canonical Routing & Zero-Flash Workspace Hydration

**Branch**: `008-account-routing-and-selector` | **Spec**: [.specify/specs/008-account-routing-and-selector/spec.md]

## Tasks List

- [x] **T001**: [P1] Create `src/components/account-selector-hub.tsx` implementing a clean, responsive account selector card grid using shadcn/ui Light Mode primitives and RTL typography.
- [x] **T002**: [P1] Refactor `src/app/page.tsx` into the Root Account Selector Hub that fetches user's assigned accounts on the server and renders `AccountSelectorHub` (or `EmptyTenancyView` if no accounts assigned).
- [x] **T003**: [P1] Create `src/app/[account]/page.tsx` to handle dynamic account segments matching `/@{username}`, canonicalize bare `/username` to `/@username`, validate user tenancy, and render `InflowDashboard` with `initialAccount`.
- [x] **T004**: [P1] Refactor `src/components/inflow-dashboard.tsx` to accept `initialAccount?: string`, initialize state synchronously without default `"r9spoort1"` flash, and avoid duplicate or premature account fetching.
- [x] **T005**: [P1] Update sidebar navigation account switching in `src/components/sidebar-nav.tsx` and `InflowDashboard` to navigate via `router.push('/@' + targetAccount)` instead of client-state-only mutation.
- [x] **T006**: [P2] Verify post deep linking (`?post={shortcode}`) and query parameters seamlessly preserve route context on `/@{username}`.
- [x] **T007**: [P1] Execute Next.js production build (`npm run build`), restart `inflow.service`, and verify all acceptance scenarios.
