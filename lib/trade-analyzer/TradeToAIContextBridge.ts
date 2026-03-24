/**
 * TradeToAIContextBridge — route from Trade Analyzer into AI Chat with optional context.
 */

import { getToolToAIChatHref } from "@/lib/chimmy-chat"
import { DEFAULT_SPORT, normalizeToSupportedSport } from "@/lib/sport-scope"
import { getSportDisplayLabel } from "./SportTradeAnalyzerResolver"

type AIChatContextOptions = {
  leagueId?: string
  insightType?: 'matchup' | 'playoff' | 'dynasty' | 'trade' | 'waiver' | 'draft'
  teamId?: string
  sport?: string
  season?: number
  week?: number
}

type AISummaryContext = {
  fairnessScore?: number
  winnerLabel?: string
}

/**
 * URL to open AI Chat from Trade Analyzer with optional contextual metadata.
 */
export function getTradeAnalyzerAIChatUrl(suggestedPrompt?: string, options?: AIChatContextOptions): string {
  const normalizedSport = options?.sport ? normalizeToSupportedSport(options.sport) : undefined

  return getToolToAIChatHref("trade", {
    prompt: suggestedPrompt,
    leagueId: options?.leagueId,
    insightType: options?.insightType,
    teamId: options?.teamId,
    sport: normalizedSport,
    season: options?.season,
    week: options?.week,
  })
}

/**
 * Build a short suggested prompt summarizing the trade for AI context.
 */
export function buildTradeSummaryForAI(
  senderSummary: string,
  receiverSummary: string,
  sport: string,
  context?: AISummaryContext
): string {
  const normalizedSport = normalizeToSupportedSport(sport || DEFAULT_SPORT)
  const sportLabel = getSportDisplayLabel(normalizedSport)
  const a = [senderSummary, receiverSummary].filter(Boolean).join(" vs ")
  const fairnessText =
    typeof context?.fairnessScore === "number"
      ? ` Fairness score was ${context.fairnessScore}/100.`
      : ""
  const winnerText = context?.winnerLabel ? ` Winner: ${context.winnerLabel}.` : ""

  if (!a) return `I want to discuss a ${sportLabel} fantasy trade.${fairnessText}${winnerText}`
  return `I just analyzed this ${sportLabel} trade: ${a}.${fairnessText}${winnerText} Can you help me understand the value and risks?`
}
