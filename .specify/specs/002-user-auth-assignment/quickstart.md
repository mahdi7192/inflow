# Quickstart & Verification Guide: User Authentication and Multi-Account Assignment

**Feature**: `002-user-auth-assignment`
**Target**: Next.js 16 Control Plane (`http://localhost:3000`)

---

## 1. Prerequisites & Environment Setup

1. Node.js v20+ / v26+ and `pnpm` (v11+).
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start development server:
   ```bash
   pnpm dev
   ```
   Or verify production build:
   ```bash
   pnpm build
   ```

---

## 2. End-to-End Verification Scenarios

### Scenario 1: Initial Bootstrapping & Superadmin Login
1. Open browser in incognito/private mode to `http://localhost:3000`.
2. **Expected Outcome**: Automatically redirected to `http://localhost:3000/login`.
3. Submit default credentials:
   - **Username**: `admin`
   - **Password**: `Admin@inFlow2026!`
4. **Expected Outcome**:
   - HTTP-only cookie `inflow_session` is set.
   - User lands on `/` dashboard.
   - Header shows `admin (Superadmin)` badge, Back-Office navigation button, and account switcher listing all connected accounts.

---

### Scenario 2: Superadmin Back-Office & Tenant Creation
1. While logged in as `admin`, click the **Back-Office** button in the header (or navigate to `/backoffice`).
2. Click **Create User**:
   - **Username**: `tenant_sport`
   - **Display Name**: `Sport Page Manager`
   - **Password**: `SportPass2026!`
   - **Role**: `tenant`
3. Click Save. The user appears in the Back-Office user table.
4. Click **Manage Accounts** for `tenant_sport`:
   - Select `@r9spoort1`.
   - Save assignments.
5. **Expected Outcome**: `tenant_sport` is recorded with 1 assigned account (`@r9spoort1`).

---

### Scenario 3: Tenant Login & Strict Tenancy Isolation
1. Click **Logout** from the header menu.
2. Log in using tenant credentials:
   - **Username**: `tenant_sport`
   - **Password**: `SportPass2026!`
3. **Expected Outcome**:
   - User is redirected to `/`.
   - Header shows `Sport Page Manager (Tenant)`.
   - Account selector contains **ONLY** `@r9spoort1`. The second account (`@inflow.shop`) is completely hidden from the dropdown.

---

### Scenario 4: Horizontal Privilege Escalation Barrier
1. While logged in as `tenant_sport`, open the browser console or run `curl`:
   ```bash
   curl -b "inflow_session=<tenant_session>" http://localhost:3000/api/posts?account=inflow.shop
   ```
2. **Expected Outcome**:
   - Server responds with HTTP `403 Forbidden` (`Forbidden: You do not have access to this Instagram account`).
   - Zero posts, comments, or configurations for `@inflow.shop` leak to `tenant_sport`.

---

### Scenario 5: User Suspension & Instant Revocation
1. Log back in as `admin` at `/login`.
2. In Back-Office, toggle status for `tenant_sport` to `suspended`.
3. In another browser/window where `tenant_sport` was logged in, refresh the page or trigger an action.
4. **Expected Outcome**:
   - Immediate rejection with HTTP 403 / redirect to `/login` with an account suspension alert.

---

### Scenario 6: BiDi RTL & Persian Localization
1. On the `/login` screen or dashboard header, click the language switcher and select **فارسی** (Persian).
2. **Expected Outcome**:
   - Document root updates to `dir="rtl"`.
   - Vazirmatn font styling renders.
   - All login cards, form fields, badges, and Back-Office labels cleanly display in Persian.
