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

export function getTabLabel(
  tabId: "available" | "trending" | "claimed" | "dropped" | "pending" | "history",
  count?: number
): string {
  if (tabId === "available") return "Available players"
  if (tabId === "trending") return "Trending"
  if (tabId === "claimed") return "Claimed"
  if (tabId === "dropped") return "Dropped"
  if (tabId === "pending") return count != null && count > 0 ? `Pending claims (${count})` : "Pending claims"
  return "Processed history"
}

export function getWaiverTypeLabel(waiverType?: string | null): string {
  switch ((waiverType ?? "").toLowerCase()) {
    case "faab":
      return "FAAB"
    case "rolling":
      return "Rolling Waivers"
    case "reverse_standings":
      return "Reverse Standings"
    case "fcfs":
      return "First Come First Served"
    case "standard":
      return "Standard"
    default:
      return waiverType ?? "—"
  }
}

export function getWaiverRuleSummary(opts: {
  waiverType?: string | null
  tiebreakRule?: string | null
  claimLimitPerPeriod?: number | null
}): string {
  const bits: string[] = [getWaiverTypeLabel(opts.waiverType)]
  if (opts.tiebreakRule) bits.push(`Tiebreaker: ${opts.tiebreakRule}`)
  if (opts.claimLimitPerPeriod != null) bits.push(`Limit: ${opts.claimLimitPerPeriod}/period`)
  return bits.join(" · ")
}
