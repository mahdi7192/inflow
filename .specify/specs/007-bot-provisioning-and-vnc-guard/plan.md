# Implementation Plan: Dedicated Bot Provisioning, Lifecycle Management & On-Demand VNC Guard

**Branch**: `007-bot-provisioning-and-vnc-guard` | **Date**: 2026-10-18 | **Spec**: [.specify/specs/007-bot-provisioning-and-vnc-guard/spec.md](file:///Users/mahdi.ketabdar/dev/inFlow/.specify/specs/007-bot-provisioning-and-vnc-guard/spec.md)

**Input**: Feature specification from `.specify/specs/007-bot-provisioning-and-vnc-guard/spec.md`

## Summary

This feature implements the complete lifecycle, self-service onboarding wizard, dynamic on-demand VNC Guard, and continuous top-toolbar monitoring for isolated Hermes bots in inFlow.

When an administrator assigns a newly registered page to a tenant, the page begins in the `unprovisioned` state. When the tenant opens this page in their dashboard, they are greeted by an intuitive, reassuring `BotSetupWizard` highlighting the dedicated cloud sandbox, isolated IP, and zero cross-tenant contamination. Clicking "راه‌اندازی ربات اختصاصی" dispatches a provisioning command to the server orchestrator to create the dedicated Hermes profile (`inflow_<username>`) with an isolated virtual display (TigerVNC/Xfce) and headed Google Chrome.

For authentic Instagram login, the server launches an ephemeral VNC Guard session (`vnc_guard.py`) secured by a one-time token and a strict 10-minute auto-termination timer, rendering the interactive browser directly inside a modal in the inFlow UI. Once login is completed and cookies are harvested, the bot transitions to `live`, the VNC port closes immediately, and routine lightweight automation begins. A permanent Bot Status button with live color-coded badges is added to the top toolbar, opening a `BotMonitorDrawer` for real-time telemetry and on-demand browser inspection.

---

## Technical Context

**Language/Version**: TypeScript (ESM) / Node.js v20+ & Python 3.10+
**Primary Dependencies**: Next.js 16 (App Router), `better-sqlite3`, `lucide-react`, `tailwindcss` v4, `websockify`, `novnc`, `curl_cffi`, `httpx`
**Storage**: SQLite database (`data/inflow.db`) with WAL mode
**Testing**: Scenario-driven integration testing via `quickstart.md` and automated API tests
**Target Platform**: Linux Server (Ubuntu 22.04/24.04) with TigerVNC/Xfce virtual display + modern web browsers
**Project Type**: Next.js Web Control Plane + Python Worker & Server Orchestrator
**Performance Goals**: < 100ms API response time, instant state transitions in UI, zero permanent open VNC ports
**Constraints**: Zero technical leakage to tenants (Principle IX), strict shadcn/ui Light Mode (Principle X), native Persian RTL (Principle V), 100% ephemeral VNC access (Principle XI)
**Scale/Scope**: Supports dozens of concurrently provisioned isolated bot profiles per Linux server with negligible idle overhead

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliance Assessment | Status |
| :--- | :--- | :--- |
| **I. Spec-Driven Development** | Feature strictly planned via Spec-Kit (`spec.md` -> `plan.md` -> `tasks.md`). | **PASS** |
| **II. Control vs Execution Plane** | inFlow remains purely Control Plane; profile execution and browser sessions occur exclusively on Linux execution plane. | **PASS** |
| **III. Absolute Idempotency & Safety** | Comment locks and bot lifecycle transitions maintain strict uniqueness and ACID transaction integrity. | **PASS** |
| **IV. Package & Runtime Standards** | `pnpm` exclusively used; `better-sqlite3` maintained in `serverExternalPackages`. | **PASS** |
| **V. RTL Typography & BiDi** | All Persian UI copy uses explicit `dir="rtl"` and `Vazirmatn` font with clean punctuation. | **PASS** |
| **VI. Tenancy & Minimalist Page** | Superadmin creates minimalist page; tenant self-provisions bot without technical keys. | **PASS** |
| **VII. Strict 1-to-1 Page-to-Bot Binding** | Each account maps to exactly one `inflow_<username>` profile with dedicated user data directory. | **PASS** |
| **VIII. Per-Page Scoped Tokens** | Dedicated tokens injected into profile during provisioning. | **PASS** |
| **IX. Zero-Leakage Abstraction** | Tenants never see raw VNC ports, Unix paths, or master keys; only user-friendly controls. | **PASS** |
| **X. Unified Design System (Light Mode)** | UI strictly uses pure white surfaces, zinc borders, and solid dark elements from `src/components/ui/`. | **PASS** |
| **XI. Bot Lifecycle & VNC Guard** | Deterministic state machine, 10-minute auto-terminating VNC Guard, persistent toolbar monitor. | **PASS** |

---

## Project Structure

### Documentation (this feature)

```text
.specify/specs/007-bot-provisioning-and-vnc-guard/
├── spec.md              # Requirements and user stories
├── plan.md              # Implementation plan (this file)
├── research.md          # Architectural research & decisions
├── data-model.md        # Database schema modifications & state machine
├── quickstart.md        # Step-by-step verification guide
├── contracts/           # API and IPC contracts
│   ├── bot-api.yaml     # REST API contract for Control Plane
│   └── orchestrator-ipc.yaml # CLI contract for execution server
└── tasks.md             # Ordered actionable tasks (generated by /speckit-tasks)
```

### Source Code Modifications & Additions

```text
data/
└── inflow.db                      # Database file with updated columns and table

scripts/
└── hermes_orchestrator.py         # Python orchestrator CLI for profile creation & VNC Guard

src/
├── app/
│   ├── api/
│   │   └── bot/
│   │       ├── provision/route.ts       # POST /api/bot/provision
│   │       ├── status/route.ts          # GET /api/bot/status
│   │       ├── vnc-session/route.ts     # POST/DELETE /api/bot/vnc-session
│   │       ├── session-harvested/route.ts # POST /api/bot/session-harvested
│   │       └── state/route.ts           # POST /api/bot/state (pause/resume/retry)
│   └── layout.tsx
├── components/
│   ├── bot/
│   │   ├── bot-setup-wizard.tsx         # Onboarding wizard for unprovisioned accounts
│   │   ├── bot-toolbar-button.tsx       # Top navbar Bot status button & indicator
│   │   ├── bot-monitor-drawer.tsx       # Slide-over telemetry drawer
│   │   └── vnc-viewer-modal.tsx         # Embedded noVNC modal with countdown timer
│   ├── inflow-dashboard.tsx             # Integrated with BotSetupWizard & BotToolbarButton
│   └── sidebar-nav.tsx
└── lib/
    ├── db.ts                            # Updated schema migrations for bot columns & logs
    ├── server-orchestrator.ts           # Orchestrator client driver (local/remote/mock)
    └── i18n.ts                          # Persian/English localization strings for bot UI
```

**Structure Decision**: Standard Next.js App Router structure with clean component modularization under `src/components/bot/` and server-side driver in `src/lib/server-orchestrator.ts`.

---

## Complexity Tracking

*No violations detected. Design fully conforms to the inFlow Constitution.*
