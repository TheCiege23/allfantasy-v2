import type { PlayoffSeriesView } from "./types"

export const PLAYOFF_LATE_PICK_LOCK_RULES = new Set(["none", "commissioner_override"])

export function allowsPlayoffLatePicks(lockRule: string | null | undefined): boolean {
  return PLAYOFF_LATE_PICK_LOCK_RULES.has(String(lockRule ?? "").trim().toLowerCase())
}

export function canUsePlayoffLatePicks(input: {
  lockRule: string | null | undefined
  isPoolOwner?: boolean
  isTestMode?: boolean
}): boolean {
  return allowsPlayoffLatePicks(input.lockRule) && (input.isPoolOwner === true || input.isTestMode === true)
}

export function getPlayoffSeriesLockedReason(
  series: Pick<PlayoffSeriesView, "status" | "startsAt">,
  lockRule: string | null | undefined,
  options: { isPoolOwner?: boolean; isTestMode?: boolean } = {},
): string | null {
  if (canUsePlayoffLatePicks({ lockRule, ...options })) return null
  if (series.status === "final") return "Series completed"
  if (series.status === "in_progress") return "Series already started/locked"
  if (series.startsAt && new Date(series.startsAt).getTime() <= Date.now()) return "Series already started/locked"
  return null
}
