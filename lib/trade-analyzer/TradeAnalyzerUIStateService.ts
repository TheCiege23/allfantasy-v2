/**
 * TradeAnalyzerUIStateService — default state and reset/swap helpers for trade analyzer UI.
 */

export const DEFAULT_TEAM_A_LABEL = "Team A"
export const DEFAULT_TEAM_B_LABEL = "Team B"
export const DEFAULT_SENDER_LABEL = "Sender (Proposing)"
export const DEFAULT_RECEIVER_LABEL = "Receiver (Responding)"
export const DEFAULT_LEAGUE_CONTEXT = "12-team SF PPR dynasty"

export type EmptyTradeState = {
  teamAName: string
  teamBName: string
  teamAAssets: unknown[]
  teamBAssets: unknown[]
  leagueContext: string
}

type EmptyTradeStateOptions = {
  useSenderReceiverLabels?: boolean
  leagueContext?: string
}

export function getEmptyTradeState(options?: boolean | EmptyTradeStateOptions): EmptyTradeState {
  const useSenderReceiverLabels =
    typeof options === "boolean"
      ? options
      : Boolean(options?.useSenderReceiverLabels)
  const leagueContext =
    typeof options === "object" && options?.leagueContext
      ? options.leagueContext
      : DEFAULT_LEAGUE_CONTEXT

  return {
    teamAName: useSenderReceiverLabels ? "Sender" : DEFAULT_TEAM_A_LABEL,
    teamBName: useSenderReceiverLabels ? "Receiver" : DEFAULT_TEAM_B_LABEL,
    teamAAssets: [],
    teamBAssets: [],
    leagueContext,
  }
}

export function swapSides<T>(sideA: T[], sideB: T[]): [T[], T[]] {
  return [[...sideB], [...sideA]]
}
