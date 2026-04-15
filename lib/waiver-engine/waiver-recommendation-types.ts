/**
 * Waiver Recommendation Types & Scoring Model
 *
 * Unified JSON schema for the upgraded waiver AI output.
 * Includes the WaiverFitScore composite formula and classification system.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Recommendation Type Classification
// ---------------------------------------------------------------------------

export const RecommendationTypeEnum = z.enum([
  'Immediate Starter',
  'Short-Term Streamer',
  'Injury Fill-In',
  'High-Upside Stash',
  'Dynasty Stash',
  'Bye Week Cover',
  'Handcuff Protection',
  'Playoff Stash',
  'Schedule-Based Pickup',
  'Speculative Add',
])

export type RecommendationType = z.infer<typeof RecommendationTypeEnum>

// ---------------------------------------------------------------------------
// Timing
// ---------------------------------------------------------------------------

export const TimingRecommendationEnum = z.enum([
  'Add now',
  'Bid tonight',
  'Wait and monitor',
  'Injury contingency add',
])

export type TimingRecommendation = z.infer<typeof TimingRecommendationEnum>

// ---------------------------------------------------------------------------
// Drop Confidence
// ---------------------------------------------------------------------------

export const DropConfidenceEnum = z.enum(['safe', 'medium', 'risky'])
export type DropConfidence = z.infer<typeof DropConfidenceEnum>

// ---------------------------------------------------------------------------
// Factual Evidence
// ---------------------------------------------------------------------------

export const FactualEvidenceSchema = z.object({
  source: z.enum(['league', 'roster', 'news', 'model', 'waiver_pool', 'schedule']),
  metric: z.string(),
  value: z.string(),
})

export type FactualEvidence = z.infer<typeof FactualEvidenceSchema>

// ---------------------------------------------------------------------------
// Suggestion Schema
// ---------------------------------------------------------------------------

export const WaiverSuggestionV2Schema = z.object({
  playerName: z.string(),
  position: z.string(),
  team: z.string().nullable(),
  recommendationType: RecommendationTypeEnum,
  rank: z.number().int().min(1),
  waiverFitScore: z.number().min(0).max(100),
  needFitScore: z.number().min(0).max(100),
  leagueFitScore: z.number().min(0).max(100),
  opportunityScore: z.number().min(0).max(100),
  shortTermProjection: z.number().min(0).max(100),
  longTermUpside: z.number().min(0).max(100),
  rosterUpgradeDelta: z.number().min(0).max(100),
  newsUrgency: z.number().min(0).max(100),
  faabBidRecommendation: z.number().min(0),
  faabBidConservative: z.number().min(0).optional(),
  faabBidAggressive: z.number().min(0).optional(),
  faabBidConfidence: z.enum(['high', 'medium', 'low']).optional(),
  faabBidRationale: z.string().optional(),
  claimPriorityRecommendation: z.number().nullable(),
  dropCandidate: z.string().nullable(),
  dropConfidence: DropConfidenceEnum.nullable(),
  dropReason: z.string().nullable().optional(),
  reason: z.array(z.string()).min(1),
  timingRecommendation: TimingRecommendationEnum,
  urgencyScore: z.number().min(0).max(100),
  factualEvidence: z.array(FactualEvidenceSchema),
  /** Why this fits YOUR team specifically */
  teamFitExplanation: z.string().optional(),
})

export type WaiverSuggestionV2 = z.infer<typeof WaiverSuggestionV2Schema>

// ---------------------------------------------------------------------------
// Team Diagnosis
// ---------------------------------------------------------------------------

export const TeamDiagnosisSchema = z.object({
  teamDirection: z.string(),
  biggestNeeds: z.array(z.string()),
  benchProblems: z.array(z.string()),
  riskSummary: z.array(z.string()),
})

export type TeamDiagnosis = z.infer<typeof TeamDiagnosisSchema>

// ---------------------------------------------------------------------------
// Strategy Notes
// ---------------------------------------------------------------------------

export const StrategyNotesV2Schema = z.object({
  faabPlan: z.string(),
  claimApproach: z.string(),
  stashVsPointsGuidance: z.string(),
})

export type StrategyNotesV2 = z.infer<typeof StrategyNotesV2Schema>

// ---------------------------------------------------------------------------
// Callouts
// ---------------------------------------------------------------------------

