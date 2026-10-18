# Quickstart & Verification Guide: Admin Page Management & Per-Page MCP Tokens

**Feature Branch**: `006-admin-page-mcp-tokens`
**Status**: Ready for Planning

This guide outlines end-to-end verification scenarios to test the minimalist page creation, per-page token generation, Hermes MCP config copying, and zero-leakage tenant boundaries.

---

## Prerequisites

1. inFlow local dev server running (`pnpm dev` on `http://localhost:3000`).
2. Superadmin session or credentials (`admin` / `admin123`).
3. Standard tenant session or credentials (`tenant1` / `password123`).

---

## Scenario 1: Minimalist Page Registration & Dedicated Token Generation (Superadmin)

### Step 1: Register Page with ID Only
Login as Superadmin and send `POST /api/backoffice/accounts` (or use Back-Office UI -> "Add Page"):

```bash
curl -X POST http://localhost:3000/api/backoffice/accounts \
  -H "Content-Type: application/json" \
  -b "inflow_session=<SUPERADMIN_SESSION_TOKEN>" \
  -d '{
    "username": "quick_store_test",
    "user_id": null
  }'
```

### Expected Outcome:
- HTTP `201 Created`
- Response contains `{ "success": true, "account": { "username": "quick_store_test" }, "bot_binding": { "api_token": "inf_..." } }`.
- Database has `accounts` record with empty avatar/bio and `account_bot_bindings` with unique `inf_...` token.

---

## Scenario 2: Inspect Hermes MCP Configuration & Token Rotation

### Step 1: Fetch Hermes MCP Config
```bash
curl -s http://localhost:3000/api/backoffice/accounts/quick_store_test/token \
  -b "inflow_session=<SUPERADMIN_SESSION_TOKEN>"
```

### Expected Outcome:
- HTTP `200 OK`
- Returns valid `hermes_mcp_config` object ready to paste into Hermes bot configuration.

### Step 2: Regenerate Token
```bash
curl -X POST http://localhost:3000/api/backoffice/accounts/quick_store_test/token \
  -b "inflow_session=<SUPERADMIN_SESSION_TOKEN>"
```

### Expected Outcome:
- HTTP `200 OK`
- Returns `new_api_token: "inf_..."`. Old token is invalidated immediately.

---

## Scenario 3: Verify Inbound Inter-Plane Token Authentication

### Step 1: Poll automations with valid new token
```bash
curl -s "http://localhost:3000/api/agent/poll?account=quick_store_test" \
  -H "Authorization: Bearer <NEW_API_TOKEN>"
```
- Expected: HTTP `200 OK` with active automations.

### Step 2: Poll automations with old (revoked) token
```bash
curl -s "http://localhost:3000/api/agent/poll?account=quick_store_test" \
  -H "Authorization: Bearer <OLD_REVOKED_TOKEN>"
```
- Expected: HTTP `401 Unauthorized`.

---

## Scenario 4: Verify Zero-Leakage & Access Control for Standard Tenant

### Step 1: Tenant attempts to access Back-Office API
```bash
curl -s http://localhost:3000/api/backoffice/accounts \
  -b "inflow_session=<TENANT_SESSION_TOKEN>"
```
- Expected: HTTP `403 Forbidden` (`{ "success": false, "error": "Access denied" }`).

### Step 2: Tenant fetches `/api/accounts`
```bash
curl -s http://localhost:3000/api/accounts \
  -b "inflow_session=<TENANT_SESSION_TOKEN>"
```
- Expected: Returns only assigned accounts. Crucially, fields `api_token`, `bot_binding`, or secret keys are **completely omitted** from the response.

---

## Scenario 5: Lazy Metadata Enrichment by Agent

### Step 1: Worker Agent syncs updated profile data
```bash
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <NEW_API_TOKEN>" \
  -d '{
    "account_username": "quick_store_test",
    "profile": {
      "display_name": "Quick Store Official",
      "avatar_url": "https://example.com/avatar.jpg",
      "bio": "Best products in town",
      "followers_text": "12.5K"
    },
    "posts": []
  }'
```

### Expected Outcome:
- Account in database now displays `display_name = "Quick Store Official"`, `followers_text = "12.5K"`.
- Dashboard UI seamlessly renders the newly enriched profile data.
