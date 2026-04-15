/**
 * Waiver FAAB Engine
 *
 * Context-sensitive FAAB bid logic. Every bid considers budget, week,
 * team direction, urgency, scarcity, market pressure, and player type.
 */

import type { DecisionFacts, LeagueFacts } from './waiver-deterministic-facts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FaabContext {
  faabRemaining: number
  totalFaabBudget: number
  currentWeek: number
  totalWeeks: number
  leagueDepthIndex: number
  contenderWindowScore: number
  faabAggressionScore: number
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low' | 'none'
  /** Average FAAB remaining across league */
  leagueAvgFaabRemaining?: number
  goal: 'win-now' | 'balanced' | 'rebuild'
}

export interface FaabBidResult {
  /** Recommended bid (0 to faabRemaining) */
  recommended: number
  /** Conservative bid */
  conservative: number
  /** Aggressive bid */
  aggressive: number
  /** Bid as percentage of remaining budget */
  recommendedPct: number
  /** Confidence in the bid recommendation */
  bidConfidence: 'high' | 'medium' | 'low'
  /** Why this bid makes sense */
  rationale: string
}

export type FaabStrategyNote =
  | 'spend_now'
  | 'preserve_budget'
  | 'selective_aggression'
  | 'all_in_contending'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function seasonProgressPct(currentWeek: number, totalWeeks: number): number {
  if (totalWeeks <= 0) return 0.5
  return clamp(currentWeek / totalWeeks, 0, 1)
}

// ---------------------------------------------------------------------------
// FAAB Bid Computation
// ---------------------------------------------------------------------------

export interface FaabBidInput {
  /** How well the player fits a team need (0-100) */
  needFitScore: number
  /** How scarce this position is on waivers (0-100) */
  positionScarcity: number
  /** Player's composite value score (0-100) */
  compositeScore: number
  /** Whether this is a short-term rental or long-term value */
  playerType: 'immediate_starter' | 'streamer' | 'stash' | 'handcuff' | 'injury_fill' | 'other'
  /** Whether multiple managers are likely to bid (crowd demand signal) */
  highDemand: boolean
  /** News urgency for this player (0-100) */
  newsUrgency: number
}

