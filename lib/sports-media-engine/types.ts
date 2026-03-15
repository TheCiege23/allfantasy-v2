/**
 * AI Sports Media Engine — types for generated league news and narratives.
 */

export type MediaArticleTag =
  | 'weekly_recap'
  | 'power_rankings'
  | 'trade_breakdown'
  | 'upset_alert'
  | 'playoff_preview'
  | 'championship_recap'
  | 'general'

export interface MediaArticleRecord {
  id: string
  leagueId: string
  sport: string
  headline: string
  body: string
  tags: string[]
  createdAt: Date
}

export interface GenerationContext {
  leagueId: string
  sport: string
  leagueName?: string
  season?: string
  week?: number
  /** Team/standings data for recaps and power rankings */
  teams: TeamStandingRow[]
  /** Optional: season results (wins, losses, champion) */
  seasonResults?: SeasonResultRow[]
  /** Optional: narrative hints (e.g. biggest upset, top performer) */
  highlights?: string[]
  /** Optional: trade summary for trade_breakdown */
  tradeSummary?: string
}

export interface TeamStandingRow {
  teamId: string
  teamName: string
  ownerName: string
  wins: number
  losses: number
  ties?: number
  pointsFor: number
  pointsAgainst: number
  rank?: number
}

export interface SeasonResultRow {
  rosterId: string
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
  champion: boolean
}

export type ArticleGenerationType =
  | 'weekly_recap'
  | 'power_rankings'
  | 'trade_breakdown'
  | 'upset_alert'
  | 'playoff_preview'
  | 'championship_recap'

export interface GeneratedArticle {
  headline: string
  body: string
  tags: string[]
}
