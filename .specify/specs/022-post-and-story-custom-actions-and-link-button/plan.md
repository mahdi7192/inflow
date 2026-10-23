# Implementation Plan: Spec 022

1. **DB Updates**:
   - Update `src/lib/db.ts` to add `target_button_text` migration to both `posts` and `stories` tables, and update `PostRow` and `StoryRow` TypeScript definitions.
2. **API Handlers**:
   - Update `src/app/api/posts/[shortcode]/route.ts` to handle `target_button_text`.
   - Update `src/app/api/accounts/[username]/stories/[id]/route.ts` to include `target_button_text` in `TEXT_FIELDS`.
   - Update `src/app/api/accounts/[username]/insights/route.ts` post select queries.
3. **Engine Updates**:
   - Update `src/lib/instagram/automation-engine.ts` to read `target_button_text` for button titles in post DMs and story replies.
4. **UI Components**:
   - Update `src/components/post-playbook-drawer.tsx`:
     - Move Cheat Sheet to the bottom.
     - Add comment AI custom instructions textarea + chips when `commentActionType === 'ai'`.
     - Add DM AI custom instructions textarea + chips when `dmActionType === 'ai'`.
     - Add Target Button Text + Target URL input fields with presets and preview.
   - Update `src/components/story-playbook-drawer.tsx`:
     - Move Cheat Sheet to the bottom.
     - Add AI custom prompt instruction field when `replyMode === 'ai'`.
     - Add Button Text + Target URL with preview.
5. **Verification**:
   - Run type checks (`npm run lint` or `npx tsc --noEmit`).
   - Run tests (`npm test` if available).
