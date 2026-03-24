/**
 * SportTradeAnalyzerResolver — sport-specific labels and options for trade analyzer UI.
 */

import { DEFAULT_SPORT, SUPPORTED_SPORTS, normalizeToSupportedSport } from "@/lib/sport-scope"

export const TRADE_ANALYZER_SPORTS = SUPPORTED_SPORTS

export function getSportDisplayLabel(sport: string): string {
  const u = normalizeToSupportedSport(sport)
  if (u === "NCAAF") return "NCAA Football"
  if (u === "NCAAB") return "NCAA Basketball"
  if (u === "SOCCER") return "Soccer"
  return u || DEFAULT_SPORT
}

export function getSportOptions(): Array<{ value: string; label: string }> {
  return SUPPORTED_SPORTS.map((s) => ({ value: s, label: getSportDisplayLabel(s) }))
}

export function isPickHeavySport(sport: string): boolean {
  const u = normalizeToSupportedSport(sport)
  return u === "NFL" || u === "NCAAF" || u === "NCAAB"
}

export function supportsDraftPicksForSport(sport: string): boolean {
  const u = normalizeToSupportedSport(sport)
  // Trade analyzer supports picks for every scoped sport today.
  return Boolean(u)
}

export function getDefaultPickRounds(sport: string): number[] {
  const u = normalizeToSupportedSport(sport)
  if (u === "NBA" || u === "NHL" || u === "MLB" || u === "SOCCER") return [1, 2]
  if (u === "NCAAB") return [1, 2, 3]
  return [1, 2, 3, 4, 5]
}
