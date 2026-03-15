/**
 * WaiverFilterResolver — filter state defaults and status/tab options for waiver wire.
 */

export const DEFAULT_SEARCH = ""
export const DEFAULT_POSITION = "ALL"
export const DEFAULT_TEAM = ""
export const DEFAULT_STATUS = "all"
export const DEFAULT_SORT = "name"

export const WAIVER_STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "watchlist", label: "Watchlist" },
] as const

export const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "position", label: "Position" },
  { value: "team", label: "Team" },
] as const

export type WaiverTabId = "available" | "pending" | "history"

export const WAIVER_TABS: { id: WaiverTabId; label: string }[] = [
  { id: "available", label: "Available players" },
  { id: "pending", label: "Pending claims" },
  { id: "history", label: "Processed history" },
]
