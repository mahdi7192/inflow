# Implementation Plan: Local MCP Server & Agent Action Triggering

**Branch**: `005-local-mcp-server` | **Date**: 2026-10-18 | **Spec**: [.specify/specs/005-local-mcp-server/spec.md](file:///Users/mahdi.ketabdar/dev/inFlow/.specify/specs/005-local-mcp-server/spec.md)

**Input**: Feature specification from `.specify/specs/005-local-mcp-server/spec.md`

## Summary

Implement a local Model Context Protocol (MCP) server for `inFlow` conforming to the `2024-11-05` specification and JSON-RPC 2.0 standards over dual transports: HTTP/SSE route handlers (`/api/mcp` and `/api/mcp/sse`) and a local Stdio CLI bridge (`src/cli/mcp.ts`).

To solve the interaction gap where an operator clicks the "Sync" button in the dashboard, implement real-time Server-Sent Events (SSE) action dispatching (Option C). inFlow creates an asynchronous job record in SQLite (`agent_jobs`) and immediately streams a `sync_requested` notification down the connected AI agent's active SSE stream. The server-side AI agent acknowledges the event, performs external Instagram scraping in the Execution Plane, and ingests results back into inFlow via the `inflow_push_scraped_posts` MCP tool while strictly enforcing idempotency and tenant token isolation.

---

## Technical Context

**Language/Version**: TypeScript 5+ / Node.js 20+ (ESM native)

**Primary Dependencies**: Next.js 16 (App Router), `better-sqlite3`, shadcn/ui, lucide-react

**Storage**: SQLite (`data/inflow.db` with WAL mode enabled) extending `agent_jobs` and `account_bot_bindings`

**Testing**: cURL JSON-RPC scripts, MCP SSE stream validation, unit/integration verification via `quickstart.md`

**Target Platform**: Linux server & macOS local development environment

**Project Type**: Full-Stack SaaS Control Plane (Next.js web application + embedded MCP server)

**Performance Goals**:
- MCP tool listing (`tools/list`) response time < 300ms
- UI Sync button to agent SSE event stream latency < 100ms
- Scraped post batch ingestion of 100 items < 2 seconds in a single transaction

**Constraints**:
- Control Plane strictly isolated from Execution Plane (no browser automation or Instagram sessions inside Next.js per Constitution Principle II)
- Anti-shadowban idempotency locks enforced on every comment interaction per Constitution Principle III
- Dual transport compatibility: HTTP/SSE and Stdio per `mcp-server-protocol` guidelines

**Scale/Scope**: Multi-account support with 1-to-1 bot profile bindings and scoped bearer authentication

---

## Constitution Check

*GATE: All principles validated. Zero violations.*

| Principle | Status | Justification / Validation |
| :--- | :--- | :--- |
| **I. Spec-Driven Development** | PASS | Follows full SDD workflow (`/speckit-specify` -> `/speckit-plan` -> `/speckit-tasks` -> `/speckit-implement`). |
| **II. Control Plane Isolation** | PASS | inFlow only provides the MCP server, state management, and SSE stream. External scraping remains 100% in the AI agent Execution Plane. |
| **III. Absolute Idempotency** | PASS | `inflow_record_comment_interaction` strictly verifies `comment_id` uniqueness, preventing double-replying. |
| **IV. Package & Runtime Standards** | PASS | Uses `pnpm`, Next.js 16 App Router, and `better-sqlite3` in WAL mode. |
| **V. RTL Typography & BiDi** | PASS | Tool descriptions explicitly indicate "به تومان (in Toman)" and UI status indicators use Vazirmatn font. |
| **VI. Multi-Tenant Account Ownership** | PASS | Every MCP tool validates account access against authenticated user/bot tokens. |
| **VII. 1-to-1 Page-to-Bot Binding** | PASS | `account_bot_bindings` enforces unique 1-to-1 pairing between Instagram accounts and bot profiles. |
| **VIII. Scoped API Tokens & Webhooks** | PASS | Inbound MCP calls require scoped Bearer/API keys; outbound sync dispatch uses verified SSE streams. |
| **IX. Back-Office Administration** | PASS | Token and bot binding management resides in the administrative schema. |
| **X. Unified shadcn/ui Light Mode** | PASS | Sync button loading states and agent connectivity badges strictly adhere to zinc light mode. |

---

## Project Structure

### Documentation (this feature)

```text
.specify/specs/005-local-mcp-server/
├── plan.md                              # This implementation plan
├── research.md                          # Phase 0 architectural decisions and research
├── data-model.md                        # Phase 1 database schema extensions and state machine
├── quickstart.md                        # Phase 1 runnable verification procedures
├── checklists/
│   └── requirements.md                  # Quality requirements checklist
└── contracts/
    ├── mcp-jsonrpc-api.md               # JSON-RPC 2.0 core protocol specifications
    ├── agent-tools.md                   # Full MCP tool catalog and JSON schemas
    └── sync-dispatch-sse.md             # Real-time SSE stream protocol and event sequence
```

### Source Code Layout

```text
src/
├── app/
│   └── api/
│       ├── mcp/
│       │   ├── route.ts                 # HTTP GET (health/SSE) & POST (JSON-RPC 2.0)
│       │   └── sse/
│       │       └── route.ts             # Dedicated SSE stream endpoint (GET /api/mcp/sse)
│       └── sync/
│           ├── route.ts                 # Updated POST /api/sync (creates job & triggers SSE)
│           └── status/
│               └── route.ts             # GET /api/sync/status?account=... (job status for UI)
├── lib/
│   ├── db.ts                            # Extended schema: agent_jobs, account_bot_bindings
│   └── mcp/
│       ├── types.ts                     # MCP JSON-RPC 2.0 and tool schema types
│       ├── sse-manager.ts               # In-memory AgentStreamRegistry for SSE broadcasting
│       ├── tool-catalog.ts              # Declarations of all inflow_* tool schemas
│       ├── tool-executor.ts             # Handlers executing tools against SQLite
│       └── auth-guard.ts                # Token extraction and account tenancy verification
├── cli/
│   └── mcp.ts                           # Stdio CLI runner reading stdin / writing stdout
└── components/
    └── inflow-dashboard.tsx             # Updated handleSync with active job status indicator
```

---

## Phased Implementation Roadmap

### Phase 0: Foundations & Research (Completed)
- Completed `research.md` resolving MCP transport, SSE stream management, job queue state machine, and authentication patterns.

### Phase 1: Design & Contracts (Completed)
- Completed `data-model.md` specifying `agent_jobs` and `account_bot_bindings`.
- Completed `contracts/mcp-jsonrpc-api.md`, `contracts/agent-tools.md`, and `contracts/sync-dispatch-sse.md`.
- Completed `quickstart.md` defining step-by-step verification commands.

### Phase 2: Implementation Tasks (to be generated by `/speckit-tasks`)
1. Database migration: Initialize `agent_jobs` and `account_bot_bindings` in `src/lib/db.ts`.
2. MCP Core Engine: Implement `src/lib/mcp/types.ts`, `tool-catalog.ts`, `tool-executor.ts`, and `auth-guard.ts`.
3. Real-Time SSE Stream Manager: Implement `src/lib/mcp/sse-manager.ts` supporting connection tracking and event broadcasting.
4. HTTP/SSE API Routes: Implement `src/app/api/mcp/route.ts` and `src/app/api/mcp/sse/route.ts`.
5. Stdio CLI Bridge: Implement `src/cli/mcp.ts` for command-line sub-process execution.
6. Dashboard Sync Bridge: Update `src/app/api/sync/route.ts` to dispatch SSE events, create jobs, and expose job status in `inflow-dashboard.tsx`.
7. End-to-End Verification: Execute all scenarios from `quickstart.md`.
