# Design System: inFlow Studio (Autonomous Social Revenue OS)

## 1. Visual Theme & Atmosphere

**inFlow Studio** is a high-craft, light-mode-first **Autonomous Social Revenue Operating System** built for two core personas: **E-Commerce / Business Pages (`business`)** and **Content Creators / Influencers (`creator`)**.

The design philosophy merges **Linear’s crisp engineering precision**, **Stripe’s analytical clarity**, and **Stan Store’s 1-click creator simplicity**. As the backend AI becomes more autonomous (reading captions, cheat sheets, live Instagram insights, and website footprints), the interface deliberately strips away multi-step flowcharts and complex forms in favor of **1-Click Playbooks**, a **Slide-Over Context Drawer**, and **Natural-Language Cheat Sheets**.

### Core Design Principles
1. **Zero-Config Autopilot Over Rule Builders**: Never force users into 4-step technical forms by default. Present 3 persona-aware **1-Click Playbooks** per post/story, keeping advanced granular triggers tucked inside an optional collapsible section.
2. **Adaptive Dual-Persona UI**: A single top-level persona toggle switches the workspace vocabulary, playbook presets, and accent semantics between **🛍️ Store & Business (`business`)** and **🎥 Creator & Influencer (`creator`)**.
3. **Context Without Clutter (Slide-Over Drawer)**: Clicking a post or story opens a contextual slide-over drawer (`PostPlaybookDrawer`) so operators can configure playbooks, add supplemental cheat-sheet notes, and inspect the post ROI funnel without losing their place in the catalog.
4. **Supplemental Knowledge via Cheat Sheets**: Information missing from Instagram captions (prices, sizes, stock, sponsor discount codes, download links) is captured in a single conversational **Cheat Sheet (`تقلب‌نامه پست`)** box with 1-click prompt chips.
5. **BiDi & RTL Native Craft**: Engineered natively for Persian (`dir="rtl"`) with `Vazirmatn` typography and tabular monospace numerals (`Geist Mono`) for metrics, shortcodes, and URLs.

---

## 2. Color Palette & Roles

The color system uses a soft alabaster studio canvas (`#F8FAFC`) so elevated pure-white cards (`#FFFFFF`) stand out through subtle luminance contrast and `1px` hairline borders rather than heavy drop shadows.

### Core Surface & Text Tokens
- **Studio Canvas Background (`--background`)**: `#F8FAFC` — Cool alabaster base canvas across all workspace views.
- **Elevated Surface / Card (`--card`)**: `#FFFFFF` — Pure crisp white for post cards, KPI funnel tiles, and slide-over drawers.
- **Interactive Card Hover (`--card-hover`)**: `#F8FAFC` — Subtle surface shift on hover.
- **Subtle Secondary Container (`--secondary`)**: `#F1F5F9` — Segmented controls, pill backgrounds, and muted badges.
- **Primary Ink (`--foreground`)**: `#09090B` — Deep obsidian ink for headings and primary labels (contrast > 18:1 on white).
- **Muted Slate (`--muted-foreground`)**: `#64748B` — Secondary descriptions, captions, and timestamps (contrast > 4.6:1 on white).
- **Hairline Border (`--border`)**: `#E2E8F0` — Crisp `1px` structural divider.
- **Subtle Divider (`--border-subtle`)**: `#F1F5F9` — Internal card section dividers.

### Brand & Semantic Persona Accents
- **Primary Action Ink (`--primary`)**: `#0F172A` (Hover: `#1E293B`, Foreground: `#FFFFFF`) — Primary CTA buttons and active navigation states.
- **Commerce / Business Persona Accent (`--persona-business`)**: `#4F46E5` (Indigo 600) — Soft fill `#EEF2FF`, border `#C7D2FE`. Used for Store Playbooks (`Auto-Seller`, `Lead Closer`), price tags, and checkout links.
- **Creator / Influencer Persona Accent (`--persona-creator`)**: `#E11D48` (Rose 600) — Soft fill `#FFF1F2`, border `#FECDD3`. Used for Creator Playbooks (`Viral Magnet`, `Creator Twin`, `Sponsor ROI`), story rings, and viral velocity badges.
- **Autopilot Active / Success (`--status-active`)**: `#059669` (Emerald 600) — Soft fill `#ECFDF5`, border `#A7F3D0`. Indicates active automation, verified follow-gate pass, and live webhook health.
- **Insights / Viral Warning (`--status-warning`)**: `#D97706` (Amber 600) — Soft fill `#FFFBEB`, border `#FDE68A`. Highlights pending follow-gates, skip-rate alerts, and viral velocity spikes.
- **Danger / Destructive (`--destructive`)**: `#DC2626` (Red 600) — Soft fill `#FEF2F2`, border `#FECACA`. Used for account deletion, error states, and spam moderation alerts.

---

## 3. Typography & Hierarchy

### Font Stack
- **Primary UI & Persian/Arabic (`--font-sans`)**: `Vazirmatn`, `Geist`, `-apple-system`, `sans-serif`.
- **Metrics, Shortcodes & Technical IDs (`--font-mono`)**: `Geist Mono`, `ui-monospace`, `monospace` with `font-variant-numeric: tabular-nums`.

