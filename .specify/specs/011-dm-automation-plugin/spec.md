# Feature Specification: Direct Message (DM) Automation Plugin with Knowledge & MCP Context

**Feature Branch**: `011-dm-automation-plugin`

**Created**: 2026-10-20

**Status**: Ready for Planning

**Input**: User description: "i look at current comment flow as 1st plugin, it trigger by user comment and fully flows of commenting on posts. now i want to create a new plugin for directing and DMs. it trigger by getting direct message. like commenting it has exact that flow. you can set trigger on any dm or specific texts or ai concept detection. and answer can be specific text of ai answering and context injection. another different here is that the user can add an mcp for context or website as context. imagin it is a online shop and want to answer based on products or inventory. in my mind i see a page the user can set some mcp if want and a big text area to describe how to anwser (if it is selected as ai answer) in this texarea it should say when to use sites, when to use mcp based on whitch context do what.... important note is that reading urls should be very fast and use a specific tools just for reading no input needed. in some situation of comment plugin we need follow config for dm, and user after follow should say i follow or somthing that in db should be somthing like to pending follow in this situation it is not in dm plugin flow. also dm should have a need follow config. in panel you have to hint user how to write these with texts, elements and placeholder. don't forget to save exactly current design system. also add enable disable. i don't know how we can handle story replyes, we have to describe it in context? think about this that this setion fill befor story upload and in config we don't know about stories and linking. so can we add story image as extra info to ai? how to save what it is and do it once? maybee in panel we can add story context for example, <story_how to order>: context.... i have no idea."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - DM Automation Configuration & Instant Master Toggle (Priority: P1)

As an Instagram page owner or marketing operator, I want a dedicated DM Automation management interface within my account workspace so that I can easily toggle automatic direct message replies on or off in real time with instant auto-save and toast feedback, configure triggers, and govern how my account responds to customer inquiries in private chats.

**Why this priority**: Without the primary configuration interface and master switch, no DM automation can be scheduled, inspected, or toggled on/off safely.

**Independent Test**: The user can navigate to the DM Automation view under their account workspace (`/@username/dms`), flip the master toggle switch ON or OFF, see an instant toast notification, and verify via API/polling that the account reflects the updated DM state without needing to click any manual apply button.

**Acceptance Scenarios**:
1. **Given** an account workspace with DM automation currently disabled, **When** the user flips the master toggle switch to Active, **Then** the change is instantly persisted in real time with an optimistic update and feedback toast notification (zero manual "Save" click required), and the background polling endpoint immediately reflects the active DM state.
2. **Given** active DM automation, **When** the user flips the toggle to Disabled, **Then** it instantly auto-saves with a toast confirmation and halts incoming DM processing while preserving all configured prompts and knowledge settings.

---

### User Story 2 - Flexible Trigger Matching & Dual-Mode Replies (Direct vs. AI) (Priority: P1)

As an e-commerce creator, I want to configure whether my DM automation triggers on all incoming messages, exact keyword phrases, or AI conceptual intent, and choose between a static predefined response or a dynamic AI-generated answer.

**Why this priority**: Core value of the automation plugin. Allows simple FAQ bots (fixed response) as well as smart conversational agents (context-aware AI response) depending on business needs.

**Independent Test**: Can be tested by configuring a rule with keyword triggers vs AI intent, simulating incoming DMs, and confirming that matching messages receive either the exact text or an AI-generated answer while non-matching DMs are cleanly ignored.

**Acceptance Scenarios**:
1. **Given** trigger type set to `keywords` (e.g. `قیمت`, `سفارش`, `سایز`), **When** an incoming DM contains one of the keywords, **Then** the system triggers the reply flow; if a DM contains unrelated text (e.g. `سلام روز بخیر`), **Then** it is logged as filtered/skipped without sending a reply.
2. **Given** trigger type set to `all`, **When** any customer sends any direct message, **Then** the automation triggers immediately.
3. **Given** trigger type set to `ai_context` (e.g. "فقط اگر درباره شرایط مهاجرت به کشور آلمان یا هزینه‌ها سوال شد پاسخ بده، در غیر این صورت اسکیپ شود"), **When** an incoming DM asks "هزینه ویزای آلمان چقدر است؟", **Then** the AI semantic classifier detects a match and proceeds to generate the reply; **When** an incoming DM asks "سلام خوبی؟ امروز هوا چطوره؟", **Then** the classifier detects a non-match, logs the message as `trigger_matched = 0` / `skipped`, and aborts reply generation.
4. **Given** response mode set to `direct`, **When** triggered, **Then** the system sends the predefined static response template.
5. **Given** response mode set to `ai`, **When** triggered, **Then** the system crafts a contextual answer following the prompt instructions provided in the configuration textarea and injected knowledge sources.

