/**
 * Social Media Content Generator (PROMPT 297) — content types and context.
 */

export type SocialContentType =
  | 'draft_results'
  | 'weekly_recap'
  | 'trade_reaction'
  | 'power_rankings'

export interface DraftResultsContext {
  leagueName: string
  season: string
  winnerName?: string
  grade?: string
  topTeam?: string
  highlight?: string
}

export interface WeeklyRecapContext {
  week?: number
  leagueName?: string
  wins?: number
  losses?: number
  highlight?: string
  summary?: string
}

export interface TradeReactionContext {
  sideA: string[]
  sideB: string[]
  grade?: string
  verdict?: string
  insight?: string
}

export interface PowerRankingsContext {
  leagueName?: string
  rank: number
  teamName: string
  change?: string
  blurb?: string
  insight?: string
}

export type SocialContentContext =
  | { type: 'draft_results'; data: DraftResultsContext }
  | { type: 'weekly_recap'; data: WeeklyRecapContext }
  | { type: 'trade_reaction'; data: TradeReactionContext }
  | { type: 'power_rankings'; data: PowerRankingsContext }

export interface SocialContentResult {
  caption: string
  hashtags: string
  /** Title for image card / preview */
  title: string
  /** Body lines for image (optional) */
  bodyLines?: string[]
  /** Payload type for card renderer: 'draft' | 'trade_grade' | 'power_rankings' | 'weekly_recap' */
  cardType: 'draft' | 'trade_grade' | 'power_rankings' | 'weekly_recap'
  /** Card payload for AICardRenderer / DraftShareCard / SocialPostCard */
  cardPayload: unknown
}
