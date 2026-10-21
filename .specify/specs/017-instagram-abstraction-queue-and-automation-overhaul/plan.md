# Implementation Plan: Instagram Provider Abstraction, Event Aggregator, Action Queue & Automation Engine Overhaul

**Branch**: `017-instagram-abstraction-queue-and-automation-overhaul` | **Date**: 2026-10-21 | **Spec**: `.specify/specs/017-instagram-abstraction-queue-and-automation-overhaul/spec.md`

## Summary

Overhaul inFlow's Instagram architecture and fix all Comment and DM automation bugs using a clean 4-layer architecture:
1. **Provider Abstraction Layer (`src/lib/instagram/provider.ts` & `src/lib/instagram/social-api-provider.ts`)**: Encapsulate all Instagram operations behind `IInstagramProvider`, fix live participant profile & follow verification (`GET /v1/platforms/instagram/accounts/{id}/participants/{participantId}/profile`), and fix webhook parsing (`data.author`, `data.metadata.payload`).
2. **Event Ingestion Aggregator (`src/lib/instagram/aggregator.ts`)**: Unify Event-driven (Webhook) and Database/Polling ingestion into a single aggregator that normalizes events into `incoming_events`, eliminates the buggy synthetic `poll_follow_...` loop in `/api/cron/poll`, and polls real incoming conversation messages.
3. **Action Queue & Rate-Limited Executor (`src/lib/instagram/action-executor.ts`)**: Decouple action queueing from execution using SQLite `action_queue` with `dedupe_key` idempotency, per-account rate limiting/pacing, automatic private-reply fallback, and retry backoff.
4. **Automation Engine & AI Context Overhaul (`src/lib/instagram/automation-engine.ts` & `src/lib/ai-client.ts`)**:
   - Support all 3 trigger modes (`all`, `keywords` script with Persian/Arabic normalization, `ai_context` via 9Router/LLM) and 2 action modes (`direct`, `ai`) in both Comment and DM modules.
   - Pass admin panel instructions, triggered user's real name (`fullName`) & `username`, panel language (`fa`/`en`/`ar`), and incoming trigger text to the AI.
   - Provide multi-turn Conversation History (last 8 exchanges from `dm_logs`) to AI DM replies so ongoing chats never repeat opening greetings.
   - Implement strict live follow verification (`is_user_follow_business === true`) and the cross-module `pending_follow` state machine between Comment and DM modules.

## Technical Context

**Language/Version**: TypeScript 5.8 / Node.js 26.7
**Framework**: Next.js 15.2 (App Router)
**Storage**: SQLite (`better-sqlite3`) in `/opt/inflow/data/inflow.db`
**AI Gateway**: 9Router (`http://127.0.0.1:20128/v1`) / OpenAI-compatible & Gemini API
**Target Platform**: Linux server (`inflow.service` + `inflow-poller.timer` on port 3005/3001)

## Constitution Check

- **Provider Isolation**: All Instagram interactions go through `IInstagramProvider`.
- **Idempotency & Rate Limiting**: `incoming_events` + `comment_logs`/`dm_logs` + `action_queue` (`dedupe_key`) guarantee zero duplicate sends and strict rate-limit compliance.
- **No Secret Leakage**: API keys remain in `app_settings` / env and are never exposed in logs or responses.

## Project Structure

```text
src/
├── lib/
│   ├── db.ts                                  # Schema migrations & queue/event helpers
│   ├── ai-client.ts                           # Enriched AI trigger & reply with user name, app language, and DM conversation history
│   ├── social-api.ts                          # Fixed participant profile endpoint & webhook helpers
│   ├── instagram-automation.ts                # Backward-compatible facade delegating to the new Instagram architecture
│   └── instagram/
│       ├── provider.ts                        # IInstagramProvider interface & domain types
│       ├── social-api-provider.ts             # SocialApiInstagramProvider implementation
│       ├── action-executor.ts                 # Action Queue enqueueing & rate-limited ActionExecutor
│       ├── automation-engine.ts               # Comment & DM Automation Engine + Follow Gate State Machine
│       └── aggregator.ts                      # Unified Event & Polling Ingestion Aggregator
├── app/api/
│   ├── webhooks/social-api/route.ts           # Routes webhooks through InstagramEventAggregator + triggers ActionExecutor
│   ├── cron/poll/route.ts                     # Runs InstagramEventAggregator.pollActiveAccountsAndPosts() + ActionExecutor
│   ├── sync/route.ts                          # Uses IInstagramProvider & Aggregator
│   ├── posts/[shortcode]/route.ts             # Persists post automation settings + app_language
│   └── accounts/[username]/dm-automation/route.ts # Persists DM automation settings + app_language
└── components/
    ├── post-detail-view.tsx                   # Sends active panel lang (`app_language`) when saving post automation
    └── dms/dm-automation-view.tsx             # Sends active panel lang (`app_language`) when saving DM automation
```