---

### User Story 3 - Rapid Web Context & MCP Knowledge Source Injection (Priority: P2)

As an online store merchant with real-time product catalogs and stock levels, I want to supply website URLs and select connected MCP servers so that the AI response engine can access live inventory, pricing, and product descriptions before replying.

**Why this priority**: Eliminates outdated or hallucinated answers by grounding the AI in live business data without requiring manual updates to the prompt every time stock or prices change.

**Independent Test**: Can be tested by entering a test product catalog URL and an MCP tool, crafting a prompt that instructs the AI when to query inventory, and sending a DM asking "Do you have size 42 in red?"; the returned answer contains verified real-time data from the knowledge source.

**Acceptance Scenarios**:
1. **Given** one or more URLs configured in the Web Context section, **When** an incoming DM requires factual information from those sites, **Then** the execution agent uses a dedicated high-speed reader tool to fetch clean page content with zero human intervention and injects it into the AI reasoning context.
2. **Given** an MCP server enabled for the account, **When** a user inquires about order status or live stock, **Then** the agent executes the relevant read-only MCP tool and injects the live result into the conversation context.
3. **Given** the master prompt textarea in the UI, **When** the user writes routing instructions (e.g., "Use website for size guide, use MCP for live warehouse stock"), **Then** the UI provides clear placeholder hints, structured guideline chips, and sample templates to assist the user.

---

### User Story 4 - Follower Gating & Follow-Verification for DMs (Priority: P2)

As a creator focused on audience growth, I want an optional "Require Follow" setting for DMs so that non-followers are politely asked to follow before receiving exclusive links, prices, or AI consultations.

**Why this priority**: Drives follower conversion while protecting commercial links and high-value AI interactions from casual one-off spammers.

**Independent Test**: Can be tested with an account where `require_follow` is enabled; a non-follower receives a customizable follow-request prompt, and once they follow and message back, the AI delivers the intended response.

**Acceptance Scenarios**:
1. **Given** `require_follow = true` and an incoming DM from a user who does not follow the account, **When** the automation processes the DM, **Then** the system sends a configurable prompt (e.g., "لطفاً ابتدا پیج را فالو کنید تا پاسخ کامل ارسال شود") and records the status as `pending_follow`.
2. **Given** a user in `pending_follow` status who subsequently follows the page and sends a new message (or confirms "فالو کردم"), **When** the automation re-verifies their follower status, **Then** it proceeds with the standard triggered reply (direct or AI).
3. **Given** `require_follow = false`, **When** any user sends a message, **Then** replies are delivered immediately regardless of follower state.

---

### User Story 5 - Lightweight Story Reply Context Handling (Priority: P3)

As an Instagram business or creator, I want incoming direct messages that are replies to my Stories to be handled intelligently without requiring a complex separate story management system: if in direct mode, reply normally; if in AI mode, automatically inject the detected story content into the AI context.

**Why this priority**: Stories generate high direct message engagement. Decoupling advanced story configuration while injecting simple story content into AI context provides immediate value with zero configuration burden on the user.

**Independent Test**: Can be tested by sending a message as a reply to an active story; if in direct reply mode, the static response is sent; if in AI reply mode, the story text/content is appended to the prompt context and the AI responds acknowledging the story subject.

**Acceptance Scenarios**:
1. **Given** reply mode set to `direct` or trigger set to `keywords`, **When** an incoming DM is a story reply matching the trigger criteria, **Then** the system sends the predefined static response template directly.
2. **Given** reply mode set to `ai`, **When** an incoming DM is a story reply, **Then** the execution agent detects the referenced story content/caption, injects it into the prompt context as supplementary context, and the AI answers using the existing configuration and knowledge sources.
3. **Given** no active story content is retrievable or the story has expired, **When** processed by AI, **Then** the AI gracefully treats the incoming text as a general DM inquiry without errors.

