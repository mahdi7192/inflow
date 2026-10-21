# Implementation Plan: Direct Native Instagram Integration, Session Health & Zero-Bot UX

**Branch**: `014-native-instagram-engine` | **Date**: 2026-10-21 (Updated) | **Spec**: [spec.md](spec.md)

**Input**: User feedback: "دیگه اون ربات بالا سمت چپ اشتباهه، چیزی به اسم ربات دیگه نداریم. فلو لاگین دیگه اونجوری نیست باید یوزر پس بده و اونجوری لاگین کنه. کل فلو های دیگه از جمله پیام دادن دایرکت دادن کامنت دادن ریپلای کردن خوندن کامنت ها از طریق mqtt و همه اینها انجام بشه. فقط مشخص مشخص باشه که لاگین هستیم و اگه لاگ اوت شده بود خطا بده تا دوباره بشه لاگین کرد. ایجنت هوش مصنوعی که دیگه نداریم ولی api key , کلید برای استفاده از هوش مصنوعی داریم."

---

## 1. Summary

This plan executes the complete transition to a **Direct Native Instagram Engine**:
1. **Zero-Bot Standard**: Replaces the legacy "ربات: متصل / VNC Guard" button with a clear **Session Health Badge** (`🟢 نشست فعال` / `🔴 نیاز به ورود مجدد`). Deletes all legacy VNC/Hermes UI elements.
2. **Direct In-App Modal Login**: Operator inputs Instagram username and password into a clean modal. The engine authenticates via mobile TLS handshake, stores encrypted cookies in `account_sessions`, and wipes the raw password from memory.
3. **Full Native Protocol & MQTT**: All operations (reading posts, comments, sending replies, and reading/sending DMs) run natively via Instagram mobile API endpoints and real-time MQTT push.
4. **Session Expiry Warning & 1-Click Re-Login**: Instant detection of `LoginRequired` with prominent red indicator and 1-click re-authentication.
5. **Direct AI API Key Client**: Evaluates semantic triggers and generates contextual responses directly via OpenAI/Gemini API keys without external agents.

---

## 2. Technical Context

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui.
- **Engine**: Python 3.10+ with `uv` (`instagrapi`, `curl_cffi`, `fastapi`, `uvicorn`, `pycryptodomex`).
- **Database**: SQLite 3 (`data/inflow.db`) with `accounts`, `account_sessions` (encrypted vault), `posts`, `comment_logs`.
- **AI Provider**: Direct HTTP client calling OpenAI (`gpt-4o-mini`) or Google Gemini API via `AI_API_KEY`.
- **Security Constraints**: Zero password storage on disk/database. Strict multi-tenant isolation.

---

## 3. Constitution Check

| Principle | Requirement | Status | Compliance Details |
| :--- | :--- | :--- | :--- |
| **I. Spec-Driven Development** | Full spec, plan, tasks required before code | **PASS** | `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md` fully updated. |
| **II. Idempotency Over Everything** | `comment_id` unique locks to prevent double-reply | **PASS** | Native worker enforces strict idempotency on `comment_logs`. |
| **III. Persian & RTL Standards** | RTL alignment, `Vazirmatn`, `<bdi>` isolation | **PASS** | In-app login modal, session status badge, and toasts follow Persian RTL standards. |
| **IV. shadcn/ui Light Mode** | Pure white/zinc aesthetics, zero glowing dark blobs | **PASS** | Replaces old bot styling with clean shadcn/ui session health badge. |
| **VI. Multi-Tenancy & RBAC** | Strict tenant isolation | **PASS** | Account ownership verified on every action; sessions isolated per tenant. |

---

## 4. Project Structure & Code Changes

```text
src/
├── components/
│   ├── layout/
│   │   └── session-health-badge.tsx   # Replaces legacy BotToolbarButton (Green/Red session indicator)
│   └── auth/
│       └── account-login-dialog.tsx   # Direct in-app username/password login modal with 2FA
├── lib/
│   ├── ai-client.ts                   # Direct OpenAI/Gemini API caller
│   └── session-vault.ts               # AES-256-GCM encryption/decryption utilities
└── app/
    └── api/
        ├── auth/instagram-login/route.ts   # In-memory handshake endpoint
        └── ai/generate-reply/route.ts      # Direct AI completion endpoint

engine/
├── worker.py                          # Smart Polling & MQTT real-time message handler
├── session_vault.py                   # Python AES-256-GCM vault manager
├── instagram_client.py                # Mobile protocol client wrapper
└── ai_service.py                      # Direct LLM completion helper
```
