/**
 * Canonical AI platform event names for ingestion + aggregation.
 * Keep additive: never rename — add new types instead.
 */

export const AI_EVENT_TYPES = {
  DRAFT_PICK_MADE: 'draft_pick_made',
  AUTO_PICK_MADE: 'auto_pick_made',
  PLAYER_ADDED: 'player_added',
  PLAYER_DROPPED: 'player_dropped',
  WAIVER_BID_SUBMITTED: 'waiver_bid_submitted',
  WAIVER_CLAIM_WON: 'waiver_claim_won',
  TRADE_PROPOSED: 'trade_proposed',
  TRADE_COUNTERED: 'trade_countered',
  TRADE_ACCEPTED: 'trade_accepted',
  TRADE_REJECTED: 'trade_rejected',
  LINEUP_CHANGED: 'lineup_changed',
  PLAYER_STARTED: 'player_started',
  PLAYER_BENCHED: 'player_benched',
  LEAGUE_JOINED: 'league_joined',
  LEAGUE_CREATED: 'league_created',
  MATCHUP_COMPLETED: 'matchup_completed',
  LEAGUE_COMPLETED: 'league_completed',
  AI_RECOMMENDATION_SERVED: 'ai_recommendation_served',
  AI_RECOMMENDATION_FOLLOWED: 'ai_recommendation_followed',
  AI_RECOMMENDATION_IGNORED: 'ai_recommendation_ignored',
} as const

export type AiEventTypeName = (typeof AI_EVENT_TYPES)[keyof typeof AI_EVENT_TYPES]

/**
 * Standard envelope for recordAiEvent (persisted JSON).
 */
export type AiEventInput = {
  eventType: string
  userId?: string | null
  leagueId?: string | null
  season?: number | null
  sport?: string | null
  leagueType?: string | null
  draftType?: string | null
  scoringProfile?: string | null
  /** Arbitrary structured payload (player ids, pick numbers, bids, etc.) */
  payload?: Record<string, unknown>
  /**
   * When set, duplicate inserts with the same key are ignored (DB unique).
   * Use for idempotent client retries: e.g. `draft:${leagueId}:${overall}`.
   */
  dedupeKey?: string | null
}
