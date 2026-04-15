/**
 * [NEW] lib/playoff-settings/types.ts
 * Sport-specific playoff stage definitions and configuration types.
 * All advanced playoff options are gated behind AF Commissioner Subscription.
 */

/** A single postseason stage that can be included/excluded. */
export interface PlayoffStageOption {
  id: string
  label: string
  description: string
  /** Does enabling this stage shorten the regular season? */
  shortensSeason: boolean
  /** How many additional fantasy weeks this stage adds. */
  additionalWeeks: number
  /** Default enabled state (free tier). */
  defaultEnabled: boolean
  /** Whether this option requires premium subscription. */
  premium: boolean
  /** Typical real-world timing (for display). */
  timing?: string
  /** Warning text if enabling has risks (e.g., roster volatility). */
  warning?: string
}

/** Complete playoff configuration for a league (stored in League.settings JSON). */
export interface PlayoffConfig {
  sport: string
  /** Which postseason stages are included. */
  includedStages: string[]
  /** Where fantasy playoffs start relative to real-world postseason. */
  startMode: string
  /** Whether the regular season was shortened to accommodate stages. */
  regularSeasonShiftApplied: boolean
  /** Adjusted regular season end week (null = use default). */
  adjustedRegularSeasonEndWeek: number | null
  /** Adjusted playoff start week (null = use default). */
  adjustedPlayoffStartWeek: number | null
  /** Total playoff weeks after adjustment. */
  adjustedPlayoffWeeks: number | null
  /** Whether premium features were used. */
  premiumFeaturesUsed: boolean
  /** Timestamp of last update. */
  lastUpdatedAt: string | null
}

/** Result of a schedule recalculation after playoff settings change. */
export interface ScheduleAdjustmentSummary {
  changes: string[]
  newRegularSeasonEndWeek: number
  newPlayoffStartWeek: number
  newPlayoffWeeks: number
  newChampionshipWeek: number
  totalWeeksChanged: number
}

/** Default empty playoff config. */
export const EMPTY_PLAYOFF_CONFIG: PlayoffConfig = {
  sport: '',
  includedStages: [],
  startMode: 'default',
  regularSeasonShiftApplied: false,
  adjustedRegularSeasonEndWeek: null,
  adjustedPlayoffStartWeek: null,
  adjustedPlayoffWeeks: null,
  premiumFeaturesUsed: false,
  lastUpdatedAt: null,
}
