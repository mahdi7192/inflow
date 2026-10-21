/**
 * Unified Instagram Automation Facade
 *
 * Re-exports the modular 4-layer architecture:
 * 1. Provider Abstraction (`src/lib/instagram/provider.ts` & `social-api-provider.ts`)
 * 2. Event & Polling Ingestion Aggregator (`src/lib/instagram/aggregator.ts`)
 * 3. Automation Engine & Follow Gate State Machine (`src/lib/instagram/automation-engine.ts`)
 * 4. Action Queue & Rate-Limited Executor (`src/lib/instagram/action-executor.ts`)
 */

export {
  processIncomingComment,
  processIncomingDm,
  matchesKeywords,
  normalizeTextForMatch,
  isFollowConfirmationSignal,
  type IncomingCommentEvent,
  type IncomingDmEvent,
} from "@/lib/instagram/automation-engine";

export {
  ingestNormalizedEvent,
  ingestWebhookPayload,
  pollActiveAccountsAndPosts,
  type PollAggregatorSummary,
} from "@/lib/instagram/aggregator";

export {
  enqueueInstagramAction,
  processActionQueue,
  type EnqueueActionParams,
  type OutboundActionType,
  type QueueExecutionSummary,
} from "@/lib/instagram/action-executor";

export {
  getInstagramProvider,
  createInstagramProvider,
  SocialApiInstagramProvider,
} from "@/lib/instagram/social-api-provider";
