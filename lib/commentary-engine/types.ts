/**
 * AI Commentary Engine — types for real-time fantasy narration.
 */

export type CommentaryEventType =
  | 'matchup_commentary'
  | 'trade_reaction'
  | 'waiver_reaction'
  | 'playoff_drama'

export const COMMENTARY_EVENT_TYPES: CommentaryEventType[] = [
  'matchup_commentary',
  'trade_reaction',
  'waiver_reaction',
  'playoff_drama',
]

export interface CommentaryContextBase {
  leagueId: string
  sport: string
  leagueName?: string | null
}

export interface MatchupCommentaryContext extends CommentaryContextBase {
  eventType: 'matchup_commentary'
  matchupId?: string
  teamAName: string
  teamBName: string
  scoreA: number
  scoreB: number
  week?: number
  season?: number
  /** e.g. "closing in", "blowout", "nail-biter" */
  situation?: string
}

export interface TradeReactionContext extends CommentaryContextBase {
  eventType: 'trade_reaction'
  managerA: string
  managerB: string
  summary: string
  /** optional: "blockbuster", "minor", "win-now" */
  tradeType?: string
}

export interface WaiverReactionContext extends CommentaryContextBase {
  eventType: 'waiver_reaction'
  managerName: string
  playerName: string
  action: 'add' | 'drop' | 'claim'
  position?: string
  faabSpent?: number
}

export interface PlayoffDramaContext extends CommentaryContextBase {
  eventType: 'playoff_drama'
  headline: string
  summary: string
  /** e.g. "elimination", "clinch", "upset" */
  dramaType?: string
}

export type CommentaryContext =
  | MatchupCommentaryContext
  | TradeReactionContext
  | WaiverReactionContext
  | PlayoffDramaContext

export interface GeneratedCommentary {
  headline: string
  body: string
}

export interface CommentaryEntryView {
  id: string
  leagueId: string
  sport: string
  eventType: string
  headline: string
  body: string
  createdAt: Date
}