export const CalloutsSchema = z.object({
  bestAddForPoints: z.string().nullable(),
  bestAddForUpside: z.string().nullable(),
  safestAdd: z.string().nullable(),
  mostAggressiveAdd: z.string().nullable(),
  bestDeepLeagueAdd: z.string().nullable(),
  bestDynastyStash: z.string().nullable(),
  bestDropCandidate: z.string().nullable(),
  holdFAABRecommendation: z.boolean(),
})

export type Callouts = z.infer<typeof CalloutsSchema>

// ---------------------------------------------------------------------------
// Full Response Schema
// ---------------------------------------------------------------------------

export const WaiverResponseV2Schema = z.object({
  suggestions: z.array(WaiverSuggestionV2Schema).max(8),
  teamDiagnosis: TeamDiagnosisSchema,
  rosterAlerts: z.array(z.string()),
  strategyNotes: StrategyNotesV2Schema,
  callouts: CalloutsSchema,
})

export type WaiverResponseV2 = z.infer<typeof WaiverResponseV2Schema>

// ---------------------------------------------------------------------------
// WaiverFitScore Composite Formula
// ---------------------------------------------------------------------------

export interface WaiverFitScoreInput {
  needFit: number         // 0-100
  leagueFit: number       // 0-100
  opportunityScore: number // 0-100
  shortTermProjection: number // 0-100
  longTermUpside: number  // 0-100
  rosterUpgradeDelta: number // 0-100
  newsUrgency: number     // 0-100
}

/**
 * Compute the composite WaiverFitScore using the weighted formula:
 *   NeedFit * 0.30 +
 *   LeagueFit * 0.20 +
 *   OpportunityScore * 0.15 +
 *   ShortTermProjection * 0.10 +
 *   LongTermUpside * 0.10 +
 *   RosterUpgradeDelta * 0.10 +
 *   NewsUrgency * 0.05
 */
export function computeWaiverFitScore(input: WaiverFitScoreInput): number {
  const score =
    input.needFit * 0.30 +
    input.leagueFit * 0.20 +
    input.opportunityScore * 0.15 +
    input.shortTermProjection * 0.10 +
    input.longTermUpside * 0.10 +
    input.rosterUpgradeDelta * 0.10 +
    input.newsUrgency * 0.05

  return Math.round(Math.max(0, Math.min(100, score)))
}

// ---------------------------------------------------------------------------
// Recommendation Type Classification Logic
// ---------------------------------------------------------------------------

export function classifyRecommendationType(input: {
  needFitScore: number
  shortTermProjection: number
  longTermUpside: number
  isInjuryOpportunity: boolean
  isByeWeekCover: boolean
  isHandcuff: boolean
  isDynastyStash: boolean
  isScheduleBased: boolean
  goal: 'win-now' | 'balanced' | 'rebuild'
  leagueFormat: string
}): RecommendationType {
  // Priority order of classification
  if (input.isInjuryOpportunity && input.shortTermProjection >= 60) return 'Injury Fill-In'
  if (input.isByeWeekCover) return 'Bye Week Cover'
  if (input.isHandcuff) return 'Handcuff Protection'

  if (input.needFitScore >= 70 && input.shortTermProjection >= 65) return 'Immediate Starter'

  if (input.isDynastyStash && input.leagueFormat === 'dynasty') return 'Dynasty Stash'

  if (input.isScheduleBased && input.shortTermProjection >= 50) return 'Schedule-Based Pickup'

  if (input.longTermUpside >= 70 && input.shortTermProjection < 50) return 'High-Upside Stash'

  if (input.shortTermProjection >= 55 && input.needFitScore >= 40) return 'Short-Term Streamer'

  if (input.longTermUpside >= 60 && input.goal !== 'win-now') return 'Playoff Stash'

  return 'Speculative Add'
}

// ---------------------------------------------------------------------------
// Urgency Score
// ---------------------------------------------------------------------------

export function computeUrgencyScore(input: {
  needFitScore: number
  newsUrgency: number
  isInjuryOpportunity: boolean
  timeSensitive: boolean
  leagueDemand: number
}): number {
  let score = 0
  score += input.needFitScore * 0.35
  score += input.newsUrgency * 0.25
  if (input.isInjuryOpportunity) score += 20
  if (input.timeSensitive) score += 15
  score += input.leagueDemand * 0.10
  return Math.round(Math.max(0, Math.min(100, score)))
}
