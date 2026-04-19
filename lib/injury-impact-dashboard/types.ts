import type { LeagueToolAccessErrorCode } from '@/lib/ai-tools/league-tool-context-types'
import type { AiTimeContextPayload } from '@/lib/time-engine/types'

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

export type InjuryReturnCategory =
  | 'day_to_day'
  | 'week_to_week'
  | 'weeks_window'
  | 'expected_return_week'
  | 'ir_return_eligible'
  | 'season_ending'
  | 'unknown'

/**
 * Return-window parsed from injury feed text — a best-effort interpretation, never invented.
 * `weeks` holds midpoint weeks when a range is stated; null otherwise.
 * `returnWeek` holds a concrete league week when the feed specifies one.
 */
export type InjuryReturnTimeline = {
  category: InjuryReturnCategory
  weeks: number | null
  returnWeek: number | null
  rawText: string | null
  /** Human-readable summary for UI. */
  label: string
}

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
    /**
     * When true and a league is selected, run Waiver Intelligence once and attach
     * named FA suggestions to each severe on-roster injury (at matching position).
     */
    includeWaiverReplacements?: boolean
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
  /** League-scored weekly projection when engine + DB rows exist. */
  effectiveProjection?: number | null
  projectionNotes?: string[]
  injuryNewsSummary?: string | null
  /** Human-readable recency — not a clinical timeline. */
  freshnessNote?: string | null
  /** Sport/position structural replacement guidance (no named players). */
  replacementHint?: string | null
  /**
   * Named free agents that could fill this slot — populated only when
   * `toggles.includeWaiverReplacements` is on and the league has a resolvable FA pool.
   * Empty array signals we looked but found none; omitted field signals we didn't look.
   */
  suggestedWaiverAdds?: Array<{
    name: string
    position: string
    team: string
    faabPct: number
    tier: string
    why: string
    playerId: string
  }>
  /** Parsed return-window info; null when feed has no usable text. */
  returnTimeline?: InjuryReturnTimeline | null
}

export type InjuryImpactValidation = {
  leagueContextResolved: boolean
  rosterContextAvailable: boolean
  projectionLayerReady: boolean
  injuryNewsLayerReady: boolean
  timeContextPresent: boolean
}

/**
 * Top-level injury_report feed health — separate from per-row freshness so UI can show
 * "feed is 12 days stale" when the provider is down, independent of any single player row.
 */
export type InjuryFeedFreshness = {
  latestReportDateIso: string | null
  staleHours: number | null
  /** True when the feed's most recent row is older than the configured stale threshold. */
  stale: boolean
  /** Sample size of rows examined (useful to distinguish "empty feed" vs "no rows for scope"). */
  rowsSeen: number
}

export type InjuryIntegrationHints = {
  startSit: string
  waiverWire: string
  matchupPrep: string
  warRoom: string
}

export type InjuryImpactDashboardResult = {
  ok: true
  analysisMode: 'league' | 'global'
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
  timeContext?: AiTimeContextPayload | null
  validation: InjuryImpactValidation
  feedFreshness: InjuryFeedFreshness
  summaryLine: string
  dataQuality: 'full' | 'partial' | 'degraded'
  integrationHints: InjuryIntegrationHints
}

export type InjuryImpactDashboardError = {
  ok: false
  error: string
  /** Machine-readable; prefer over parsing `error` string */
  code?: LeagueToolAccessErrorCode | 'FORBIDDEN' | 'VALIDATION'
  userMessage?: string
}

export type InjuryImpactDashboardOutput = InjuryImpactDashboardResult | InjuryImpactDashboardError
