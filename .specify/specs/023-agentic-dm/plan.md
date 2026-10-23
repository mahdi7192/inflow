# Plan 023
- db.ts: `site_pages` table; guarded ALTERs on dm_automations (tone, tone_sample, primary_goal, secondary_goals), dm_thread_states (paused_reason, customer_info).
- `src/lib/dm-goals.ts`: shared tone/goal catalog + persona recommendations (used by agent and UI).
- `src/lib/crawler/{url,safe-fetch,extract,crawl,search}.ts`.
- `src/lib/agent/dm-agent.ts` + `ai-client.callLlmChat`; hooked into `processIncomingDm` AI branch with fallback.
- `src/lib/notify.ts` Telegram handoff notification (env token, logs fallback).
- `/api/cron/crawl` + systemd units. API route + UI changes.
