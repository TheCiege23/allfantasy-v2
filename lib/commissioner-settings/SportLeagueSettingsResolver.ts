/**
 * Sport-aware league settings defaults.
 * Uses lib/sport-scope (NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER).
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

export function getSportOptions(): { value: LeagueSport; label: string }[] {
  return (SUPPORTED_SPORTS as unknown as LeagueSport[]).map((sport) => ({
    value: sport,
    label: SPORT_LABELS[sport] ?? sport,
  }))
}

export function getSportLabel(sport: LeagueSport | string): string {
  return SPORT_LABELS[String(sport).toUpperCase()] ?? String(sport)
}

export function getDefaultSeasonForSport(_sport: LeagueSport): number {
  const y = new Date().getFullYear()
  return y
}
