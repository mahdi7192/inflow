# Research & Architecture Decisions: User Authentication and Multi-Account Assignment

**Feature**: `002-user-auth-assignment`
**Date**: 2026-10-18
**Status**: Completed

---

## 1. Authentication & Session Strategy

### Decision
Use database-backed session tokens stored in secure, `httpOnly`, `sameSite=lax` cookies, managed directly via SQLite (`user_sessions` table) and Next.js Route Handlers / Server Utilities.

### Rationale
- **Instant Revocation**: If a Superadmin suspends a user or revokes an account assignment, the session or tenancy check can be immediately invalidated or re-evaluated without waiting for a stateless JWT to expire.
- **Single Source of Truth**: SQLite WAL mode in `data/inflow.db` handles concurrent reads at sub-millisecond latency. Checking an indexed `session_token` takes <1ms.
- **Zero Heavy External Dependencies**: Does not require external auth services (NextAuth, Supabase, Auth0) that add runtime bloat, external network calls, or compatibility hurdles with Next.js 16 and Turbopack.
- **Total Control**: Clean integration with existing `db.ts` architecture and Next.js App Router patterns.

### Alternatives Considered
- **Stateless JWTs in Cookies**: Rejected because revoking a suspended user's token or handling immediate account reassignment requires a token blocklist, essentially recreating a session database with additional cryptographic complexity.
- **NextAuth.js / Auth.js**: Rejected due to frequent breaking changes in Next.js 15/16 App Router integrations, unnecessary database adapters, and excess bundle weight for a strictly scoped 2-role Control Plane.

---

## 2. Password Hashing & Security

### Decision
Use Node.js native `crypto.scrypt` (or `crypto.scryptSync` with salt) with 64-byte key length and high cost parameters, formatted as `salt:derivedKeyHex`.

### Rationale
- **Zero Native Build Dependencies**: Avoids `bcrypt` or `argon2` native C++ bindings that frequently fail compilation during CI/CD, Dockerization, or Node version upgrades (e.g. Node 20 to Node 26).
- **Cryptographic Strength**: `scrypt` is memory-hard and recommended by modern security guidelines (OWASP) for password storage.
- **Performance**: Password verification executes in ~50-80ms on standard CPUs, fast enough for interactive logins while sufficiently expensive to thwart offline dictionary attacks.

### Alternatives Considered
- **bcrypt**: Requires node-gyp / native C++ compilation or slow JavaScript fallback (`bcryptjs`).
- **pbkdf2**: Standard, but less resistant to GPU/ASIC attacks compared to memory-hard `scrypt`.

---

## 3. Multi-Tenant Account Assignment Architecture (1-to-N)

### Decision
Implement a dedicated `user_accounts` mapping table with a `UNIQUE(account_username)` constraint:
```sql
CREATE TABLE IF NOT EXISTS user_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_username TEXT UNIQUE NOT NULL REFERENCES accounts(username) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_accounts_user_id ON user_accounts(user_id);
```

### Rationale
- **Enforces Constitution Principle VI**: "The relationship between users and Instagram accounts is strictly 1-to-N: each user can manage one or more Instagram accounts."
- **Integrity Guarantee**: The `UNIQUE(account_username)` constraint structurally forbids an Instagram account from being assigned to more than one user at any time.
- **Flexible Management**: Superadmins can reassign an account to another user in a single atomic transaction.
- **Clean Empty-State Handling**: If a user has no rows in `user_accounts`, they are safely treated as an unassigned tenant and shown the empty-state guide.

### Alternatives Considered
- **`owner_user_id` column on `accounts`**: Simple, but less flexible for auditing assignment history and creates circular foreign key dependencies with seed data. The dedicated association table keeps core `accounts` schema clean while strictly enforcing 1-to-N via unique constraint.

---

## 4. Role-Based Access Control (RBAC) & Route Boundaries

### Decision
Enforce a two-tier RBAC model with server-side tenancy verification:
1. **Roles**:
   - `superadmin`: Access to the `/backoffice` administrative plane, user management, and global view of all accounts.
   - `tenant`: Access strictly to `/` (Control Plane dashboard) filtered to accounts mapped in `user_accounts`.
2. **Server-Side Verification**:
   - `requireAuth()` helper: Validates session cookie, returns current user and authorized accounts.
   - `requireSuperadmin()` helper: Throws or returns 403 Forbidden if user role is not `superadmin`.
   - `validateAccountOwnership(accountUsername)`: Validates that the logged-in user is either a `superadmin` or has an active assignment for that account.

### Rationale
- Guarantees complete tenant isolation.
- Prevents horizontal privilege escalation (tenant querying another tenant's Instagram page or logs).
- Prevents vertical privilege escalation (tenant accessing Back-Office routes or user CRUD APIs).

---

## 5. First-Boot Superadmin Provisioning

### Decision
Automatically seed a default Superadmin profile upon database initialization if the `users` table is empty:
- Default username: `admin`
- Default initial password: Configured via environment variable `INITIAL_ADMIN_PASSWORD` (defaulting to `Admin@inFlow2026!` if not set).
- Role: `superadmin`
- Existing demo accounts (`r9spoort1`, `inflow.shop`) are automatically assigned to this default admin so existing development/demo workflows remain fully functional out of the box.

### Rationale
- Zero manual database migration or shell execution required when booting the system.
- Completely non-disruptive to existing features and tests.

---

## 6. RTL Typography & Multi-Language Standards

### Decision
Extend `src/lib/i18n.ts` with comprehensive localization dictionaries for Persian (`fa`), Arabic (`ar`), and English (`en`), covering:
- Authentication forms (username, password, login button, errors, logout).
- Account selector states (assigned accounts, empty state).
- Back-Office management (users list, create user modal, account assignment dialog, status toggles, deletion confirmation).
- Strict RTL alignment (`dir="rtl"`) and Vazirmatn font styling for Persian and Arabic.
