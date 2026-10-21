# Tasks: Native Self-Contained Instagram Engine with Zero-Password Security & Direct In-App Login

**Input**: Design documents from `.specify/specs/014-native-instagram-engine/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`  
**Tests**: Verified via end-to-end integration and runnable validation scenarios (`quickstart.md`).  
**Organization**: Tasks are grouped strictly by user story to enable independent implementation and testing.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, environment, and dependencies for the native engine.

- [x] T001 Initialize Python native engine directory with dependencies (`instagrapi`, `fastapi`, `uvicorn`, `pycryptodomex`, `httpx`) in `engine/requirements.txt`
- [x] T002 [P] Configure environment variables (`SESSION_VAULT_SECRET`, `AI_PROVIDER`, `AI_API_KEY`) in `.env.example`
- [x] T003 [P] Create database migration runner for session vault in `scripts/migrate-session-vault.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Setup SQLite schema migration in `src/lib/db.ts` to create `account_sessions` table and refactor `accounts` (add `session_status`, `proxy_url`, `last_sync_at`, retire legacy bot columns)
- [x] T005 [P] Implement AES-256-GCM session vault encryption/decryption module in `engine/session_vault.py`
- [x] T006 [P] Implement TypeScript session vault decryption helper in `src/lib/session-vault.ts`
- [x] T007 [P] Implement token-bucket rate limiter with human jitter in `engine/rate_limiter.py`
- [x] T008 Implement base `InstagramClient` wrapper with mobile TLS impersonation in `engine/instagram_client.py`

**Checkpoint**: Foundation ready — User Story implementation can now begin.

---

## Phase 3: User Story 1 - Direct In-App Login & Encrypted Session Vault (Priority: P1) 🎯 MVP

**Goal**: Operator logs into Instagram directly inside an in-app dialog using username & password with zero raw password storage on disk.

**Independent Test**: Connect an account via the modal; verify encrypted session is saved to `account_sessions` table and zero plain-text passwords exist anywhere on disk or in the database.

- [x] T009 [US1] Implement direct login endpoint `POST /api/v1/auth/login` in `engine/server.py` with in-memory password handshake and zero-password vault creation
- [x] T010 [P] [US1] Implement 2FA challenge resolution endpoint `POST /api/v1/auth/verify-2fa` in `engine/server.py`
- [x] T011 [US1] Create Next.js API route proxy `src/app/api/auth/instagram-login/route.ts` bridging frontend to the internal engine login endpoint
- [x] T012 [P] [US1] Build direct in-app login modal with username, password, proxy, and inline 2FA prompt in `src/components/auth/account-login-dialog.tsx`
- [x] T013 [US1] Integrate `AccountLoginDialog` into workspace navigation and account onboarding flows in `src/components/layout/sidebar-nav.tsx`

**Checkpoint**: User Story 1 is fully functional and testable independently (MVP ready).

---

## Phase 4: User Story 2 - High-Visibility Session Health & 1-Click Re-Login (Priority: P1)

**Goal**: Replace all legacy "Bot / VNC" terminology with a clean session health indicator and provide instant 1-click re-login when a session expires.

**Independent Test**: Simulate an expired session (`LoginRequired`); verify the top badge turns red (`🔴 نشست منقضی شده`), displays an alert banner, and clicking "ورود مجدد" opens the modal pre-filled for instant re-login.

- [x] T014 [P] [US2] Implement session health telemetry endpoint `GET /api/v1/accounts/{username}/health` in `engine/server.py`
- [x] T015 [US2] Create unified `SessionHealthBadge` component in `src/components/layout/session-health-badge.tsx` replacing legacy `BotToolbarButton`
- [x] T016 [US2] Remove legacy bot/VNC components (`vnc-viewer-modal.tsx`, `bot-monitor-drawer.tsx`, `bot-screen.tsx`) and clean up `src/components/shell/workspace-shell.tsx`
- [x] T017 [US2] Implement non-dismissible session expiry alert banner with 1-click re-login trigger in `src/components/layout/session-expiry-banner.tsx`
- [x] T018 [US2] Handle `LoginRequired` exception interception in `engine/worker.py` to transition `session_status` to `reauth_required`

**Checkpoint**: User Stories 1 and 2 work seamlessly together with zero bot terminology.

---

## Phase 5: User Story 3 - Native Comments & Real-Time Direct Messaging (Priority: P1)

**Goal**: Full native comment reading, auto-replying, and direct messaging via mobile endpoints and MQTT real-time push.

**Independent Test**: Post a comment and send a direct message on Instagram; verify both are detected within 15 seconds, public replies/DMs are sent, and idempotency locks prevent duplicates.

- [x] T019 [US3] Implement native Smart Polling loop for active post comments with randomized human jitter in `engine/worker.py`
- [x] T020 [P] [US3] Implement comment reply submission with `comment_logs` idempotency locks in `engine/instagram_client.py`
- [x] T021 [US3] Implement real-time MQTT message listener and fallback inbox polling in `engine/mqtt_listener.py`
- [x] T022 [P] [US3] Implement direct message dispatch endpoint `POST /api/v1/inbox/send` in `engine/server.py`
- [x] T023 [US3] Connect real-time inbox view in `src/app/[account]/dms/page.tsx` to native engine endpoints

**Checkpoint**: Comment automation and direct messaging operate 100% natively without external browsers.

---

## Phase 6: User Story 4 - Direct AI API Key Configuration & Contextual Reply (Priority: P2)

**Goal**: Direct LLM API completion (OpenAI / Gemini) for semantic trigger evaluation and response drafting without external AI agents.

**Independent Test**: Configure an AI API key; post a question comment; verify the engine generates a natural contextual reply and delivers it.

- [x] T024 [P] [US4] Implement direct LLM completion service in `engine/ai_service.py` supporting OpenAI and Gemini API keys with 4.5s timeout
- [x] T025 [P] [US4] Implement TypeScript AI client helper in `src/lib/ai-client.ts`
- [x] T026 [US4] Implement AI API key settings configuration UI and database persistence in `src/app/settings/ai/page.tsx`
- [x] T027 [US4] Integrate AI context evaluation into comment processing pipeline with automatic static fallback in `engine/worker.py`

**Checkpoint**: AI-driven responses function directly via standard API keys.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: UI localization, code cleanup, and end-to-end validation.

- [x] T028 [P] Add localized Persian, English, and Arabic translations for session health and login dialogs in `src/locales/fa.json`, `en.json`, `ar.json`
- [x] T029 Clean up deprecated Hermes API routes (`src/app/api/agent/poll/route.ts`, `src/app/api/posts/[shortcode]/logs/route.ts`)
- [x] T030 Execute end-to-end quickstart validation scenarios per `quickstart.md`
- [x] T031 Run ESLint and TypeScript compilation validation (`pnpm lint && pnpm build`)

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: Independent — can begin immediately.
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS** all user stories.
- **User Story 1 (Phase 3 - MVP)**: Depends on Phase 2. Delivers working direct in-app login and encrypted vault.
- **User Story 2 (Phase 4)**: Depends on US1 completion. Purges bot UI and establishes session health badges.
- **User Story 3 (Phase 5)**: Depends on US1 completion. Enables native comments and MQTT DMs.
- **User Story 4 (Phase 6)**: Depends on US3 completion. Connects AI API completions to the comment/DM pipeline.
- **Polish (Phase 7)**: Depends on all user stories.

### Parallel Opportunities
- In Phase 1: `T002` and `T003` run in parallel.
- In Phase 2: `T005`, `T006`, and `T007` run in parallel.
- In Phase 3 (US1): `T010` and `T012` run in parallel with backend endpoints.
- In Phase 4 (US2): `T014`, `T015`, and `T017` run in parallel.
- In Phase 5 (US3): `T020` and `T022` run in parallel.
- In Phase 6 (US4): `T024` and `T025` run in parallel.
