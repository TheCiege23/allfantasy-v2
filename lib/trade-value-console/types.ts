import type { LeagueSport } from '@prisma/client'
import type { SupportedSport } from '@/lib/sport-scope'

export type TradeSportFilter = 'ALL' | SupportedSport

export type TradeStrategyMode =
  | 'contender'
  | 'rebuilder'
  | 'win_now'
  | 'long_term'
  | 'neutral'

export type TeamContextMode = 'my_team' | 'team_a' | 'team_b' | 'neutral'

export type TradeAssetInput =
  | { kind: 'player'; playerId?: string; name?: string; sportHint?: string }
  | {
      kind: 'pick'
      year: number
      round: number
      tier?: 'early' | 'mid' | 'late'
      label?: string
    }
  | { kind: 'faab'; amount: number }

export type TradeConsoleAnalyzeInput = {
  sportFilter: TradeSportFilter
  leagueId?: string | null
  userId: string | null
  leagueSize?: number
  tePremium?: boolean
  isSuperFlex?: boolean
  waiverBudget?: number
  strategy: TradeStrategyMode
  teamContext: TeamContextMode
  analysisTab: string
  sideGive: TradeAssetInput[]
  sideGet: TradeAssetInput[]
  skipAi?: boolean
  /** When true, multisport trades are allowed (rare league modes). */
  allowMultisportFairness?: boolean
  /** League team `externalId` — opponent roster for lineup / rebalance context. */
  opponentTeamExternalId?: string | null
}

export type TradeConsoleLeagueSnapshot = {
  id: string
  name: string
  sport: LeagueSport
  leagueSize: number | null
  isDynasty: boolean
  leagueType: string | null
  scoring: string | null
  isSuperFlexHint: boolean
  tePremiumHint: boolean
  waiverBudget: number | null
  taxiSlots: number | null
  leagueVariant: string | null
  bestBallMode: boolean | null
  settings: Record<string, unknown> | null
  quickModeBadges: string[]
}

export type TradeConsoleRosterSummary = {
  lineupSimulation: boolean
  yourRosterPlayers: number
  theirRosterPlayers: number
  opponentTeams: Array<{
    externalId: string
    teamName: string
    ownerName: string
    platformUserId: string | null
  }>
}

export type TradeConsolePlayerLine = {
  name: string
  playerId: string | null
  sport: string
  position: string
  team: string
  headshotUrl: string | null
  logoUrl: string | null
  injuryStatus: string | null
  dataSource: string
  composite: number
  marketValue: number
  pricedSource: 'fantasycalc' | 'sports_db' | 'faab' | 'pick' | 'unknown'
}

/** Opponent roster pieces not in the current "get" side — potential counter/ask targets. */
export type TradeConsoleOpponentRosterTarget = {
  id: string
  name: string
  position: string | null
  marketValue: number
}

/** Deterministic, data-grounded summary for UI + Chimmy (no invented stats). */
export type TradeIntelligence = {
  fairnessVerdict: string
  confidenceScore: number
  whoWinsNow: 'you' | 'opponent' | 'even'
  whoWinsLongTerm: 'you' | 'opponent' | 'even'
  contenderRecommendation: string
  rebuilderRecommendation: string
  tradeWarnings: string[]
  rebalanceSuggestions: string[]
  alternateTargetsNote: string
  leagueReasoning: string
  teamReasoning: string
  leagueHistoryNote: string | null
  /** Populated when warehouse / LeagueSeason / waiver tables have rows for this league */
  syncedDataHighlights?: string[]
}

export type TradeConsoleAnalyzeResult = {
  ok: true
  effectiveSport: SupportedSport | 'MIXED'
  analysisScope: 'league' | 'general' | 'browse_only'
  league: TradeConsoleLeagueSnapshot | null
  labels: {
    fairnessLabel: string
    sideAdvantage: 'even' | 'you' | 'opponent' | 'mixed'
    confidenceLabel: string
  }
  fairnessScore: number
  confidenceScore: number
  percentDiff: number
  giveTotal: number
  getTotal: number
  giveMarket: number
  getMarket: number
  degraded: boolean
  dataGaps: string[]
  dataSources: string[]
  lastUpdated: string | null
  players: { give: TradeConsolePlayerLine[]; get: TradeConsolePlayerLine[] }
  rosterSummary: TradeConsoleRosterSummary
  secondary: {
    rawValue: { give: number; get: number; deltaPct: number }
    teamFit: { grade: string; note: string }
    risk: { grade: string; note: string }
    scheduleImpact: { note: string }
    injuryImpact: { note: string }
    shortTermOutlook: { note: string }
    longTermOutlook: { note: string }
    positionalScarcity: { note: string }
    leagueImpact: { note: string }
    contenderScore: number
    rebuilderScore: number
  }
  drivers: Record<string, unknown>
  evaluation: { bullets: string[]; sensitivity: string }
  negotiationToolkit: Record<string, unknown> | null
  /** Present when league opponent roster was loaded; not part of the trade's receive side. */
  opponentRosterTargets?: TradeConsoleOpponentRosterTarget[]
  tradeIntelligence: TradeIntelligence
  chimmyPayload: Record<string, unknown>
}

export type TradeConsoleAnalyzeError = {
  ok: false
  error: string
  code?: 'CROSS_SPORT' | 'VALIDATION' | 'EMPTY'
}

export type TradeConsoleAnalyzeOutput = TradeConsoleAnalyzeResult | TradeConsoleAnalyzeError
