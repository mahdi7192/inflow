# Feature Specification: Migrate to shadcn/ui & Centralized Token Theming

**Feature Branch**: `003-shadcn-theming-migration`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "migrate to shadcn and set theming"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unified Visual Identity & Centralized Theme Tokens (Priority: P1)

As an operator, tenant, or administrator navigating between Login (`/login`), Main Dashboard (`/`), and Back-Office (`/backoffice`), I experience a consistent, high-end visual design where primary actions, card borders, focus rings, and typography share the same unified theme tokens.

**Why this priority**: Resolves the existing visual fragmentation between Feature 001 (monochrome Vercel style) and Feature 002 (Instagram purple/pink aesthetic), fulfilling Constitution Principle X.

**Independent Test**: Can be tested by navigating between `/login`, `/`, and `/backoffice`, verifying that all buttons, cards, and borders follow identical tokens, and that modifying `--primary` in `src/app/globals.css` propagates universally.

**Acceptance Scenarios**:

1. **Given** a user viewing `/login`, `/`, or `/backoffice`, **When** inspecting primary action buttons and inputs, **Then** all elements share identical radius, border contrast, focus ring styling, and primary brand colors.
2. **Given** the global stylesheet `globals.css`, **When** the `--primary` or `--card` theme token is updated, **Then** all pages reflect the change immediately without requiring component-level edits.

---

### User Story 2 - Standardized shadcn/ui Component Primitives (Priority: P1)

As a developer or AI coding agent implementing or maintaining features, I have access to clean, standardized, accessible UI primitives in `src/components/ui/` (`Button`, `Input`, `Card`, `Badge`, `Switch`, `Dialog`/Modal wrappers) so that I never write ad-hoc inline color palettes or custom button tags.

**Why this priority**: Guarantees code maintainability, reusability, and eliminates duplicate or divergent implementations across different features.

**Independent Test**: Can be tested by inspecting `src/components/ui/` to ensure all standard primitives are exported, have typed variants, and are imported by all application routes.

**Acceptance Scenarios**:

1. **Given** any form or modal in `/login`, `/`, or `/backoffice`, **When** examining the source code, **Then** all buttons and inputs are imported directly from `@/components/ui/` with semantic variant props (`default`, `outline`, `secondary`, `destructive`).
2. **Given** an invalid or disabled state, **When** rendered, **Then** the component displays appropriate accessibility attributes (`aria-disabled`, `disabled`) and consistent dimmed opacity.

---

### User Story 3 - Official inFlow Brand Mark & Header Consistency (Priority: P2)

As a user on any screen in the platform, I see the official inFlow brand mark (a minimalist monochrome black squircle with sleek typography) in the top navigation, completely replacing mismatched icons or the default Next.js/Vercel triangle logo.

**Why this priority**: Elevates inFlow from a generic boilerplate to a distinct, professional SaaS platform.

**Independent Test**: Can be tested by verifying the logo and header across all three main views (`/login`, `/`, `/backoffice`), confirming identical logo assets and sizing.

**Acceptance Scenarios**:

1. **Given** the Main Dashboard header (`/`), **When** viewed, **Then** the Vercel triangle icon is removed and replaced by the official inFlow brand mark.
2. **Given** the Back-Office header (`/backoffice`), **When** viewed, **Then** the header layout and brand identity match the dashboard and login screens.

---

### Edge Cases

- **BiDi (RTL/LTR) Alignment**: Icons inside buttons, inputs, and search bars must automatically flip padding and positioning when toggling between Persian (`fa`), Arabic (`ar`), and English (`en`).
- **Input Autofill States**: Browser autofill on credentials must not break the dark background or render unreadable white boxes in Chrome/Safari.
- **High-Density Displays**: Sub-pixel borders (`border-white/8`) and subtle ambient glows must render cleanly without flickering or color banding.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST establish a centralized semantic token palette in `src/app/globals.css` using CSS custom properties (at minimum: `--background`, `--foreground`, `--card`, `--card-hover`, `--border`, `--border-subtle`, `--primary`, `--primary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--destructive`, `--ring`).
- **FR-002**: System MUST add `components.json` at repository root specifying the standard shadcn/ui configuration (Tailwind v4, CSS variables enabled, path aliases for components and utils).
- **FR-003**: System MUST provide standardized, accessible UI primitives in `src/components/ui/` including:
  - `Button` (with variants: `default`, `secondary`, `outline`, `ghost`, `destructive`, and sizes: `sm`, `default`, `lg`, `icon`)
  - `Input` (with focus ring, placeholder styling, and icon addon support)
  - `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
  - `Badge` (with semantic status variants)
  - `Switch` (accessible toggle)
- **FR-004**: System MUST refactor the Login page (`src/app/login/page.tsx`) to replace raw HTML form elements with the standardized `Input`, `Button`, and `Card` primitives while retaining the ambient visual polish.
- **FR-005**: System MUST refactor the Main Dashboard (`src/components/inflow-dashboard.tsx`) and Back-Office views (`src/app/backoffice/backoffice-client.tsx`) to replace raw button/input implementations with standardized primitives.
- **FR-006**: System MUST standardize the official inFlow brand logo component (`src/components/ui/icons.tsx` or `src/components/ui/brand-logo.tsx`) and replace the Vercel triangle logo across the application.
- **FR-007**: All UI primitives MUST natively maintain compliance with Constitution Principle V (Persian/Arabic RTL support, Vazirmatn font, and correct bidirectional spacing).

### Key Entities

- **Semantic Theme Token**: A centralized CSS custom property defined in `globals.css` that maps a UI role (e.g. `--primary`, `--card`) to a specific color value.
- **UI Primitive**: A reusable, headless or styled component adhering to shadcn/ui patterns with type-safe props and CVA variant definitions.
- **Brand Mark**: The official vector graphic asset and typography representing the inFlow platform identity.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of interactive inputs, buttons, and cards across all application screens (`/login`, `/`, `/backoffice`) utilize the unified `src/components/ui/` primitives.
- **SC-002**: Zero instances of hardcoded ad-hoc background colors or rogue Vercel triangle logos remain in user-facing components.
- **SC-003**: Modifying a single CSS variable in `src/app/globals.css` (e.g. `--primary`) instantly cascades changes to all primary buttons and focus states platform-wide.
- **SC-004**: The complete test suite and production build (`pnpm build` and `pnpm lint`) execute with zero errors and zero warnings.

## Assumptions

- The project continues using Next.js 16 (App Router) and Tailwind CSS v4.
- Dark theme is the default mode for inFlow.
- Primitives will be implemented without adding heavy third-party runtime bundles, preserving sub-second build times.
