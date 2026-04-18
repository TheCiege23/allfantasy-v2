/** Matches `AIToolGridId` for deep links — keep in sync manually to avoid server→components imports. */
export type WarRoomLinkToolId = 'startSit' | 'trade' | 'waiver' | 'trending' | 'power' | 'injury'

export type WarRoomTeamContextId =
  | 'my_team'
  | 'specific_team'
  | 'league_wide'
  | 'opponent_view'
  | 'full_portfolio'

export type WarRoomStrategyId =
  | 'balanced'
  | 'win_now'
  | 'aggressive'
  | 'conservative'
  | 'rebuilder'
  | 'playoff_push'
  | 'streaming_focus'
  | 'prospect_focus'
  | 'dynasty_long_term'
  | 'neutral'

export type WarRoomTimeHorizonId =
  | 'today'
  | 'this_week'
  | 'next_2_weeks'
  | 'next_month'
  | 'rest_of_season'
  | 'playoff_window'
  | 'dynasty_long'

export type WarRoomViewTabId =
  | 'overview'
  | 'actions'
  | 'start_sit'
  | 'waivers'
  | 'trades'
  | 'injuries'
  | 'trends'
  | 'power'
  | 'schedule'
  | 'team_outlook'
  | 'ai_chat'

export type WarRoomToggles = {
  includeNews: boolean
  includeInjuries: boolean
  includeWaiverSuggestions: boolean
  includeTradeSuggestions: boolean
  includeStartSitRecommendations: boolean
  includePowerRankings: boolean
  includeTrendingPlayers: boolean
  includeRookieProspectIntel: boolean
  includePlayoffImpact: boolean
  includeDynastyWeighting: boolean
}

export type WarRoomActionSource =
  | 'start_sit'
  | 'waiver'
  | 'injury'
  | 'trend'
  | 'power'
  | 'trade'
  | 'schedule'

export type WarRoomActionItem = {
  id: string
  rank: number
  urgency: number
  confidence: number
  title: string
  detail: string
  source: WarRoomActionSource
  linkTool?: WarRoomLinkToolId
  estimatedEdgePts?: number | null
}

export type WarRoomConflict = {
  id: string
  summary: string
  primaryAction: string
  alternateAction: string
}

export type WarRoomCommandCenterInput = {
  userId: string
  sportFilter: 'ALL' | string
  leagueId: string | null
  teamContext: WarRoomTeamContextId
  strategyMode: WarRoomStrategyId
  timeHorizon: WarRoomTimeHorizonId
  specificTeamExternalId?: string | null
  opponentTeamExternalId?: string | null
  toggles: WarRoomToggles
  skipAi?: boolean
}

export type WarRoomModuleSnapshot = {
  startSit: Record<string, unknown> | null
  waiver: Record<string, unknown> | null
  injury: Record<string, unknown> | null
  trending: Record<string, unknown> | null
  power: Record<string, unknown> | null
}

export type WarRoomCommandCenterResult = {
  ok: true
  analysisScope: 'league' | 'general'
  leagueName: string | null
  sportLabel: string
  teamContextLabel: string
  strategyMode: WarRoomStrategyId
  timeHorizon: WarRoomTimeHorizonId
  overview: {
    teamName: string | null
    record: string | null
    standingRank: number | null
    powerScore: number | null
    momentumLabel: string | null
    injuryRisk: number | null
    commandPriority: number
    nextMatchupNote: string | null
    topActions: string[]
    dataFreshness: string
    degraded: boolean
  }
  scores: {
    commandPriority: number
    teamRisk: number | null
    waiverOpportunity: number | null
    contenderSignal: number | null
    trendSignal: number | null
  }
  actions: WarRoomActionItem[]
  conflicts: WarRoomConflict[]
  modules: WarRoomModuleSnapshot
  dataGaps: string[]
  aiSummary: string | null
  chimmyPayload: Record<string, unknown>
  computedAt: string
}

export type WarRoomCommandCenterError = { ok: false; error: string; code?: 'FORBIDDEN' | 'VALIDATION' }

export type WarRoomCommandCenterOutput = WarRoomCommandCenterResult | WarRoomCommandCenterError
