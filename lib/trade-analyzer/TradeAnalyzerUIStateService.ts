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

export function getEmptyTradeState(useSenderReceiverLabels: boolean): EmptyTradeState {
  return {
    teamAName: useSenderReceiverLabels ? "Sender" : DEFAULT_TEAM_A_LABEL,
    teamBName: useSenderReceiverLabels ? "Receiver" : DEFAULT_TEAM_B_LABEL,
    teamAAssets: [],
    teamBAssets: [],
    leagueContext: DEFAULT_LEAGUE_CONTEXT,
  }
}

export function swapSides<T>(sideA: T[], sideB: T[]): [T[], T[]] {
  return [[...sideB], [...sideA]]
}
