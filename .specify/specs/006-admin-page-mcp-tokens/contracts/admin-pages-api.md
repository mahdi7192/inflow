# API Contract: Back-Office Instagram Page Management

**Endpoint Group**: `/api/backoffice/accounts`
**Authentication**: Required (Session Cookie, `role: 'superadmin'`)
**Protocol**: REST / JSON over HTTP

---

## 1. List All Pages & Assignments

### `GET /api/backoffice/accounts`

Retrieves all registered Instagram pages, their current assigned tenant user (if any), and their Hermes bot binding summary.

#### Response: `200 OK`

```json
{
  "success": true,
  "accounts": [
    {
      "id": 1,
      "username": "r9spoort1",
      "display_name": "R9 Sport Baghdad",
      "avatar_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
      "status": "active",
      "followers_text": "42.8K",
      "posts_count": 24,
      "assigned_user": {
        "id": 2,
        "username": "sport_manager",
        "display_name": "Sport Store Manager"
      },
      "bot_binding": {
        "bot_profile_id": "hermes-r9spoort1",
        "has_token": true,
        "last_heartbeat_at": "2026-10-18 17:45:00",
        "created_at": "2026-10-18 10:00:00"
      },
      "created_at": "2026-10-18 10:00:00"
    },
    {
      "id": 2,
      "username": "minimal_shop",
      "display_name": "",
      "avatar_url": "",
      "status": "active",
      "followers_text": null,
      "posts_count": 0,
      "assigned_user": null,
      "bot_binding": {
        "bot_profile_id": "hermes-minimal_shop",
        "has_token": true,
        "last_heartbeat_at": null,
        "created_at": "2026-10-18 18:00:00"
      },
      "created_at": "2026-10-18 18:00:00"
    }
  ]
}
```

---

## 2. Register New Page (Minimalist Registration)

### `POST /api/backoffice/accounts`

Creates a new Instagram account record using only the username/handle, provisions the bot binding with a dedicated token, and optionally assigns it to a user.

#### Request Body

```json
{
  "username": "fashion_boutique",
  "user_id": 2
}
```

* `username` (string, required): Valid Instagram handle (1-30 chars, lowercase, letters, numbers, periods, underscores).
* `user_id` (number, optional): User ID to immediately assign the page to. If omitted, page remains unassigned.

#### Response: `201 Created`

```json
{
  "success": true,
  "message": "Page registered successfully",
  "account": {
    "id": 3,
    "username": "fashion_boutique",
    "status": "active",
    "created_at": "2026-10-18 18:15:00"
  },
  "bot_binding": {
    "bot_profile_id": "hermes-fashion_boutique",
    "api_token": "inf_3f789d20c54a8b1e4f6291a0c8d7e6f54b3a2c1e0f9d8c7b"
  },
  "assigned_user_id": 2
}
```

#### Error Responses

- `400 Bad Request`: `{ "success": false, "error": "Invalid Instagram username" }`
- `409 Conflict`: `{ "success": false, "error": "Instagram page already registered" }`
- `403 Forbidden`: Non-superadmin access attempt.

---

## 3. Assign / Reassign Page to User

### `PUT /api/backoffice/accounts/[username]/assignment`

Sets or changes the tenant user who owns this page. Passing `null` for `user_id` unassigns the page.

#### Request Body

```json
{
  "user_id": 3
}
```

#### Response: `200 OK`

```json
{
  "success": true,
  "message": "Account assigned successfully",
  "account_username": "fashion_boutique",
  "assigned_user_id": 3
}
```

---

## 4. Delete Page

### `DELETE /api/backoffice/accounts/[username]`

Permanently deletes an Instagram page, cascaded bindings, posts, and logs.

#### Response: `200 OK`

```json
{
  "success": true,
  "message": "Account fashion_boutique deleted successfully"
}
```
