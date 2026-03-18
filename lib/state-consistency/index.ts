/**
 * PROMPT 273 — Global state consistency.
 *
 * Single entry point for refresh behavior and invalidation so auth, leagues,
 * drafts, chat, AI, tokens, and subscriptions stay in sync.
 */

export {
  FOCUS_REFETCH_THROTTLE_MS,
  REFRESH_TRIGGERS_DOC,
} from './refresh-triggers'

// Re-export for API routes that need to invalidate after mutations
export {
  invalidateLeagueCache,
  handleInvalidationTrigger,
  type InvalidationTrigger,
} from '@/lib/trade-engine/caching'
