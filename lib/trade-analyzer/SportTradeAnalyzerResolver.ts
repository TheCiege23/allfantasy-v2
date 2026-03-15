/**
 * SportTradeAnalyzerResolver — sport-specific labels and options for trade analyzer UI.
 */

import { SUPPORTED_SPORTS } from "@/lib/sport-scope"

export const TRADE_ANALYZER_SPORTS = SUPPORTED_SPORTS

export function getSportDisplayLabel(sport: string): string {
  const u = sport?.toUpperCase()
  if (u === "NCAAF") return "NCAA Football"
  if (u === "NCAAB") return "NCAA Basketball"
  if (u === "SOCCER") return "Soccer"
  return sport || "NFL"
}

export function getSportOptions(): Array<{ value: string; label: string }> {
  return SUPPORTED_SPORTS.map((s) => ({ value: s, label: getSportDisplayLabel(s) }))
}

export function isPickHeavySport(sport: string): boolean {
  const u = sport?.toUpperCase()
  return u === "NFL" || u === "NCAAF" || u === "NCAAB"
}

export function getDefaultPickRounds(sport: string): number[] {
  if (sport?.toUpperCase() === "NBA" || sport?.toUpperCase() === "NHL" || sport?.toUpperCase() === "MLB") return [1, 2]
  return [1, 2, 3, 4, 5]
}
