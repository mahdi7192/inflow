# Plan 021
- DB (opus-tier, engine/schema): migration `stories` + CHECK-free text enums in `src/lib/db.ts`; `story_handling_mode` reused.
- `src/lib/stories.ts`: sync (upsert, keep expired), lookup by id/permalink, emoji detector.
- Engine branch `handleStoryReply` in automation-engine.ts, placed before generic step 5; returns early; shares follow-gate + enqueue helpers pattern.
- API routes GET/PATCH. Insights route also upserts stories.
- UI: `story-playbook-drawer.tsx`, `stories-section.tsx`, wire into inflow-dashboard; DM view cleanup + source badge (dm-logs source derived from story flag / comment_logs origin).
- Verify: pnpm lint, pnpm run build (nice/ionice), no deploy before pass.