---

### Edge Cases

- **Rate Limiting & Rapid Multi-Message Flooding**: What happens when a user sends 5 messages in quick succession within a few seconds? The system MUST queue and coalesce incoming messages per sender within a short debounce window (e.g. 10-15 seconds) so the AI crafts a single coherent reply rather than sending 5 conflicting replies.
- **External URL Scrape Timeout / Down Site**: What happens if a configured website URL times out or returns a 5xx error? The AI prompt must have a graceful fallback instruction to apologize and provide general guidance without crashing or fabricating missing data.
- **MCP Tool Execution Failure**: What happens if the connected MCP server is unreachable or reports an error? The agent falls back to general prompt context and flags the incident in execution logs.
- **Idempotency on DM Event Delivery**: What happens if the execution plane or webhook delivers duplicate notifications for the same incoming DM? The system MUST enforce idempotency on `message_id` / `thread_id` to guarantee zero double-replies.
- **Self-Message & Bot-to-Bot Loop Filter**: What happens when the account itself sends an outbound message or another bot engages in conversation? The system MUST ignore all messages sent by the account owner and detect automated loops.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide deterministic plugin routing within the account workspace:
  - `/@{username}` (or `/@{username}/comments`): Comment Automation Plugin
  - `/@{username}/dms`: Direct Message (DM) Automation Plugin
  - Sidebar navigation MUST feature clear links between the plugins ("اتوماسیون کامنت" و "اتوماسیون دایرکت").
  - The root path `/` MUST automatically redirect unauthenticated users to `/login`, and authenticated users with assigned accounts directly to their default account's primary plugin workspace (`/@{username}`).
- **FR-002**: System MUST support an account-level Master Toggle (`enabled`: 0 or 1) that saves immediately in real time via optimistic updates and triggers a toast notification upon toggle change (identical to the post card auto-reply switch behavior, with zero manual "Save Changes" requirement).
- **FR-003**: System MUST support three distinct trigger evaluation modes:
  - `all`: Trigger on every incoming DM from external users.
  - `keywords`: Trigger only if the incoming message contains one or more user-defined comma-separated keywords.
  - `ai_context`: Semantic/Intent Triggering where the user provides a natural language condition (e.g. "فقط اگر کاربر درباره شرایط ویزا یا اخذ اقامت آلمان سوال پرسید پاسخ بده"). The AI semantic classifier evaluates the message against this concept first: if it matches, it triggers reply generation; if not, it skips the message and records `trigger_matched = 0` / `skipped` in the logs.
- **FR-004**: System MUST support two primary reply modes:
  - `direct`: Sends a fixed, user-defined template text.
  - `ai`: Invokes an AI model with system instructions, user context, and dynamic external knowledge.
- **FR-005**: System MUST provide a dedicated multi-line prompt textarea for the AI reply mode, complete with interactive hint cards, copyable element placeholders, and contextual writing guidelines in Persian and English.
- **FR-006**: System MUST allow configuring a list of Web Context URLs (HTTP/HTTPS) that the execution agent can rapidly read using a fast, headless read-only scraper with zero form-filling or unnecessary latency.
- **FR-007**: System MUST allow selecting or specifying MCP (Model Context Protocol) server connections to be made available to the agent for contextual tool queries (e.g. inventory check, order tracking).
- **FR-008**: System MUST support an optional Follow-Gating toggle (`dm_require_follow`: true/false) for DM automation, separate from the post-comment follow check.
- **FR-009**: When `dm_require_follow` is enabled and a non-follower sends a DM, the system MUST send a customizable follow-request prompt and log the conversation state as `pending_follow`.
- **FR-010**: System MUST automatically re-check follower status on subsequent incoming messages from a `pending_follow` user and resume normal AI/direct replies once follower status is verified.
- **FR-011**: System MUST handle incoming Story Replies cleanly within the DM plugin:
  - When reply mode is `direct` (or non-AI): standard trigger matching and static reply templates apply directly.
  - When reply mode is `ai`: the execution agent detects referenced story content/caption/text and appends it to the AI prompt context so the model can generate a relevant response based on the active prompt instructions and knowledge sources.
  - A separate, standalone Story Reply plugin is decoupled and deferred to a future iteration.
