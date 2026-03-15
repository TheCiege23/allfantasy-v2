/**
 * SportWaiverResolver — sport-specific position filters and labels for waiver wire UI.
 */

import { SUPPORTED_SPORTS } from "@/lib/sport-scope"

/** Position filter options (ALL + sport positions) for waiver browse. */
const POSITIONS_BY_SPORT: Record<string, string[]> = {
  NFL: ["QB", "RB", "WR", "TE", "FLEX", "K", "DST"],
  NBA: ["PG", "SG", "SF", "PF", "C", "G", "F", "UTIL"],
  MLB: ["C", "1B", "2B", "3B", "SS", "OF", "DH", "UTIL", "SP", "RP", "P"],
  NHL: ["C", "LW", "RW", "D", "G", "UTIL"],
  NCAAF: ["QB", "RB", "WR", "TE", "FLEX", "K", "DST"],
  NCAAB: ["G", "F", "C", "UTIL"],
  SOCCER: ["GKP", "DEF", "MID", "FWD", "UTIL"],
}

const DEFAULT_POSITIONS = ["ALL", "QB", "RB", "WR", "TE", "FLEX", "DST"]

export const WAIVER_WIRE_SPORTS = SUPPORTED_SPORTS

export function getPositionFiltersForSport(sport: string | null | undefined): string[] {
  const key = sport?.trim().toUpperCase()
  if (key && POSITIONS_BY_SPORT[key]) return ["ALL", ...POSITIONS_BY_SPORT[key]]
  return DEFAULT_POSITIONS
}

export function getSportDisplayLabel(sport: string): string {
  const u = sport?.toUpperCase()
  if (u === "NCAAF") return "NCAA Football"
  if (u === "NCAAB") return "NCAA Basketball"
  if (u === "SOCCER") return "Soccer"
  return sport || "NFL"
}
