function clamp0to100(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

export function normalizeScore(value: number): number {
  return clamp0to100(value)
}

export function computeTradeFairnessScore(args: {
  sideAScore: number
  sideBScore: number
  fairnessScale: number
}): number {
  const delta = Math.abs(args.sideAScore - args.sideBScore)
  return clamp0to100(100 - Math.min(100, delta * args.fairnessScale))
}

export function computeTradeRecommendationScore(args: {
  rawValueEdge: number
  teamFitEdge: number
  shortTermEdge: number
  longTermEdge: number
  riskAdjustedEdge: number
  playoffEdge: number
}): number {
  return (
    0.35 * args.rawValueEdge +
    0.2 * args.teamFitEdge +
    0.15 * args.shortTermEdge +
    0.15 * args.longTermEdge +
    0.1 * args.riskAdjustedEdge +
    0.05 * args.playoffEdge
  )
}

export function computeWaiverScore(args: {
  opportunityScore: number
  talentUpsideScore: number
  shortTermUsability: number
  longTermStashValue: number
  rosterFitScore: number
  usageTrendScore: number
  scheduleScore: number
  playoffStashScore: number
  xBuzzScore: number
  acquisitionCostPenalty: number
}): number {
  const raw =
    0.22 * args.opportunityScore +
    0.18 * args.talentUpsideScore +
    0.15 * args.shortTermUsability +
    0.12 * args.longTermStashValue +
    0.1 * args.rosterFitScore +
    0.08 * args.usageTrendScore +
    0.07 * args.scheduleScore +
    0.05 * args.playoffStashScore +
    0.03 * args.xBuzzScore -
    0.12 * args.acquisitionCostPenalty

  return clamp0to100(raw)
}

export function computeAddDropDelta(args: {
  waiverTargetScore: number
  currentRosterSpotScore: number
}): number {
  return args.waiverTargetScore - args.currentRosterSpotScore
}

export function computeLineupSlotScore(args: {
  weeklyProjection: number
  matchupScore: number
  roleSecurity: number
  ceilingScore: number
  floorScore: number
  xNewsBoost: number
  gameEnvironment: number
  usageTrend: number
  injuryRisk: number
}): number {
  const raw =
    0.3 * args.weeklyProjection +
    0.18 * args.matchupScore +
    0.12 * args.roleSecurity +
    0.1 * args.ceilingScore +
    0.1 * args.floorScore +
    0.08 * args.xNewsBoost +
    0.07 * args.gameEnvironment +
    0.05 * args.usageTrend -
    0.12 * args.injuryRisk

  return clamp0to100(raw)
}

export function computeDraftPickScore(args: {
  valueOverAdp: number
  rosterNeedFit: number
  talentGrade: number
  positionalScarcity: number
  likelyAvailabilityPenaltyInverse: number
  buildPathFit: number
  opponentPickPredictionEdge: number
  longTermUpside: number
  xBuzzScore: number
}): number {
  const raw =
    0.24 * args.valueOverAdp +
    0.2 * args.rosterNeedFit +
    0.14 * args.talentGrade +
    0.1 * args.positionalScarcity +
    0.1 * args.likelyAvailabilityPenaltyInverse +
    0.08 * args.buildPathFit +
    0.06 * args.opponentPickPredictionEdge +
    0.05 * args.longTermUpside +
    0.03 * args.xBuzzScore

  return clamp0to100(raw)
}

export function computeLeagueHealthScore(args: {
  competitiveness: number
  parity: number
  engagement: number
  transactionFairness: number
  lineupCompliance: number
  chatHealth: number
  paymentIntegrity: number
  commissionerResponsiveness: number
}): number {
  const raw =
    0.2 * args.competitiveness +
    0.18 * args.parity +
    0.18 * args.engagement +
    0.14 * args.transactionFairness +
    0.1 * args.lineupCompliance +
    0.08 * args.chatHealth +
    0.07 * args.paymentIntegrity +
    0.05 * args.commissionerResponsiveness

  return clamp0to100(raw)
}
