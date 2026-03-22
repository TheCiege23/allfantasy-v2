/**
 * TradeToAIContextBridge — route from Trade Analyzer into AI Chat with optional context.
 */

const AI_CHAT_BASE = "/af-legacy?tab=chat"

type AIChatContextOptions = {
  leagueId?: string
  insightType?: 'matchup' | 'playoff' | 'dynasty' | 'trade' | 'waiver' | 'draft'
  teamId?: string
  sport?: string
  season?: number
  week?: number
}

/**
 * URL to open AI Chat (Legacy). Optionally pass a suggested prompt for trade discussion.
 */
export function getTradeAnalyzerAIChatUrl(suggestedPrompt?: string, options?: AIChatContextOptions): string {
  try {
    const u = new URL(AI_CHAT_BASE, typeof window !== "undefined" ? window.location.origin : "https://allfantasy.com")
    if (suggestedPrompt?.trim()) {
      u.searchParams.set("prompt", suggestedPrompt.trim().slice(0, 500))
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

/**
 * Build a short suggested prompt summarizing the trade for AI context.
 */
export function buildTradeSummaryForAI(senderSummary: string, receiverSummary: string, sport: string): string {
  const a = [senderSummary, receiverSummary].filter(Boolean).join(" vs ")
  if (!a) return `I want to discuss a ${sport} fantasy trade.`
  return `I just analyzed this ${sport} trade: ${a}. Can you help me understand the value and risks?`
}
