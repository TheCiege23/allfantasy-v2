/**
 * RosterStrengthCalculator — 3-year and 5-year roster strength from roster value + aging.
 * Delegates to dynasty-projection RosterFutureValueCalculator; exposes sport-aware interface.
 */

import type { DynastyLeagueContext, PlayerDynastyAsset } from '@/lib/dynasty-projection/types'
import { calculateRosterFutureValue } from '@/lib/dynasty-projection/RosterFutureValueCalculator'

export function calculateRosterStrength(
  players: PlayerDynastyAsset[],
  ctx: DynastyLeagueContext
): { rosterStrength3Year: number; rosterStrength5Year: number; agingRiskScore: number } {
  const breakdown = calculateRosterFutureValue(players, ctx)
  return {
    rosterStrength3Year: Math.round(Math.min(100, Math.max(0, breakdown.threeYearStrength / (ctx.teamCount || 12) * 8))),
    rosterStrength5Year: Math.round(Math.min(100, Math.max(0, breakdown.fiveYearStrength / (ctx.teamCount || 12) * 8))),
    agingRiskScore: Math.round(Math.min(100, breakdown.agingRiskScore)),
  }
}
