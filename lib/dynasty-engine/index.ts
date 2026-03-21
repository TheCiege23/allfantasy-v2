/**
 * Dynasty Engine — central export. Long-term franchise outlook, 3/5-year strength, rebuild probability.
 */

export * from './types'
export {
  getDynastySports,
  resolveSportForDynasty,
  getPeakAgeRange,
  isDynastyRelevant,
} from './SportDynastyResolver'
export {
  ageMultiplier,
  rosterAgingRiskScore,
  type Horizon,
} from './AgingCurveService'
export {
  calculateRosterFutureValue,
  valueFuturePicks,
  futureAssetScoreFromPicks,
  type DynastyLeagueContext,
  type PlayerDynastyAsset,
  type FuturePickAsset,
  type RosterFutureValueBreakdown,
  type DraftPickValueBreakdown,
} from './DynastyValueModel'
export {
  valueFuturePicks as valueDynastyFuturePicks,
  type FuturePickAsset as DynastyFuturePickAsset,
  type DraftPickValueBreakdown as DynastyDraftPickValueBreakdown,
} from './DraftPickValueModel'
export { calculateRosterStrength } from './RosterStrengthCalculator'
export {
  generateDynastyProjection,
  generateLeagueDynastyProjections,
} from './DynastyProjectionGenerator'
export {
  getDynastyProjection,
  getDynastyProjectionsForLeague,
  getDynastyContextForTeam,
} from './DynastyQueryService'
