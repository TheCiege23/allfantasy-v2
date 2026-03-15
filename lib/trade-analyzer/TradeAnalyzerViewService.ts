/**
 * TradeAnalyzerViewService — view labels, empty state copy, and result section visibility.
 */

export const TRADE_ANALYZER_EMPTY_TITLE = "Add players and picks to both sides"
export const TRADE_ANALYZER_EMPTY_SUBTITLE = "Then click Evaluate Trade to get AI analysis, fairness score, and counter-offer ideas."
export const TRADE_ANALYZER_LOADING_TITLE = "Analyzing trade..."
export const TRADE_ANALYZER_ERROR_TITLE = "Analysis failed"
export const TRADE_ANALYZER_ERROR_RETRY = "Try again"

export function shouldShowResult(result: unknown, loading: boolean, error: string | null): boolean {
  return !loading && !error && result != null
}

export function getResultSectionTitle(hasError: boolean, hasResult: boolean): string | null {
  if (hasError) return TRADE_ANALYZER_ERROR_TITLE
  if (hasResult) return "Trade analysis"
  return null
}
