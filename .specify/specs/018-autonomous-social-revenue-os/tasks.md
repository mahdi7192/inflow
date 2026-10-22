# Tasks: Spec 018 — Autonomous Social Revenue OS & Studio Design System

- [x] **T001**: Author canonical design system docs (`DESIGN.md`, `docs/design-system.md`) and Spec 018 (`spec.md`, `plan.md`, `tasks.md`).
- [x] **T002**: Migrate SQLite schema in `src/lib/db.ts` (`account_persona`, `brand_cheat_sheet`, `website_url`, `insights_json` on `accounts`; `playbook_id`, `cheat_sheet`, `target_url`, `smart_moderation`, `metrics_json` on `posts`; `read_at` on `dm_logs`).
- [x] **T003**: Create `src/lib/playbooks.ts` with Dual-Persona (`business` & `creator`) 1-Click Playbook definitions, prompt instructions, and quick-insert Cheat Sheet chips.
- [x] **T004**: Add zero-credit analytics & active stories methods to `src/lib/social-api.ts` and create `src/app/api/accounts/[username]/insights/route.ts`.
- [x] **T005**: Update `src/app/api/accounts/[username]/route.ts`, `src/app/api/posts/[shortcode]/route.ts`, and `src/lib/instagram/aggregator.ts` (`dm.status.read` support).
- [x] **T006**: Upgrade `src/lib/instagram/automation-engine.ts` to inject `cheat_sheet`, `target_url` (with user attribution), `brand_cheat_sheet`, `playbook_id`, Smart Comment Moderation Shield, and Comment-to-DM context bridge.
- [x] **T007**: Upgrade `src/app/globals.css` to the **inFlow Studio** light theme token system and build `src/components/post-playbook-drawer.tsx`.
- [x] **T008**: Upgrade `src/components/inflow-dashboard.tsx` and `src/components/post-detail-view.tsx` with the Adaptive Persona Switcher, True ROI Funnel Strip, Active 24h Stories Strip, Playbook badges, and Slide-Over Context Drawer.
- [x] **T009**: Update `CLAUDE.md`, `AGENTS.md`, and `.specify/memory/constitution.md` to lock in the Studio Design System and Spec 018 architecture, then run `pnpm build` and restart `inflow.service`.
