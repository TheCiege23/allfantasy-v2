/**
 * League Settings Validation Engine.
 * Prevents invalid league configurations (e.g. auction without budgets, devy without slots, C2C without college pool).
 * Deterministic; no AI.
 */

import type { LeagueSettingsValidationResult } from './types'
import { DYNASTY_SUPPORTED_TEAM_SIZES } from '@/lib/dynasty-core/constants'

/** Input may be League.settings (snake_case), wizard payload (camelCase), or partial. */
export type LeagueSettingsInput = Record<string, unknown>

function num(x: unknown): number | null {
  if (typeof x === 'number' && !Number.isNaN(x)) return x
  if (typeof x === 'string') {
    const n = Number(x)
    return !Number.isNaN(n) ? n : null
  }
  return null
}

function arrayOfNumbers(x: unknown): number[] {
  if (!Array.isArray(x)) return []
  return x.filter((v) => typeof v === 'number' && !Number.isNaN(v))
}

/**
 * Validate league/draft settings. Returns errors that block save; warnings are advisory.
 */
export function validateLeagueSettings(input: LeagueSettingsInput): LeagueSettingsValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const draftType = (input.draft_type ?? input.draftType ?? '') as string
  const leagueType = String(input.league_type ?? input.leagueType ?? '').toLowerCase()

  // --- Auction: draft_type === 'auction' requires a positive budget ---
  const auctionBudget =
    num(input.auction_budget_per_team) ??
    num(input.auctionBudgetPerTeam) ??
    (input.draftSettings && typeof input.draftSettings === 'object' && (input.draftSettings as Record<string, unknown>).auctionBudgetPerTeam != null
      ? num((input.draftSettings as Record<string, unknown>).auctionBudgetPerTeam)
      : null)
  if (String(draftType).toLowerCase() === 'auction') {
    if (auctionBudget == null || auctionBudget <= 0) {
      errors.push('Auction draft requires a positive budget per team (auction_budget_per_team or auctionBudgetPerTeam).')
    }
  }

  // --- Devy: league_type === 'devy' or devyConfig.enabled requires non-empty devy rounds/slots ---
  const devyConfig = input.devyConfig ?? input.devy_config
  const devyRounds =
    Array.isArray((devyConfig as { devyRounds?: number[] })?.devyRounds)
      ? (devyConfig as { devyRounds: number[] }).devyRounds
      : Array.isArray((devyConfig as { devy_rounds?: number[] })?.devy_rounds)
        ? (devyConfig as { devy_rounds: number[] }).devy_rounds
        : input.draftSettings && typeof input.draftSettings === 'object'
          ? arrayOfNumbers((input.draftSettings as Record<string, unknown>).devyRounds)
          : arrayOfNumbers(input.devy_rounds ?? input.devyRounds)
  const isDevyLeague =
    String(leagueType).toLowerCase() === 'devy' ||
    (devyConfig && typeof devyConfig === 'object' && Boolean((devyConfig as { enabled?: boolean }).enabled))
  if (isDevyLeague) {
    const rounds = Array.isArray(devyRounds) ? devyRounds : []
    if (rounds.length === 0) {
      errors.push('Devy league requires at least one devy round (devyRounds / devy_rounds or devyConfig.devyRounds).')
    }
    const rosterModeDevy = (input.roster_mode ?? input.rosterMode ?? '') as string
    if (String(rosterModeDevy).toLowerCase() === 'redraft') {
      errors.push('Devy and Merged Devy / C2C are dynasty-only; they cannot be created as redraft.')
    }
  }

  // --- C2C: league_type === 'c2c' or c2cConfig.enabled requires non-empty college rounds/pool ---
  const c2cConfig = input.c2cConfig ?? input.c2c_config
  const collegeRounds =
    Array.isArray((c2cConfig as { collegeRounds?: number[] })?.collegeRounds)
      ? (c2cConfig as { collegeRounds: number[] }).collegeRounds
      : Array.isArray((c2cConfig as { college_rounds?: number[] })?.college_rounds)
        ? (c2cConfig as { college_rounds: number[] }).college_rounds
        : input.draftSettings && typeof input.draftSettings === 'object'
          ? arrayOfNumbers((input.draftSettings as Record<string, unknown>).c2cCollegeRounds)
          : arrayOfNumbers(input.c2c_college_rounds ?? input.c2cCollegeRounds)
  const isC2CLeague =
    String(leagueType).toLowerCase() === 'c2c' ||
    (c2cConfig && typeof c2cConfig === 'object' && Boolean((c2cConfig as { enabled?: boolean }).enabled))
  if (isC2CLeague) {
    const rounds = Array.isArray(collegeRounds) ? collegeRounds : []
    if (rounds.length === 0) {
      errors.push('C2C league requires at least one college round (collegeRounds / c2cCollegeRounds or c2cConfig.collegeRounds).')
    }
    const rosterModeC2C = (input.roster_mode ?? input.rosterMode ?? '') as string
    if (String(rosterModeC2C).toLowerCase() === 'redraft') {
      errors.push('Devy and Merged Devy / C2C are dynasty-only; they cannot be created as redraft.')
    }
  }

  // --- Standard redraft: no dynasty-only features (devy, taxi) ---
  if (leagueType === 'redraft') {
    const taxiSlots = num(input.taxi_slots ?? input.taxiSlots ?? 0)
    if (taxiSlots != null && taxiSlots > 0) {
      errors.push('Standard redraft leagues do not support taxi slots. Use dynasty or keeper for taxi.')
    }
    if (isDevyLeague) {
      errors.push('Standard redraft leagues do not support devy. Use dynasty/devy league type for devy.')
    }
    if (isC2CLeague) {
      errors.push('Standard redraft leagues do not support C2C. Use C2C league type for campus-to-canton.')
    }
  }

  // --- Keeper: distinct from devy/C2C; no devy or C2C in keeper mode ---
  if (leagueType === 'keeper') {
    if (isDevyLeague) {
      errors.push('Keeper leagues do not support devy. Use Devy league type for devy.')
    }
    if (isC2CLeague) {
      errors.push('Keeper leagues do not support C2C. Use C2C league type for campus-to-canton.')
    }
  }

  // --- Dynasty: league size must be in supported team sizes (4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 32) ---
  const rosterMode = (input.roster_mode ?? input.rosterMode ?? '') as string
  const leagueSize = num(input.league_size ?? input.leagueSize ?? input.leagueSize)
  const isDynasty =
    String(rosterMode).toLowerCase() === 'dynasty' ||
    String(leagueType).toLowerCase() === 'dynasty' ||
    String(leagueType).toLowerCase() === 'devy' ||
    isDevyLeague ||
    isC2CLeague
  if (isDynasty && leagueSize != null) {
    if (!(DYNASTY_SUPPORTED_TEAM_SIZES as readonly number[]).includes(leagueSize)) {
      errors.push(
        `Dynasty league size must be one of: ${(DYNASTY_SUPPORTED_TEAM_SIZES as readonly number[]).join(', ')}.`
      )
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Alias for validateLeagueSettings (LeagueSettingsValidator entry point).
 */
export function validate(input: LeagueSettingsInput): LeagueSettingsValidationResult {
  return validateLeagueSettings(input)
}
