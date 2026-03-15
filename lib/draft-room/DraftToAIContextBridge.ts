/**
 * DraftToAIContextBridge — route from Draft Room into AI Chat with context.
 */

const AI_CHAT_BASE = '/af-legacy?tab=chat'

/**
 * URL to open AI Chat (Legacy). Optionally pass a suggested prompt for draft help.
 */
export function getDraftAIChatUrl(suggestedPrompt?: string): string {
  if (!suggestedPrompt?.trim()) return AI_CHAT_BASE
  try {
    const u = new URL(AI_CHAT_BASE, typeof window !== 'undefined' ? window.location.origin : 'https://allfantasy.com')
    u.searchParams.set('prompt', suggestedPrompt.trim().slice(0, 500))
    return u.pathname + u.search
  } catch {
    return AI_CHAT_BASE
  }
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
