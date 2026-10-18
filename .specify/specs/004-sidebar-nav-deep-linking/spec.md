# Feature Specification: Sidebar Navigation, Topbar Decluttering & Deep Linking

**Feature Branch**: `004-sidebar-nav-deep-linking`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "این صفحه بخصوص اون تب بار بالا شلوغ شده بهتره خلوتش کنی نیاز نیست دیزاینهای متفاوت داشته باشیم اون نحوه نمایش باید بیاد پایین تو قسمت کانتنت ثبت ریلز نداریم اصلا سینک رو داریم فقط زبان همه رو نشون نده فقط زبان انتخاب شده و به صورت منو باشه و با صفحه لاگین دو دیزاین متفوات داره کلا من ترجیح میدم یک ساید نو داشته باشیم آنتخاب آیتم ها چرا آدرس رو تغییر نمیده رفرش میکنم میره صفحه لیست دوباره"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Clean Sidebar Navigation Shell (Priority: P1)

As an operator or tenant managing automated Instagram pages, I want a clean, dedicated Sidebar Navigation (Side Nav) on the side of the screen rather than an overcrowded top header, so that my workspace is structured, uncluttered, and easily navigable.

**Why this priority**: Resolves severe visual congestion in the top navigation bar, establishes a modern SaaS app shell, and provides scalable space for Instagram account switching, sync status, and system tools.

**Independent Test**: Can be tested independently by loading the dashboard on desktop and mobile screens, verifying that the sidebar contains the brand logo, account switcher, primary navigation links, sync trigger, and user logout, while the top area remains minimal and focused.

**Acceptance Scenarios**:

1. **Given** an operator accessing the dashboard on a desktop display, **When** the page renders, **Then** a persistent, sleek sidebar appears on the start edge (right side in Persian/Arabic RTL, left side in English LTR) containing brand identity, active account context, and navigation actions, while the top bar is stripped of redundant buttons.
2. **Given** a user on a mobile or narrow viewport (< 1024px), **When** interacting with the dashboard, **Then** the sidebar is neatly tucked into a collapsible drawer/sheet accessible via a clean menu trigger in the header bar.
3. **Given** a user switching between Persian, Arabic, and English, **When** language toggles, **Then** the sidebar smoothly repositions to the appropriate reading edge (RTL right edge vs. LTR left edge) with fully aligned text and icons.

---

### User Story 2 - URL Deep-Linking & State Persistence for Post Selection (Priority: P1)

As an operator configuring automation rules for a post or reel, I want the browser URL to update whenever I select a post, so that refreshing the page, bookmarking, or using browser back/forward buttons keeps me on the post's configuration screen instead of throwing me back to the full list.

**Why this priority**: Solves a major workflow frustration where refreshing the browser during editing or log inspection abruptly resets state to the catalog list, losing context.

**Independent Test**: Can be tested independently by clicking any post card, observing that the URL updates with the post parameter (e.g. `?post=DehQhnjoEcr`), refreshing the browser page, and verifying that the post detail configuration view immediately re-opens. Clicking the back button removes the parameter and returns to the catalog.

**Acceptance Scenarios**:

1. **Given** an operator viewing the catalog of posts, **When** they click on any post or reel card, **Then** the browser address bar updates to include the post's shortcode identifier (e.g. `?post={shortcode}`) and the configuration detail view opens.
2. **Given** an operator actively viewing a post detail view with a shortcode in the URL, **When** they refresh the browser page (F5 / Cmd+R), **Then** the application initializes directly into that post's detail view without returning to the catalog list.
3. **Given** an operator on a post detail view, **When** they click the "Back" button or use their browser's native Back button, **Then** the URL returns to the base dashboard path and the catalog list displays.

---

### User Story 3 - Unified Language Switcher Menu (Priority: P2)

As a multilingual user navigating between the Login page and the Main Dashboard, I want a single, consistent Language Dropdown Menu that only displays the currently active language on its trigger, rather than cluttering the screen with buttons for every available language.

**Why this priority**: Eliminates visual discrepancy between the login screen and the dashboard, removes unnecessary buttons from the top bar, and establishes a unified language switching component across all views.

**Independent Test**: Can be tested independently by checking the language selector on both `/login` and `/`, confirming that both interfaces use the exact same compact dropdown component displaying only the current language, and that selecting a language smoothly updates the locale and direction.

**Acceptance Scenarios**:

1. **Given** a user viewing either the Login page or the Dashboard, **When** looking at the language selector, **Then** only the currently active language (e.g. "فارسی") is shown on the trigger button with a globe icon and dropdown chevron.
2. **Given** an open language dropdown menu, **When** the user clicks an alternate language (Persian, Arabic, or English), **Then** the menu closes, the active language updates immediately across the interface, the preference is saved to persistent storage, and the layout direction updates (RTL/LTR).
3. **Given** both the Login page (`/login`) and the Main Dashboard (`/`), **When** visually compared, **Then** the language switcher exhibits identical styling, tokens, and interaction patterns.

---

### User Story 4 - Content Toolbar View Mode Toggle & Manual Post Creation Removal (Priority: P2)

As an operator managing incoming Instagram media, I want the view presentation toggle (cards vs. grid) to be located in the content toolbar next to search and filters, and I want manual post creation removed since all posts are ingested through Instagram synchronization.

