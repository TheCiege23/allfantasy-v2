/**
 * SportNarrativeResolver — sport-aware labels for league story creator.
 * Uses lib/sport-scope (NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer).
 */

import { SUPPORTED_SPORTS, normalizeToSupportedSport } from "@/lib/sport-scope"

const SPORT_LABELS: Record<string, string> = {
  NFL: "NFL / Fantasy Football",
  NHL: "NHL / Fantasy Hockey",
  NBA: "NBA / Fantasy Basketball",
  MLB: "MLB / Fantasy Baseball",
  NCAAB: "NCAA Basketball",
  NCAAF: "NCAA Football",
  SOCCER: "Soccer",
}

export function getSportNarrativeLabel(sport: string | null | undefined): string {
  const s = normalizeToSupportedSport(sport)
  return SPORT_LABELS[s] ?? s
}

export function getSupportedSportsForStory(): string[] {
  return [...SUPPORTED_SPORTS]
}

export { normalizeToSupportedSport }
