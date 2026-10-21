# Contracts: Instagram Provider, Ingestion Aggregator, Automation Engine & Action Executor

## 1. `IInstagramProvider` (`src/lib/instagram/provider.ts`)
```ts
export interface InstagramParticipantProfile {
  id: string;
  username: string;
  name: string;
  profilePic?: string;
  followerCount?: number;
  isUserFollowBusiness: boolean;
  isBusinessFollowUser?: boolean;
  isVerifiedUser?: boolean;
}

export interface NormalizedInstagramEvent {
  eventUid: string; // "cmt:<id>" | "dm:<id>"
  eventType: "comment" | "dm" | "postback" | "mention";
  source: "webhook" | "polling" | "sync";
  socialAccountId?: string;
  accountUsername?: string;
  postId?: string;
  shortcode?: string;
  commentId?: string;
  messageId?: string;
  conversationId?: string;
  authorId: string;
  authorUsername: string;
  authorFullName?: string;
  text: string;
  postbackPayload?: string;
  postbackTitle?: string;
  isStoryReply?: boolean;
  storyId?: string | null;
  storyContent?: string | null;
  createdAt?: string;
}
```

## 2. `InstagramEventAggregator` (`src/lib/instagram/aggregator.ts`)
- `ingestWebhookEvent(rawBody: string, headers: { signature?: string | null; timestamp?: string | null }): Promise<AggregatorResult>`
- `pollActiveAccountsAndPosts(): Promise<PollAggregatorSummary>`
- `ingestEvent(event: NormalizedInstagramEvent): Promise<{ processed: boolean; already_processed?: boolean; [key: string]: unknown }>`

## 3. `AutomationEngine` (`src/lib/instagram/automation-engine.ts`)
- Evaluates triggers (`all`, `keywords`, `ai_context`) and actions (`direct`, `ai`).
- Enriches user identity (`username`, `name`, `isUserFollowBusiness`) via `provider.getParticipantProfile`.
- Manages Follow Gate & cross-module `pending_follow` state machine.
- Enqueues outbound actions into `action_queue` via `enqueueAction()`.

## 4. `ActionExecutor` (`src/lib/instagram/action-executor.ts`)
- `processActionQueue(options?: { accountUsername?: string; maxActions?: number }): Promise<QueueExecutionSummary>`
- Enforces per-account rate limits, handles `PRIVATE_REPLY` -> conversation fallback, updates `comment_logs` and `dm_logs`, and schedules exponential backoff retries on `429`/`5xx`.
