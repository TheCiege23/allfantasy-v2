/**
 * WaiverToAIContextBridge — route from Waiver Wire into AI Chat with optional context.
 */

const AI_CHAT_BASE = "/af-legacy?tab=chat"

/**
 * URL to open AI Chat (Legacy). Optionally pass a suggested prompt for waiver discussion.
 */
export function getWaiverAIChatUrl(suggestedPrompt?: string): string {
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
 * Build a short suggested prompt for waiver help in AI context.
 */
export function buildWaiverSummaryForAI(leagueContext?: string, sport?: string): string {
  const parts = ["I'm managing my waiver wire"]
  if (sport) parts.push(`for ${sport}`)
  if (leagueContext) parts.push(`(${leagueContext})`)
  parts.push(". Can you suggest priority adds, FAAB bids, or drops?")
  return parts.join(" ")
}
