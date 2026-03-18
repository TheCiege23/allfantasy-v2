/**
 * Devy Dynasty roster rules: lineup legality, devy slots, taxi, reserve. PROMPT 2/6.
 * Deterministic: devy college players do NOT score until promoted.
 */

import type { DevyLeagueConfigShape } from '../types'

export interface RosterSlotConstraint {
  slotName: string
  slotType: 'starter' | 'bench' | 'ir' | 'taxi' | 'devy'
  maxCount: number
  /** Devy slots accept only devy-eligible (college) players who have not graduated. */
  devyOnly?: boolean
  /** Taxi slots typically accept rookies or devy; rules are league-specific. */
  taxiEligible?: boolean
}

export interface LineupLegalityResult {
  legal: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validate that a roster respects devy slot constraints.
 * - Devy slots: only devy-eligible, non-graduated players.
 * - Starters/bench: pro (veteran or graduated) only for scoring; devy players in devy slots do not score.
 */
export function validateDevyRosterSlots(args: {
  config: DevyLeagueConfigShape
  devySlotCount: number
  /** Count of players currently in devy slots that are devy-eligible and not graduated. */
  devySlotsFilled: number
  /** Count of players in devy slots that are graduated (illegal). */
  devySlotsGraduated: number
}): LineupLegalityResult {
  const { config, devySlotCount, devySlotsFilled, devySlotsGraduated } = args
  const errors: string[] = []
  const warnings: string[] = []

  if (devySlotsGraduated > 0) {
    errors.push(`Devy slots must not contain graduated players. Move ${devySlotsGraduated} to active/bench.`)
  }

  if (devySlotsFilled > devySlotCount) {
    errors.push(`Devy slots overflow: ${devySlotsFilled} devy players but only ${devySlotCount} devy slots.`)
  }

  return {
    legal: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Devy players do not score until promoted (graduated to pro).
 * Use this when computing best ball or lineup optimization: exclude devy-only players from scoring.
 */
export function isEligibleToScore(isDevyPlayer: boolean, isGraduated: boolean): boolean {
  if (!isDevyPlayer) return true
  return isGraduated
}

/**
 * Resolve effective devy slot count from config (commissioner setting).
 */
export function getDevySlotCount(config: DevyLeagueConfigShape): number {
  return config.devySlotCount
}

/**
 * Resolve effective taxi size from config.
 */
export function getTaxiSize(config: DevyLeagueConfigShape): number {
  return config.taxiSize
}
