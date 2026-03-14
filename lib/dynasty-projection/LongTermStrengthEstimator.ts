import type {
  DynastyLeagueContext,
  RosterFutureValueBreakdown,
  DraftPickValueBreakdown,
  LongTermStrengthProjection,
} from './types'

function normalizeScore(value: number, leagueSize: number): number {
  const perTeam = leagueSize > 0 ? value / leagueSize : value
  return Math.round(Math.min(100, Math.max(0, perTeam / 150)))
}

export function estimateLongTermStrength(
  roster: RosterFutureValueBreakdown,
  picks: DraftPickValueBreakdown,
  ctx: DynastyLeagueContext,
): LongTermStrengthProjection {
  const leagueSize = ctx.teamCount || 12

  const nearCombined = roster.nextYearStrength + picks.nearTermContribution * 0.7
  const midCombined = roster.threeYearStrength + (picks.nearTermContribution + picks.longTermContribution) * 0.6
  const farCombined = roster.fiveYearStrength + picks.longTermContribution * 0.8

  const projectedStrengthNextYear = normalizeScore(nearCombined, leagueSize)
  const projectedStrength3Years = normalizeScore(midCombined, leagueSize)
  const projectedStrength5Years = normalizeScore(farCombined, leagueSize)

  const contenderProbability = Math.round(
    Math.min(100, Math.max(0, projectedStrengthNextYear * 0.6 + projectedStrength3Years * 0.4)),
  )

  const rebuildSignal = Math.max(
    0,
    100 - ((projectedStrengthNextYear * 0.5 + projectedStrength3Years * 0.3 + projectedStrength5Years * 0.2)),
  )
  const rebuildProbability = Math.round(Math.min(100, rebuildSignal))

  let windowStartYear: number | null = null
  let windowEndYear: number | null = null
  const strongNow = projectedStrengthNextYear >= 70
  const strongMid = projectedStrength3Years >= 70
  const strongFar = projectedStrength5Years >= 65

  if (strongNow || strongMid || strongFar) {
    const offsets: number[] = []
    if (strongNow) offsets.push(0)
    if (strongMid) offsets.push(2)
    if (strongFar) offsets.push(4)
    const minOffset = Math.min(...offsets)
    const maxOffset = Math.max(...offsets)
    windowStartYear = ctx.season + minOffset
    windowEndYear = ctx.season + maxOffset
  }

  const span = (windowEndYear ?? ctx.season) - (windowStartYear ?? ctx.season)
  const volatilityFromWindow = span >= 4 ? 70 : span >= 2 ? 55 : 40
  const volatilityFromRoster = roster.agingRiskScore * 0.4 + roster.injuryRiskScore * 0.6
  const volatilityScore = Math.round(
    Math.min(100, Math.max(0, (volatilityFromWindow * 0.3 + volatilityFromRoster * 0.7))),
  )

  return {
    projectedStrengthNextYear,
    projectedStrength3Years,
    projectedStrength5Years,
    rebuildProbability,
    contenderProbability,
    windowStartYear,
    windowEndYear,
    volatilityScore,
  }
}

