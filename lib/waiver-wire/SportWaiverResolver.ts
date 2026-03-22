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
  SOCCER: ["GK", "DEF", "MID", "FWD", "UTIL"],
}

/** NFL IDP: offense + IDP position filters for waiver wire. */
const NFL_IDP_WAIVER_POSITIONS = ["QB", "RB", "WR", "TE", "FLEX", "K", "DST", "Offense", "DL", "LB", "DB", "DE", "DT", "CB", "S", "IDP FLEX"]

const DEFAULT_POSITIONS = ["ALL", "QB", "RB", "WR", "TE", "FLEX", "DST"]

export const WAIVER_WIRE_SPORTS = SUPPORTED_SPORTS

/**
 * Get position filter options for waiver wire. When formatType is 'IDP' for NFL, includes Offense, DL, LB, DB, DE, DT, CB, S, IDP FLEX.
 */
export function getPositionFiltersForSport(sport: string | null | undefined, formatType?: string | null): string[] {
  const key = sport?.trim().toUpperCase()
  if (key === "NFL" && (formatType === "IDP" || formatType === "idp")) return ["ALL", ...NFL_IDP_WAIVER_POSITIONS]
  if (key && POSITIONS_BY_SPORT[key]) return ["ALL", ...POSITIONS_BY_SPORT[key]]
  return DEFAULT_POSITIONS
}

/** Filter waiver player by position filter (supports IDP groups: Offense, DL, DB, IDP FLEX). */
export function waiverPositionMatches(playerPosition: string | null, positionFilter: string): boolean {
  if (!positionFilter || positionFilter === "ALL") return true
  const pos = (playerPosition ?? "").toUpperCase()
  const filter = positionFilter.toUpperCase()
  if ((filter === "GK" && pos === "GKP") || (filter === "GKP" && pos === "GK")) return true
  if (filter === "OFFENSE") return ["QB", "RB", "WR", "TE", "K", "DST"].includes(pos)
  if (filter === "DL") return ["DE", "DT"].includes(pos)
  if (filter === "DB") return ["CB", "S", "SS", "FS"].includes(pos)
  if (filter === "IDP FLEX" || filter === "IDP_FLEX") return ["DE", "DT", "LB", "CB", "S", "SS", "FS"].includes(pos)
  return pos === filter
}

export function getSportDisplayLabel(sport: string): string {
  const u = sport?.toUpperCase()
  if (u === "NCAAF") return "NCAA Football"
  if (u === "NCAAB") return "NCAA Basketball"
  if (u === "SOCCER") return "Soccer"
  return sport || "NFL"
}