- **FR-012**: System MUST record every incoming and outgoing DM interaction in a dedicated `dm_logs` table with unique message identifier locks to guarantee absolute idempotency and prevent duplicate responses.
- **FR-013**: System MUST expose the DM automation configuration and processed message ID locks to the background execution agent via the existing/extended polling endpoint (`GET /api/agent/poll?account={username}`) and dedicated DM logging endpoint (`POST /api/accounts/{username}/dm-logs`).
- **FR-014**: System UI MUST strictly adhere to the unified inFlow Design System (shadcn/ui Light Mode, clean white cards, subtle zinc borders, Vazirmatn RTL typography, zero rogue gradients or unstyled elements).
- **FR-015**: System MUST provide clear status and diagnostic telemetry on the DM view, showing recent messages, trigger match rates, and knowledge tool call health.

---

### Key Entities *(include if feature involves data)*

- **`dm_automations`**:
  - `id`: Unique numeric primary key
  - `account_username`: Scoped Instagram account identifier (Foreign Key)
  - `enabled`: Integer boolean (0 = disabled, 1 = enabled)
  - `trigger_type`: `'all'` | `'keywords'` | `'ai_context'`
  - `trigger_context`: Natural language condition for AI intent matching
  - `trigger_keywords`: Comma-separated keyword string
  - `reply_mode`: `'direct'` | `'ai'`
  - `direct_reply_text`: Static message text for direct reply mode
  - `ai_prompt_instructions`: Master prompt and behavioral guidelines for the AI
  - `web_context_urls`: JSON array or newline-separated list of fast-read website URLs
  - `mcp_servers_config`: JSON array of enabled MCP server IDs and allowed tool scopes
  - `require_follow`: Integer boolean (0 = disabled, 1 = enabled)
  - `follow_prompt_text`: Message sent to non-followers requesting them to follow
  - `story_handling_mode`: Configuration for story replies
  - `updated_at`, `created_at`: ISO timestamp strings
- **`dm_logs`**:
  - `id`: Unique numeric primary key
  - `message_id`: Unique Instagram DM message identifier (**Idempotency Key**)
  - `thread_id`: Instagram DM conversation thread identifier
  - `account_username`: Target Instagram account
  - `sender_username`: Instagram username of the customer
  - `sender_id`: Instagram numeric/alphanumeric user ID
  - `incoming_text`: Content of the received message
  - `is_story_reply`: Integer boolean (1 if message is a reply to a story, 0 otherwise)
  - `story_id`: Associated story identifier (if applicable)
  - `trigger_matched`: Integer boolean (1 = matched, 0 = filtered)
  - `reply_status`: `'sent'` | `'pending_follow'` | `'skipped'` | `'failed'` | `'locked'`
  - `reply_text`: Delivered response text
  - `tools_invoked`: JSON array of tools / URLs queried during resolution
  - `processed_at`: ISO timestamp string

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can configure, test, and activate DM automation from scratch in under 3 minutes using the guided panel with placeholders and hints.
- **SC-002**: 100% of incoming DMs receive idempotent handling — zero duplicate replies sent even during rapid message delivery or polling overlaps.
- **SC-003**: Web context ingestion using the fast reader tool completes page text extraction in under 1.5 seconds per URL without delaying customer response time.
- **SC-004**: Users with `require_follow` enabled experience accurate follow detection with zero false negatives (active followers are never erroneously blocked).
- **SC-005**: All UI screens strictly comply with the shadcn/ui Light Mode visual standard and render flawlessly in RTL with Vazirmatn typography across desktop and mobile viewports.

---

## Assumptions

- The execution plane agent (`Hermes Agent` or worker bot) has active Instagram session credentials capable of reading direct messages and dispatching direct messages on behalf of the account.
- Website URLs provided by the user are publicly accessible via HTTP/HTTPS and do not require CAPTCHA or authenticated human login to read basic product or inventory details.
- Standard debounce logic (10-15 seconds) will be applied by the execution agent to bundle consecutive messages from the same user into a single conversational turn.
- Comment automation and DM automation operate as complementary, decoupled plugins sharing the same underlying account ownership and session credentials.
- The UI language adapts to Persian (RTL default) and English (LTR) via `src/lib/i18n.ts`.