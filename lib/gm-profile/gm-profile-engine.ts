/**
 * AI Personal GM Profile Engine
 *
 * Behavioral intelligence: archetype detection, strength/weakness analysis,
 * recurring leak identification, coaching recommendations. Based on real
 * decision history, not personality quizzes.
 *
 * Pure deterministic. <10ms.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const GmArchetypes = [
  'The Shark', 'The Builder', 'The Gambler', 'The Analyst', 'The Loyalist',
  'The Reactive Manager', 'The Passive Observer', 'The Overtrader',
  'The Draft Guru', 'The Waiver Hawk', 'The Balanced GM',
] as const

export const GmProfileInputSchema = z.object({
  sport: z.string().default('NFL'),
  leagueType: z.string().default('dynasty'),
  totalTradesMade: z.number().default(0),
  tradesWon: z.number().default(0),
  tradesLost: z.number().default(0),
  avgTradeOverpay: z.number().default(0),
  waiverClaimCount: z.number().default(0),
  faabSpentPct: z.number().default(0),
  lineupChangeFrequency: z.number().default(0),
  draftPicksUsedOnRookies: z.number().default(0),
  draftPicksTradedAway: z.number().default(0),
  draftPicksAcquired: z.number().default(0),
  avgRosterAge: z.number().default(26),
  positionConcentration: z.record(z.string(), z.number()).default({}),
  winPct: z.number().default(0.5),
  seasonsTracked: z.number().default(1),
  panicTradeCount: z.number().default(0),
  holdTooLongCount: z.number().default(0),
  riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).default('moderate'),
})
export type GmProfileInput = z.infer<typeof GmProfileInputSchema>

export interface GmProfileResult {
  gmArchetype: string
  confidencePct: number
  profileSummary: string
  strengths: string[]
  weaknesses: string[]
  recurringLeaks: string[]
  behavioralPatterns: string[]
  riskProfile: string
  pressureBehavior: string
  negotiationStyle: string
  draftStyle: string
  waiverStyle: string
  lineupStyle: string
  rebuildVsCompeteBias: string
  positionBiases: string[]
  marketTimingGrade: string
  disciplineGrade: string
  adaptabilityGrade: string
  growthAreas: string[]
  coachingRecommendations: string[]
  summary: string
  generatedAt: string
  gmEvolutionTrend: 'improving' | 'stable' | 'regressing' | 'volatile'
  selfSabotageFlags: string[]
  decisionQualityScore: number
  consistencyScore: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)) }

function grade(score: number): string {
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

// ---------------------------------------------------------------------------
// Archetype Detection
// ---------------------------------------------------------------------------

function detectArchetype(input: GmProfileInput): string {
  const { totalTradesMade, tradesWon, waiverClaimCount, lineupChangeFrequency, avgTradeOverpay, panicTradeCount, draftPicksTradedAway, draftPicksAcquired } = input

  if (totalTradesMade >= 8 && tradesWon > totalTradesMade * 0.6 && avgTradeOverpay < 0.05) return 'The Shark'
  if (totalTradesMade >= 10 && avgTradeOverpay > 0.1) return 'The Overtrader'
  if (panicTradeCount >= 3) return 'The Reactive Manager'
  if (totalTradesMade <= 1 && waiverClaimCount <= 3) return 'The Passive Observer'
  if (waiverClaimCount >= 15 && totalTradesMade < 3) return 'The Waiver Hawk'
  if (draftPicksAcquired > draftPicksTradedAway + 3) return 'The Builder'
  if (input.riskTolerance === 'aggressive' && lineupChangeFrequency >= 5) return 'The Gambler'
  if (totalTradesMade >= 4 && waiverClaimCount >= 8) return 'The Analyst'
  if (input.holdTooLongCount >= 3) return 'The Loyalist'
  return 'The Balanced GM'
}

// ---------------------------------------------------------------------------
// Main Entry Point
// ---------------------------------------------------------------------------

export function generateGmProfile(input: GmProfileInput): GmProfileResult {
  const archetype = detectArchetype(input)
  const tradeWinRate = input.totalTradesMade > 0 ? input.tradesWon / input.totalTradesMade : 0.5
  const tradingActive = input.totalTradesMade >= 5

  // Strengths
  const strengths: string[] = []
  if (tradeWinRate >= 0.6 && tradingActive) strengths.push('Strong trade execution — wins more deals than loses')
  if (input.waiverClaimCount >= 10) strengths.push('Active on waivers — doesn\'t miss emerging value')
  if (input.winPct >= 0.6) strengths.push('Winning record — making good overall decisions')
  if (input.avgTradeOverpay < 0.05 && tradingActive) strengths.push('Disciplined negotiator — rarely overpays')
  if (input.draftPicksAcquired > input.draftPicksTradedAway) strengths.push('Pick accumulator — building future flexibility')

  // Weaknesses
  const weaknesses: string[] = []
  if (tradeWinRate < 0.4 && tradingActive) weaknesses.push('Poor trade outcomes — consistently losing value in trades')
  if (input.panicTradeCount >= 2) weaknesses.push('Panic trading — makes emotional moves after bad weeks')
  if (input.holdTooLongCount >= 2) weaknesses.push('Holds too long — misses sell-high windows on declining assets')
  if (input.avgTradeOverpay > 0.15) weaknesses.push('Chronic overpayer — leaves value on the table in trades')
  if (input.waiverClaimCount <= 2 && input.totalTradesMade <= 1) weaknesses.push('Too passive — missing opportunities through inaction')

  // Recurring leaks
  const leaks: string[] = []
  if (input.panicTradeCount >= 2) leaks.push('Emotional trading after losses — erodes long-term value')
  if (input.holdTooLongCount >= 2) leaks.push('Sentimental attachment to declining players — sell windows close')
  if (input.avgTradeOverpay > 0.12) leaks.push('Consistent overpaying — 12%+ above fair value on average')
  if (input.faabSpentPct > 80 && input.waiverClaimCount >= 8) leaks.push('FAAB overspending — burns budget on marginal pickups')

  // Scores
  const decisionQuality = clamp(Math.round(50 + (tradeWinRate - 0.5) * 60 + (input.winPct - 0.5) * 40 - input.panicTradeCount * 5), 0, 100)
  const consistency = clamp(Math.round(70 - input.panicTradeCount * 10 - input.holdTooLongCount * 5 + (tradingActive ? 10 : 0)), 0, 100)

  // Styles
  const negotiationStyle = input.avgTradeOverpay < 0.05 ? 'Disciplined — rarely overpays, patient negotiator' : input.avgTradeOverpay > 0.15 ? 'Aggressive — willing to overpay for targets' : 'Fair — generally trades at market value'
  const draftStyle = input.draftPicksUsedOnRookies >= 3 ? 'Youth-focused — invests heavily in rookies' : 'Standard — balanced pick usage'
  const waiverStyle = input.waiverClaimCount >= 12 ? 'Hyperactive — aggressive waiver hawk' : input.waiverClaimCount >= 5 ? 'Active — consistent waiver engagement' : 'Passive — minimal waiver activity'
  const lineupStyle = input.lineupChangeFrequency >= 5 ? 'Tinkerer — frequently adjusts lineup' : input.lineupChangeFrequency >= 2 ? 'Active — regular lineup management' : 'Set-and-forget — minimal lineup changes'

  // Coaching
  const coaching: string[] = []
  if (input.panicTradeCount >= 2) coaching.push('Wait 48 hours before making any trade after a loss. Emotional trades are your biggest leak.')
  if (input.holdTooLongCount >= 2) coaching.push('Set calendar reminders to re-evaluate aging assets monthly. Don\'t let sentiment override value.')
  if (input.avgTradeOverpay > 0.1) coaching.push('Always get a second opinion on trade values. You tend to overpay — having a fairness check prevents this.')
  if (input.waiverClaimCount <= 2) coaching.push('Check waivers every Tuesday. You\'re leaving free value on the wire.')
  if (weaknesses.length === 0) coaching.push('Continue current approach — it\'s working. Focus on maintaining discipline.')

  const evolution: GmProfileResult['gmEvolutionTrend'] = decisionQuality >= 65 && consistency >= 60 ? 'improving' : decisionQuality < 40 ? 'regressing' : consistency < 40 ? 'volatile' : 'stable'

  const sabotage: string[] = []
  if (input.panicTradeCount >= 3) sabotage.push('Panic trading is your #1 self-sabotage pattern')
  if (input.holdTooLongCount >= 3) sabotage.push('Holding declining assets past sell-by date — emotional attachment')
  if (input.avgTradeOverpay > 0.2) sabotage.push('Severe overpaying habit — you\'re giving away value consistently')

  const confidence = clamp(40 + (input.seasonsTracked >= 2 ? 20 : 0) + (input.totalTradesMade >= 3 ? 15 : 0) + (input.waiverClaimCount >= 5 ? 10 : 0), 25, 90)

  // Position biases
  const posBiases: string[] = []
  for (const [pos, count] of Object.entries(input.positionConcentration)) {
    if (count >= 6) posBiases.push(`Heavy ${pos} concentration (${count} rostered) — possible overvaluation`)
  }

  return {
    gmArchetype: archetype, confidencePct: confidence,
    profileSummary: `${archetype}: ${strengths[0] ?? 'Balanced approach'}, but ${weaknesses[0] ?? 'no major weaknesses identified'}.`,
    strengths, weaknesses, recurringLeaks: leaks,
    behavioralPatterns: [
      `Trade frequency: ${input.totalTradesMade} trades (${tradingActive ? 'active' : 'low'})`,
      `Waiver engagement: ${input.waiverClaimCount} claims`,
      `Lineup volatility: ${input.lineupChangeFrequency} changes/week avg`,
    ],
    riskProfile: input.riskTolerance === 'aggressive' ? 'Aggressive — embraces risk for upside' : input.riskTolerance === 'conservative' ? 'Conservative — prioritizes safety' : 'Moderate — balanced risk/reward',
    pressureBehavior: input.panicTradeCount >= 2 ? 'Reactive under pressure — makes emotional moves after bad outcomes' : 'Composed — maintains discipline under pressure',
    negotiationStyle, draftStyle, waiverStyle, lineupStyle,
    rebuildVsCompeteBias: input.avgRosterAge < 25 ? 'Rebuild-oriented — prefers youth and future' : input.avgRosterAge > 28 ? 'Win-now bias — leans toward proven veterans' : 'Balanced — no strong rebuild/compete bias',
    positionBiases: posBiases,
    marketTimingGrade: grade(clamp(Math.round(70 - input.avgTradeOverpay * 200 - input.holdTooLongCount * 10), 0, 100)),
    disciplineGrade: grade(consistency),
    adaptabilityGrade: grade(clamp(Math.round(50 + input.totalTradesMade * 3 + input.waiverClaimCount * 1.5 - input.panicTradeCount * 8), 0, 100)),
    growthAreas: weaknesses.slice(0, 3), coachingRecommendations: coaching,
    summary: `${archetype} | Decision Quality: ${decisionQuality}/100 | Consistency: ${consistency}/100 | ${strengths.length} strengths, ${weaknesses.length} weaknesses, ${leaks.length} recurring leaks`,
    generatedAt: new Date().toISOString(),
    gmEvolutionTrend: evolution, selfSabotageFlags: sabotage,
    decisionQualityScore: decisionQuality, consistencyScore: consistency,
  }
}