### Typographic Scale
- **Workspace Title (`h1`)**: `1.125rem` (`18px`), `font-weight: 700`, `line-height: 1.4`, `letter-spacing: -0.01em`.
- **Section / Drawer Header (`h2`)**: `0.9375rem` (`15px`), `font-weight: 700`, `line-height: 1.4`.
- **Playbook Card Title (`h3`)**: `0.8125rem` (`13px`), `font-weight: 600`, `line-height: 1.4`.
- **Body & Cheat Sheet Input**: `0.75rem` (`12px`), `font-weight: 400`, `line-height: 1.65`.
- **KPI Hero Metric Value**: `1.375rem` (`22px`), `font-weight: 700`, `font-family: var(--font-mono)`, `tabular-nums`.
- **Micro Badge / Tag**: `0.6875rem` (`11px`), `font-weight: 500`, `line-height: 1.2`.

---

## 4. Layout, Spacing & Elevation

### Structural Grid
- **App Shell**: Persistent `264px` (`w-66`) right-docked sidebar in RTL (`left-docked` in LTR) + fluid main viewport with sticky translucent top bar (`h-14 bg-white/85 backdrop-blur-md border-b border-border`).
- **Content Container**: `max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6`.
- **Slide-Over Context Drawer (`PostPlaybookDrawer`)**: Fixed overlay drawer (`w-full max-w-xl bg-white shadow-2xl border-s border-border`) sliding in from the end edge (`inset-y-0 end-0 z-50`).

### Border Radius & Elevation Scale
- **Micro Controls & Badges**: `0.5rem` (`8px` / `rounded-lg`).
- **Standard Cards & Inputs**: `0.75rem` (`12px` / `rounded-xl`).
- **Hero Strips, Playbook Cards & Modals**: `1rem` (`16px` / `rounded-2xl`).
- **Elevation**:
  - Level 0 (Canvas): `#F8FAFC`
  - Level 1 (Card): `#FFFFFF` + `border: 1px solid #E2E8F0` + `0 1px 2px 0 rgba(15, 23, 42, 0.03)`
  - Level 2 (Interactive Hover): `border-color: #CBD5E1` + `0 4px 12px -2px rgba(15, 23, 42, 0.06)`
  - Level 3 (Slide-Over Drawer / Modal): `0 20px 40px -15px rgba(15, 23, 42, 0.14)`

---

## 5. Core Component Specifications

### 5.1. Adaptive Persona Switcher
Located in the account header strip. Allows instant switching between:
- **🛍️ فروشگاه و بیزینس (`business`)**: Indigo accent (`#4F46E5`), e-commerce playbooks, price/stock/checkout cheat sheet hints.
- **🎥 کریتور و بلاگر (`creator`)**: Rose accent (`#E11D48`), creator viral playbooks, file/link/sponsor cheat sheet hints.

### 5.2. True ROI Funnel & Insights Strip
A 4-stage horizontal metric ribbon powered by live SocialAPI.ai account and post insights (`GET /v1/platforms/instagram/accounts/{id}/summary` & `GET /v1/posts/{id}/metrics`):
1. **دیده‌شدن و ریچ (`Views & Reach`)**: Total views, reach, and average reel skip-rate (`Skip Rate`).
2. **تعامل و کامنت (`Comments & Replies`)**: Total comments processed and public AI/direct replies sent.
3. **مکالمه و سین دایرکت (`DMs & Read Rate`)**: Private replies + DMs sent and read status.
4. **رشد و تبدیل (`Follows & Link Clicks`)**: Net followers gained via Follow-Gate + tracked link clicks.

### 5.3. Active 24h Stories Strip
Horizontal scrollable row displaying active 24-hour Instagram stories (`GET /v1/platforms/instagram/accounts/{id}/stories`) with Instagram-gradient rings (`from-amber-500 via-rose-500 to-purple-600`), view/reply counters, and direct story reply automation status.

### 5.4. 1-Click Playbook Cards (`PlaybookSelector`)
Replaces multi-box forms with 3 goal-driven cards per persona:
- **Business Playbooks**:
  - `auto_seller` (**🛒 فروشنده خودکار و پاسخگوی قیمت**): AI comment teaser + AI DM sales consultant using Caption + Cheat Sheet + tracked link.
  - `viral_gate` (**🧲 قفل فالوورگیر و ارسال لینک/کاتالوگ**): Requires follow before unlocking DM link/catalog.
  - `lead_closer` (**🔥 شکارچی شماره تماس و ثبت سفارش**): Collects customer phone number, size/variant, and order intent in DM.
- **Creator Playbooks**:
  - `creator_magnet` (**🧲 بمب فالوور و ارسال لینک/فایل**): Keyword/all trigger + Follow-Gate + instant DM delivery of promised resource.
  - `creator_twin` (**💬 همزاد پاسخگو با لحن من**): Replies to fan comments and DMs in the creator's voice using Cheat Sheet Q&A.
  - `sponsor_campaign` (**🎯 کمپین اسپانسر و کد تخفیف**): Delivers sponsor link/code and tracks campaign engagement for sponsor ROI reports.

### 5.5. Supplemental Context Cheat Sheet (`تقلب‌نامه پست`)
A unified natural-language textarea accompanied by 1-click prompt chips (`+ قیمت و موجودی`, `+ لینک خرید/دانلود`, `+ سایز و رنگ‌بندی`, `+ کد تخفیف اسپانسر`). Anything entered here is stored in `posts.cheat_sheet` and injected as high-priority ground truth into both Comment AI and DM AI prompts.

---

## 6. Guardrails & Anti-Patterns

- **NEVER** introduce dark-mode-only hardcoded colors (`bg-zinc-950`, `text-white` on page canvas). All surfaces must adhere to the Studio Light palette.
- **NEVER** use physical directional classes (`ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `text-left`, `text-right`) for layout structure; always use logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `text-end`).
- **NEVER** overwhelm the default post configuration view with more than 3 primary visual blocks (Playbook Selector, Cheat Sheet + Target Link, and Optional Advanced Accordion).
