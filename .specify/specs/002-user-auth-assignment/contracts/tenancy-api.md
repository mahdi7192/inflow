# API Contract: Tenancy Authorization Rules on Data Endpoints

**Feature**: `002-user-auth-assignment`
**Scope**: Existing Control Plane data endpoints

---

## 1. Tenancy Enforcement Model

Every authenticated request undergoes tenancy verification:
1. **Superadmin Bypass**: Users with `role === 'superadmin'` have global read/write access across all accounts.
2. **Tenant Scoping**: Users with `role === 'tenant'` are restricted to accounts listed in their `user_accounts` table.
3. **Execution Plane Isolation**: Automated worker bots (`Hermes Agent`) authenticate via scoped inter-plane tokens (Constitution Principle VIII), validating that the worker's token matches the specific target `account_username`.

---

## 2. Protected Endpoints & Tenancy Rules

### 2.1 GET `/api/accounts`
- **Superadmin**: Returns all connected Instagram accounts.
- **Tenant**: Returns only Instagram accounts assigned to the current user in `user_accounts`.
- **Unauthenticated**: Returns 401 Unauthorized.

### 2.2 GET `/api/posts?account={username}`
- **Superadmin**: Access granted for any valid account username.
- **Tenant**:
  - If `{username}` is assigned to the logged-in user: Returns 200 OK with post list.
  - If `{username}` is NOT assigned to the user: Returns 403 Forbidden:
    ```json
    {
      "success": false,
      "error": "Forbidden: You do not have access to this Instagram account"
    }
    ```

### 2.3 POST / PATCH `/api/posts/[shortcode]`
- Looks up the `account_username` for the post shortcode in the database.
- Verifies that the authenticated user has tenancy for that `account_username`.
- If unauthorized: Returns 403 Forbidden.

### 2.4 POST `/api/sync`
- Request body: `{ "account": "username", ... }`
- Verifies that the authenticated user has tenancy for the targeted account.
- If unauthorized: Returns 403 Forbidden.