export function computeFaabBid(
  input: FaabBidInput,
  ctx: FaabContext,
): FaabBidResult {
  if (ctx.faabRemaining <= 0) {
    return {
      recommended: 0,
      conservative: 0,
      aggressive: 0,
      recommendedPct: 0,
      bidConfidence: 'low',
      rationale: 'No FAAB remaining',
    }
  }

  const progress = seasonProgressPct(ctx.currentWeek, ctx.totalWeeks)

  // Base bid as percentage of remaining budget
  let basePct = 0

  // Start from composite score → base percentage
  if (input.compositeScore >= 85) basePct = 25
  else if (input.compositeScore >= 70) basePct = 15
  else if (input.compositeScore >= 55) basePct = 8
  else if (input.compositeScore >= 40) basePct = 4
  else basePct = 1

  // --- Modifiers ---

  // Need fit boost
  if (input.needFitScore >= 80) basePct *= 1.4
  else if (input.needFitScore >= 60) basePct *= 1.2

  // Scarcity boost
  if (input.positionScarcity >= 80) basePct *= 1.3
  else if (input.positionScarcity >= 60) basePct *= 1.1

  // Player type modifier
  switch (input.playerType) {
    case 'immediate_starter':
      basePct *= 1.5
      break
    case 'injury_fill':
      basePct *= 1.2
      break
    case 'streamer':
      basePct *= 0.6
      break
    case 'stash':
      basePct *= 0.5
      break
    case 'handcuff':
      basePct *= 0.4
      break
    default:
      break
  }

  // Team direction modifier
  if (ctx.goal === 'win-now') {
    if (input.playerType === 'immediate_starter' || input.playerType === 'injury_fill') {
      basePct *= 1.3
    }
    if (input.playerType === 'stash') basePct *= 0.5
  } else if (ctx.goal === 'rebuild') {
    if (input.playerType === 'streamer') basePct *= 0.3
    if (input.playerType === 'stash') basePct *= 1.2
  }

  // Season progress modifier
  if (progress >= 0.7) {
    // Late season: contenders bid more, rebuilders less
    if (ctx.goal === 'win-now') basePct *= 1.2
    else basePct *= 0.6
  } else if (progress <= 0.2) {
    // Early season breakouts: worth more
    if (input.playerType === 'immediate_starter') basePct *= 1.2
  }

  // Market pressure (high demand = bid up)
  if (input.highDemand) basePct *= 1.3

  // News urgency boost
  if (input.newsUrgency >= 70) basePct *= 1.2
  else if (input.newsUrgency >= 40) basePct *= 1.05

  // League depth modifier
  if (ctx.leagueDepthIndex >= 70) basePct *= 1.2 // deeper league = more competition

  // Apply aggression score
  const aggressionMult = 0.7 + (ctx.faabAggressionScore / 100) * 0.6 // 0.7 to 1.3
  basePct *= aggressionMult

  // Clamp percentage
  basePct = clamp(basePct, 0, 80)

  // Convert to absolute bid
  const recommended = Math.round(ctx.faabRemaining * (basePct / 100))
  const conservative = Math.round(recommended * 0.6)
  const aggressive = Math.min(ctx.faabRemaining, Math.round(recommended * 1.6))

  // Confidence
  let bidConfidence: FaabBidResult['bidConfidence'] = 'medium'
  if (input.needFitScore >= 70 && input.compositeScore >= 60) bidConfidence = 'high'
  else if (input.needFitScore < 40 || input.compositeScore < 30) bidConfidence = 'low'

  // Rationale
  const parts: string[] = []
  if (input.needFitScore >= 70) parts.push('strong roster fit')
  if (input.positionScarcity >= 70) parts.push('scarce position')
  if (input.playerType === 'immediate_starter') parts.push('immediate starter upgrade')
  if (input.highDemand) parts.push('high league demand expected')
  if (ctx.goal === 'win-now' && input.playerType !== 'stash') parts.push('contender window open')
  if (ctx.goal === 'rebuild' && input.playerType === 'stash') parts.push('fits rebuild strategy')
  if (progress >= 0.7 && ctx.goal === 'win-now') parts.push('playoff push urgency')

  const rationale = parts.length > 0
    ? `Bid justified by: ${parts.join(', ')}`
    : 'Standard bid based on player value'

  return {
    recommended: Math.max(0, recommended),
    conservative: Math.max(0, conservative),
    aggressive: Math.max(0, aggressive),
    recommendedPct: Math.round(basePct * 10) / 10,
    bidConfidence,
    rationale,
  }
}

// ---------------------------------------------------------------------------
// Top-Level Strategy Note
// ---------------------------------------------------------------------------

export function computeFaabStrategy(ctx: FaabContext): {
  strategy: FaabStrategyNote
  explanation: string
} {
  const budgetPct = ctx.totalFaabBudget > 0
    ? ctx.faabRemaining / ctx.totalFaabBudget
    : 0
  const progress = seasonProgressPct(ctx.currentWeek, ctx.totalWeeks)

  // All-in contending: late season + contender + good budget
  if (ctx.goal === 'win-now' && progress >= 0.6 && ctx.contenderWindowScore >= 65 && budgetPct >= 0.3) {
    return {
      strategy: 'all_in_contending',
      explanation: 'Championship window is open and you have budget to spend. Bid aggressively on immediate starters — this FAAB won\'t help you in the offseason.',
    }
  }

  // Spend now: high urgency + multiple needs
  if (ctx.urgencyLevel === 'critical' || ctx.urgencyLevel === 'high') {
    return {
      strategy: 'spend_now',
      explanation: 'Multiple roster holes need filling. Spend on high-impact adds this week — waiting costs you more than the FAAB.',
    }
  }

  // Preserve: rebuilder or low urgency
  if (ctx.goal === 'rebuild' || ctx.urgencyLevel === 'low') {
    return {
      strategy: 'preserve_budget',
      explanation: 'No urgent needs. Save FAAB for breakout opportunities and injury-created value. Let contenders overpay.',
    }
  }

  // Default: selective
  return {
    strategy: 'selective_aggression',
    explanation: 'Spend on high-fit adds but don\'t overpay on streamers. Target players who solve a real roster problem.',
  }
}
