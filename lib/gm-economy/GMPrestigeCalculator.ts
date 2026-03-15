/**
 * GMPrestigeCalculator — computes GM prestige score (0–100) from career stats and reputation/legacy.
 */

import type { ManagerFranchiseProfileInput } from './types'

/** Weights for prestige dimensions (sum to 1.0). */
const CHAMPIONSHIP_WEIGHT = 0.3
const PLAYOFF_WEIGHT = 0.15
const TENURE_WEIGHT = 0.2
const WIN_PCT_WEIGHT = 0.2
const LEAGUE_DIVERSITY_WEIGHT = 0.15

const MAX_CHAMPIONSHIPS_FOR_SCALE = 10
const MAX_PLAYOFFS_FOR_SCALE = 30
const MAX_SEASONS_FOR_SCALE = 20
const MAX_LEAGUES_FOR_SCALE = 15

/**
 * Compute GM prestige score 0–100 from profile inputs (no external reputation/legacy here;
 * aggregator feeds in derived stats).
 */
export function computeGMPrestigeScore(profile: ManagerFranchiseProfileInput): number {
  const champScore =
    Math.min(1, profile.championshipCount / MAX_CHAMPIONSHIPS_FOR_SCALE) * 100
  const playoffScore =
    Math.min(1, profile.playoffAppearances / MAX_PLAYOFFS_FOR_SCALE) * 100
  const tenureScore =
    Math.min(1, profile.totalCareerSeasons / MAX_SEASONS_FOR_SCALE) * 100
  const winPctScore = Math.max(0, Math.min(100, profile.careerWinPercentage * 100))
  const leagueScore =
    Math.min(1, profile.totalLeaguesPlayed / MAX_LEAGUES_FOR_SCALE) * 100

  const score =
    champScore * CHAMPIONSHIP_WEIGHT +
    playoffScore * PLAYOFF_WEIGHT +
    tenureScore * TENURE_WEIGHT +
    winPctScore * WIN_PCT_WEIGHT +
    leagueScore * LEAGUE_DIVERSITY_WEIGHT

  return Math.round(Math.max(0, Math.min(100, score)) * 100) / 100
}
