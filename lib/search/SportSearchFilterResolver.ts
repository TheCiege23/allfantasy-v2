/**
 * SportSearchFilterResolver — sport filter for search (NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer).
 * Used when search results or quick actions can be scoped by sport.
 */

import { SUPPORTED_SPORTS } from "@/lib/sport-scope"

export type SportFilterValue = string | null

/** Supported sport codes for filter dropdown/chips. */
export function getSupportedSportFilters(): string[] {
  return [...SUPPORTED_SPORTS]
}

/** Resolve sport filter from query or selection; null = all. */
export function resolveSportFilter(value: SportFilterValue): SportFilterValue {
  if (!value || value === "all") return null
  const upper = value.trim().toUpperCase()
  return SUPPORTED_SPORTS.includes(upper as any) ? upper : null
}

/** Whether to show sport filter in search UI (e.g. when searching players/leagues). */
export function shouldShowSportFilter(resultCategory: string): boolean {
  return resultCategory === "player" || resultCategory === "league"
}
