/**
 * [NEW] lib/big-brother/types.ts
 * Big Brother League — shared types for config, cycles, and game loop.
 * PROMPT 2/6.
 */

import type { LeagueSport } from '@prisma/client'

/** Phase of the weekly eviction cycle. */
export type BigBrotherPhase =
  | 'hoh_challenge'
  | 'nomination'
  | 'veto_draw'
  | 'veto_challenge'
  | 'veto_decision'
  | 'replacement_nominee'
  | 'eviction_vote'
  | 'eviction'
  | 'jury_transition'
  | 'finale'

/** Jury start mode. */
export type JuryStartMode = 'after_eliminations' | 'when_remaining' | 'fixed_week'

/** Finale format. */
export type FinaleFormat = 'final_2' | 'final_3'

/** Waiver release timing after eviction. */
export type WaiverReleaseTiming = 'immediate' | 'next_waiver_run' | 'faab_window'

/** Public vote totals visibility. */
export type PublicVoteTotalsVisibility = 'exact' | 'evicted_only'

/** Challenge mode for HOH/veto. */
export type ChallengeMode = 'ai_theme' | 'deterministic_score' | 'hybrid'

/** Inactive player handling. */
export type InactivePlayerHandling = 'none' | 'replacement_after_n_weeks' | 'commissioner_only'

/** Auto-nomination fallback when HOH times out. */
export type AutoNominationFallback = 'lowest_season_points' | 'random' | 'commissioner'

/** Config loaded from DB (BigBrotherLeagueConfig + League.sport). */
export interface BigBrotherConfig {
  leagueId: string
  configId: string
  sport: LeagueSport
  hohChallengeDayOfWeek: number | null
  hohChallengeTimeUtc: string | null
  nominationDeadlineDayOfWeek: number | null
  nominationDeadlineTimeUtc: string | null
  vetoDrawDayOfWeek: number | null
  vetoDrawTimeUtc: string | null
  vetoDecisionDeadlineDayOfWeek: number | null
  vetoDecisionDeadlineTimeUtc: string | null
  replacementNomineeDeadlineDayOfWeek: number | null
  replacementNomineeDeadlineTimeUtc: string | null
  evictionVoteOpenDayOfWeek: number | null
  evictionVoteOpenTimeUtc: string | null
  evictionVoteCloseDayOfWeek: number | null
  evictionVoteCloseTimeUtc: string | null
  finalNomineeCount: number
  vetoCompetitorCount: number
  consecutiveHohAllowed: boolean
  hohVotesOnlyInTie: boolean
  juryStartMode: JuryStartMode
  juryStartAfterEliminations: number | null
  juryStartWhenRemaining: number | null
  juryStartWeek: number | null
  finaleFormat: FinaleFormat
  waiverReleaseTiming: WaiverReleaseTiming
  publicVoteTotalsVisibility: PublicVoteTotalsVisibility
  challengeMode: ChallengeMode
  antiCollusionLogging: boolean
  inactivePlayerHandling: InactivePlayerHandling
  autoNominationFallback: AutoNominationFallback
}

/** Cycle row for a single week. */
export interface BigBrotherCycleRow {
  id: string
  leagueId: string
  configId: string
  week: number
  hohRosterId: string | null
  nominee1RosterId: string | null
  nominee2RosterId: string | null
  vetoWinnerRosterId: string | null
  vetoParticipantRosterIds: string[] | null
  vetoUsed: boolean
  vetoSavedRosterId: string | null
  replacementNomineeRosterId: string | null
  evictedRosterId: string | null
  voteDeadlineAt: Date | null
  voteOpenedAt: Date | null
  closedAt: Date | null
  tieBreakSeasonPoints: Record<string, number> | null
}

/** Eviction vote tally result. */
export interface BigBrotherVoteTally {
  cycleId: string
  votesByTarget: Record<string, number>
  tied: boolean
  evictedRosterId: string | null
  tieBreakSeasonPoints: Record<string, number> | null
}

/** Result of closing an eviction cycle. */
export interface BigBrotherEvictionResult {
  cycleId: string
  week: number
  evictedRosterId: string
  voteCount: Record<string, number>
  tieBreakUsed: boolean
  juryEnrolled: boolean
}
