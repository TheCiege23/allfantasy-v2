import type { EnrichedPlayer, LineupDecisionMode, PremiumPlayerInput } from './types'
import type { ModifierContext } from './weekly-start-score'
import { computeWeeklyStartScore, modeEffectiveObjectiveScore } from './weekly-start-score'

export function enrichPremiumPlayer(
  player: PremiumPlayerInput,
  mode: LineupDecisionMode,
  ctx: ModifierContext
): EnrichedPlayer {
  const projectedPoints = Number(player.projectedPoints ?? 0)
  const signals = { ...player }
  const base = computeWeeklyStartScore(projectedPoints, signals, ctx)
  const c = base.components
  const eff = modeEffectiveObjectiveScore(
    mode,
    base.weeklyStartScore,
    c.floorScore,
    c.ceilingScore,
    base.volatilityScore,
    projectedPoints
  )
  return {
    id: String(player.id ?? player.name),
    name: player.name,
    team: player.team,
    positions: Array.isArray(player.positions) ? player.positions : [],
    projectedPoints,
    signals,
    breakdown: {
      projectionScore: c.projectionScore,
      matchupScore: c.matchupScore,
      usageOpportunityScore: c.usageOpportunityScore,
      roleSecurityScore: c.roleSecurityScore,
      recentFormScore: c.recentFormScore,
      healthAvailabilityScore: c.healthAvailabilityScore,
      ceilingScore: c.ceilingScore,
      floorScore: c.floorScore,
      scheduleEnvironmentScore: c.scheduleEnvironmentScore,
      weeklyStartScoreRaw: base.weeklyStartScoreRaw,
      weeklyStartScore: base.weeklyStartScore,
      volatilityScore: base.volatilityScore,
      startConfidence: base.startConfidence,
      benchCost: base.benchCost,
      swapPriority: base.swapPriority,
      effectiveObjectiveScore: eff,
    },
  }
}
