# Tasks: B2B Services Persona & Playbooks (Spec 019)

- [x] Task 1: Update `src/lib/playbooks.ts` with `AccountPersona = "ecommerce" | "service_b2b" | "creator"`, legacy fallback, and 3 dedicated B2B playbooks (`brief_qualifier`, `consultation_booking`, `portfolio_showcase`).
- [x] Task 2: Update AI system prompt logic in `src/lib/ai-client.ts` to support consultative persona tone and lead qualification.
- [x] Task 3: Update `src/components/post-playbook-drawer.tsx` and `src/components/inflow-dashboard.tsx` to support the 3-tab persona selector and dynamic chip insertion.
- [x] Task 4: Add localization keys across `fa.json`, `en.json`, and `ar.json` and verify with `pnpm test:i18n`.
- [x] Task 5: Run `pnpm build`, verify zero errors, commit changes, update `ROADMAP.md` and `PROJECT_STATE.md`, and restart `inflow.service`.
