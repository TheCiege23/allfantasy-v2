/**
 * FranchiseValueResolver — computes franchise value from prestige, championships, tenure, win rate.
 * Used by GMEconomyEngine to set ManagerFranchiseProfile.franchiseValue.
 */

import type { ManagerFranchiseProfileInput } from './types'

const BASE_VALUE = 100
const PRESTIGE_WEIGHT = 2.5
const CHAMPIONSHIP_WEIGHT = 500
const PLAYOFF_WEIGHT = 50
const SEASONS_WEIGHT = 20
const WIN_PCT_WEIGHT = 200

/**
 * Compute franchise value (single number for display/ranking) from profile inputs.
 * Scale is arbitrary but consistent; higher = more valuable franchise.
 */
export function computeFranchiseValue(profile: ManagerFranchiseProfileInput): number {
  const prestige = Math.max(0, Math.min(100, profile.gmPrestigeScore))
  const winPct = Math.max(0, Math.min(1, profile.careerWinPercentage))
  const value =
    BASE_VALUE +
    prestige * PRESTIGE_WEIGHT +
    profile.championshipCount * CHAMPIONSHIP_WEIGHT +
    profile.playoffAppearances * PLAYOFF_WEIGHT +
    profile.totalCareerSeasons * SEASONS_WEIGHT +
    winPct * WIN_PCT_WEIGHT
  return Math.round(value * 100) / 100
}
