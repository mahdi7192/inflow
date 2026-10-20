# Implementation Plan: Direct Message (DM) Automation Plugin with Knowledge & MCP Context

**Branch**: `011-dm-automation-plugin` | **Date**: 2026-10-20 | **Spec**: [.specify/specs/011-dm-automation-plugin/spec.md](file:///Users/mahdi.ketabdar/dev/inFlow/.specify/specs/011-dm-automation-plugin/spec.md)

**Input**: Feature specification from `.specify/specs/011-dm-automation-plugin/spec.md`

---

## Summary

This feature implements the **Direct Message (DM) Automation Plugin** as the second official automation plugin in inFlow.

Users manage their automations within their canonical account workspace:
- `/@{username}` (or `/@{username}/comments`): Comment & Reel Automation Plugin.
- `/@{username}/dms`: Direct Message Automation Plugin.
- Root path `/` redirects unauthenticated users to `/login`, and authenticated users directly to their active account's primary plugin workspace.

Key capabilities of the DM Plugin:
1. **Instant Real-Time Master Toggle**: Optimistic auto-save + non-blocking toast notifications (zero manual "Save Changes" button required for activation).
2. **Dual-Layer Evaluation Engine**:
   - Layer 1 (Trigger Filtering): `all`, `keywords`, or `ai_context` (semantic natural-language condition; non-matching messages are cleanly skipped).
   - Layer 2 (Reply Mode): `direct` (static text template) or `ai` (contextual LLM generation).
3. **Knowledge Sources & Context Injection**:
   - Fast read-only Web Context scraper (caching clean text without heavy browser overhead).
   - MCP tool integration (querying live stock, catalog, or CRM tools).
   - Rich instructional prompt textarea with interactive helper chips, placeholders, and writing guidance.
4. **Follower Gating**: Independent `require_follow` rule dispatching customizable follow-prompts to non-followers and tracking `pending_follow` status.
5. **Lightweight Story Reply Handling**: In direct mode, matches standard keywords; in AI mode, extracts and appends referenced story text/caption as supplementary context.
6. **Absolute Idempotency & Polling Integration**: Unique `message_id` locking in SQLite `dm_logs` table, extended `GET /api/agent/poll?account={username}`, and dedicated `POST /api/accounts/{username}/dm-logs`.

---

## Technical Context

**Language/Version**: TypeScript (ESM) / Node.js v20+ / Next.js 16 (App Router)  
**Primary Dependencies**: Next.js 16, `better-sqlite3`, `lucide-react`, `tailwindcss` v4, `shadcn/ui` primitives, `sonner` toast  
**Storage**: SQLite database (`data/inflow.db`) with WAL mode  
**Testing**: Scenario-driven verification via `quickstart.md` and automated REST/polling checks  
**Target Platform**: Web browsers (desktop & mobile responsive) + Linux background agent  
**Project Type**: Next.js Web Control Plane + Worker Polling API  
**Performance Goals**: < 100ms API response time, instant optimistic UI toggling, < 1.5s web context extraction  
**Constraints**: Absolute idempotency (Principle III), zero technical leakage to tenants (Principle IX), strict shadcn/ui Light Mode (Principle X), native Persian RTL (Principle V), zero-flash canonical URL routing (Principle XII)  
**Scale/Scope**: Manages hundreds of thousands of incoming DMs per account with zero duplicate replies  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliance Assessment | Status |
| :--- | :--- | :--- |
| **I. Spec-Driven Development** | Strictly adheres to Spec-Kit workflow (`spec.md` -> `plan.md` -> `tasks.md`). | **PASS** |
| **II. Control vs Execution Plane** | inFlow remains purely Control Plane; LLM execution, scraping, and Instagram DM dispatch happen in the worker plane. | **PASS** |
| **III. Absolute Idempotency & Safety** | `dm_logs` enforces `UNIQUE(message_id)` lock, preventing any duplicate DM reply. | **PASS** |
| **IV. Package & Runtime Standards** | Uses `pnpm` exclusively; `better-sqlite3` maintained in `serverExternalPackages`. | **PASS** |
| **V. RTL Typography & BiDi** | All Persian UI elements use `dir="rtl"`, `Vazirmatn` font, and proper BiDi spacing. | **PASS** |
| **VI. Tenancy & Minimalist Page** | DM configuration is strictly scoped to `account_username` and accessible only by assigned tenants or superadmins. | **PASS** |
| **VII. Strict 1-to-1 Page-to-Bot Binding** | Worker polling provides DM configuration per-account to that page's isolated bot profile. | **PASS** |
| **VIII. Per-Page Scoped Tokens** | Agent endpoints validate Bearer tokens scoped to the requested page. | **PASS** |
| **IX. Zero-Leakage Abstraction** | Tenants configure friendly prompts and select MCP/URL sources without seeing technical credentials or keys. | **PASS** |
| **X. Unified Design System (Light Mode)** | Built strictly with `src/components/ui/` primitives, pure white cards, and zinc borders; no neon blobs or dark mode. | **PASS** |
| **XI. Bot Lifecycle & VNC Guard** | Operates cleanly alongside the existing bot status header and virtual desktop monitor. | **PASS** |
| **XII. Canonical @username URL Scoping** | Implements deterministic routing: root `/` redirect, `/@{username}` comments, and `/@{username}/dms` direct messages. | **PASS** |

---

## Project Structure

### Documentation (this feature)

```text
.specify/specs/011-dm-automation-plugin/
├── spec.md              # Requirements, user stories, and acceptance scenarios
├── plan.md              # Implementation plan (this file)
├── research.md          # Architectural research & decisions
├── data-model.md        # Database schema modifications & migrations
├── quickstart.md        # Step-by-step verification scenarios
├── contracts/           # API contracts
│   ├── dm-agent-api.yaml # REST contract for background worker agent
│   └── dm-ui-api.yaml    # REST contract for control plane dashboard
├── checklists/
│   └── requirements.md  # Spec quality validation checklist
└── tasks.md             # Ordered actionable tasks (generated by /speckit-tasks)
```

### Source Code Modifications & Additions

```text
src/
├── app/
│   ├── page.tsx                             # Updated root redirect logic (to active account workspace)
│   ├── [account]/
│   │   ├── page.tsx                         # Existing comment automation workspace
│   │   └── dms/
│   │       └── page.tsx                     # NEW: DM Automation workspace page route
│   └── api/
│       ├── agent/
│       │   └── poll/
│       │       └── route.ts                 # Extended to return dm_automation & processed_dm_ids
│       └── accounts/
│           └── [username]/
│               ├── dm-automation/
│               │   └── route.ts             # NEW: GET / POST DM automation configuration & instant toggle
│               └── dm-logs/
│                   └── route.ts             # NEW: GET / POST DM interaction logs & idempotency lock
├── components/
│   ├── sidebar-nav.tsx                      # Updated with dedicated Comment & DM plugin nav items
│   ├── dms/
│   │   ├── dm-automation-view.tsx           # NEW: Master DM configuration container component
│   │   ├── dm-header-toggle.tsx             # NEW: Instant master switch with optimistic auto-save & toast
│   │   ├── dm-trigger-selector.tsx          # NEW: All / Keywords / AI Context tabs with helper chips
│   │   ├── dm-ai-prompt-editor.tsx          # NEW: Rich prompt textarea, placeholder tokens, guide drawer
│   │   ├── dm-knowledge-sources.tsx         # NEW: Rapid web URLs manager & MCP servers picker
│   │   ├── dm-follow-gate-card.tsx          # NEW: Follower requirement switch & custom prompt text
│   │   └── dm-logs-table.tsx                # NEW: Recent DM interactions, statuses, and tool execution audit
├── lib/
│   ├── db.ts                                # Added dm_automations & dm_logs tables, migrations, & types
│   └── i18n.ts                              # Added Persian/English translations for DM plugin UI
```

---

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| *None* | All designs strictly comply with Constitution Principles I through XII. | N/A |
