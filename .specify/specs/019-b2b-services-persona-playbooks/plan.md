# Implementation Plan: B2B Services Persona & Playbooks (Spec 019)

## Strategy & Safety
- **No breaking DB migrations**: `accounts.account_persona` is already a `TEXT` column in SQLite. Legacy `'business'` values map directly to `'ecommerce'` in application logic.
- **Resource Gate & Tier Routing**:
  - Complexity Tier: **Tier 2 (Standard Engineering Tier)**.
  - Primary Tool: `claude` (Claude Code CLI) with `--model sonnet` (`claude-sonnet-5-5`), running under `nice -n 15 ionice -c 2 -n 7`.
  - Secondary Tool (Failover): `agy` (Antigravity CLI) with `--model gemini-4-argon-high`.
- **Quality Gates**:
  1. `pnpm test:i18n` passes with 100% parity across `fa.json`, `en.json`, `ar.json`.
  2. `pnpm build` passes with zero TypeScript and lint errors.
  3. `systemctl restart inflow.service` and verify active status.

## File Changes
1. `src/lib/playbooks.ts`: Update `AccountPersona`, add B2B playbooks, chips, and placeholders.
2. `src/lib/instagram/ai-client.ts`: Adapt AI prompt engineering for `service_b2b` (consultative tone, qualifying questions, booking leads).
3. `src/components/post-playbook-drawer.tsx`: Add 3-way persona toggle and badge styling.
4. `src/components/inflow-dashboard.tsx`: Reflect 3-way persona switcher in the header/settings.
5. `src/locales/{fa,en,ar}.json`: Add localized strings for the new persona and playbooks.
6. `ROADMAP.md` & `PROJECT_STATE.md`: Document intermediate Step 2.5.
