# API Contract: Authentication & Session Endpoints

**Feature**: `002-user-auth-assignment`
**BasePath**: `/api/auth`
**Content-Type**: `application/json`

---

## 1. POST `/api/auth/login`

Authenticates a user and issues an HTTP-only session cookie.

### Request
```json
{
  "username": "client_username",
  "password": "SecurePassword123!"
}
```

### Response: 200 OK
Sets cookie: `inflow_session=<session_token>; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`

```json
{
  "success": true,
  "user": {
    "id": 2,
    "username": "client_username",
    "display_name": "Client Name",
    "role": "tenant",
    "assigned_accounts": ["r9spoort1"]
  }
}
```

### Response: 400 Bad Request
```json
{
  "success": false,
  "error": "Username and password are required"
}
```

### Response: 401 Unauthorized
```json
{
  "success": false,
  "error": "Invalid username or password"
}
```

### Response: 403 Forbidden (Suspended Account)
```json
{
  "success": false,
  "error": "Account has been suspended. Please contact administrator."
}
```

---

## 2. POST `/api/auth/logout`

Terminates the active session and clears the session cookie.

### Request
Empty payload. Cookie `inflow_session` must be present.

### Response: 200 OK
Clears cookie `inflow_session` (Max-Age=0).
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 3. GET `/api/auth/me`

Retrieves the currently authenticated user's profile and authorized Instagram accounts.

### Request Headers
`Cookie: inflow_session=<session_token>`

### Response: 200 OK
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "display_name": "Platform Administrator",
    "role": "superadmin",
    "assigned_accounts": ["r9spoort1", "inflow.shop"]
  }
}
```

### Response: 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthenticated"
}
```
