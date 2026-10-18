# Hermes Agent Integration Protocol

This document provides the technical specification for implementing the **Execution Plane (Hermes Agent / Python Worker)** that connects to `inFlow Control Plane`.

---

## 1. Execution Flow & Lifecycle (Every 2 Minutes)

```mermaid
sequenceDiagram
    autonumber
    participant Agent as Hermes Worker Agent
    participant inFlow as inFlow Control Plane (:3005)
    participant IG as Instagram Web / App / Private API
    participant LLM as OpenAI / Claude / Local LLM

    loop Every 2 Minutes
        Agent->>inFlow: GET /api/agent/poll?account=r9spoort1
        inFlow-->>Agent: Active Posts + Rules + Processed Comment IDs
        
        loop For each Active Post
            Agent->>IG: Fetch latest 20 comments
            loop For each Comment
                alt comment_id in processed_comment_ids
                    Agent->>Agent: Skip (Already locked/processed)
                else New Comment
                    Agent->>Agent: Evaluate Trigger (All / Keywords / AI)
                    alt Trigger Matched
                        opt Comment Action == 'ai'
                            Agent->>LLM: Generate Comment Reply (using post caption + instructions)
                            LLM-->>Agent: reply_text
                        end
                        opt DM Action == 'ai'
                            Agent->>LLM: Generate DM Text (using product specs + tone)
                            LLM-->>Agent: dm_text
                        end
                        opt Require Follow == true
                            Agent->>IG: Check if commenter follows account
                            alt Not Following
                                Agent->>IG: Send prompt or hold in pending_follow
                            end
                        end
                        Agent->>IG: Post Comment Reply
                        Agent->>IG: Send Instagram Direct Message
                        Agent->>inFlow: POST /api/posts/{shortcode}/logs (Lock & Record success)
                    else Trigger Filtered
                        Agent->>inFlow: POST /api/posts/{shortcode}/logs (Lock with trigger_matched=0)
                    end
                end
            end
        end
    end
```

---

## 2. Trigger Evaluation Logic

### 1. `all` (All Comments)
* Every new comment matches: `trigger_matched = 1`.

### 2. `keywords` (Keywords Matching)
* Comma-separated keyword list (e.g. `قیمت, لینک, سایز, چند, تخفیف`).
* Normalize comment text (lowercase, remove diacritics).
* If any keyword is found in `comment_text`: `trigger_matched = 1`.

### 3. `ai_context` (Semantic AI Filter)
* Prompt template for LLM evaluation:
```markdown
System: You are an intent classifier for Instagram comments.
Post Caption: {caption}
Condition: {trigger_context}
Comment: "{comment_text}"

Does this comment express interest or intent matching the condition?
Respond with JSON: {"matched": true|false, "reason": "brief explanation"}
```

---

## 3. Dynamic AI Response Generation Prompts

When `comment_action_type === 'ai'` or `dm_action_type === 'ai'`:

### Comment Reply Prompt
```markdown
System: You are a friendly, professional social media manager for @{account_username}.
Post Caption: {caption}
Instructions: {comment_action_text}
User Comment: "{comment_text}"

Write a concise public comment reply (1-2 sentences). Do not mention prices publicly if instructed to direct them to DM. Use friendly emojis.
```

### Direct Message (DM) Prompt
```markdown
System: You are an automated sales assistant for @{account_username}.
Post Caption: {caption}
Product & Pricing Details: {dm_action_text}
User Name: @{commenter_username}
User Question: "{comment_text}"

Formulate a warm, polite, and detailed direct message with all pricing, sizing, ordering instructions, and links as specified.
```

---

## 4. Idempotency & Concurrency Locking Contract

To ensure that network latency or agent retries never result in duplicate messages:
1. Always send `comment_id` in `POST /api/posts/{shortcode}/logs`.
2. If `inFlow` responds with `"already_processed": true`, abort any further action on that comment.
3. The database schema enforces `UNIQUE(comment_id)`.
