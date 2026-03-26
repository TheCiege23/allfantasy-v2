import type { SupportedSport } from "@/lib/sport-scope"

export type AIInsightType = "matchup" | "playoff" | "dynasty" | "trade" | "waiver" | "draft"

export type AIContextSource =
  | "messages_ai"
  | "trade_analyzer"
  | "waiver_tool"
  | "draft_tool"
  | "matchup_tool"
  | "league_forecast"
  | "lineup_tool"
  | "dashboard"
  | "dashboard_widget"
  | "tool_hub"
  | "ai_hub"
  | "quick_action"
  | "top_bar"
  | "right_rail"
  | "search"
  | "fallback"
  | "unknown"

export type AIChatContext = {
  prompt?: string
  leagueId?: string
  leagueName?: string
  sleeperUsername?: string
  insightType?: AIInsightType
  teamId?: string
  sport?: SupportedSport
  season?: number
  week?: number
  source?: AIContextSource
}

export type ChimmyProviderStatus = Record<string, string> | undefined

export type ChimmyMessageMeta = {
  confidencePct?: number
  providerStatus?: ChimmyProviderStatus
  recommendedTool?: string
  dataSources?: string[]
  quantData?: Record<string, unknown>
  trendData?: Record<string, unknown>
}

export type ChimmyThreadMessage = {
  role: "user" | "assistant"
  content: string
  imageUrl?: string | null
  meta?: ChimmyMessageMeta | null
}
