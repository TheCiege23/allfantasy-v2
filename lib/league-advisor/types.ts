/**
 * AI League Advisor — types for lineup help, trade suggestions, waiver alerts, injury alerts.
 */

export type AdvisorCategory = 'lineup' | 'trade' | 'waiver' | 'injury'

export interface AdvisorLineupItem {
  summary: string
  action?: string
  priority: 'high' | 'medium' | 'low'
  playerNames?: string[]
}

export interface AdvisorTradeItem {
  summary: string
  direction?: 'buy' | 'sell' | 'hold'
  targetPlayer?: string
  priority: 'high' | 'medium' | 'low'
}

export interface AdvisorWaiverItem {
  summary: string
  addTarget?: string
  dropCandidate?: string
  priority: 'high' | 'medium' | 'low'
}

export interface AdvisorInjuryItem {
  summary: string
  playerName: string
  status?: string
  suggestedAction?: string
  priority: 'high' | 'medium' | 'low'
}

export interface LeagueAdvisorAdvice {
  lineup: AdvisorLineupItem[]
  trade: AdvisorTradeItem[]
  waiver: AdvisorWaiverItem[]
  injury: AdvisorInjuryItem[]
  generatedAt: string
  leagueId: string
  sport: string
}

export interface LeagueAdvisorContext {
  leagueId: string
  leagueName: string
  sport: string
  rosterSummary: string
  faabRemaining?: number | null
  waiverPriority?: number | null
  injurySummary: string
  waiverHint?: string
  tradeHint?: string
}
