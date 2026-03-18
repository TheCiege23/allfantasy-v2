/**
 * Common automation modules for specialty leagues (PROMPT 350).
 * Shared patterns: weekly runner, event append, season points source for tie-break.
 */

import type { LeagueSport } from '@prisma/client'

/** Run weekly (or period) automation for a league. Dispatches to spec.runAutomation when present. */
export type WeeklyAutomationRunner = (args: {
  leagueId: string
  weekOrPeriod: number
  sport: LeagueSport
  specId: string
}) => Promise<{ ok: boolean; error?: string }>

/** Append event to league-specific event log. Event types are league-specific. */
export type AppendEventFn = (
  leagueId: string,
  eventType: string,
  metadata?: Record<string, unknown>
) => Promise<void>

/**
 * Common season-points source for tie-break (e.g. Survivor vote tie).
 * Try league-specific period scores first; fall back to TeamPerformance sum.
 */
export type SeasonPointsSourceFactory = (
  leagueId: string
) => {
  getSeasonPointsForRoster(leagueId: string, rosterId: string, throughWeek: number): Promise<number>
}

/** Automation categories that specialty leagues can implement. */
export const COMMON_AUTOMATION_HOOKS = [
  'weekly_evaluation',      // e.g. elimination, danger tier
  'period_close',           // e.g. close council, lock challenge
  'token_award',            // e.g. exile top scorer
  'boss_reset',             // e.g. reset tokens when commissioner wins
  'merge_check',            // e.g. trigger merge at week or player count
  'jury_enrollment',        // e.g. add eliminated to jury
  'return_eligibility',     // e.g. check exile return at N tokens
  'event_log_append',       // audit / event log
  'weekly_finalization',    // e.g. infection, serum/weapon awards, winnings (Zombie)
  'movement_refresh',      // e.g. refresh promotion/relegation projections (Zombie universe)
  'weekly_board_generation', // e.g. Chompin' Block, risk list (Zombie)
  'collusion_evaluation',   // e.g. evaluate and record collusion flags
  'dangerous_drop_evaluation', // e.g. evaluate valuable drops vs threshold
  'replacement_workflow',   // e.g. inactivity/replacement owner triggers
] as const

export type CommonAutomationHookId = (typeof COMMON_AUTOMATION_HOOKS)[number]
