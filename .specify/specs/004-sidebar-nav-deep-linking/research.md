# Technical Research & Architecture Decisions: Feature 004

**Feature**: Sidebar Navigation, Topbar Decluttering & Deep Linking
**Branch**: `004-sidebar-nav-deep-linking`
**Date**: 2026-10-18

## 1. App Shell Architecture: Persistent Desktop Sidebar & Mobile Drawer

### Decision
Implement a responsive App Shell architecture where:
* Desktop viewports (`>= 1024px` / `lg`): A fixed or sticky Sidebar Navigation (`w-64`, `shrink-0`) anchors to the start edge (`start-0`, meaning right in Persian/Arabic RTL and left in English LTR).
* Mobile and tablet viewports (`< 1024px`): The sidebar collapses into an accessible slide-over drawer (Sheet) triggered by a minimalist menu icon button in the slim top header.
* Main Content Area: Expands smoothly (`flex-1 min-w-0`), retaining the existing max-width container (`max-w-6xl`) for content readability.

### Rationale
* The previous top navigation bar contained 7 disparate action groups (Account switcher, Language strip, View toggles, Hermes API button, Add Post button, Sync button, User profile & logout), causing severe cognitive load and horizontal overflow on medium screens.
* Moving account context, sync triggers, worker modal access, and profile actions to a vertical sidebar matches enterprise SaaS standards (GitHub, Vercel, Supabase, Linear) and leaves the top header clean and focused.
* Using Tailwind's logical direction utilities (`start-0`, `ps-*`, `pe-*`, `ms-*`, `me-*`, and `rtl:*`) ensures the sidebar naturally flips between right-anchored (RTL) and left-anchored (LTR) without layout breakage.

### Alternatives Considered
* *Floating Navigation Bar*: Evaluated keeping a top bar with nested overflow dropdowns. Rejected because nested menus obscure frequent actions (like Sync and Account Switching) and do not provide the requested dedicated side nav.
* *Icon-Only Collapsed Sidebar*: Evaluated a narrow 64px icon-only rail. Rejected because Persian/Arabic labels and multi-account context require readable typography.

---

## 2. URL Deep-Linking & History State Synchronization

### Decision
Synchronize the active post configuration view using the URL search parameter `?post={shortcode}` via Next.js App Router navigation (`useSearchParams`, `useRouter`, and `usePathname` wrapped in a React `<Suspense>` boundary):
* When an operator clicks a post card in the catalog: Execute `router.push(`/?post=${shortcode}`)` (or replace if desired), which updates the browser address bar and sets the detail view state.
* On initial render or hard page refresh (`F5` / `Cmd+R`): Read `searchParams.get("post")`. If present and valid in the loaded posts catalog, initialize directly into `activeDetailPost`.
* When navigating back to the catalog: Call `handleBackToList()` which navigates to `/?account=${currentAccount}` or `/`, clearing the `post` param.
* Browser Back/Forward navigation: Reactively listened to via `useSearchParams()`, transitioning seamlessly between catalog and post detail views.

### Rationale
* Resolves the primary user complaint: *"آنتخاب آیتم ها چرا آدرس رو تغییر نمیده رفرش میکنم میره صفحه لیست دوباره"*.
* Standard search parameter synchronization allows operators to bookmark specific post automations, share direct links with team members, and refresh without losing their editing context.
* Wrapping `InflowDashboard` in a `<Suspense>` boundary in `src/app/page.tsx` satisfies Next.js 16 App Router requirements for client-side search parameter parsing during static/server rendering.

### Alternatives Considered
* *Sub-routes (`/posts/[shortcode]`)*: Evaluated creating a dedicated page route. Rejected because the dashboard relies on cached account metadata and live poll state; query parameters allow seamless in-memory switching with zero redundant API re-fetching while maintaining full URL shareability and refresh persistence.
* *Local Storage Session Cache*: Evaluated saving the last selected post ID in `localStorage`. Rejected because it does not update the browser URL, does not support multiple browser tabs, and does not allow link sharing.

---

## 3. Unified Language Dropdown Menu

### Decision
Create a shared, standalone client primitive `LanguageDropdown` in `src/components/ui/language-dropdown.tsx`:
* **Trigger Element**: A compact button displaying a `Globe` icon, the localized label of the currently active language (e.g. "فارسی", "العربية", "English"), and a subtle `ChevronDown` indicator.
* **Dropdown Menu**: An accessible popover card containing the list of supported locales with checkmark indicators for the active selection.
* **Universal Usage**: Integrated into both the Dashboard top bar and the Login page (`src/app/login/page.tsx`), completely eliminating the old multi-button strip (`[FA] [EN] [AR]`).

### Rationale
* Directly fulfills user feedback: *"زبان همه رو نشون نده فقط زبان انتخاب شده و به صورت منو باشه و با صفحه لاگین دو دیزاین متفوات داره"*.
* Conserves substantial horizontal space in the navigation bar while maintaining full keyboard and click accessibility.
* Enforces Constitution Principle X (unified design system across all views).

### Alternatives Considered
* *Native HTML `<select>` element*: Evaluated for minimal bundle size. Rejected because native select styling cannot be seamlessly matched to shadcn/ui Light Mode standards and renders inconsistently across mobile Safari and Windows Chrome.

---

## 4. Content Toolbar View Mode Toggle & Manual Post Removal

### Decision
* **Relocate View Mode Toggle**: Move the Cards/Grid switcher (`LayoutGrid` and `List` icons) from the top navigation bar into the catalog toolbar, placed beside the search input and the filter tabs (`همه پست‌ها`, `روشن`, `خاموش`, `ریلزها`, `پست‌ها`).
* **Remove Manual Post Creation**: Delete the "ثبت پست / ریلز" button and its associated `AddPostModal` from `src/components/inflow-dashboard.tsx`. Inflow relies entirely on the automated Instagram Sync mechanism (`/api/sync`) to ingest reels and posts.

### Rationale
* View presentation is a property of the content list, not the global application layout. Placing it next to the search and filter controls provides a unified content control bar.
* Manual post creation was confusing to operators because Instagram media IDs and shortcodes are generated by Instagram's servers, and inFlow's execution plane worker ingests them automatically. Removing manual registration prevents state desynchronization.
