# Spec 023: Agentic DM (دایرکت کاملاً عاملی)

## Goal
Direct DMs are answered by an agent that can search the page owner's own website, remember customer info, send internal links as buttons and hand off to a human. Settings are minimal: enabled toggle, website URL, tone, goal, follow gate.

## Requirements
1. **Site crawler** (`src/lib/crawler/*`): input = `accounts.website_url`. Same registrable domain (+subdomains) only; robots.txt, sitemap.xml, canonical URLs (no utm/fragment), ≤60 pages, polite delay, timeout, size cap, SSRF guard (private/loopback blocked, re-checked on redirects). Pages scored/classified (product|service|pricing|contact|shipping|faq|about|blog|other); junk (cart/login/tag/pagination/search) skipped. Clean text, re-process only on hash change. Table `site_pages`. Updates `dm_automations.crawl_*`.
2. **Trigger**: `POST /api/cron/crawl[?account=]` (local or master token) + `inflow-crawler.timer` every 15 min. UI button «کرال همین حالا».
3. **Agent loop** (≤4 tool steps, JSON-action protocol, works on any OpenAI-compatible provider): tools `search_site`, `get_post_info`, `save_customer_info`, `send_link`, `handoff_to_human`. Hard rules: no invented prices/products/links, no external links, short Persian, <640 chars with button, goal wrap-up. Falls back to legacy single-call path on error.
4. **Tone & goal**: `dm_automations.tone`, `tone_sample`, `primary_goal`, `secondary_goals`; goal success conditions in prompt; persona-based recommendation badge «پیشنهاد برای پیج شما».
5. **UI/API**: simplified settings tab (enabled toggle synced with header, website+crawl status, tone chips, goals, follow gate, collapsed «پیشرفته»). API exposes new fields, crawl status/pages, `action: "crawl_now"`.
