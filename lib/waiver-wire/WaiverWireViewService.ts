/**
 * WaiverWireViewService — empty/loading/error copy and visibility for waiver wire UI.
 */

export const WAIVER_EMPTY_PLAYERS_TITLE = "No players match your filters."
export const WAIVER_EMPTY_PLAYERS_HINT = "Try broadening search or position filter."
export const WAIVER_EMPTY_PENDING_TITLE = "No pending claims."
export const WAIVER_EMPTY_PENDING_HINT = "Add a claim from Available players."
export const WAIVER_EMPTY_HISTORY_TITLE = "No processed claims yet."
export const WAIVER_LOADING_TITLE = "Loading waiver wire…"
export const WAIVER_ERROR_TITLE = "Failed to load"
export const WAIVER_ERROR_RETRY = "Retry"

export function shouldShowClaimDrawer(open: boolean, player: unknown): boolean {
  return open && player != null
}

export function getTabLabel(tabId: "available" | "pending" | "history", pendingCount?: number): string {
  if (tabId === "available") return "Available players"
  if (tabId === "pending") return pendingCount != null && pendingCount > 0 ? `Pending claims (${pendingCount})` : "Pending claims"
  return "Processed history"
}
