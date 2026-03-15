/**
 * TradeToAIContextBridge — route from Trade Analyzer into AI Chat with optional context.
 */

const AI_CHAT_BASE = "/af-legacy?tab=chat"

/**
 * URL to open AI Chat (Legacy). Optionally pass a suggested prompt for trade discussion.
 */
export function getTradeAnalyzerAIChatUrl(suggestedPrompt?: string): string {
  if (!suggestedPrompt?.trim()) return AI_CHAT_BASE
  try {
    const u = new URL(AI_CHAT_BASE, typeof window !== "undefined" ? window.location.origin : "https://allfantasy.com")
    u.searchParams.set("prompt", suggestedPrompt.trim().slice(0, 500))
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
