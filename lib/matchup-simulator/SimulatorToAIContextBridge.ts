/**
 * SimulatorToAIContextBridge — route from Matchup Simulator into AI Chat with context.
 */

const AI_CHAT_BASE = '/af-legacy?tab=chat'

type AIChatContextOptions = {
  leagueId?: string
  insightType?: 'matchup' | 'playoff' | 'dynasty' | 'trade' | 'waiver' | 'draft'
  teamId?: string
  sport?: string
  season?: number
  week?: number
}

/**
 * URL to open AI Chat (Legacy). Optionally pass a suggested prompt for matchup explanation.
 */
export function getMatchupAIChatUrl(suggestedPrompt?: string, options?: AIChatContextOptions): string {
  try {
    const u = new URL(AI_CHAT_BASE, typeof window !== 'undefined' ? window.location.origin : 'https://allfantasy.com')
    if (suggestedPrompt?.trim()) {
      u.searchParams.set('prompt', suggestedPrompt.trim().slice(0, 500))
    }
    if (options?.leagueId) u.searchParams.set('leagueId', options.leagueId)
    if (options?.insightType) u.searchParams.set('insightType', options.insightType)
    if (options?.teamId) u.searchParams.set('teamId', options.teamId)
    if (options?.sport) u.searchParams.set('sport', options.sport)
    if (options?.season != null) u.searchParams.set('season', String(options.season))
    if (options?.week != null) u.searchParams.set('week', String(options.week))
    return u.pathname + u.search
  } catch {
    return AI_CHAT_BASE
  }
}

export type MatchupContextForAI = {
  teamAName: string
  teamBName: string
  projectedScoreA?: number
  projectedScoreB?: number
  winProbA?: number
  winProbB?: number
  upsetChance?: number
  volatilityTag?: string
  sport?: string
}

/**
 * Build a short suggested prompt for "Explain this matchup" so Chimmy has context.
 */
export function buildMatchupSummaryForAI(ctx: MatchupContextForAI): string {
  const parts = [
    `Explain this matchup: ${ctx.teamAName} vs ${ctx.teamBName}.`,
  ]
  if (ctx.projectedScoreA != null && ctx.projectedScoreB != null) {
    parts.push(`Projected score: ${ctx.projectedScoreA.toFixed(1)} – ${ctx.projectedScoreB.toFixed(1)}.`)
  }
  if (ctx.winProbA != null && ctx.winProbB != null) {
    parts.push(`Win probability: ${ctx.winProbA.toFixed(0)}% – ${ctx.winProbB.toFixed(0)}%.`)
  }
  if (ctx.upsetChance != null && ctx.upsetChance > 5) {
    parts.push(`Upset chance: ${ctx.upsetChance}%.`)
  }
  if (ctx.volatilityTag) {
    parts.push(`Volatility: ${ctx.volatilityTag}.`)
  }
  if (ctx.sport) {
    parts.push(`Sport: ${ctx.sport}.`)
  }
  parts.push('What should I know about this matchup?')
  return parts.join(' ')
}