**Why this priority**: Reflects inFlow's architectural role as an automated Control Plane where content is ingested through the execution plane/sync, and clusters view formatting controls where users naturally look for them.

**Independent Test**: Can be tested independently by inspecting the top header to ensure manual post registration and view mode buttons are removed, and verifying that the cards/grid toggle is located in the content filter bar next to search and filter tabs.

**Acceptance Scenarios**:

1. **Given** the content toolbar above the posts catalog, **When** viewed by the user, **Then** the card/grid layout toggle is positioned adjacent to the search input and filter tabs.
2. **Given** the dashboard navigation, **When** inspected, **Then** the "Register Post/Reel" (ثبت پست / ریلز) button and modal are completely removed.
3. **Given** the "Sync" action in the sidebar or toolbar, **When** clicked, **Then** the platform initiates post synchronization from Instagram and updates the catalog.

---

### Edge Cases

- **Invalid or Deleted Shortcode in URL**: If the URL contains `?post=invalid_code` that does not exist in the database, the system must display a clear, user-friendly notice and fall back gracefully to the catalog list without crashing.
- **Account Switching while Post Detail is Open**: When switching the active Instagram account in the sidebar while viewing a post detail, the application must reset the selected post URL parameter if the post belongs to the previous account.
- **BiDi (RTL/LTR) Sidebar Transitions**: The sidebar must flip from the right side (RTL for Persian/Arabic) to the left side (LTR for English) seamlessly without content overlap or layout reflow issues.
- **Browser History Traversal**: Rapidly clicking the browser's native Back and Forward buttons must properly transition between post detail views and the main catalog without stale states.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a dedicated Sidebar Navigation (Side Nav) layout component for the dashboard, positioned on the reading edge (right side in RTL, left side in LTR) for desktop viewports (width >= 1024px).
- **FR-002**: System MUST house the following elements inside the sidebar:
  - Official inFlow brand mark
  - Connected Instagram Account selector / switcher
  - Primary navigation links (Catalog, Hermes Agent API info modal, Back-Office link for Superadmins)
  - Instagram Sync button with progress indicator
  - User identity badge and Logout action
- **FR-003**: System MUST provide a responsive mobile drawer/sheet that displays the sidebar navigation on viewports narrower than 1024px, toggled via a clean menu button in the top bar.
- **FR-004**: System MUST declutter the top header bar, retaining only essential elements (such as page title / context and the unified language dropdown menu).
- **FR-005**: System MUST synchronize the selected post state with the browser URL address bar using a query parameter (e.g. `?post={shortcode}`).
- **FR-006**: System MUST parse the URL query parameter on page load or refresh, immediately rendering the corresponding post configuration detail view if the shortcode exists.
- **FR-007**: System MUST provide a unified, compact Language Dropdown Menu component that displays only the currently active language on its trigger button with an icon and chevron, opening a dropdown list of available languages upon click.
- **FR-008**: System MUST utilize the identical Language Dropdown Menu component on both the Login screen (`/login`) and the Main Dashboard (`/`), removing the inconsistent multi-button language selector.
- **FR-009**: System MUST move the catalog view mode toggle (Cards vs. Grid) from the top header into the content toolbar, positioned alongside the search input and filter tabs.
- **FR-010**: System MUST remove all UI controls, buttons, and modals for manual post/reel registration (such as "ثبت پست / ریلز" and `AddPostModal`), enforcing Instagram Sync as the exclusive ingestion channel.
- **FR-011**: All new and refactored UI components MUST strictly comply with Constitution Principle X (shadcn/ui Light Mode standards) and Constitution Principle V (Persian/Arabic RTL typography with Vazirmatn font).

### Key Entities

- **Sidebar Navigation Shell**: The layout container providing persistent navigation structure on desktop and drawer-based access on mobile.
- **Post URL Deep Link**: The URL query parameter `?post={shortcode}` representing the active post detail view in browser history.
- **Unified Language Dropdown**: A standardized client component managing active language state, local storage persistence, and document direction.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of post selections update the browser address bar, and a hard page refresh on any post detail URL (`?post={shortcode}`) reloads directly into the post configuration view without returning to the catalog list.
- **SC-002**: The top header bar button count on desktop is reduced by at least 70% (no manual post creation buttons, no view mode toggle buttons, no multi-language button strips).
- **SC-003**: The Language Dropdown Menu component is 100% shared and identical in appearance between `/login` and `/`.
- **SC-004**: Zero manual post registration buttons or modals exist in the application interface.
- **SC-005**: The sidebar layout operates with full RTL/LTR responsiveness, correctly flipping sides when switching between Persian/Arabic and English without breaking layout or horizontal scroll.
- **SC-006**: The entire test suite and production build (`pnpm build` and `pnpm lint`) pass with zero errors.

## Assumptions

- Next.js App Router query parameter management (`useSearchParams` and `useRouter` / `window.history.pushState`) will be used to manage URL deep linking without full page reloads during in-app navigation.
- The default view mode (Cards) remains the standard view, with the toggle available in the content toolbar for users who prefer Grid view.
- User authorization, tenant isolation, and session authentication remain governed by existing server guards (Constitution Principle VI).
