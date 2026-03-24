/**
 * DraftToAIContextBridge — route from Draft Room into AI Chat with context.
 */

import { getToolToAIChatHref } from "@/lib/chimmy-chat"

type AIChatContextOptions = {
  leagueId?: string
  insightType?: 'matchup' | 'playoff' | 'dynasty' | 'trade' | 'waiver' | 'draft'
  teamId?: string
  sport?: string
  season?: number
  week?: number
}

/**
 * URL to open AI Chat (Legacy). Optionally pass a suggested prompt for draft help.
 */
export function getDraftAIChatUrl(suggestedPrompt?: string, options?: AIChatContextOptions): string {
  return getToolToAIChatHref("draft", {
    prompt: suggestedPrompt,
    leagueId: options?.leagueId,
    insightType: options?.insightType,
    teamId: options?.teamId,
    sport: options?.sport,
    season: options?.season,
    week: options?.week,
  })
}

export type DraftContextForAI = {
  sport?: string
  round?: number
  pick?: number
  queueLength?: number
  rosterPositions?: string[]
  leagueName?: string
}

/**
 * Build a short suggested prompt for "Ask AI about my draft" so Chimmy has context.
 */
export function buildDraftSummaryForAI(ctx: DraftContextForAI): string {
  const parts = ['I need draft advice.']
  if (ctx.sport) parts.push(`Sport: ${ctx.sport}.`)
  if (ctx.round != null) parts.push(`Round ${ctx.round}.`)
  if (ctx.pick != null) parts.push(`Pick ${ctx.pick}.`)
  if (ctx.queueLength != null && ctx.queueLength > 0) {
    parts.push(`I have ${ctx.queueLength} players in my queue.`)
  }
  if (ctx.rosterPositions && ctx.rosterPositions.length > 0) {
    parts.push(`Roster slots: ${ctx.rosterPositions.slice(0, 8).join(', ')}.`)
  }
  if (ctx.leagueName) parts.push(`League: ${ctx.leagueName}.`)
  parts.push('What should I consider for my next pick?')
  return parts.join(' ')
}

/**
 * Build prompt for "Ask Chimmy about this pick" (recommended player).
 */
export function buildAskChimmyAboutPickPrompt(ctx: DraftContextForAI & { recommendedPlayer?: string; recommendedPosition?: string; explanation?: string }): string {
  const parts = ['I’m on the clock and the draft helper recommended a player.']
  if (ctx.recommendedPlayer) parts.push(`Recommended: ${ctx.recommendedPlayer}${ctx.recommendedPosition ? ` (${ctx.recommendedPosition})` : ''}.`)
  if (ctx.explanation) parts.push(`Reason: ${ctx.explanation.slice(0, 200)}.`)
  if (ctx.sport) parts.push(`Sport: ${ctx.sport}.`)
  if (ctx.round != null) parts.push(`Round ${ctx.round}, Pick ${ctx.pick}.`)
  parts.push('Should I take this pick or consider someone else?')
  return parts.join(' ')
}
