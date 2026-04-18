export type MatchupLinkToolId = 'startSit' | 'trade' | 'waiver' | 'trending' | 'power' | 'injury' | 'warRoom'

export type MatchupTeamFocusId = 'my_team' | 'specific_team'

export type MatchupTimeHorizonId =
  | 'this_matchup'
  | 'next_matchup'
  | 'next_2_matchups'
  | 'playoff_window'
  | 'rest_of_season'

export type MatchupStrategyModeId =
  | 'balanced'
  | 'high_upside'
  | 'safe_floor'
  | 'aggressive'
  | 'injury_protected'
  | 'streaming_focus'
  | 'playoff_prep'
  | 'neutral'

export type MatchupPrepViewTabId =
  | 'overview'
  | 'game_plan'
  | 'lineup_edge'
  | 'opponent_weaknesses'
  | 'injuries'
  | 'schedule'
  | 'streaming'
  | 'ai_insights'

export type MatchupPrepToggles = {
  includeLiveNews: boolean
  includeInjuries: boolean
  includeScheduleAdjustments: boolean
  includeWeather: boolean
  includeStreamingRecommendations: boolean
  includeOpponentTrendAnalysis: boolean
  includePlayoffContext: boolean
  includeRookieProspectContext: boolean
}

export type MatchupPositionEdge = {
  position: string
  myPoints: number
  oppPoints: number
  edge: number
}

export type MatchupGamePlanAction = {
  id: string
  rank: number
  title: string
  detail: string
  urgency: number
  confidence: number
  source: 'start_sit' | 'injury' | 'projection' | 'schedule'
  linkTool?: MatchupLinkToolId
}

export type MatchupPrepDashboardInput = {
  userId: string
  sportFilter: 'ALL' | string
  leagueId: string | null
  teamFocus: MatchupTeamFocusId
  teamExternalId?: string | null
  opponentExternalId?: string | null
  timeHorizon: MatchupTimeHorizonId
  strategyMode: MatchupStrategyModeId
  toggles: MatchupPrepToggles
  skipAi?: boolean
}

export type MatchupPrepDashboardResult = {
  ok: true
  analysisScope: 'league' | 'general'
  leagueName: string | null
  sport: string | null
  week: number
  weekLabel: string
  myTeamName: string | null
  oppTeamName: string | null
  myRecord: string | null
  oppRecord: string | null
  myProjectedTotal: number | null
  oppProjectedTotal: number | null
  projectedEdge: number | null
  winProbability: number | null
  confidence: number
  matchupDifficulty: 'favorable' | 'even' | 'tough'
  positionEdges: MatchupPositionEdge[]
  gamePlan: MatchupGamePlanAction[]
  conflicts: Array<{ id: string; summary: string; primary: string; alternate: string }>
  injuryHighlights: Array<{ side: 'you' | 'opp'; name: string; status: string; note: string }>
  scheduleNotes: string[]
  dataGaps: string[]
  degraded: boolean
  modules: {
    myStartSit: Record<string, unknown> | null
    oppStartSit: Record<string, unknown> | null
  }
  aiSummary: string | null
  chimmyPayload: Record<string, unknown>
  computedAt: string
}

export type MatchupPrepDashboardError = { ok: false; error: string; code?: 'FORBIDDEN' | 'VALIDATION' }

export type MatchupPrepDashboardOutput = MatchupPrepDashboardResult | MatchupPrepDashboardError
