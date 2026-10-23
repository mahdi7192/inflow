# Spec 022: Post & Story Custom AI Action Contexts and Link Buttons

## Problem
1. When user sets Public Comment Reply to "هوش مصنوعی" (AI), there is no field to specify extra context/instructions (e.g. "تشکر کن و بگو دایرکت فرستادم", "فقط با ایموجی جواب بده").
2. When user sets Direct Message Reply to "مشاور هوش مصنوعی" (AI), there is no field to provide reel-specific conversational direction or custom prompt context (e.g. "قیمت و مشخصات محصول رو بگو", "متن رو شخصی‌سازی کن").
3. The destination link was only a plain URL input. Users need a real button configuration where both button text (e.g. "مشاهده و خرید 🛍️", "دریافت کاتالوگ") and URL can be customized, and rendered as an interactive Instagram button.
4. The Cheat Sheet (تقلب‌نامه) was placed in the middle of the drawer, disrupting the natural configuration flow (actions -> options -> supplemental knowledge).

## Requirements
1. **Database Schema & Migrations (`src/lib/db.ts`)**:
   - `posts` table: add `target_button_text TEXT NOT NULL DEFAULT ''`. Update `PostRow` interface.
   - `stories` table: add `target_button_text TEXT NOT NULL DEFAULT ''`. Update `StoryRow` interface.
2. **API Layer**:
   - `src/app/api/posts/[shortcode]/route.ts`: accept and persist `target_button_text`.
   - `src/app/api/accounts/[username]/stories/[id]/route.ts`: accept and persist `target_button_text`.
   - `src/app/api/accounts/[username]/insights/route.ts`: include `target_button_text` in posts queries if explicitly projected.
3. **Instagram Automation Engine (`src/lib/instagram/automation-engine.ts`)**:
   - In post DM private reply, use `post.target_button_text` for button `title` (fallback to localized "مشاهده و خرید 🛍️" / "View & Buy 🛍️").
   - In story reply, use `storyCfg.target_button_text` for button `title` (fallback to localized "مشاهده لینک 🔗" / "Open link 🔗").
   - When story reply is AI mode, use `storyCfg.reply_text` as custom instructions if provided.
4. **Post Playbook Drawer (`src/components/post-playbook-drawer.tsx`)**:
   - When `commentActionType === 'ai'`, render instruction textarea with quick chips (`+ تشکر و اعلام دایرکت`, `+ فقط ایموجی تشویقی`, `+ دعوت به استوری`).
   - When `dmActionType === 'ai'`, render instruction textarea with quick chips (`+ قیمت و جزئیات محصول`, `+ مشاوره و سوال از نیاز`, `+ شخصی‌سازی پیشنهاد`).
   - Replace plain target URL with dual button block (Button Text + Target URL), quick button presets, and visual Instagram glass button preview.
   - Relocate Cheat Sheet (تقلب‌نامه) to the very end of the configuration form.
5. **Story Playbook Drawer (`src/components/story-playbook-drawer.tsx`)**:
   - When `replyMode === 'ai'`, allow entering custom prompt instructions.
   - Replace plain target URL with dual button block (Button Text + Target URL), presets, and button preview.
   - Relocate Cheat Sheet to the end of the drawer.
6. **Instagram Button Template Protocol Guard (`action-executor.ts` & `automation-engine.ts`)**:
   - Instagram & Meta Graph API strictly enforce a maximum text length of 640 characters for messages containing a Button Template (`validation.text_too_long`).
   - When an interactive button (`target_url`) is configured, do NOT append raw tracking URLs to the main body text; the URL lives inside the button. The raw URL is only appended in `fallbackText` if the button template fails.
   - In `action-executor.ts`, clamp button message text to at most 640 characters (`clampTextForButtonTemplate`) before sending to prevent API 400 rejection.
   - Log any button sending errors clearly instead of silently swallowing them.
