import type { CommissionerPlatformResponse } from '../../contracts'

/**
 * League Analytics owns executive KPI dashboards, trends, participation,
 * competitive balance, scoring distributions, transaction analytics,
 * roster utilization, and season-over-season comparisons. It is
 * distinct from League Health: League Health explains the league's
 * *current* condition (score, active risks); League Analytics is the
 * open-ended workbench for how the league has *evolved* — history,
 * benchmarking, trend lines — per the module's own placeholder
 * description carried into this implementation.
 */
export interface AnalyticsKpi {
  id: string
  label: string
  value: string
  trend?: { direction: 'up' | 'down' | 'flat'; label: string }
}

export interface AnalyticsTrendPoint {
  label: string
  value: number
}

export interface AnalyticsTrendSeries {
  id: string
  name: string
  points: AnalyticsTrendPoint[]
}

export interface CompetitiveBalanceMetric {
  label: string
  value: string
  interpretation: string
}

export interface ScoringDistributionBucket {
  rangeLabel: string
  teamCount: number
}

export interface TransactionWeek {
  weekLabel: string
  tradeCount: number
  waiverClaimCount: number
}

export interface RosterUtilizationEntry {
  teamName: string
  utilizationPercent: number
}

export interface SeasonComparisonPoint {
  seasonLabel: string
  value: number
}

/**
 * One cohesive snapshot rather than eight separate fetches — this is one
 * executive dashboard page conceptually, the same reasoning Mission
 * Control's own `MissionControlKpis` already applies to bundle several
 * numbers into a single call.
 */
export interface LeagueAnalyticsSnapshot {
  kpis: AnalyticsKpi[]
  /** Multiple named series (engagement, participation) rendered together as "league trends," plural. */
  trends: AnalyticsTrendSeries[]
  competitiveBalance: CompetitiveBalanceMetric[]
  scoringDistribution: ScoringDistributionBucket[]
  transactionsByWeek: TransactionWeek[]
  rosterUtilization: RosterUtilizationEntry[]
  seasonComparison: SeasonComparisonPoint[]
  generatedAt: string
}

/** The only shape Mission Control ever sees — computed by League Analytics over its own snapshot, never by Mission Control. */
export interface AnalyticsSummary {
  headline: string
  kpiCount: number
}

export interface AnalyticsClient {
  getSnapshot(): Promise<CommissionerPlatformResponse<LeagueAnalyticsSnapshot>>
  getSummary(): Promise<CommissionerPlatformResponse<AnalyticsSummary>>
}
