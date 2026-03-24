/**
 * TradeToAIContextBridge — route from Trade Analyzer into AI Chat with optional context.
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
 * URL to open AI Chat (Legacy). Optionally pass a suggested prompt for trade discussion.
 */
export function getTradeAnalyzerAIChatUrl(suggestedPrompt?: string, options?: AIChatContextOptions): string {
  return getToolToAIChatHref("trade", {
    prompt: suggestedPrompt,
    leagueId: options?.leagueId,
    insightType: options?.insightType,
    teamId: options?.teamId,
    sport: options?.sport,
    season: options?.season,
    week: options?.week,
  })
}

/**
 * Build a short suggested prompt summarizing the trade for AI context.
 */
export function buildTradeSummaryForAI(senderSummary: string, receiverSummary: string, sport: string): string {
  const a = [senderSummary, receiverSummary].filter(Boolean).join(" vs ")
  if (!a) return `I want to discuss a ${sport} fantasy trade.`
  return `I just analyzed this ${sport} trade: ${a}. Can you help me understand the value and risks?`
}
