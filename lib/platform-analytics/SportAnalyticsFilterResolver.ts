/**
 * Resolves sport filter for analytics queries.
 * Supports all seven sports per platform scope.
 */

import { SUPPORTED_SPORTS } from "@/lib/sport-scope"
import type { LeagueSport } from "@prisma/client"

const SPORT_LABELS: Record<string, string> = {
  NFL: "NFL",
  NHL: "NHL",
  NBA: "NBA",
  MLB: "MLB",
  NCAAF: "NCAA Football",
  NCAAB: "NCAA Basketball",
  SOCCER: "Soccer",
}

/** Parse query param "sport" (single value or "all"). Returns null for all, or one LeagueSport. */
export function resolveSportFilter(sport: string | null | undefined): LeagueSport | null {
  if (!sport || sport.trim().toLowerCase() === "all") return null
  const u = sport.trim().toUpperCase()
  if ((SUPPORTED_SPORTS as readonly string[]).includes(u)) return u as LeagueSport
  return null
}

/** All sports for dropdown options. */
export function getSportOptions(): { value: string; label: string }[] {
  return [
    { value: "all", label: "All sports" },
    ...(SUPPORTED_SPORTS as unknown as LeagueSport[]).map((s) => ({
      value: s,
      label: SPORT_LABELS[s] ?? s,
    })),
  ]
}

export function getSportLabel(sport: LeagueSport): string {
  return SPORT_LABELS[sport] ?? sport
}
