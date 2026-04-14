/**
 * Player Outlook AI Narrative Prompt
 *
 * Produces concise, opinionated, data-grounded narratives.
 * Only called when includeNarrative: true.
 */

import type { OutlookScoringResult, OutlookDataBundle } from './player-outlook-types'
import { TIER_LABELS } from './player-outlook-types'

export const PLAYER_OUTLOOK_SYSTEM_PROMPT = `You are an elite fantasy sports analyst for AllFantasy. You produce concise, data-grounded player outlook narratives.

Rules:
1. Only reference statistics and facts provided in the context below.
2. Never invent or hallucinate statistics, snap counts, or projections.
3. Be direct and opinionated — clearly state if a player is overvalued, undervalued, or properly valued.
4. Focus on the single most actionable insight for a fantasy manager.
5. Keep your response to exactly 2-3 sentences. No bullet points. No headers.
6. If the player is a sell-high, say it directly. If they're a buy-low, say it directly.
7. Reference the specific data points that drive your conclusion.
8. Return ONLY the narrative text — no JSON, no markdown.`.trim()

export function buildOutlookUserPrompt(
  scoring: OutlookScoringResult,
  bundle: OutlookDataBundle,
): string {
  const lines: string[] = []

  lines.push(`PLAYER: ${bundle.playerName} (${bundle.position}, ${bundle.team ?? 'FA'})`)
  lines.push(`AGE: ${bundle.age ?? 'unknown'}`)

  // Value snapshot
  if (bundle.fantasyCalc) {
    const fc = bundle.fantasyCalc
    lines.push(`CURRENT VALUE: ${fc.value} (Overall Rank #${fc.overallRank}, Pos Rank #${fc.positionRank})`)
    lines.push(`30-DAY TREND: ${fc.trend30Day > 0 ? '+' : ''}${fc.trend30Day}`)
  }

  // Tiers
  lines.push(`TIERS: ROS=${scoring.restOfSeasonTier} (${TIER_LABELS[scoring.restOfSeasonTier]}), Weekly=${scoring.weeklyTier} (${TIER_LABELS[scoring.weeklyTier]}), Dynasty=${scoring.dynastyTier} (${TIER_LABELS[scoring.dynastyTier]})`)

  // Scores
  lines.push(`TREND: ${scoring.trend} (strength ${scoring.trendStrength}/100)`)
  lines.push(`RISK: ${scoring.riskLevel} | OPPORTUNITY: ${scoring.opportunityScore}/100 | ROLE SECURITY: ${scoring.roleSecurityScore}/100`)

  // Age curve
  if (bundle.ageCurve) {
    lines.push(`AGE CURVE: peak=${bundle.ageCurve.peakAge}, decline=${bundle.ageCurve.declineAge}, cliff=${bundle.ageCurve.cliffAge}`)
  }

  // Stats
  if (bundle.fantasyPointsPerGame != null) {
    lines.push(`RECENT PRODUCTION: ${bundle.fantasyPointsPerGame.toFixed(1)} PPG${bundle.gamesPlayed != null ? ` (${bundle.gamesPlayed} games)` : ''}`)
  }

  // Analytics
  const analyticsNotes: string[] = []
  if (bundle.breakoutAge != null) analyticsNotes.push(`breakoutAge=${bundle.breakoutAge}`)
  if (bundle.dominatorRating != null) analyticsNotes.push(`dominator=${(bundle.dominatorRating * 100).toFixed(0)}%`)
  if (bundle.athleticGrade) analyticsNotes.push(`athleticism=${bundle.athleticGrade}`)
  if (bundle.weeklyVolatility != null) analyticsNotes.push(`volatility=${bundle.weeklyVolatility.toFixed(2)}`)
  if (analyticsNotes.length > 0) {
    lines.push(`ANALYTICS: ${analyticsNotes.join(', ')}`)
  }

  // Status
  if (bundle.injuryStatus && bundle.injuryStatus !== 'Active' && bundle.injuryStatus !== 'Healthy') {
    lines.push(`INJURY: ${bundle.injuryStatus}`)
  }

  // News adjustments
  if (bundle.newsAdjustments && bundle.newsAdjustments.length > 0) {
    const topAdj = bundle.newsAdjustments[0]
    lines.push(`NEWS IMPACT: ${topAdj.adjustmentPct > 0 ? '+' : ''}${topAdj.adjustmentPct}% — ${topAdj.primaryReason}`)
  }

  // Tags and flags
  if (scoring.tags.length > 0) lines.push(`TAGS: ${scoring.tags.join(', ')}`)
  if (scoring.riskFlags.length > 0) lines.push(`RISK FLAGS: ${scoring.riskFlags.join(', ')}`)

  // Deterministic summaries
  lines.push(`BULLISH: ${scoring.bullishCase}`)
  lines.push(`BEARISH: ${scoring.bearishCase}`)

  lines.push('')
  lines.push('Write a 2-3 sentence narrative synthesizing this data. Highlight the single most important insight an owner should act on. Be direct and opinionated.')

  return lines.join('\n')
}
