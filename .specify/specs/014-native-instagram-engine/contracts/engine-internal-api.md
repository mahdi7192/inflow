# Contract: Direct Native Engine API & Session Management

**Feature**: `014-native-instagram-engine`  
**Protocol**: HTTP/1.1 REST (Local IPC)  
**Base URL**: `http://127.0.0.1:8765/api/v1`

---

## 1. Direct Credential Login (In-Memory Handshake)

### `POST /auth/login`
Logs into an Instagram account using provided credentials. Password is strictly volatile in-memory and never stored.

#### Request Body
```json
{
  "username": "mahdiketabdar",
  "password": "user_submitted_password",
  "proxy": "socks5://127.0.0.1:10808"
}
```

#### Responses

**200 OK — Session Created & Encrypted**
```json
{
  "success": true,
  "session_status": "active",
  "account": {
    "username": "mahdiketabdar",
    "display_name": "Mahdi Ketabdar",
    "followers_count": 511,
    "avatar_url": "https://scontent...jpg"
  }
}
```

**200 OK — 2FA Challenge Required**
```json
{
  "success": false,
  "session_status": "2fa_required",
  "challenge_type": "totp",
  "message": "کد تایید ۶ رقمی را وارد کنید."
}
```

**401 Unauthorized — Bad Password**
```json
{
  "success": false,
  "session_status": "unauthenticated",
  "error": "نام کاربری یا رمز عبور اشتباه است."
}
```

---

## 2. Session Health & Status Check

### `GET /accounts/{username}/health`

#### Response — Active Session
```json
{
  "account_username": "mahdiketabdar",
  "session_status": "active",
  "is_valid": true,
  "last_sync_at": "2026-10-21T13:42:00Z"
}
```

#### Response — Invalidation Detected (Triggers UI Re-Login Alert)
```json
{
  "account_username": "mahdiketabdar",
  "session_status": "reauth_required",
  "is_valid": false,
  "error_code": "LOGIN_REQUIRED",
  "message": "نشست اینستاگرام منقضی شده است. لطفاً مجدداً وارد شوید."
}
```

---

## 3. Real-Time Actions & Messaging

### `POST /comments/reply`
```json
{
  "media_id": "3510443965653624921_1984191325",
  "comment_pk": "18128250811849981",
  "text": "سلام! پاسخ در دایرکت خدمتتان ارسال شد 📩"
}
```

### `POST /inbox/send`
```json
{
  "username": "client_dev",
  "text": "سلام! قیمت محصول ۳۰ هزار دینار است 🌟"
}
```
