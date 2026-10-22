# Feature Specification: B2B Services Persona & Dedicated Playbooks (Spec 019 - Intermediate Phase)

**Feature Branch**: `019-b2b-services-persona-playbooks`
**Created**: 2026-10-22
**Status**: In Implementation (Intermediate Phase between Step 2 and Step 3)
**Design Reference**: `/DESIGN.md` & `/docs/design-system.md` & `/ROADMAP.md`

---

## 1. Problem Statement & User Insight
In Spec 018, account personas were divided strictly into a binary model:
1. `business` (فروشگاه و بیزینس)
2. `creator` (کریتور و بلاگر)

However, service-based businesses, consulting firms, staffing agencies, digital marketing & content production agencies, and medical/legal practices do NOT operate like e-commerce stores:
- They do not have fixed product prices or add-to-cart checkouts on their websites.
- They do not deal with physical inventory, sizes, colors, or postal shipping (تیپاکس/پست).
- Their primary Instagram conversion goals are:
  1. **Needs Assessment & Brief Intake (`brief_qualifier`)**: Asking smart discovery questions and logging client scope.
  2. **Contact Capture & Meeting Booking (`consultation_booking`)**: Capturing phone numbers or sending meeting booking links (Calendly/Jalaseh).
  3. **Portfolio & Base Rates Showcase (`portfolio_showcase`)**: Sharing PDF portfolio/work sample links and high-level engagement process.

---

## 2. Architecture & Data Model Evolution

### 2.1. Account Persona Triad (`src/lib/playbooks.ts` & `accounts.account_persona`)
Transform `AccountPersona` from a binary type to a 3-way discriminator:
- `"ecommerce"` (فروشگاه و کالا): Online shops, physical products, direct checkout, shipping.
- `"service_b2b"` (خدمات و مشاوره): Agencies, consultants, clinics, B2B services, project-based businesses.
- `"creator"` (کریتور و مدیا): Personal brands, content creators, bloggers, sponsorship monetization.
*Backwards Compatibility:* Any existing account with `account_persona = 'business'` is gracefully treated as `"ecommerce"`.

### 2.2. Dedicated B2B Playbooks
1. `brief_qualifier` (نیازسنجی و دریافت بریف):
   - Comment AI: Directs to DM with a consultative note.
   - DM AI: Acts as a senior account executive, asking discovery questions, capturing scope and requirements into `captured_leads`.
2. `consultation_booking` (رزرو جلسه مشاوره و تماس):
   - Captures contact details or sends calendar booking links without robotic friction.
3. `portfolio_showcase` (ارسال نمونه‌کار و کاتالوگ خدمات):
   - Delivers portfolio link with a brief explanation of engagement tiers.

### 2.3. Contextual Cheat Sheet Chips for B2B
Tailored quick chips in `PostPlaybookDrawer`:
- `+ فرآیند شروع همکاری`: Steps from discovery call to contract.
- `+ شرایط و تعرفه پایه`: Pricing starting points and customized quote guidelines.
- `+ لینک پورتفولیو و رزومه`: Direct link to PDF/case studies.
- `+ اطلاعات مورد نیاز بریف`: Required questions from prospective clients.

---

## 3. UI/UX Specifications
- Persona switcher in `inflow-dashboard.tsx` and `post-playbook-drawer.tsx` displays 3 distinct tabs:
  - 🛍️ فروشگاه و کالا (`ecommerce`)
  - 💼 خدمات و مشاوره (`service_b2b`)
  - 🌟 کریتور و مدیا (`creator`)
- The active persona filters available playbooks in the slide-over drawer and sets contextual chips and placeholders.
- 100% key parity in `fa.json`, `en.json`, and `ar.json`.
