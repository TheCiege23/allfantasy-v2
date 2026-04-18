export type InjuryTeamContextId =
  | 'my_team'
  | 'specific_team'
  | 'full_league'
  | 'opponent_team'
  | 'league_wide_risk'
  | 'neutral'

export type InjuryStatusFilterId =
  | 'all'
  | 'healthy_monitoring'
  | 'questionable'
  | 'doubtful'
  | 'out'
  | 'ir'
  | 'suspended'
  | 'gtd'
  | 'day_to_day'
  | 'week_to_week'
  | 'long_term'
  | 'returning_soon'

export type InjuryTimeHorizonId =
  | 'today'
  | 'this_week'
  | 'next_2_weeks'
  | 'next_month'
  | 'rest_of_season'
  | 'playoff_window'
  | 'dynasty_long'

export type InjuryViewTabId =
  | 'live'
  | 'team_impact'
  | 'league_impact'
  | 'replacements'
  | 'start_sit_risk'
  | 'waiver'
  | 'trade'
  | 'return_tracker'
  | 'ai'

export type InjurySeverityBucket = 'out' | 'ir' | 'doubtful' | 'questionable' | 'probable' | 'gtd' | 'suspended' | 'other'

export type InjuryImpactDashboardInput = {
  userId: string
  sportFilter: 'ALL' | string
  leagueId: string | null
  teamContext: InjuryTeamContextId
  specificTeamExternalId?: string | null
  opponentTeamExternalId?: string | null
  statusFilter: InjuryStatusFilterId
  timeHorizon: InjuryTimeHorizonId
  toggles: {
    includePractice: boolean
    includeNews: boolean
    includeReturnTimelines: boolean
    includeHandcuffs: boolean
    includePlayoffImpact: boolean
    includeDynastyImpact: boolean
  }
  skipAi?: boolean
}

export type InjuryPlayerIntelRow = {
  playerKey: string
  name: string
  position: string
  team: string
  sport: string
  statusRaw: string
  severity: InjurySeverityBucket
  source: 'injury_report' | 'sports_player_record'
  sourceId: string
  notes: string | null
  practice: string | null
  gameStatus: string | null
  reportDate: string | null
  lastUpdated: string | null
  onRoster: boolean
  isStarter: boolean
  headshotUrl: string | null
  impactScore: number
  lineupDisruption: number
  replacementUrgency: number
  confidence: number
  dataGaps: string[]
}

export type InjuryImpactDashboardResult = {
  ok: true
  analysisScope: 'league' | 'general'
  leagueName: string | null
  sportLabel: string
  leagueSport: string | null
  overallRisk: number
  summaryCounts: {
    outIr: number
    doubtful: number
    questionable: number
    limited: number
    fullPractice: number
  }
  players: InjuryPlayerIntelRow[]
  aiNarrative: string | null
  chimmyPayload: Record<string, unknown>
  dataGaps: string[]
  degraded: boolean
  computedAt: string
}

export type InjuryImpactDashboardError = { ok: false; error: string; code?: 'FORBIDDEN' | 'VALIDATION' }

export type InjuryImpactDashboardOutput = InjuryImpactDashboardResult | InjuryImpactDashboardError
