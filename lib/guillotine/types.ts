/**
 * Shared types for the Guillotine league backend engine.
 */

import type { LeagueSport } from '@prisma/client'

export type TiebreakStep =
  | 'season_points'
  | 'previous_period'
  | 'draft_slot'
  | 'commissioner'
  | 'random'

/** Config loaded from DB (GuillotineLeagueConfig + League.sport). */
export interface GuillotineConfig {
  leagueId: string
  sport: LeagueSport
  eliminationStartWeek: number
  eliminationEndWeek: number | null
  teamsPerChop: number
  correctionWindow: 'immediate' | 'after_stat_corrections' | 'custom_cutoff'
  customCutoffDayOfWeek: number | null
  customCutoffTimeUtc: string | null
  statCorrectionHours: number | null
  tiebreakerOrder: TiebreakStep[]
  dangerMarginPoints: number | null
  rosterReleaseTiming: 'immediate' | 'next_waiver_run' | 'custom_time'
  commissionerOverride: boolean
}

/** One roster's score for a period (for evaluation and tiebreak). */
export interface PeriodScoreRow {
  rosterId: string
  displayName?: string
  periodPoints: number
  seasonPointsCumul: number
  previousPeriodPoints?: number
  draftSlot?: number
}

/** Result of week evaluation: who is eligible for chop (ranked worst-first). */
export interface GuillotineWeekEvalResult {
  leagueId: string
  weekOrPeriod: number
  season: number | null
  pastCutoff: boolean
  activeRosterIds: string[]
  scores: PeriodScoreRow[]
  orderedWorstFirst: string[]
  alreadyChoppedRosterIds: string[]
}

/** Result of running elimination (who was chopped). */
export interface GuillotineChopResult {
  leagueId: string
  weekOrPeriod: number
  choppedRosterIds: string[]
  tiebreakStepUsed: TiebreakStep | null
  reason?: string
}

/** Danger tier for one roster. */
export type DangerTier = 'chop_zone' | 'danger' | 'safe'

export interface GuillotineDangerRow {
  rosterId: string
  displayName?: string
  projectedPoints: number
  seasonPointsCumul: number
  tier: DangerTier
  rank: number
  pointsFromChopZone: number
}

/** Survival standings row (active rosters only). */
export interface GuillotineSurvivalStanding {
  rosterId: string
  displayName?: string
  rank: number
  seasonPointsCumul: number
  periodPoints?: number
  isChopped: false
}

/** Event types for GuillotineEventLog. */
export type GuillotineEventType =
  | 'first_league_entry'
  | 'post_draft_intro'
  | 'chop'
  | 'commissioner_override'
  | 'weekly_recap'
  | 'chop_animation_trigger'
  | 'roster_released'
