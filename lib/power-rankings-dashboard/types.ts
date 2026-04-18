import type { PowerRankingsOutput, PowerRankingTeam } from '@/lib/league-power-rankings/types'

export type RankingModeId =
  | 'current_power'
  | 'weekly_power'
  | 'rest_of_season'
  | 'playoff_odds'
  | 'championship_odds'
  | 'dynasty_power'
  | 'rebuild_index'
  | 'contender_index'
  | 'momentum'
  | 'all_around'

export const RANKING_MODE_IDS: RankingModeId[] = [
  'current_power',
  'weekly_power',
  'rest_of_season',
  'playoff_odds',
  'championship_odds',
  'dynasty_power',
  'rebuild_index',
  'contender_index',
  'momentum',
  'all_around',
]

export type TimeWindowId = 'this_week' | 'last_2' | 'last_4' | 'season' | 'playoff_window' | 'dynasty_long'

export type TeamContextId =
  | 'full_league'
  | 'my_team'
  | 'specific_team'
  | 'division'
  | 'playoff_teams'
  | 'bubble'
  | 'bottom'

export type PowerRankingsDashboardInput = {
  sportFilter: 'ALL' | string
  leagueId: string | null
  userId: string
  rankingMode: RankingModeId
  timeWindow: TimeWindowId
  teamContext: TeamContextId
  specificTeamExternalId?: string | null
  week?: number | null
  toggles: {
    includeProjections: boolean
    includeScheduleStrength: boolean
    includeInjuries: boolean
    includeTransactionMomentum: boolean
    includeRookies: boolean
    includePlayoffHistory: boolean
    includeRecentForm: boolean
    includeDynastyWeighting: boolean
  }
  skipAi?: boolean
}

export type EnrichedTeamRow = PowerRankingTeam & {
  teamName: string
  avatarUrl: string | null
  externalId: string | null
  isCurrentUser: boolean
  tier: string
  momentumLabel: 'surging' | 'hot' | 'stable' | 'cold' | 'fading'
  snippet: string
  playoffOddsPct: number | null
  championshipOddsPct: number | null
}

export type PowerRankingsDashboardResult = {
  ok: true
  analysisScope: 'league' | 'none'
  engine: 'sleeper_v2' | 'league_team_fallback' | 'none'
  leagueName: string | null
  sport: string | null
  season: string | null
  week: number | null
  rankingMode: RankingModeId
  teams: EnrichedTeamRow[]
  raw: PowerRankingsOutput | null
  aiNarrative: string | null
  chimmyPayload: Record<string, unknown>
  dataGaps: string[]
  degraded: boolean
  computedAt: string
}

export type PowerRankingsDashboardError = { ok: false; error: string; code?: 'FORBIDDEN' | 'VALIDATION' }

export type PowerRankingsDashboardOutput = PowerRankingsDashboardResult | PowerRankingsDashboardError
