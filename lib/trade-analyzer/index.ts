/**
 * Trade Analyzer — UX services, asset controller, value breakdown, UI state, AI bridge, sport resolver.
 */

export {
  getTradeAnalyzerAIChatUrl,
  buildTradeSummaryForAI,
} from "./TradeToAIContextBridge"
export {
  TRADE_ANALYZER_SPORTS,
  getSportDisplayLabel,
  getSportOptions,
  isPickHeavySport,
  getDefaultPickRounds,
} from "./SportTradeAnalyzerResolver"
export {
  DEFAULT_TEAM_A_LABEL,
  DEFAULT_TEAM_B_LABEL,
  DEFAULT_SENDER_LABEL,
  DEFAULT_RECEIVER_LABEL,
  DEFAULT_LEAGUE_CONTEXT,
  getEmptyTradeState,
  swapSides,
} from "./TradeAnalyzerUIStateService"
export type { EmptyTradeState } from "./TradeAnalyzerUIStateService"
export {
  addPlayerSlot,
  removeAssetAtIndex,
  removeAssetById,
  canSubmitTrade,
  getNamedPlayerCount,
} from "./TradeAssetSelectionController"
export type { AssetLike } from "./TradeAssetSelectionController"
export {
  getFairnessScore,
  getFairnessColorClass,
  getWinnerLabel,
  formatValueBreakdown,
} from "./TradeValueBreakdownResolver"
export type { ValueBreakdownSide } from "./TradeValueBreakdownResolver"
export {
  TRADE_ANALYZER_EMPTY_TITLE,
  TRADE_ANALYZER_EMPTY_SUBTITLE,
  TRADE_ANALYZER_LOADING_TITLE,
  TRADE_ANALYZER_ERROR_TITLE,
  TRADE_ANALYZER_ERROR_RETRY,
  shouldShowResult,
  getResultSectionTitle,
} from "./TradeAnalyzerViewService"
