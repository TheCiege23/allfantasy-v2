/**
 * PROMPT 235 — Deterministic logic generates recommendation FIRST.
 * AI explains second. These functions produce the recommendation only.
 */

import type { CoachAdviceType, AICoachInput, CoachRecommendation } from './types'
import { getStrategyRecommendation } from '@/lib/fantasy-coach'
import type { AdviceType } from '@/lib/fantasy-coach/types'

function toStrategyType(type: CoachAdviceType): AdviceType {
  if (type === 'start_sit' || type === 'lineup_optimization') return 'lineup'
  if (type === 'waiver') return 'waiver'
  if (type === 'trade') return 'trade'
  if (type === 'draft') return 'lineup'
  return 'lineup'
}

function buildContextSummary(input: AICoachInput): string {
  const parts: string[] = []
  if (input.teamName) parts.push(`Team: ${input.teamName}`)
  if (input.leagueId) parts.push(`League: ${input.leagueId}`)
  if (input.week != null) parts.push(`Week ${input.week}`)
  if (input.leagueSettings?.sport) parts.push(`Sport: ${input.leagueSettings.sport}`)
  if (input.roster?.length) parts.push(`Roster: ${input.roster.length} players`)
  return parts.length ? parts.join('. ') : 'No context.'
}

/**
 * Start/sit: order roster by projected points, recommend starters and sits.
 */
async function recommendStartSit(input: AICoachInput): Promise<CoachRecommendation> {
  const roster = input.roster ?? []
  const contextSummary = buildContextSummary(input)
  const strategy = await getStrategyRecommendation('lineup', {
    leagueId: input.leagueId,
    week: input.week,
    teamName: input.teamName,
    sport: input.leagueSettings?.sport,
  })

  const withProjections = roster
    .filter((r) => r.projectedPoints != null)
    .sort((a, b) => (b.projectedPoints ?? 0) - (a.projectedPoints ?? 0))
  const starters = withProjections.filter((r) => r.slot === 'starter').length
  const suggestedStarts = withProjections.slice(0, Math.max(starters, 9))
  const suggestedSits = withProjections.slice(Math.max(starters, 9))

  const items: { label: string; detail?: string; value?: number }[] = []
  suggestedStarts.forEach((p) => {
    items.push({
      label: `Start: ${p.playerName} (${p.position})`,
      detail: p.team ? `${p.team}` : undefined,
      value: p.projectedPoints,
    })
  })
  suggestedSits.slice(0, 5).forEach((p) => {
    items.push({
      label: `Sit: ${p.playerName} (${p.position})`,
      detail: p.team ? `${p.team}` : undefined,
      value: p.projectedPoints,
    })
  })

  const totalProjected = suggestedStarts.reduce((s, p) => s + (p.projectedPoints ?? 0), 0)
  const headline =
    suggestedStarts.length > 0
      ? `Start ${suggestedStarts.map((p) => p.playerName).join(', ')}${suggestedSits.length > 0 ? `; sit ${suggestedSits[0]?.playerName} and other bench options` : ''}`
      : strategy.summary

  return {
    type: 'start_sit',
    headline: headline.slice(0, 200),
    items,
    summaryNumbers: totalProjected > 0 ? { projectedLineupTotal: totalProjected } : undefined,
    contextSummary,
  }
}

/**
 * Lineup optimization: same as start/sit with emphasis on optimal flex and ordering.
 */
async function recommendLineupOptimization(input: AICoachInput): Promise<CoachRecommendation> {
  const rec = await recommendStartSit(input)
  return {
    ...rec,
    type: 'lineup_optimization',
    headline: rec.headline || 'Set your best projected lineup; use flex for the next-best skill player.',
  }
}

/**
 * Waiver: recommend add/drop from strategy + any player stats.
 */
async function recommendWaiver(input: AICoachInput): Promise<CoachRecommendation> {
  const contextSummary = buildContextSummary(input)
  const strategy = await getStrategyRecommendation('waiver', {
    leagueId: input.leagueId,
    week: input.week,
    teamName: input.teamName,
    sport: input.leagueSettings?.sport,
  })
  const items = strategy.bullets.map((b) => ({ label: b }))
  strategy.actions.slice(0, 3).forEach((a) => items.push({ label: a }))
  return {
    type: 'waiver',
    headline: strategy.summary,
    items,
    contextSummary,
  }
}

/**
 * Draft: recommend next pick from strategy + ADP-style ordering if provided.
 */
async function recommendDraft(input: AICoachInput): Promise<CoachRecommendation> {
  const contextSummary = buildContextSummary(input)
  const strategy = await getStrategyRecommendation('lineup', {
    leagueId: input.leagueId,
    week: input.week,
    teamName: input.teamName,
    sport: input.leagueSettings?.sport,
  })
  const items: CoachRecommendation['items'] = strategy.bullets.map((b) => ({ label: b }))
  const playerStats = input.playerStats ?? []
  const byProjection = [...playerStats].sort(
    (a, b) => (b.projectedPoints ?? 0) - (a.projectedPoints ?? 0)
  )
  byProjection.slice(0, 5).forEach((p) => {
    items.push({
      label: p.playerName,
      detail: p.position,
      value: p.projectedPoints,
    })
  })
  return {
    type: 'draft',
    headline: strategy.summary,
    items,
    contextSummary,
  }
}

/**
 * Trade: recommend accept/reject + value from strategy.
 */
async function recommendTrade(input: AICoachInput): Promise<CoachRecommendation> {
  const contextSummary = buildContextSummary(input)
  const strategy = await getStrategyRecommendation('trade', {
    leagueId: input.leagueId,
    week: input.week,
    teamName: input.teamName,
    sport: input.leagueSettings?.sport,
  })
  const items = strategy.bullets.map((b) => ({ label: b }))
  strategy.actions.slice(0, 3).forEach((a) => items.push({ label: a }))
  return {
    type: 'trade',
    headline: strategy.summary,
    items,
    contextSummary,
  }
}

/** Run deterministic recommendation for the given type and input. */
export async function getDeterministicRecommendation(
  input: AICoachInput
): Promise<CoachRecommendation> {
  const contextSummary = buildContextSummary(input)
  switch (input.type) {
    case 'start_sit':
      return await recommendStartSit(input)
    case 'lineup_optimization':
      return await recommendLineupOptimization(input)
    case 'waiver':
      return recommendWaiver(input)
    case 'draft':
      return recommendDraft(input)
    case 'trade':
      return recommendTrade(input)
    default:
      const strategy = await getStrategyRecommendation(toStrategyType(input.type), {
        leagueId: input.leagueId,
        week: input.week,
        teamName: input.teamName,
        sport: input.leagueSettings?.sport,
      })
      return {
        type: input.type,
        headline: strategy.summary,
        items: strategy.bullets.map((b) => ({ label: b })),
        contextSummary,
      }
  }
}
