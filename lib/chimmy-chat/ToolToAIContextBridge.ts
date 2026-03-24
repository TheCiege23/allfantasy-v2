import { buildAIChatHref } from "./AIContextRouter"
import { resolveSportForAIChat } from "./SportAIChatResolver"
import type { AIChatContext } from "./types"

type ToolSource =
  | "trade"
  | "waiver"
  | "draft"
  | "matchup"
  | "playoff"
  | "lineup"
  | "generic"

type ToolBridgePayload = {
  prompt?: string
  leagueId?: string
  leagueName?: string
  sleeperUsername?: string
  insightType?: AIChatContext["insightType"]
  teamId?: string
  sport?: string
  season?: number
  week?: number
}

function getDefaultPromptForTool(source: ToolSource): string {
  switch (source) {
    case "trade":
      return "Help me evaluate this trade and suggest the best next move."
    case "waiver":
      return "Who should I prioritize on waivers, and what FAAB should I use?"
    case "draft":
      return "I'm on the clock. What draft move gives me the best edge?"
    case "matchup":
      return "Explain this matchup and tell me the key swing factors."
    case "playoff":
      return "Explain my playoff outlook and what I should do next."
    case "lineup":
      return "Give me lineup advice for this week with risk notes."
    default:
      return "I need fantasy strategy help for my team."
  }
}

function getSourceLabel(source: ToolSource): AIChatContext["source"] {
  switch (source) {
    case "trade":
      return "trade_analyzer"
    case "waiver":
      return "waiver_tool"
    case "draft":
      return "draft_tool"
    case "matchup":
      return "matchup_tool"
    case "playoff":
      return "league_forecast"
    case "lineup":
      return "lineup_tool"
    default:
      return "unknown"
  }
}

export function buildToolToAIContext(source: ToolSource, payload: ToolBridgePayload = {}): AIChatContext {
  return {
    prompt: payload.prompt?.trim() || getDefaultPromptForTool(source),
    leagueId: payload.leagueId,
    leagueName: payload.leagueName,
    sleeperUsername: payload.sleeperUsername,
    insightType: payload.insightType,
    teamId: payload.teamId,
    sport: resolveSportForAIChat(payload.sport, null),
    season: payload.season,
    week: payload.week,
    source: getSourceLabel(source),
  }
}

export function getToolToAIChatHref(source: ToolSource, payload: ToolBridgePayload = {}): string {
  return buildAIChatHref(buildToolToAIContext(source, payload))
}
