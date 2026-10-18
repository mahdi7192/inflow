# API Contract: Back-Office User Management & Assignment

**Feature**: `002-user-auth-assignment`
**BasePath**: `/api/backoffice`
**Authorization**: `superadmin` role required (HTTP 403 otherwise)
**Content-Type**: `application/json`

---

## 1. GET `/api/backoffice/users`

Lists all registered users along with their role, status, and assigned Instagram accounts.

### Response: 200 OK
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "username": "admin",
      "display_name": "Platform Administrator",
      "role": "superadmin",
      "status": "active",
      "assigned_accounts": ["r9spoort1", "inflow.shop"],
      "last_login_at": "2026-10-18 10:14:20",
      "created_at": "2026-10-18 09:00:00"
    },
    {
      "id": 2,
      "username": "sport_client",
      "display_name": "R9 Sport Store",
      "role": "tenant",
      "status": "active",
      "assigned_accounts": ["r9spoort1"],
      "last_login_at": null,
      "created_at": "2026-10-18 11:30:00"
    }
  ],
  "available_accounts": ["r9spoort1", "inflow.shop"]
}
```

---

## 2. POST `/api/backoffice/users`

Creates a new user profile with specified role and credentials.

### Request
```json
{
  "username": "fashion_client",
  "display_name": "Fashion Store Admin",
  "password": "TemporaryPassword123!",
  "role": "tenant"
}
```

### Response: 201 Created
```json
{
  "success": true,
  "user": {
    "id": 3,
    "username": "fashion_client",
    "display_name": "Fashion Store Admin",
    "role": "tenant",
    "status": "active",
    "assigned_accounts": [],
    "created_at": "2026-10-18 14:15:00"
  }
}
```

### Response: 409 Conflict (Duplicate Username)
```json
{
  "success": false,
  "error": "A user with this username already exists"
}
```

---

## 3. PATCH `/api/backoffice/users/[id]`

Updates an existing user's display name, password, or status (active/suspended).

### Request
```json
{
  "display_name": "Updated Fashion Admin",
  "status": "suspended",
  "password": "NewOptionalPassword123!"
}
```

### Response: 200 OK
```json
{
  "success": true,
  "user": {
    "id": 3,
    "username": "fashion_client",
    "display_name": "Updated Fashion Admin",
    "role": "tenant",
    "status": "suspended",
    "updated_at": "2026-10-18 14:20:00"
  }
}
```

### Response: 400 Bad Request
Attempting to suspend or demote the last remaining active superadmin:
```json
{
  "success": false,
  "error": "Cannot suspend or demote the only remaining active superadmin"
}
```

---

## 4. DELETE `/api/backoffice/users/[id]`

Removes a user account and deletes their active sessions.

### Response: 200 OK
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

### Response: 400 Bad Request
```json
{
  "success": false,
  "error": "Cannot delete the primary or sole superadmin account"
}
```

---

## 5. POST `/api/backoffice/users/[id]/assignments`

Replaces the list of Instagram accounts assigned to a user.

### Request
```json
{
  "account_usernames": ["r9spoort1"]
}
```

### Response: 200 OK
```json
{
  "success": true,
  "user_id": 2,
  "assigned_accounts": ["r9spoort1"]
}
```

### Response: 400 Bad Request
If an account is already assigned to another user, or if account username does not exist:
```json
{
  "success": false,
  "error": "Account r9spoort1 is currently assigned to another tenant. Unassign it first."
}
```
